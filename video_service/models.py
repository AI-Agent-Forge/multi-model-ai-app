from pydantic import BaseModel
from typing import Optional

class GenerateVideoRequest(BaseModel):
    prompt: str
    negative_prompt: str = "worst quality, inconsistent motion, blurry, jittery, distorted"
    width: Optional[int] = 768
    height: Optional[int] = 512
    num_frames: Optional[int] = 121
    num_inference_steps: int = 50
    guidance_scale: float = 3.0
    seed: int = 42

class ImageToVideoRequest(GenerateVideoRequest):
    # Image will be passed as file upload, but we can have extra params here if needed
    pass
