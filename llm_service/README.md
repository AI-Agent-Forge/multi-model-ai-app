# LLM Service (Qwen3-VL)

This service provides text-to-image and visual language understanding capabilities using the Qwen3 series of models.

## Models

### Qwen3-VL-32B
Qwen3-VL-32B is a powerful vision-language model that can perceive and understand images, videos, and multi-modal content with high accuracy.

- **GitHub Repository**: [https://github.com/QwenLM/Qwen3](https://github.com/QwenLM/Qwen3)
- **Hugging Face Model**: [https://huggingface.co/Qwen/Qwen3-32B](https://huggingface.co/Qwen/Qwen3-32B)

## How to Run

### 1. Environment Setup

It is recommended to use a fresh, isolated Python environment. Following the project standards, we use `.venv`:

```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Linux/macOS
source .venv/bin/activate
```

### 2. Installation

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Note: This model requires a GPU with significant VRAM. Ensure you have the appropriate CUDA drivers installed.

### 3. Launch the Service

You can start the FastAPI service using `uvicorn`:

```bash
python main.py
```

Or directly with uvicorn:

```bash
uvicorn llm_service.main:app --host 0.0.0.0 --port 5004
```

The service will be available at `http://localhost:5004`.

## API Documentation

- **Health Check**: `GET /health`
- **Root Info**: `GET /`
- **Chat Completion**: `POST /v1/chat/completions` (refer to `api/v1/endpoints/chat.py` for spec)
