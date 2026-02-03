from fastapi import FastAPI
from voice_service.api.v1.router import api_router
from voice_service.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to Qwen3-TTS Service", "device": settings.DEVICE}
