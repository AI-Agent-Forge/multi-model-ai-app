# Video Service — Implementation Summary & Next Steps

This file summarizes what was implemented in the `video_service`, the current runtime state, and concrete next steps so you can resume work quickly.

## What I implemented
- FastAPI service with endpoints:
  - `POST /generate` — text-to-video endpoint (JSON).
  - `POST /image-to-video` — image-conditioned generation (multipart form).
  - `GET /health` — returns model load status and device info.
- Model load logic using Lightricks' TI2VidTwoStagesPipeline (attempted). The code is in `main.py`.
- MP4 encode + base64 response implemented so UI receives video data directly.
- CORS enabled to allow the frontend to call the service.
- Config settings added in `config.py` to control model paths, LoRA, device, and defaults.
- Tests, helper scripts, and docs were added/updated to help bootstrapping.

## Current runtime state (when I last ran the service)
- The FastAPI app starts and responds on port `8002`.
- `torch.cuda.is_available()` returned `True` on the machine I used (GPU present).
- However, the third-party package `ltx-pipelines` and the LTX-2 model assets were not installed/downloaded in the VM I used, so the pipeline could not load. The `/health` endpoint therefore returns `status: model_not_loaded` and `POST /generate` returns a 503 with `Video generation model is not loaded.`

If you are on a machine labeled `gpu_1x_a10` and you confirm you want to run inference there, loading the model is appropriate — proceed to the next steps.

## How to load the model (recommended commands)
Prereqs: ensure you have enough disk space (~40+ GB) and GPU memory (recommended 24GB VRAM for default LTX-2). Run these from the repository root or `video_service` folder.

1) Install Python dependencies (if not already):
```bash
cd video_service
pip install -r requirements.txt
```

2) Install the LTX-2 pipelines package (this may take a while and downloads large models):
```bash
pip install "git+https://github.com/Lightricks/LTX-2.git#subdirectory=packages/ltx-pipelines"
```

3) (Optional) Pre-download or set model paths. The service will try to download from Hugging Face if you don't provide local paths. To set env vars, create a `.env` or export manually, e.g.:
```bash
export LTX_MODEL_PATH="Lightricks/LTX-2"
export SPATIAL_UPSAMPLER_PATH="path/to/spatial-upsampler"
export DISTILLED_LORA_PATH="path/to/distilled-lora"
```

4) Start the service and check health:
```bash
# from video_service/
python main.py
# in another terminal
curl -s http://localhost:8002/health | python3 -m json.tool
```

If the model loads successfully, `/health` should show a `status: ready` (or similar) and the device (e.g., `cuda`). If you see `model_not_loaded`, check the logs for import/load failures.

## How to run a quick generation test (small safe params)
Use conservative parameters first to minimize memory usage.

Text-to-video example (curl):
```bash
curl -s -X POST http://localhost:8002/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A short test animation of a red ball","width":512,"height":384,"frames":16,"num_inference_steps":20}' \
| python3 -m json.tool
```

If successful, the API returns JSON with a base64-encoded MP4. The frontend `VideoStudioLayout` is already wired to call this endpoint and will play the returned video.

## Next steps / Checklist
- [ ] Install `ltx-pipelines` and required model assets (see above).
- [ ] Start the service and verify `/health` shows the model loaded.
- [ ] Run a small test generation via `curl` or the frontend UI.
- [ ] If you encounter CUDA OOM: reduce frames/resolution/steps, or enable quantization/offload options in `main.py`.
- [ ] Optionally, persist generated frames and MP4 files to disk (the service already saves frames temporarily; adapt as needed).

## Troubleshooting hints
- If you see ImportError about `ltx` or similar, ensure step (2) completed successfully and that your Python environment is the same one running the service.
- If downloads fail due to network/auth, set HF token in the environment: `export HF_HOME` or `export HUGGINGFACE_HUB_TOKEN=...`.
- If GPU memory is insufficient, try parameters: `frames<=16`, `width<=512`, `height<=384`, and `num_inference_steps<=20`.

## Where to look in repo
- Main API and pipeline wiring: `video_service/main.py`
- Configuration: `video_service/config.py`
- Tests: `video_service/tests/test_main.py`

If you want, I can now proceed to install the LTX package and start loading the model on `gpu_1x_a10`. Tell me to proceed and I will run the install & load sequence and report logs.

---
Last updated: 2026-02-10
# Video Generation Service (LTX-2)

This microservice provides high-quality video generation using the LTX-2 model from Lightricks.

