import os
import torch

class Settings:
    # Model IDs
    TEXT_TO_IMAGE_MODEL_ID = "Qwen/Qwen-Image-2512"
    IMAGE_EDIT_MODEL_ID = "Qwen/Qwen-Image-Edit-2511"

    # Device configuration
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    # Use bfloat16 if on CUDA, otherwise float32
    TORCH_DTYPE = torch.bfloat16 if DEVICE == "cuda" else torch.float32

    # Server settings
    HOST = "0.0.0.0"
    PORT = 8000

    # Output directory
    OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")

settings = Settings()

# Ensure output directory exists
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
