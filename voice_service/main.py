from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from voice_service.api.v1.router import api_router
from voice_service.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to Qwen3-TTS Service", "device": settings.DEVICE}

if __name__ == "__main__":
    import uvicorn
    import os
    uvicorn.run("voice_service.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
    #uvicorn.run(app, host="0.0.0.0", port=port)

