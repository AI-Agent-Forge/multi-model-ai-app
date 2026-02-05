from fastapi import APIRouter
from llm_service.api.v1.endpoints import chat

api_router = APIRouter()
api_router.include_router(chat.router, tags=["chat"])
