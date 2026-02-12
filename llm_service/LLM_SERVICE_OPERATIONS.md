# LLM Service Operations and Setup

This document tracks all changes made to the `llm_service`, how to run it, and how to configure it for successful API inference.

## Summary of Changes

- Config alignment in `core/config.py`:
  - `DEVICE` auto-detects CUDA; falls back to `cpu`.
  - Default `MODEL_ID`: `Qwen/Qwen2.5-14B-Instruct`.
  - Default `QUANTIZATION`: `4bit` (GPU-friendly; ignored on CPU).
- Robust Qwen integration in `services/model_service.py`:
  - Multimodal via `AutoProcessor` when present; text-only via `AutoTokenizer` otherwise.
  - Flexible message parsing (supports `content` arrays and extra `image`/`images` fields).
  - Critical fix: generation fallback checks `model.generate()` and then `model.language_model.generate()` for Qwen VL backends that don’t expose top-level `generate()`.
- API schema in `api/v1/endpoints/chat.py` accepts an optional `image` field on messages.
- Verified end-to-end: service health, API test script, and UI Qwen chat window calling the service.

## How to Run

### 1) Python Environment

It is recommended to use a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r llm_service/requirements.txt
```

### 2) Configure Model (Qwen2.5-14B-Instruct default; adjust for your hardware)

```bash
export LLM_MODEL_ID="Qwen/Qwen2.5-14B-Instruct"   # default; use VL variant if needed
export LLM_DEVICE="cuda"               # strongly recommended; 14B requires ~14GB VRAM with 4bit
export LLM_QUANTIZATION="4bit"         # consider 8bit/none based on stability and memory
```

### 3) Start the Service

```bash
uvicorn llm_service.main:app --host 0.0.0.0 --port 5004
```

### 4) Verify

```bash
curl http://localhost:5004/health
curl http://localhost:5004/ | python -m json.tool
```

### 5) Test the API

```bash
python llm_service/test_api_vm.py
```

Expected: HTTP 200 with an assistant message in `choices[0].message.content`.

### 6) Test via UI (Optional)

```bash
cd client
npm install
npm run dev -- --host --port 5173
```

Open the printed localhost port (Vite may pick 5174/5175 if 5173 is busy). Use the Qwen chat window; it posts to `http://localhost:5004/v1/chat/completions`.

## Configuring a Qwen3 VL Model (Optional)

If you have a compatible multi-GPU setup and want multimodal (image) reasoning, use a Qwen3 VL model and consider turning off quantization if you hit loading issues:

```bash
export LLM_MODEL_ID="Qwen/Qwen3-VL-32B"   # if available; otherwise use a smaller VL variant
export LLM_DEVICE="cuda"
export LLM_QUANTIZATION="none"            # VL models may require no quant for stability
```

The service will attempt to initialize a multimodal `AutoProcessor` and handle image inputs present in messages (including the non-standard `image` field).

## API Contract

- Health: `GET /health` → `{ "status": "ok" }`
- Info: `GET /` → Basic info including model, device, and quantization.
- Chat: `POST /v1/chat/completions`
  - Request (flexible):
    - `model`: string (echoed back in response)
    - `messages`: array of messages, each with:
      - `role`: `user` | `assistant` | `system`
      - `content`: string or array of items `{ type: "text" | "image_url", ... }`
      - Optional `image`: string (markdown link or plain URL)
    - `max_tokens`, `temperature`, `top_p`, `stream` (optional)
  - Response: OpenAI-like object with `choices[0].message.content` containing the generated text.

## Notes and Limitations

- Defaults in code: `MODEL_ID=Qwen/Qwen2.5-14B-Instruct`, `QUANTIZATION=4bit`, device auto-detected.
- Qwen2.5-14B uses ~14GB VRAM with 4-bit quantization; ensure sufficient GPU memory.
- For image reasoning, use a Qwen3 VL model on CUDA; if loading fails, try `LLM_QUANTIZATION=none`.
- Streaming is not yet implemented; `stream=true` returns 501.

## Troubleshooting

- Address already in use (port 5004):
  - Stop existing: `pkill -f "uvicorn llm_service.main"`
  - Or change port: `export LLM_SERVICE_PORT=5005`
- Error: `... has no generate() method`:
  - Ensure you’re on a supported Qwen model; the service falls back to `language_model.generate()` when needed.
  - Try the recommended text model first to validate the stack.
- Out of memory:
  - Use 4-bit/8-bit quantization on GPU or pick a smaller model (e.g., `Qwen/Qwen2-1.5B-Instruct`).

## Performance Metrics (Qwen2.5-14B-Instruct)

Benchmark conducted on **February 12, 2026** with the following configuration:

### Configuration
| Setting | Value |
|---------|-------|
| Model | `Qwen/Qwen2.5-14B-Instruct` |
| Quantization | 4-bit (NF4) |
| Device | CUDA (GPU) |

### Hardware
| Component | Specification |
|-----------|--------------|
| GPU | NVIDIA A100-SXM4-40GB |
| GPU VRAM | 40,960 MiB total |
| System RAM | 216 GB total |

### Resource Usage During Inference
| Metric | Value |
|--------|-------|
| GPU Memory Used | ~14 GB (13,983 MiB) |
| GPU Utilization | 35-40% |
| System RAM Used | ~6 GB |
| CPU Usage | < 1% |

### Inference Performance
| Metric | Value |
|--------|-------|
| Tokens/sec (output) | ~10 tok/s (average) |
| Response time (100 tokens) | ~8-9 seconds |
| Response time (250 tokens) | ~20-25 seconds |

### Test Results (3-run average)
```
Test 1: 8.79s, ~89 tokens, 10.1 tok/s
Test 2: 8.87s, ~85 tokens, 9.6 tok/s
Test 3: 8.85s, ~91 tokens, 10.3 tok/s
Average: 10.0 tok/s
```

### Notes
- First request includes model loading time (~50s for cold start)
- Subsequent requests are significantly faster
- 4-bit quantization reduces VRAM from ~28GB to ~14GB with minimal quality loss
- GPU utilization stays moderate (~37%) due to memory bandwidth limitations

## Maintenance

- To change defaults, update environment variables rather than code.
- All changes were contained within `llm_service` and did not modify other services or the main API.
