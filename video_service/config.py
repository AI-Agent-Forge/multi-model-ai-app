import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = int(os.environ.get("VIDEO_SERVICE_PORT", 8002))

    
    # Model Configuration
    MODEL_PATH: str = os.environ.get("LTX_MODEL_PATH", "Lightricks/LTX-2") # Can be local path or HF repo ID
    DEVICE: str = "cuda" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu"
    
    # Generation Defaults
    DEFAULT_WIDTH: int = 768
    DEFAULT_HEIGHT: int = 512
    DEFAULT_NUM_FRAMES: int = 121 # ~5 seconds at 24fps
    DEFAULT_FPS: int = 24
    
    class Config:
        env_file = "../.env"


settings = Settings()
