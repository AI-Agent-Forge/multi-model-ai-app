import io
import base64
import os
import torch
import tempfile
import uuid
from pathlib import Path
from typing import Optional
import logging

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from PIL import Image
import numpy as np

# LTX-2 specific imports
try:
    from ltx_pipelines.ti2vid_one_stage import TI2VidOneStagePipeline
    from ltx_pipelines.utils.media_io import encode_video
    from ltx_pipelines.utils.constants import (
        DEFAULT_VIDEO_GUIDER_PARAMS,
        DEFAULT_AUDIO_GUIDER_PARAMS,
        DEFAULT_NEGATIVE_PROMPT,
        AUDIO_SAMPLE_RATE,
    )
    from ltx_core.components.guiders import MultiModalGuiderParams
    from ltx_core.loader import LoraPathStrengthAndSDOps
    from ltx_core.quantization import QuantizationPolicy
    LTX_AVAILABLE = True
except ImportError as e:
    print(f"WARNING: ltx-pipelines not found. Model loading will fail. Error: {e}")
    TI2VidOneStagePipeline = None
    QuantizationPolicy = None
    LTX_AVAILABLE = False

try:
    from .config import settings
    from .models import GenerateVideoRequest
except ImportError:
    from config import settings
    from models import GenerateVideoRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to hold the pipeline
video_pipe = None


def load_model():
    """Load the LTX-2 one-stage pipeline (lower VRAM than two-stage)."""
    global video_pipe
    if not LTX_AVAILABLE:
        logger.warning("ltx-pipelines library is not installed. Video generation will not be available.")
        video_pipe = None
        return

    # Set HF token in environment for model downloads
    if settings.HF_TOKEN:
        os.environ["HUGGING_FACE_HUB_TOKEN"] = settings.HF_TOKEN
        os.environ["HF_TOKEN"] = settings.HF_TOKEN
        logger.info("Hugging Face token configured")

    logger.info("=" * 60)
    logger.info("LTX-2 One-Stage Pipeline Configuration:")
    logger.info(f"  MODEL_PATH: {settings.MODEL_PATH}")
    logger.info(f"  GEMMA_ROOT: {settings.GEMMA_ROOT}")
    logger.info(f"  DEVICE: {settings.DEVICE}")
    logger.info("=" * 60)

    # Determine quantization policy for VRAM optimization
    # fp8-cast keeps transformer weights in FP8 (~26GB) instead of expanding to bf16 (~52GB)
    quant_policy = None
    if settings.QUANTIZATION == "fp8-cast":
        quant_policy = QuantizationPolicy.fp8_cast()
        logger.info("Using FP8-cast quantization (weights stored in FP8, computed in bf16)")
    elif settings.QUANTIZATION == "fp8-scaled-mm":
        quant_policy = QuantizationPolicy.fp8_scaled_mm()
        logger.info("Using FP8-scaled-mm quantization")
    else:
        logger.info("No quantization applied (requires ~52GB VRAM for bf16 weights)")

    logger.info("Loading LTX-2 TI2VidOneStagePipeline...")
    try:
        video_pipe = TI2VidOneStagePipeline(
            checkpoint_path=settings.MODEL_PATH,
            gemma_root=settings.GEMMA_ROOT,
            loras=[],
            device=settings.DEVICE,
            quantization=quant_policy,
        )

        logger.info("LTX-2 One-Stage Pipeline loaded successfully.")
        logger.info(f"Device: {settings.DEVICE}")
        logger.info(f"Model: {settings.MODEL_PATH}")
        logger.info(f"Quantization: {settings.QUANTIZATION or 'none'}")
    except Exception as e:
        logger.error(f"Failed to load LTX-2 Model: {e}")
        import traceback
        traceback.print_exc()
        video_pipe = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    global video_pipe
    if video_pipe:
        del video_pipe
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

app = FastAPI(title="LTX-2 Video Service", lifespan=lifespan)

# Mount outputs directory
outputs_dir = Path("outputs")
outputs_dir.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def save_generation_result(decoded_video, decoded_audio, fps: int) -> dict:
    """Save generated video and return response dict with base64 MP4."""
    request_id = str(uuid.uuid4())
    base_output_dir = Path("outputs")
    base_output_dir.mkdir(exist_ok=True)
    output_mp4_path = base_output_dir / f"{request_id}.mp4"

    logger.info(f"Saving output to {output_mp4_path.absolute()}")

    # One-stage pipeline returns a single chunk (video_chunks_number=1)
    encode_video(
        video=decoded_video,
        fps=fps,
        audio=decoded_audio,
        audio_sample_rate=AUDIO_SAMPLE_RATE if decoded_audio is not None else None,
        output_path=str(output_mp4_path),
        video_chunks_number=1,
    )

    # Read video for base64 response
    with open(output_mp4_path, "rb") as video_file:
        video_bytes = video_file.read()
        video_str = base64.b64encode(video_bytes).decode("utf-8")

    return {
        "success": True,
        "video": video_str,
        "video_path": f"/outputs/{request_id}.mp4",
        "format": "base64",
        "media_type": "video/mp4",
        "request_id": request_id,
    }


