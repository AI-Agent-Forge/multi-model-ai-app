import os
import torch

class Settings:
    # Model IDs
    LAYERED_MODEL_ID = "Qwen/Qwen-Image-Layered"
    EDIT_MODEL_ID = "Qwen/Qwen-Image-Edit"

    # Device configuration
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    # Use bfloat16 if on CUDA, otherwise float32
    TORCH_DTYPE = torch.bfloat16 if DEVICE == "cuda" else torch.float32

    # Server settings
    HOST = "0.0.0.0"
    PORT = int(os.environ.get("IMAGE_SERVICE_LAYERED_PORT", 8003))

    class Config:
        env_file = "../../.env"

    # Output directory
    # Go up two directories from core/config.py to root of image_service_layered
    OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outputs")

settings = Settings()

# Ensure output directory exists
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
