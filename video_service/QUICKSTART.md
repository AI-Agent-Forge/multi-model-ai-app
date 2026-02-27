# LTX-2 Video Generation Service - Quick Start Guide

## Overview

This document provides a step-by-step guide to get the video generation service up and running.

## Prerequisites Check

- GPU: NVIDIA with 16GB+ VRAM (24GB recommended)
- RAM: 32GB+ system RAM
- Disk Space: 50GB+ free for models
- Python: 3.10 or higher
- CUDA: 11.8 or higher

## Installation Steps

### 1. Navigate to Service Directory

```bash
cd video_service
```

### 2. Install Dependencies

```bash
# Using pip
pip install -r requirements.txt

# Or using uv (faster)
pip install uv
uv pip install -r requirements.txt
```

### 3. Verify Installation

```bash
python test_setup.py
```

This will check:
- All dependencies are installed
- CUDA is available and has sufficient memory
- Configuration is valid

### 4. Configure Environment (Optional)

If using local models, create a `.env` file:

```bash
# Copy example
cp ../.env.example ../.env

# Edit with your paths
nano ../.env
```

Set these variables:

```env
LTX_MODEL_PATH=/path/to/ltx-2-19b-dev.safetensors
LTX_SPATIAL_UPSAMPLER_PATH=/path/to/ltx-2-spatial-upsampler-x2-1.0.safetensors
LTX_DISTILLED_LORA_PATH=/path/to/ltx-2-19b-distilled-lora-384.safetensors
GEMMA_ROOT=/path/to/gemma-3-12b-it-qat-q4_0-unquantized
```

**Default behavior**: If not set, models will auto-download from HuggingFace (requires ~40GB bandwidth and disk space).

### 5. Start the Service

```bash
# Using Python directly
python main.py

# Or using uvicorn with auto-reload (for development)
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 6. Verify Service is Running

Open another terminal and test:

```bash
# Check health
curl http://localhost:8002/health

# Should return:
# {
#   "status": "healthy",
#   "device": "cuda",
#   "model_path": "...",
#   "cuda_available": true
# }
```

## First Video Generation Test

### Using curl:

```bash
curl -X POST http://localhost:8002/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape with flowing water",
    "width": 768,
    "height": 512,
    "num_frames": 81,
    "num_inference_steps": 30,
    "seed": 42
  }' \
  -o response.json

# Extract and save video
python -c "import json, base64; data=json.load(open('response.json')); open('test_video.mp4','wb').write(base64.b64decode(data['video']))"
```

### Using Python:

```python
import requests
import base64
import json

# Generate video
response = requests.post(
    "http://localhost:8002/generate",
    json={
        "prompt": "A beautiful sunset over the ocean",
        "width": 768,
        "height": 512,
        "num_frames": 81,  # ~3.5 seconds
        "num_inference_steps": 30,
        "seed": 42
    }
)

if response.status_code == 200:
    result = response.json()
    video_data = base64.b64decode(result["video"])
    
    with open("output.mp4", "wb") as f:
        f.write(video_data)
    
    print("Video saved as output.mp4")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
