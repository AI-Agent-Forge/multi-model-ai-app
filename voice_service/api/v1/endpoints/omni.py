from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import Response
import shutil
import os
import uuid
import logging
from typing import Optional

from voice_service.services.stt_service import stt_service
from voice_service.services.audio_service import audio_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/chat")
async def omni_chat(
    request: Request,
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    language: str = Form("English")
):
    if not text and not audio:
        raise HTTPException(status_code=400, detail="Either text or audio must be provided")

    user_text = text

    # 1. STT (if audio provided)
    if audio:
        temp_filename = f"temp_{uuid.uuid4()}.wav"
        try:
            with open(temp_filename, "wb") as buffer:
                shutil.copyfileobj(audio.file, buffer)
            
            transcription = stt_service.transcribe(temp_filename)
            logger.info(f"Transcribed: {transcription}")
            if not user_text:
                user_text = transcription
            else:
                user_text += f" {transcription}"
        except Exception as e:
            logger.error(f"STT Error: {e}")
            raise HTTPException(status_code=500, detail=f"STT Error: {str(e)}")
        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

    if not user_text:
         raise HTTPException(status_code=400, detail="Could not extract text from audio")

    # 2. LLM (Qwen)
    try:
        model = request.app.state.qwen_model
        # Simple prompt wrapping
        response_text = model.generate(user_text)
        logger.info(f"LLM Response: {response_text}")
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM Error: {str(e)}")

    # 3. TTS (Audio Response)
    try:
        # Using a default speaker for now. 
        # Ideally we'd have a specific "Assistant" voice or let user choose.
        # We'll use 'generate_design' with a neutral instruction if possible, or 'generate_custom'.
        # Let's try 'generate_design' as it might be more flexible? 
        # Actually 'audio_service.generate_custom' requires 'speaker'.
        # 'audio_service.generate_design' requires 'instruct'.
        # Let's use 'generate_design' with "Helpful assistant" instruction.
        
        audio_buffer = audio_service.generate_design(
            text=response_text,
            instruct="A helpful and friendly AI assistant.",
            language=language
        )

        # Encode audio to base64
        import base64
        audio_data = audio_buffer.read()
        audio_base64 = base64.b64encode(audio_data).decode("utf-8")

        return {
            "text": response_text,
            "audio": audio_base64
        }
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        # Fallback: return text only? Or error?
        # For now, return error as client expects audio.
        raise HTTPException(status_code=500, detail=f"TTS Error: {str(e)}")
