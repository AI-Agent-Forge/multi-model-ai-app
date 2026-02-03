import torch
import logging
from typing import Optional, Any
from app.core.config import settings

# Try importing qwen_tts, handle if missing for development/structure purpose
try:
    from qwen_tts import Qwen3TTSModel, Qwen3TTSTokenizer
except ImportError:
    logging.warning("qwen_tts not installed. Model loading will fail.")
    Qwen3TTSModel = None
    Qwen3TTSTokenizer = None

logger = logging.getLogger(__name__)

class ModelManager:
    _instance = None
    model: Any = None
    tokenizer: Any = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def load_model(self, model_name: str = settings.MODEL_BASE):
        if self.model is not None:
             # Already loaded (simple singleton for now, could be improved to switch models)
             # If we need to switch models, we would check if current model matches requested.
             # For this MVP, we assume one model is sufficient or we reload.
             return self.model

        if Qwen3TTSModel is None:
            raise ImportError("qwen_tts package is missing.")

        logger.info(f"Loading Qwen3-TTS model: {model_name} on {settings.DEVICE}")
        
        try:
            # Determine dtype and attention based on device and availability
            dtype = torch.float16 if settings.DEVICE == "cuda" else torch.float32
            # attn_implementation = "flash_attention_2" if settings.DEVICE == "cuda" else "eager"
            # Flash attention often requires specific setup, safer to default to standard or let library decide if not strictly required
            # The docs say: attn_implementation="flash_attention_2"
            
            kwargs = {
                "device_map": settings.DEVICE,
                "dtype": dtype
            }
            
            # Simple check for FA2 availability (simplified)
            if settings.DEVICE == "cuda":
                 kwargs["attn_implementation"] = "flash_attention_2"

            self.model = Qwen3TTSModel.from_pretrained(
                model_name,
                **kwargs
            )
            logger.info("Model loaded successfully.")
            return self.model
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            # Fallback attempts could go here (e.g. disable FA2)
            if "flash_attention_2" in str(e) or "not support" in str(e):
                logger.info("Retrying without flash_attention_2...")
                kwargs.pop("attn_implementation", None)
                self.model = Qwen3TTSModel.from_pretrained(
                    model_name,
                    **kwargs
                )
                return self.model
            raise e

    def get_model(self):
        if self.model is None:
            return self.load_model()
        return self.model

model_manager = ModelManager()
