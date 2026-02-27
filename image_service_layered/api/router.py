from fastapi import APIRouter
from api.endpoints import image

api_router = APIRouter()
api_router.include_router(image.router, prefix="", tags=["image"])
