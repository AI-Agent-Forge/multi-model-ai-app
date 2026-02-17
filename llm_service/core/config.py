import os
import torch
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Qwen3-VL Service"
    API_V1_STR: str = "/v1"
    
    # Model Configuration - Default to Qwen2.5-14B (update via env for VL variants)
    MODEL_ID: str = os.getenv("LLM_MODEL_ID", "Qwen/Qwen2.5-14B-Instruct")
    DEVICE: str = os.getenv("LLM_DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")
    QUANTIZATION: str = os.getenv("LLM_QUANTIZATION", "4bit") # '4bit', '8bit', or 'none'

    class Config:
        case_sensitive = True

settings = Settings()