```

## Troubleshooting

### Issue: "ltx-pipelines not found"

**Solution**: Install from source (pinned to a known-good commit):
```bash
pip install git+https://github.com/Lightricks/LTX-2.git@28c3c73fe557666c3de176e1e50a5220152ccfca#subdirectory=packages/ltx-pipelines
```

### Issue: "CUDA out of memory"

**Solutions**:
1. Enable expandable segments:
   ```bash
   export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
   python main.py
   ```

2. Reduce parameters:
   ```json
   {
     "width": 512,
     "height": 384,
     "num_frames": 81,
     "num_inference_steps": 30
   }
   ```

3. Use FP8 model (requires less VRAM):
   ```bash
   export LTX_MODEL_PATH="Lightricks/LTX-2/ltx-2-19b-dev-fp8.safetensors"
   ```

### Issue: Model loading is slow/failing

**Solutions**:
1. Check HuggingFace authentication:
   ```bash
   huggingface-cli login
   ```

2. Download models manually:
   ```bash
   huggingface-cli download Lightricks/LTX-2 --local-dir ./models
   huggingface-cli download google/gemma-3-12b-it-qat-q4_0-unquantized --local-dir ./models/gemma
   ```

3. Set local paths in `.env`

### Issue: Generation is very slow

**Solutions**:
1. Use fewer inference steps (30 instead of 50)
2. Generate shorter videos (81 frames instead of 121)
3. Use distilled model for faster inference
4. Ensure GPU is being used (check with `nvidia-smi`)

### Issue: "Resolution not divisible by 64"

**Solution**: Use resolutions that are multiples of 64:
- Valid: 512, 576, 640, 704, 768, 832, 896, 960, 1024
- Invalid: 500, 720, 800

## Performance Benchmarks

Approximate generation times on different hardware:

| GPU | Resolution | Frames | Steps | Time |
|-----|-----------|--------|-------|------|
| RTX 4090 | 768x512 | 121 | 50 | 4-6 min |
| RTX 4090 | 768x512 | 81 | 30 | 2-3 min |
| RTX 3090 | 768x512 | 121 | 50 | 6-9 min |
| RTX 3090 | 512x384 | 81 | 30 | 3-4 min |
| A100 40GB | 768x512 | 121 | 50 | 3-5 min |

*Note: First generation includes model loading time (2-5 minutes)*

## Integration with Main App

The video service is automatically integrated with the main application's Video Studio UI.

Start the main app:

```bash
# From project root
npm run dev
```

The Video Studio will connect to `http://localhost:8002` for video generation.

## API Documentation

Once the service is running, visit:
- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Next Steps

1. **Optimize for your hardware**: Adjust resolution and frame count
2. **Test image-to-video**: Upload an image and animate it
3. **Experiment with prompts**: Try different styles and motions
4. **Monitor resources**: Use `nvidia-smi` to track GPU usage

## Support

For issues specific to:
- **LTX-2 Model**: https://github.com/Lightricks/LTX-2/issues
- **This Implementation**: Check logs in the terminal
- **CUDA/PyTorch**: https://pytorch.org/get-started/locally/

## Advanced Configuration

### Enable FP8 Quantization

For reduced memory usage:

```python
# In main.py, modify load_model():
from ltx_core.quantization import QuantizationPolicy

video_pipe = TI2VidTwoStagesPipeline(
    ...
    quantization=QuantizationPolicy.FP8  # Add this line
)
```

### Custom LoRAs

Add custom LoRAs for specific styles:

```python
from ltx_core.loader import LoraPathStrengthAndSDOps, LTXV_LORA_COMFY_RENAMING_MAP

custom_loras = [
    LoraPathStrengthAndSDOps(
        "/path/to/custom_lora.safetensors",
        0.6,  # strength
        LTXV_LORA_COMFY_RENAMING_MAP
    )
]

video_pipe = TI2VidTwoStagesPipeline(
    ...
    loras=custom_loras
)
```

### Batch Processing

For generating multiple videos, use a simple script:

```python
import asyncio
import httpx

prompts = [
    "A cat playing with a ball",
    "A sunset over mountains",
    "A city street at night"
]

async def generate_videos():
    async with httpx.AsyncClient(timeout=300.0) as client:
        tasks = [
            client.post(
                "http://localhost:8002/generate",
                json={"prompt": prompt, "num_frames": 81, "num_inference_steps": 30}
            )
            for prompt in prompts
        ]
        responses = await asyncio.gather(*tasks)
        
        for i, response in enumerate(responses):
            if response.status_code == 200:
                video_data = base64.b64decode(response.json()["video"])
                with open(f"video_{i}.mp4", "wb") as f:
                    f.write(video_data)

asyncio.run(generate_videos())
```

## Production Deployment

For production use:

1. **Use Gunicorn with Uvicorn workers**:
   ```bash
   pip install gunicorn
   gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8002
   ```

2. **Add proper error handling and logging**
3. **Implement request queuing** for concurrent requests
4. **Add authentication** if exposing publicly
5. **Use a reverse proxy** (nginx) for SSL/TLS
6. **Monitor GPU usage** and implement rate limiting
7. **Set up proper CORS** for web access

