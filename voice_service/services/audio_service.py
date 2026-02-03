import soundfile as sf
import io
import torch
import numpy as np
import logging
from voice_service.core.model import model_manager
from voice_service.core.config import settings

logger = logging.getLogger(__name__)

class AudioService:
    @staticmethod
    def generate_clone(text: str, ref_audio_path: str, ref_text: str, language: str = "English"):
        model = model_manager.get_model(settings.MODEL_BASE)
        
        logger.info(f"Cloning voice. Text: {text[:20]}... RefText: {ref_text[:20]}...")
        
        # Qwen3-TTS generate_voice_clone
        # ref_audio can be a path or tuple (audio, sr)
        wavs, sr = model.generate_voice_clone(
            text=text,
            language=language,
            ref_audio=ref_audio_path,
            ref_text=ref_text
        )
        
        # Return the first generated audio
        # Convert to bytes
        buffer = io.BytesIO()
        sf.write(buffer, wavs[0], sr, format='WAV')
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_design(text: str, instruct: str, language: str = "English"):
        model = model_manager.get_model(settings.MODEL_DESIGN)
        logger.info(f"Designing voice. Text: {text[:20]}... Instruct: {instruct[:20]}...")
        
        if hasattr(model, 'generate_voice_design'):
            wavs, sr = model.generate_voice_design(
                text=text,
                language=language,
                instruct=instruct
            )
            buffer = io.BytesIO()
            sf.write(buffer, wavs[0], sr, format='WAV')
            buffer.seek(0)
            return buffer
        else:
             raise ValueError("Loaded model does not support generate_voice_design")

    @staticmethod
    def generate_custom(text: str, speaker: str, language: str = "English", instruct: str = ""):
        model = model_manager.get_model(settings.MODEL_CUSTOM)
        if hasattr(model, 'generate_custom_voice'):
            wavs, sr = model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
                instruct=instruct
            )
            buffer = io.BytesIO()
            sf.write(buffer, wavs[0], sr, format='WAV')
            buffer.seek(0)
            return buffer
        else:
             raise ValueError("Loaded model does not support generate_custom_voice")

audio_service = AudioService()