**Model Source**: [https://github.com/Lightricks/LTX-2](https://github.com/Lightricks/LTX-2)

## Prerequisites

- Python 3.10+
- NVIDIA GPU with 24GB+ VRAM (Recommended for optimal performance)
- LTX-2 Models and components

## Setup

### 1. Create and Activate Virtual Environment

```bash
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Linux/macOS
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
cd video_service
pip install -r requirements.txt
```

*Note: This includes `ltx-pipelines` from the official GitHub sub-repository.*

### 3. Download Required Models

The LTX-2 two-stage pipeline requires several components:

#### Required Components:

1. **Main Model Checkpoint** (choose one):
   - `ltx-2-19b-dev.safetensors` (full precision, ~38GB)
   - `ltx-2-19b-dev-fp8.safetensors` (FP8 optimized, ~19GB)
   - `ltx-2-19b-distilled.safetensors` (distilled version)
   - `ltx-2-19b-distilled-fp8.safetensors` (distilled FP8)

2. **Spatial Upsampler** (required):
   - `ltx-2-spatial-upsampler-x2-1.0.safetensors`

3. **Distilled LoRA** (required for two-stage):
   - `ltx-2-19b-distilled-lora-384.safetensors`

4. **Gemma Text Encoder** (required):
   - Download all files from: `google/gemma-3-12b-it-qat-q4_0-unquantized`

You can download these from [HuggingFace](https://huggingface.co/Lightricks/LTX-2).

#### Automatic Download:

The service will attempt to auto-download models from HuggingFace on first run if you provide HuggingFace repo paths.

#### Manual Download:

To use local models, download them and set environment variables:

```bash
# Example: Download with huggingface-cli
huggingface-cli download Lightricks/LTX-2 ltx-2-19b-dev.safetensors --local-dir ./models
huggingface-cli download Lightricks/LTX-2 ltx-2-spatial-upsampler-x2-1.0.safetensors --local-dir ./models
huggingface-cli download Lightricks/LTX-2 ltx-2-19b-distilled-lora-384.safetensors --local-dir ./models
huggingface-cli download google/gemma-3-12b-it-qat-q4_0-unquantized --local-dir ./models/gemma
```

### 4. Configure Environment Variables

Set the following environment variables (or use defaults):

```bash
# Model paths (can be HuggingFace repos or local paths)
export LTX_MODEL_PATH="./models/ltx-2-19b-dev.safetensors"
export LTX_SPATIAL_UPSAMPLER_PATH="./models/ltx-2-spatial-upsampler-x2-1.0.safetensors"
export LTX_DISTILLED_LORA_PATH="./models/ltx-2-19b-distilled-lora-384.safetensors"
export GEMMA_ROOT="./models/gemma"

# Service configuration
export VIDEO_SERVICE_PORT=8002

# Optional: LoRA strength (default: 0.8)
export LTX_DISTILLED_LORA_STRENGTH=0.8
```

### 5. Running the Service

Start the FastAPI server:

```bash
# From video_service directory
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

## API Endpoints

### 1. Text-to-Video Generation

**Endpoint**: `POST /generate`

**Request Body** (JSON):
```json
{
  "prompt": "A cinematic shot of a futuristic city at sunset",
  "negative_prompt": "worst quality, inconsistent motion, blurry",
  "width": 768,
  "height": 512,
  "num_frames": 121,
  "num_inference_steps": 50,
  "guidance_scale": 3.0,
  "seed": 42
}
```

**Response**:
```json
{
  "video": "base64_encoded_video_data...",
  "format": "base64",
  "media_type": "video/mp4"
}
```

### 2. Image-to-Video Generation

**Endpoint**: `POST /image-to-video`

**Request** (multipart/form-data):
- `file`: Image file (PNG, JPG, etc.)
- `prompt`: Text description of desired motion
- `negative_prompt`: (optional)
- `width`: (optional, default: 768)
- `height`: (optional, default: 512)
- `num_frames`: (optional, default: 121)
- `num_inference_steps`: (optional, default: 50)
- `guidance_scale`: (optional, default: 3.0)
- `seed`: (optional, default: 42)

**Response**: Same as text-to-video

### 3. Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "device": "cuda",
  "model_path": "Lightricks/LTX-2",
  "cuda_available": true
}
```

## Usage Examples

### Using curl:

```bash
# Text-to-video
curl -X POST http://localhost:8002/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape with a flowing river",
    "width": 768,
    "height": 512,
    "num_frames": 121
  }'

# Image-to-video
curl -X POST http://localhost:8002/image-to-video \
  -F "file=@input_image.jpg" \
  -F "prompt=Animate this scene with gentle motion"
```

### Using Python:

```python
import requests
import base64

# Text-to-video
response = requests.post(
    "http://localhost:8002/generate",
    json={
        "prompt": "A beautiful sunset over the ocean",
        "width": 768,
        "height": 512,
        "num_frames": 121
    }
)

if response.status_code == 200:
    video_data = base64.b64decode(response.json()["video"])
    with open("output.mp4", "wb") as f:
        f.write(video_data)
```

## Performance Optimization

### Memory Usage

- **24GB VRAM**: Recommended for 768x512 resolution with 121 frames
- **16GB VRAM**: Try reducing resolution to 512x384 or fewer frames
- **<16GB VRAM**: Consider using distilled FP8 model or one-stage pipeline

### Speed Optimization

1. **Use FP8 Model**: Reduces memory and increases speed
2. **Reduce Inference Steps**: Default 50, try 30-40 for faster generation
3. **Lower Resolution**: 512x384 instead of 768x512
4. **Fewer Frames**: 81 frames (~3.5s @ 24fps) instead of 121

### CUDA Out of Memory

If you encounter OOM errors:

```bash
# Enable expandable segments
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True

# Or reduce parameters
{
  "width": 512,
  "height": 384,
  "num_frames": 81,
  "num_inference_steps": 30
}
```

## Troubleshooting

### Model Loading Issues

1. **Check paths**: Ensure all model paths are correct
2. **Check disk space**: Models require ~50GB+ total
3. **Check CUDA**: Run `torch.cuda.is_available()` in Python

### Generation Failures

1. **Resolution**: Must be divisible by 64 for two-stage pipeline
2. **VRAM**: Monitor GPU memory usage
3. **Logs**: Check console output for detailed error messages

## Notes

- First run will download models if HuggingFace repos are used (~40GB+)
- Initial model loading takes 2-5 minutes depending on hardware
- Generation time varies: 2-10 minutes per video depending on parameters
- The service uses two-stage generation for best quality output
- Audio generation is supported but not exposed in the API endpoints

## Integration with Main App

This service is designed to work with the main multi-model AI application. The React client connects to this service through the Video Studio interface.
