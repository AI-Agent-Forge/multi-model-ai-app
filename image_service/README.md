# Image Service

This service provides text-to-image and image-editing capabilities using state-of-the-art models.

## Models Used

The following models and repositories are integrated into this service:

- **LTX-2**: [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) (Video and Image Generation)
- **Qwen-Image**: [https://github.com/QwenLM/Qwen-Image](https://github.com/QwenLM/Qwen-Image)
- **Qwen-Image-Edit-2511**: [https://huggingface.co/Qwen/Qwen-Image-Edit-2511](https://huggingface.co/Qwen/Qwen-Image-Edit-2511)

### Default Model IDs
- **Text-to-Image**: `Qwen/Qwen-Image-2512`
- **Image Editing**: `Qwen/Qwen-Image-Edit-2511`

## Setup and Running

### Prerequisites
- Python 3.10+
- CUDA-compatible GPU (recommended for performance, models are large)

### Installation

1. **Create a virtual environment**:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate
   ```

2. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

### Running the Service

Start the FastAPI server using `uvicorn`:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

The service will be available at `http://localhost:8000`.

## API Endpoints

- `POST /generate`: Generate an image from a text prompt.
- `POST /edit`: Edit an existing image based on a prompt.

## Environment Variables

You can configure the service using environment variables or a `.env` file in the root directory:

- `IMAGE_SERVICE_PORT`: Port to run the service on (default: `8000`).
