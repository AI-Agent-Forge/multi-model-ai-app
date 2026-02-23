import os
from pydantic_settings import BaseSettings
import torch
from pathlib import Path

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8002
    
    # Hugging Face Token
    HF_TOKEN: str = ""
    HUGGING_FACE_HUB_TOKEN: str = ""
    
    # Model Configuration — absolute paths to local model files
    LTX_MODEL_PATH: str = "/home/ubuntu/abi-video-disk/git/multi-model-ai-app/models/ltx2/ltx-2-19b-distilled-fp8.safetensors"
    
    # Spatial upsampler for 2x resolution increase (required for two-stage pipeline)
    LTX_SPATIAL_UPSAMPLER_PATH: str = "/home/ubuntu/abi-video-disk/git/multi-model-ai-app/models/ltx2/ltx-2-spatial-upscaler-x2-1.0.safetensors"
    
    # Distilled LoRA for stage 2 refinement (required for two-stage pipeline)
    LTX_DISTILLED_LORA_PATH: str = "/home/ubuntu/abi-video-disk/git/multi-model-ai-app/models/ltx2/ltx-2-19b-distilled-lora-384.safetensors"
    LTX_DISTILLED_LORA_STRENGTH: float = 0.8
    
    # Gemma text encoder path (required)
    GEMMA_ROOT: str = "/home/ubuntu/abi-video-disk/git/multi-model-ai-app/models/gemma"
    
    # Device configuration
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Generation Defaults (conservative for 40GB VRAM)
    DEFAULT_WIDTH: int = 512
    DEFAULT_HEIGHT: int = 384
    DEFAULT_NUM_FRAMES: int = 65
    DEFAULT_FPS: int = 24
    # Quantization options: '', 'fp8-cast', 'fp8-scaled-mm'
    # fp8-cast: keeps transformer weights in FP8 (~26GB) instead of bf16 (~52GB)
    # REQUIRED for 40GB VRAM GPUs with the 19B model
    QUANTIZATION: str = "fp8-cast"
    
    @property
    def MODEL_PATH(self) -> str:
        return self.LTX_MODEL_PATH
    
    @property
    def SPATIAL_UPSAMPLER_PATH(self) -> str:
        return self.LTX_SPATIAL_UPSAMPLER_PATH
    
    @property
    def DISTILLED_LORA_PATH(self) -> str:
        return self.LTX_DISTILLED_LORA_PATH
    
    @property
    def DISTILLED_LORA_STRENGTH(self) -> float:
        return self.LTX_DISTILLED_LORA_STRENGTH
    
    class Config:
        # Use absolute path to .env file
        env_file = str(Path(__file__).parent.parent / ".env")
        extra = "ignore"
        case_sensitive = True


settings = Settings()
