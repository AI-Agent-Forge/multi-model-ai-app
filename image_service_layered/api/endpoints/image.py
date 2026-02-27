from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import logging

from services.image_service import ImageService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/edit-layered")
async def edit_image_layered(
    file: UploadFile = File(...),
    prompt: str = Form(""),
    negative_prompt: str = Form(" "),
    target_layer_index: int = Form(-1), # -1 triggers auto-detection
    steps: int = Form(50),
    guidance_scale: float = Form(4.0),
    seed: int = Form(777),
    layers: int = Form(-1) # -1 triggers dynamic layer count
):
    try:
        # If not automatic, validate bounds
        if target_layer_index >= 0 and (target_layer_index >= layers and layers > 0):
            raise HTTPException(status_code=400, detail=f"target_layer_index must be between 0 and {layers-1}")
            
        contents = await file.read()
        
        final_base64, base64_layers = await ImageService.process_layered_image(
            file_bytes=contents,
            prompt=prompt,
            negative_prompt=negative_prompt,
            target_layer_index=target_layer_index,
            steps=steps,
            guidance_scale=guidance_scale,
            seed=seed,
            layers=layers
        )
        
        return JSONResponse(
            content={
                "final_image": final_base64,
                "layers": base64_layers, 
                "format": "base64", 
                "media_type": "image/png"
            }
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Editing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
