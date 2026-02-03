from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from typing import Optional
import shutil
import os
import uuid
from voice_service.services.audio_service import audio_service

router = APIRouter()

@router.post("/clone")
async def voice_clone(
    text: str = Form(...),
    ref_text: str = Form(...),
    language: str = Form("English"),
    ref_audio: UploadFile = File(...)
):
    """
    Clone a voice from a reference audio file.
    """
    temp_filename = f"temp_{uuid.uuid4()}.wav"
    try:
        # Save uploaded file temporarily
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(ref_audio.file, buffer)
        
        audio_buffer = audio_service.generate_clone(
            text=text,
            ref_audio_path=temp_filename,
            ref_text=ref_text,
            language=language
        )
        
        return Response(content=audio_buffer.read(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@router.post("/design")
async def voice_design(
    text: str = Form(...),
    instruct: str = Form(...),
    language: str = Form("English")
):
    """
    Generate speech using a voice design instruction.
    """
    try:
        audio_buffer = audio_service.generate_design(
            text=text,
            instruct=instruct,
            language=language
        )
        return Response(content=audio_buffer.read(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom")
async def custom_voice(
    text: str = Form(...),
    speaker: str = Form(...),
    language: str = Form("English"),
    instruct: str = Form(None)
):
    """
    Generate speech using a predefined custom voice.
    """
    try:
        audio_buffer = audio_service.generate_custom(
            text=text,
            speaker=speaker,
            language=language,
            instruct=instruct
        )
        return Response(content=audio_buffer.read(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