@app.post("/generate")
async def generate_video(req: GenerateVideoRequest):
    global video_pipe
    if video_pipe is None:
        raise HTTPException(status_code=503, detail="Video generation model is not loaded.")

    if not req.prompt or req.prompt.strip() == "":
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        logger.info(f"Generating video for prompt: {req.prompt}")
        logger.info(f"Parameters: {req.width}x{req.height}, {req.num_frames} frames")

        fps = req.frame_rate if req.frame_rate else settings.DEFAULT_FPS
        neg_prompt = req.negative_prompt or DEFAULT_NEGATIVE_PROMPT

        with torch.no_grad():
            try:
                decoded_video, decoded_audio = video_pipe(
                    prompt=req.prompt,
                    negative_prompt=neg_prompt,
                    seed=req.seed,
                    height=req.height,
                    width=req.width,
                    num_frames=req.num_frames,
                    frame_rate=fps,
                    num_inference_steps=req.num_inference_steps,
                    video_guider_params=DEFAULT_VIDEO_GUIDER_PARAMS,
                    audio_guider_params=DEFAULT_AUDIO_GUIDER_PARAMS,
                    images=[],
                )
            except RuntimeError as e:
                if "out of memory" in str(e).lower():
                    torch.cuda.empty_cache()
                    logger.error(f"CUDA Out of Memory: {e}")
                    raise HTTPException(
                        status_code=507,
                        detail="GPU out of memory. Try reducing resolution or frames.",
                    )
                raise

            result = save_generation_result(decoded_video, decoded_audio, int(fps))
        logger.info("Video generation completed successfully")
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Video generation failed: {str(e)}")


@app.post("/image-to-video")
async def image_to_video(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    width: Optional[int] = Form(768),
    height: Optional[int] = Form(512),
    num_frames: Optional[int] = Form(121),
    seed: int = Form(42),
):
    global video_pipe
    if video_pipe is None:
        raise HTTPException(status_code=503, detail="Video generation model is not loaded.")

    if not prompt or prompt.strip() == "":
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        logger.info(f"Generating video from image + prompt: {prompt}")
        logger.info(f"Parameters: {width}x{height}, {num_frames} frames")

        contents = await file.read()
        temp_dir = Path(tempfile.gettempdir())
        input_image_path = temp_dir / f"{uuid.uuid4()}_input.png"
        input_image = Image.open(io.BytesIO(contents)).convert("RGB")
        input_image.save(input_image_path)

        with torch.no_grad():
            try:
                decoded_video, decoded_audio = video_pipe(
                    prompt=prompt,
                    negative_prompt=DEFAULT_NEGATIVE_PROMPT,
                    seed=seed,
                    height=height,
                    width=width,
                    num_frames=num_frames,
                    frame_rate=settings.DEFAULT_FPS,
                    num_inference_steps=40,
                    video_guider_params=DEFAULT_VIDEO_GUIDER_PARAMS,
                    audio_guider_params=DEFAULT_AUDIO_GUIDER_PARAMS,
                    images=[(str(input_image_path), 0, 1.0)],
                )
            except RuntimeError as e:
                if "out of memory" in str(e).lower():
                    torch.cuda.empty_cache()
                    logger.error(f"CUDA Out of Memory: {e}")
                    raise HTTPException(
                        status_code=507,
                        detail="GPU out of memory. Try reducing resolution or frames.",
                    )
                raise

            os.remove(input_image_path)
            result = save_generation_result(decoded_video, decoded_audio, settings.DEFAULT_FPS)

        logger.info("Image-to-video generation completed successfully")
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image-to-Video generation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image-to-video generation failed: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    gpu_info = {}
    if torch.cuda.is_available():
        gpu_info = {
            "gpu_name": torch.cuda.get_device_name(0),
            "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1),
            "vram_used_gb": round(torch.cuda.memory_allocated(0) / 1e9, 1),
            "vram_reserved_gb": round(torch.cuda.memory_reserved(0) / 1e9, 1),
        }
    return {
        "status": "healthy" if video_pipe is not None else "model_not_loaded",
        "device": settings.DEVICE,
        "model_path": settings.MODEL_PATH,
        "quantization": settings.QUANTIZATION or "none",
        "cuda_available": torch.cuda.is_available(),
        **gpu_info,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
