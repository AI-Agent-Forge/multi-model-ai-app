import torch
import logging
from typing import Any, Optional
from diffusers import QwenImageLayeredPipeline, QwenImageEditPipeline
from transformers import CLIPProcessor, CLIPModel

from core.config import settings

logger = logging.getLogger(__name__)

class ModelManager:
    _instance = None
    layered_pipe: Optional[Any] = None
    edit_pipe: Optional[Any] = None
    clip_model: Optional[Any] = None
    clip_processor: Optional[Any] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
        return cls._instance

    def load_models(self):
        if self.layered_pipe is not None and self.edit_pipe is not None:
             return self.layered_pipe, self.edit_pipe

        logger.info(f"Loading Models on {settings.DEVICE}...")
        
        try:
            # 1. Load Layered Pipeline
            logger.info(f"Loading Layered Pipeline: {settings.LAYERED_MODEL_ID}")
            self.layered_pipe = QwenImageLayeredPipeline.from_pretrained(
                settings.LAYERED_MODEL_ID,
                torch_dtype=settings.TORCH_DTYPE,
                device_map=None
            )
            # Reverted to sequential offload because model offload causes 39GB OOM
            self.layered_pipe.enable_sequential_cpu_offload()
            self.layered_pipe.enable_attention_slicing()
            self.layered_pipe.set_progress_bar_config(disable=None)
            
            # 2. Load Edit Pipeline
            logger.info(f"Loading Edit Pipeline: {settings.EDIT_MODEL_ID}")
            self.edit_pipe = QwenImageEditPipeline.from_pretrained(
                settings.EDIT_MODEL_ID,
                torch_dtype=settings.TORCH_DTYPE,
                device_map=None
            )
            # Reverted to sequential offload because model offload causes 39GB OOM
            self.edit_pipe.enable_sequential_cpu_offload()
            self.edit_pipe.enable_attention_slicing()
            self.edit_pipe.set_progress_bar_config(disable=None)
            
            logger.info("Both Phase Models loaded successfully.")
            return self.layered_pipe, self.edit_pipe
            
        except Exception as e:
            logger.error(f"Failed to load pipelines: {e}")
            raise e

    def get_layered_model(self):
        self.load_models()
        return self.layered_pipe

    def get_edit_model(self):
        self.load_models()
        return self.edit_pipe
        
    def get_clip_model(self):
        if self.clip_model is None or self.clip_processor is None:
            logger.info("Loading CLIP model for semantic layer matching...")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(settings.DEVICE)
            # Use inference mode to save memory during eval
            self.clip_model.eval()
        return self.clip_model, self.clip_processor
        
    def cleanup(self):
        logger.info("Cleaning up models...")
        if self.layered_pipe is not None:
            del self.layered_pipe
            self.layered_pipe = None
        if self.edit_pipe is not None:
            del self.edit_pipe
            self.edit_pipe = None
        if self.clip_model is not None:
            del self.clip_model
            self.clip_model = None
        if self.clip_processor is not None:
            del self.clip_processor
            self.clip_processor = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

model_manager = ModelManager()
