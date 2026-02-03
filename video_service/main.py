import io
import base64
import os
import torch
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from contextlib import asynccontextmanager
from PIL import Image

# LTX-2 specific imports
# Note: These imports assume ltx-pipelines is installed in the environment
try:
    from ltx_pipelines import TI2VidTwoStagesPipeline
except ImportError:
    print("WARNING: ltx_pipelines not found. Model loading will fail.")
    TI2VidTwoStagesPipeline = None

from .config import settings
from .models import GenerateVideoRequest

# Global variable to hold the pipeline
video_pipe = None

def load_model():
    """Lengths load the LTX-2 Pipeline."""
    global video_pipe
    if TI2VidTwoStagesPipeline is None:
        raise RuntimeError("ltx-pipelines library is not installed.")

    print(f"Loading LTX-2 Pipeline from {settings.MODEL_PATH}...")
    try:
        # Load the pipeline. 
        # Assuming typical diffusers-like loading or the specific LTX class method
        # The docs say: TI2VidTwoStagesPipeline.from_pretrained(...)
        
        video_pipe = TI2VidTwoStagesPipeline.from_pretrained(
            settings.MODEL_PATH,
            torch_dtype=torch.float16 if settings.DEVICE == "cuda" else torch.float32
        )
        
        # Move to device
        video_pipe.to(settings.DEVICE)
        
        # Optional: Enable CPU offload or other optimizations for VRAM
        # video_pipe.enable_model_cpu_offload() 
        
        print("LTX-2 Pipeline loaded successfully.")
    except Exception as e:
        print(f"Failed to load LTX-2 Model: {e}")
        # We don't raise here to allow the service to start, but endpoints will fail
        video_pipe = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    # Cleanup
    global video_pipe
    if video_pipe:
        del video_pipe
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

app = FastAPI(title="LTX-2 Video Service", lifespan=lifespan)

@app.post("/generate")
async def generate_video(req: GenerateVideoRequest):
    global video_pipe
    if video_pipe is None:
        raise HTTPException(status_code=503, detail="Video generation model is not loaded.")

    try:
        print(f"Generating video for prompt: {req.prompt}")
        
        # Generate video frames
        # usage might vary based on the specific API of TI2VidTwoStagesPipeline
        # Based on typical diffusers usage + LTX docs implying separate stages hidden or explicit
        # We'll assume the pipeline handles the 2 stages internally if we call it once, 
        # or we might need to verify the exact call signature.
        
        with torch.inference_mode():
            output = video_pipe(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt,
                width=req.width,
                height=req.height,
                num_frames=req.num_frames,
                num_inference_steps=req.num_inference_steps,
                guidance_scale=req.guidance_scale,
                generator=torch.Generator(device=settings.DEVICE).manual_seed(req.seed)
            )

        # Output is likely a list of frames or a video tensor.
        # We need to convert this to an MP4 video.
        
        # Assuming output.frames is a list of PIL images or similar
        # If it returns a tensor, we convert to PIL.
        
        frames = output.frames[0] if hasattr(output, 'frames') else output[0]
        
        # Save to temp mp4 file using utility (e.g. export_to_video from diffusers or manually)
        # For simplicity, let's use a standard export helper or cv2/moviepy if available, 
        # or typical diffusers export_to_video
        
        from diffusers.utils import export_to_video
        
        # export_to_video usually returns path or saves to path.
        # Let's create a temp file
        temp_dir = Path(tempfile.gettempdir())
        output_filename = f"{uuid.uuid4()}.mp4"
        output_path = temp_dir / output_filename
        
        export_to_video(frames, str(output_path), fps=settings.DEFAULT_FPS)
        
        # Read the file and return as base64
        with open(output_path, "rb") as video_file:
            video_bytes = video_file.read()
            video_str = base64.b64encode(video_bytes).decode("utf-8")
            
        # Clean up temp file
        os.remove(output_path)
        
        return JSONResponse(
            content={
                "video": video_str, 
                "format": "base64", 
                "media_type": "video/mp4"
            }
        )

    except Exception as e:
        print(f"Video generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/image-to-video")
async def image_to_video(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form("worst quality, inconsistent motion, blurry, jittery, distorted"),
    width: Optional[int] = Form(768),
    height: Optional[int] = Form(512),
    num_frames: Optional[int] = Form(121),
    num_inference_steps: int = Form(50),
    guidance_scale: float = Form(3.0),
    seed: int = Form(42)
):
    global video_pipe
    if video_pipe is None:
        raise HTTPException(status_code=503, detail="Video generation model is not loaded.")

    try:
        # Read and process input image
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Resize image to match request or model requirements if needed
        # For now, pass directly
        
        print(f"Generating video from image + prompt: {prompt}")
        
        with torch.inference_mode():
            output = video_pipe(
                image=input_image,
                prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                num_frames=num_frames,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                generator=torch.Generator(device=settings.DEVICE).manual_seed(seed)
            )

        frames = output.frames[0] if hasattr(output, 'frames') else output[0]
        
        from diffusers.utils import export_to_video
        
        temp_dir = Path(tempfile.gettempdir())
        output_filename = f"{uuid.uuid4()}.mp4"
        output_path = temp_dir / output_filename
        
        export_to_video(frames, str(output_path), fps=settings.DEFAULT_FPS)
        
        with open(output_path, "rb") as video_file:
            video_bytes = video_file.read()
            video_str = base64.b64encode(video_bytes).decode("utf-8")
            
        os.remove(output_path)
        
        return JSONResponse(
            content={
                "video": video_str, 
                "format": "base64", 
                "media_type": "video/mp4"
            }
        )

    except Exception as e:
        print(f"Image-to-Video generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
