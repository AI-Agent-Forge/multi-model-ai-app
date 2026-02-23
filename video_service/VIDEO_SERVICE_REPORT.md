# Video Service — Technical Report

## Overview

Text-to-video and image-to-video generation service built on **LTX-2 19B** from Lightricks, served via **FastAPI** on port `8002`. Integrated with the multi-model AI app frontend (React/Vite on port `5173`).

---

## What We Used

### Model Stack

| Component | Details |
|---|---|
| **Video Model** | LTX-2 19B Distilled (FP8) — `ltx-2-19b-distilled-fp8.safetensors` (26 GB) |
| **Text Encoder** | Gemma 3 (5-shard safetensors, ~23 GB total on disk) |
| **Pipeline** | `TI2VidOneStagePipeline` from `ltx-pipelines` — single-stage diffusion with classifier-free guidance |
| **Quantization** | `fp8-cast` — stores transformer weights in `float8_e4m3fn`, computes in `bfloat16` |
| **Scheduler** | `LTX2Scheduler` with Euler diffusion steps |
| **Audio** | Built-in audio VAE decoder + vocoder (generates audio alongside video) |

### Infrastructure

| Resource | Specification |
|---|---|
| **GPU** | NVIDIA A100-SXM4-40GB |
| **CPU** | AMD EPYC 7J13 64-Core Processor (30 vCPUs) |
| **System RAM** | 216 GB |
| **VRAM** | 40 GB (40,960 MiB) |

### Software Versions

| Package | Version |
|---|---|
| Python | 3.10 |
| PyTorch | 2.10.0+cu128 |
| CUDA | 12.8 |
| Transformers | 4.57.6 |
| NumPy | 1.26.4 |
| FastAPI | 0.131.0 |
| ltx-core | 1.0.0 |
| ltx-pipelines | 1.0.0 |

### Local Model Files

| File | Size | Purpose |
|---|---|---|
| `ltx-2-19b-distilled-fp8.safetensors` | 26 GB | Main transformer checkpoint (FP8 weights) |
| `ltx-2-19b-distilled-lora-384.safetensors` | 7.2 GB | Distilled LoRA for two-stage pipeline (unused in one-stage) |
| `ltx-2-spatial-upscaler-x2-1.0.safetensors` | 950 MB | Spatial upsampler for two-stage pipeline (unused in one-stage) |
| `models/gemma/model-*.safetensors` (×5) | ~23 GB | Gemma 3 text encoder shards |

---

## What We Changed

### Problem

The original implementation attempted to load the LTX-2 19B model **without quantization**, which expands FP8 weights to bfloat16 at load time (~52 GB). This exceeded the 40 GB VRAM of the A100 GPU. The service also used `TI2VidTwoStagesPipeline` which loads multiple models simultaneously, further compounding memory pressure.

### Changes Made

#### 1. Enabled FP8-Cast Quantization (`config.py`)

```python
# Before
QUANTIZATION: str = ""

# After
QUANTIZATION: str = "fp8-cast"
```

This keeps transformer weights in `float8_e4m3fn` format (~26 GB) instead of expanding to `bfloat16` (~52 GB). During inference, weights are upcast to the input dtype for each `F.linear` call, then discarded — trading small compute overhead for major VRAM savings.

#### 2. Switched to One-Stage Pipeline (`main.py`)

Used `TI2VidOneStagePipeline` instead of `TI2VidTwoStagesPipeline`. The one-stage pipeline generates at target resolution directly in a single diffusion pass, avoiding the need to load the spatial upsampler and distilled LoRA simultaneously.

#### 3. Added Quantization Policy to Pipeline Init (`main.py`)

```python
from ltx_core.quantization import QuantizationPolicy

quant_policy = QuantizationPolicy.fp8_cast()
video_pipe = TI2VidOneStagePipeline(
    checkpoint_path=settings.MODEL_PATH,
    gemma_root=settings.GEMMA_ROOT,
    loras=[],
    device=settings.DEVICE,
    quantization=quant_policy,  # was None
)
```

#### 4. Replaced `torch.inference_mode()` with `torch.no_grad()` (`main.py`)

The VAE decoder's `conv3d` operations require gradient tracking metadata that `inference_mode()` strips. Switched both `/generate` and `/image-to-video` endpoints to `torch.no_grad()` which prevents gradient computation without breaking the VAE.

#### 5. Reduced Default Resolution and Frames (`config.py`, `models.py`, `VideoStudioLayout.tsx`)

| Parameter | Before | After | Reason |
|---|---|---|---|
| Width | 768 | 512 | Reduce latent tensor size |
| Height | 512 | 384 | Reduce latent tensor size |
| Frames | 121 | 65 | ~Half frame count = ~half latent memory |
| Inference Steps | 50 | 40 | Faster generation, still good quality |

#### 6. Fixed Dependency Compatibility

| Issue | Fix |
|---|---|
| Pillow 9.0.1 missing `Image.Resampling` | Upgraded to Pillow 12.1.1 |
| System torchvision incompatible with pip torch | Upgraded torchvision to 0.25.0 |
| System pandas/sklearn binary incompatible with numpy 2.x | Upgraded pandas to 2.3.3, scikit-learn to 1.7.2 |
| NumPy 2.x incompatible with system TensorFlow | Downgraded numpy to 1.26.4 |
| Transformers 5.2.0 removed `Gemma3TextConfig.rope_local_base_freq` | Pinned transformers to `>=4.52,<5.0` (installed 4.57.6) |

