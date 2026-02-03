import torch

class Settings:
    PROJECT_NAME: str = "Qwen3-TTS Microservice"
    API_V1_STR: str = "/api/v1"
    # Detect device
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    # Model Paths (defaulting to HuggingFace IDs, can be overridden)
    MODEL_BASE: str = "Qwen/Qwen3-TTS-12Hz-1.7B-Base"
    MODEL_CUSTOM: str = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"
    MODEL_DESIGN: str = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"

settings = Settings()
