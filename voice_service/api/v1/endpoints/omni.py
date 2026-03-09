from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
import shutil
import os
import uuid
import logging
import json
from typing import Optional

from voice_service.services.stt_service import stt_service
from voice_service.services.audio_service import audio_service
from voice_service.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/chat")
async def omni_chat(
    request: Request,
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    language: str = Form(settings.DEFAULT_LANGUAGE)
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
            instruct=settings.DEFAULT_VOICE_INSTRUCTION,
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

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = bytearray()
    
    try:
        while True:
            # We can receive either bytes (audio chunks) or text (JSON commands)
            message = await websocket.receive()
            
            if "bytes" in message:
                audio_chunk = message["bytes"]
                audio_buffer.extend(audio_chunk)
            elif "text" in message:
                text_data = message["text"]
                try:
                    data = json.loads(text_data)
                    if data.get("type") == "stop_recording":
                        # Process the accumulated audio buffer
                        if len(audio_buffer) == 0:
                            await websocket.send_json({"type": "error", "message": "No audio received"})
                            continue
                            
                        # Save buffer to temp file
                        temp_filename = f"temp_{uuid.uuid4()}.wav"
                        try:
                            with open(temp_filename, "wb") as f:
                                f.write(audio_buffer)
                                
                            # 1. STT
                            transcription = stt_service.transcribe(temp_filename)
                            if not transcription:
                                await websocket.send_json({"type": "error", "message": "Could not recognize speech"})
                                continue
                                
                            # Send transcription back immediately
                            await websocket.send_json({"type": "transcription", "text": transcription})
                            
                            # 2. LLM
                            model = websocket.app.state.qwen_model
                            response_text = model.generate(transcription)
                            
                            # Send text response
                            await websocket.send_json({"type": "text_response", "text": response_text})
                            
                            # 3. TTS
                            audio_io = audio_service.generate_design(
                                text=response_text,
                                instruct=settings.DEFAULT_VOICE_INSTRUCTION,
                                language=settings.DEFAULT_LANGUAGE
                            )
                            
                            # Send audio response as bytes message
                            audio_bytes = audio_io.read()
                            await websocket.send_bytes(audio_bytes)
                            
                            # Clear buffer for next utterance
                            audio_buffer.clear()
                            
                        except Exception as e:
                            logger.error(f"Error processing audio in WS: {e}")
                            await websocket.send_json({"type": "error", "message": str(e)})
                            audio_buffer.clear()
                        finally:
                            if os.path.exists(temp_filename):
                                os.remove(temp_filename)
                                
                    elif data.get("type") == "text_chat":
                        # Handle text only request over WS
                        user_text = data.get("text")
                        if not user_text:
                            continue
                            
                        try:
                            # 1. LLM
                            model = websocket.app.state.qwen_model
                            response_text = model.generate(user_text)
                            
                            # Send text response
                            await websocket.send_json({"type": "text_response", "text": response_text})
                            
                            # 2. TTS
                            audio_io = audio_service.generate_design(
                                text=response_text,
                                instruct=settings.DEFAULT_VOICE_INSTRUCTION,
                                language=settings.DEFAULT_LANGUAGE
                            )
                            
                            # Send audio response as bytes message
                            audio_bytes = audio_io.read()
                            await websocket.send_bytes(audio_bytes)
                            
                        except Exception as e:
                            logger.error(f"Error processing text in WS: {e}")
                            await websocket.send_json({"type": "error", "message": str(e)})

                except json.JSONDecodeError:
                    pass # Ignore invalid JSON
                    
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
