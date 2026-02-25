from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from core.config import settings
from core.model import model_manager
from api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    model_manager.load_models()
    yield
    # Cleanup on shutdown
    model_manager.cleanup()

app = FastAPI(title="Qwen Layered Image Service", lifespan=lifespan)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# For testing that it is running
@app.get("/")
def root():
    return {"message": "Welcome to Qwen Layered Image Service", "device": settings.DEVICE}

if __name__ == "__main__":
    uvicorn.run("image_service_layered.main:app", host=settings.HOST, port=settings.PORT, reload=True)
