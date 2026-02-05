import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Qwen3-VL Service"
    API_V1_STR: str = "/v1"
    
    # Model Configuration
    MODEL_ID: str = os.getenv("LLM_MODEL_ID", "Qwen/Qwen3-VL-32B-Thinking")
    DEVICE: str = "cuda"  # We assume CUDA availability for this model as per plan, but could add checks
    QUANTIZATION: str = os.getenv("LLM_QUANTIZATION", "4bit") # '4bit', '8bit', or 'none'

    class Config:
        case_sensitive = True

settings = Settings()
