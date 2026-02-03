import io
import base64
import torch
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
from diffusers import QwenImagePipeline, QwenImageEditPlusPipeline
import uvicorn
from contextlib import asynccontextmanager

from .config import settings

# Global variables to hold models
txt2img_pipe = None
edit_pipe = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Load models on startup and clear memory on shutdown.
    Warning: These models are very large. Loading both might OOM on consumer GPUs.
    We will load strictly what is needed if possible, but for this service we load on startup 
    to be ready.
    """
    global txt2img_pipe, edit_pipe
    
    print(f"Loading Text-to-Image model: {settings.TEXT_TO_IMAGE_MODEL_ID}...")
    try:
        txt2img_pipe = QwenImagePipeline.from_pretrained(
            settings.TEXT_TO_IMAGE_MODEL_ID,
            torch_dtype=settings.TORCH_DTYPE
        ).to(settings.DEVICE)
        print("Text-to-Image model loaded successfully.")
    except Exception as e:
        print(f"Failed to load Text-to-Image model: {e}")

    print(f"Loading Image-Edit model: {settings.IMAGE_EDIT_MODEL_ID}...")
    try:
        edit_pipe = QwenImageEditPlusPipeline.from_pretrained(
            settings.IMAGE_EDIT_MODEL_ID,
            torch_dtype=settings.TORCH_DTYPE
        ).to(settings.DEVICE)
        # Enable progress bar
        edit_pipe.set_progress_bar_config(disable=None)
        print("Image-Edit model loaded successfully.")
    except Exception as e:
        print(f"Failed to load Image-Edit model: {e}")

    yield
    
    # Cleanup
    print("Cleaning up models...")
    del txt2img_pipe
    del edit_pipe
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Qwen Image Service", lifespan=lifespan)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = " "
    width: int = 1024
    height: int = 1024
    steps: int = 50
    guidance_scale: float = 4.0 # true_cfg_scale
    seed: int = 42

@app.post("/generate")
async def generate_image(req: GenerateRequest):
    global txt2img_pipe
    if txt2img_pipe is None:
        raise HTTPException(status_code=503, detail="Text-to-Image model not loaded.")
    
    try:
        generator = torch.Generator(device=settings.DEVICE).manual_seed(req.seed)
        
        # Qwen-Image specific arguments based on docs
        # Note: 'true_cfg_scale' is used in the example instead of guidance_scale for some pipelines,
        # but typically diffusers uses guidance_scale. The example shows: 
        # true_cfg_scale=4.0
        
        with torch.inference_mode():
            output = txt2img_pipe(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt,
                width=req.width,
                height=req.height,
                num_inference_steps=req.steps,
                true_cfg_scale=req.guidance_scale,
                generator=generator
            )
            
        if not output.images:
             raise HTTPException(status_code=500, detail="Model failed to generate image.")

        image = output.images[0]
        
        # Convert to base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return JSONResponse(content={"image": img_str, "format": "base64", "media_type": "image/png"})

    except Exception as e:
        print(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/edit")
async def edit_image(
    file: UploadFile = File(...),
    prompt: str = Form(...),
    negative_prompt: str = Form(" "),
    steps: int = Form(40),
    guidance_scale: float = Form(4.0), # true_cfg_scale
    seed: int = Form(42)
):
    global edit_pipe
    if edit_pipe is None:
        raise HTTPException(status_code=503, detail="Image-Edit model not loaded.")

    try:
        # Read image
        contents = await file.read()
        image1 = Image.open(io.BytesIO(contents)).convert("RGB")
        
        generator = torch.manual_seed(seed)
        
        # Qwen-Image-Edit-2511 inputs
        inputs = {
            "image": [image1], # The model expects a list of images based on example
            "prompt": prompt,
            "generator": generator,
            "true_cfg_scale": guidance_scale,
            "negative_prompt": negative_prompt,
            "num_inference_steps": steps,
            "guidance_scale": 1.0, # The example sets guidance_scale to 1.0 and uses true_cfg_scale
            "num_images_per_prompt": 1,
        }

        with torch.inference_mode():
            output = edit_pipe(**inputs)
            
        if not output.images:
             raise HTTPException(status_code=500, detail="Model failed to edit image.")

        output_image = output.images[0]

        # Convert to base64
        buffered = io.BytesIO()
        output_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return JSONResponse(content={"image": img_str, "format": "base64", "media_type": "image/png"})

    except Exception as e:
        print(f"Editing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
