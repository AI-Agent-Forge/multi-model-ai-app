# Voice Service

This service handles text-to-speech (TTS) and voice cloning capabilities.

## Models

### Qwen3-TTS
Qwen3-TTS is an open-source series of TTS models developed by the Qwen team at Alibaba Cloud, supporting stable, expressive, and streaming speech generation, free-form voice design, and vivid voice cloning.

- **GitHub Repository**: [https://github.com/QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- **Hugging Face Space**: [https://huggingface.co/spaces/Qwen/Qwen3-TTS](https://huggingface.co/spaces/Qwen/Qwen3-TTS)

## How to Run

### 1. Environment Setup

It is recommended to use a fresh, isolated Python 3.12 environment using Conda:

```bash
conda create -n qwen3-tts python=3.12 -y
conda activate qwen3-tts
```

### 2. Installation

Install the `qwen-tts` package and `flash-attn` for optimized performance:

```bash
pip install -U qwen-tts
pip install -U flash-attn --no-build-isolation
```

### 3. Launch Local Web UI Demo

You can launch the Web UI for different model variants using the following commands:

#### Custom Voice Model
```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --ip 0.0.0.0 --port 8000
```

#### Voice Design Model
```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --ip 0.0.0.0 --port 8000
```

#### Base Model (Voice Clone)
```bash
qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base --ip 0.0.0.0 --port 8000
```

Once running, access the UI at `http://localhost:8000`.

### 4. Code Usage (Python)

```python
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

# Load model
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    device_map="cuda:0",
    dtype=torch.bfloat16,
    attn_implementation="flash_attention_2",
)

# Generate audio
wavs, sr = model.generate_custom_voice(
    text="Hello, how can I help you today?",
    language="English",
    speaker="Vivian"
)

# Save to file
sf.write("output.wav", wavs[0], sr)
```
