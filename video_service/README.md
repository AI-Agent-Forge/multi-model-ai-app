# Video Generation Service (LTX-2)

This microservice provides high-quality video generation using the LTX-2 model from Lightricks.

**Model Source**: [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2)

## Prerequisites

- Python 3.10+
- NVIDIA GPU with 24GB+ VRAM (Recommended)
- LTX-2 Models

## Setup

1.  **Clone the Repository** (if not already done):
    ```bash
    git clone https://github.com/Lightricks/LTX-2.git
    ```

2.  **Create and Activate Virtual Environment**:
    ```bash
    python -m venv .venv
    # On Windows
    .venv\Scripts\activate
    # On Linux/macOS
    source .venv/bin/activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    *Note: This includes `ltx-pipelines` from the official GitHub sub-repository.*

4.  **Download Models**:
    You need to download the LTX-2 model weights. The service expects them at `Lightricks/LTX-2` by default (Auto-download via HF Hub) or a local path set via `LTX_MODEL_PATH`.
    
    To configure a local path:
    ```bash
    # Windows (PowerShell)
    $env:LTX_MODEL_PATH="C:\path\to\your\models\LTX-2"
    # Linux/macOS
    export LTX_MODEL_PATH=/path/to/your/models/LTX-2
    ```

## Running the Service

Start the FastAPI server using the provided configuration:

```bash
python main.py
```
Or manually using uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## API Endpoints

-   `POST /generate`: Text-to-Video
    -   JSON Body:
        ```json
        {
          "prompt": "A cinematic shot of a futuristic city...",
          "width": 768,
          "height": 512,
          "num_frames": 121
        }
        ```

-   `POST /image-to-video`: Image-to-Video
    -   Multipart Form Data:
        -   `file`: (Image file)
        -   `prompt`: (Text prompt)

## Notes

-   The first run will attempt to download the model if not found locally, which is ~30GB+.
-   Generation takes significant time depending on hardware.
