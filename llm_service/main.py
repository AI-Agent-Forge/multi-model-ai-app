from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from llm_service.core.config import settings
from llm_service.api.v1.router import api_router
import uvicorn
import os

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
    return {
        "message": "Welcome to Qwen3-VL Service", 
        "model": settings.MODEL_ID,
        "device": settings.DEVICE,
        "quantization": settings.QUANTIZATION
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    port = int(os.environ.get("LLM_SERVICE_PORT", 5004))
    uvicorn.run(app, host="0.0.0.0", port=port)
