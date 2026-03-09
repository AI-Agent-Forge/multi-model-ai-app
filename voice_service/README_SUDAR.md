to run the voice-services 
Prerequisites

Ubuntu 20.04 / 22.04

NVIDIA GPU (A10 / A100 recommended)

NVIDIA Driver installed

CUDA available (nvidia-smi should work)

Python 3.10.x

Internet access (for model download)
Project Location

cd ~/sudar-us-east-1-disk/git/multi-model-ai-app

Step 1: Create & Activate Python Environment (qwen_env)
Create virtual environment (only once)
python3.10 -m venv qwen_env

Activate environment
source qwen_env/bin/activate


Verify:

python --version
# Python 3.10.x

Step 2: Upgrade pip tools

pip install --upgrade pip setuptools wheel
🎮 Step 3: Verify GPU Access
nvidia-smi
You should see GPU details (A100 / A10 etc).

🔥 Step 4: Install PyTorch (CUDA enabled)
Recommended stable build (works even if system CUDA is 12.x)

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
Verify GPU support:

python -c "import torch; print(torch.cuda.is_available())"
Expected output:

True

🗣️ Step 5: Install Qwen3-TTS
pip install -U qwen-tts
⚡ Step 6: Install FlashAttention2 (Performance Optimization)
Required for Qwen3-TTS
Python must be 3.10

pip install flash-attn --no-build-isolation
⏳ This may take 10–15 minutes on first install.

Verify:

python -c "import flash_attn; print('flash-attn OK')"

Launch Local Web UI Demo
You can launch the Web UI for different model variants using the following commands:

Custom Voice Model

qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice --ip 0.0.0.0 --port 8000

Voice Design Model

qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign --ip 0.0.0.0 --port 8000

Base Model (Voice Clone)

qwen-tts-demo Qwen/Qwen3-TTS-12Hz-1.7B-Base --ip 0.0.0.0 --port 8000


Once running, access the UI at http://localhost:8000.

 uvicorn voice_service.main:app --host 0.0.0.0 --port 5003 --reload