#### 7. Enhanced Health Endpoint (`main.py`)

Added GPU memory stats, GPU name, and quantization status to `/health` response for monitoring.

---

## Performance Metrics

### Test Configuration

| Parameter | Value |
|---|---|
| Prompt | "A red ball bouncing on a wooden floor" |
| Resolution | 512 × 384 |
| Frames | 65 |
| Inference Steps | 30 |
| Seed | 42 |
| Guidance | Default CFG + STG (classifier-free + spatio-temporal guidance) |

### Generation Timing

| Stage | Duration | Notes |
|---|---|---|
| **Text Encoding** (Gemma 3) | ~40 s | Load 23 GB text encoder → encode → free |
| **Denoising** (30 steps) | ~55 s | 1.87 s/step; transformer loaded with FP8-cast quantization |
| **VAE Decode** (video + audio) | ~7 s | Decode latents to pixel space + audio waveform |
| **Video Encoding** (MP4) | < 1 s | Encode frames to H.264 MP4 via PyAV |
| **Total End-to-End** | **~102 s** | From API request to response |

### Tokens / Throughput

| Metric | Value |
|---|---|
| **Denoising speed** | ~0.53 steps/s (1.87 s/step) |
| **Frame throughput** | ~0.64 frames/s (65 frames in 102 s total) |
| **Effective video output** | ~2.7 s of video per 102 s of compute (65 frames @ 24 fps = 2.7 s) |
| **Latent tokens per step** | ~7,680 (512/8 × 384/8 × 65/8 spatial-temporal patches, approximate) |
| **Latent tokens processed/s** | ~4,100 tokens/s during denoising (7,680 tokens × 0.53 steps/s) |

### GPU Memory (VRAM)

| Phase | VRAM Used | Notes |
|---|---|---|
| **Idle** (service running, no model on GPU) | ~0 MiB | Pipeline uses lazy loading; models allocated on-demand |
| **Text Encoding** | ~23 GB | Gemma 3 loaded to GPU, freed after encoding |
| **Denoising** (peak) | ~30–35 GB | Transformer (~26 GB FP8 weights) + latent tensors + activations |
| **VAE Decode** | ~5–8 GB | Video decoder only; transformer already freed |
| **Post-Generation** (reserved) | ~3.7 GB | PyTorch CUDA allocator cache (not actively used) |

### CPU Usage

| Phase | CPU Usage | Notes |
|---|---|---|
| **Idle** | < 1% | FastAPI event loop only |
| **During Generation** | 5–15% | Data loading, tensor prep, video encoding |
| **Peak CPU** | ~20% | During MP4 encoding (PyAV / H.264) |

### System RAM

| Phase | RAM Used |
|---|---|
| **Idle** (service loaded) | ~5.2 GB |
| **During Generation** | ~8–10 GB |
| **Available** | ~209 GB of 216 GB |

---

## Architecture

### Pipeline Flow (One-Stage)

```
Request
  │
  ├─ 1. Load Gemma 3 Text Encoder → GPU (~23 GB)
  │     └─ Encode prompt + negative prompt
  │     └─ Delete text encoder, free GPU memory
  │
  ├─ 2. Load Transformer + Video Encoder → GPU (~26 GB FP8)
  │     └─ 30× Euler diffusion steps with CFG
  │     └─ Delete transformer, free GPU memory
  │
  ├─ 3. Load Video VAE Decoder → GPU (~5 GB)
  │     └─ Decode latents → pixel frames
  │     └─ Load Audio Decoder + Vocoder
  │     └─ Decode audio latents → waveform
  │
  └─ 4. Encode to MP4 (PyAV / H.264)
        └─ Return base64 MP4 in JSON response
```

### Key Design: Sequential Load-Use-Delete

Models are **never** all on GPU simultaneously. Each sub-model is:
1. Built from checkpoint weights (with FP8 quantization for transformer)
2. Moved to GPU
3. Used for its stage
4. Deleted + `gc.collect()` + `torch.cuda.empty_cache()`

This keeps peak VRAM at ~30–35 GB (dominated by the transformer during denoising), well within the 40 GB A100 budget.

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/generate` | POST | Text-to-video (JSON body) |
| `/image-to-video` | POST | Image-conditioned generation (multipart form) |
| `/health` | GET | Service status, GPU info, quantization mode |
| `/outputs/{id}.mp4` | GET | Static file serving of generated videos |

---

## Files Modified

| File | Change |
|---|---|
| `video_service/main.py` | FP8 quantization, `torch.no_grad()`, enhanced health endpoint |
| `video_service/config.py` | `QUANTIZATION = "fp8-cast"`, reduced default resolution/frames |
| `video_service/models.py` | Updated default request parameters (512×384, 65 frames, 40 steps) |
| `video_service/requirements.txt` | ltx-core + ltx-pipelines from GitHub |
| `client/src/components/video/VideoStudioLayout.tsx` | Updated default width/height to match backend |

---

*Report generated: February 23, 2026*
