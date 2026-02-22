from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

class PromptRequest(BaseModel):
    prompt: str
    max_tokens: int = 200
    temperature: float = 0.7

@router.post("/qwen/generate")
def generate_text(req: PromptRequest, request: Request):
    model = request.app.state.qwen_model
    response = model.generate(req.prompt)
    return {"response": response}