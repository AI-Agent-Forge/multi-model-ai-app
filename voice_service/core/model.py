import torch
import logging
import gc
from typing import Optional, Any
from voice_service.core.config import settings

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
    current_model_name: Optional[str] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def load_model(self, model_name: str = settings.MODEL_BASE):
        if self.model is not None and self.current_model_name == model_name:
             return self.model

        if Qwen3TTSModel is None:
            raise ImportError("qwen_tts package is missing.")

        logger.info(f"Switching model from {self.current_model_name} to {model_name}")
        
        # Unload previous model
        if self.model is not None:
            del self.model
            self.model = None
            if settings.DEVICE == "cuda":
                torch.cuda.empty_cache()
            gc.collect()

        logger.info(f"Loading Qwen3-TTS model: {model_name} on {settings.DEVICE}")
        
        try:
            # Determine dtype and attention based on device and availability
            dtype = torch.float16 if settings.DEVICE == "cuda" else torch.float32
            
            model_kwargs = {
    "attn_implementation": "eager"
}

            
            # Simple check for FA2 availability (simplified)
            # if settings.DEVICE == "cuda":
            #      kwargs["attn_implementation"] = "flash_attention_2"

            self.model = Qwen3TTSModel.from_pretrained(
                model_name,
                **model_kwargs
            )
            self.current_model_name = model_name
            logger.info("Model loaded successfully.")
            return self.model
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise e

    def get_model(self, model_name: str = settings.MODEL_BASE):
        return self.load_model(model_name)

model_manager = ModelManager()
