from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any
from llm_service.services.model_service import llm_service
import time
import uuid

router = APIRouter()

class ImageURL(BaseModel):
    url: str

class ContentItem(BaseModel):
    type: str # text or image_url
    text: Optional[str] = None
    image_url: Optional[ImageURL] = None

class Message(BaseModel):
    role: str
    content: Union[str, List[ContentItem]]

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    stream: Optional[bool] = False

@router.post("/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    try:
        if request.stream:
            # TODO: Implement streaming
            raise HTTPException(status_code=501, detail="Streaming not yet implemented")

        # Convert pydantic models to dicts for service
        messages_dict = [msg.model_dump() for msg in request.messages]
        
        response_text = llm_service.generate(
            messages=messages_dict,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        return {
            "id": f"chatcmpl-{uuid.uuid4()}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": -1, # To be implemented if needed
                "completion_tokens": -1,
                "total_tokens": -1
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
