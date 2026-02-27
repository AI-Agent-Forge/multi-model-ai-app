from pydantic import BaseModel
from typing import Optional

class GenerateVideoRequest(BaseModel):
    prompt: str
    negative_prompt: str = "worst quality, inconsistent motion, blurry, jittery, distorted"
    width: Optional[int] = 512
    height: Optional[int] = 384
    num_frames: Optional[int] = 65
    num_inference_steps: int = 40
    guidance_scale: float = 3.0
    seed: int = 42
    frame_rate: Optional[float] = 24.0

class ImageToVideoRequest(GenerateVideoRequest):
    # Image will be passed as file upload, but we can have extra params here if needed
    pass
