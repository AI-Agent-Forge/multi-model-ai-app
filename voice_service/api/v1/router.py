from fastapi import APIRouter
from voice_service.api.v1.endpoints import tts, omni
from voice_service.api.v1.qwen import router as qwen_router 

api_router = APIRouter()
api_router.include_router(tts.router, prefix="/tts", tags=["tts"])
api_router.include_router(omni.router, prefix="/omni", tags=["Omni"])
api_router.include_router(qwen_router, tags=["Qwen"])