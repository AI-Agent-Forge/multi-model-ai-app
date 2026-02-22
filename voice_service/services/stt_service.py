import os
import logging
from faster_whisper import WhisperModel
from voice_service.core.config import settings

logger = logging.getLogger(__name__)

class STTService:
    def __init__(self):
        self.model_size = "base" # or "small", "medium", "large-v3" based on GPU VRAM
        # Run on GPU with FP16
        self.model = WhisperModel(self.model_size, device="cuda", compute_type="float16")
        logger.info(f"STT Service initialized with model: {self.model_size}")

    def transcribe(self, audio_path: str) -> str:
        segments, info = self.model.transcribe(audio_path, beam_size=5)
        
        full_text = ""
        for segment in segments:
            full_text += segment.text
            
        return full_text.strip()

stt_service = STTService()
