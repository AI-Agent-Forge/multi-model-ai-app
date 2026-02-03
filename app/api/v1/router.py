from fastapi import APIRouter
from app.api.v1.endpoints import tts

api_router = APIRouter()
api_router.include_router(tts.router, prefix="/tts", tags=["tts"])
