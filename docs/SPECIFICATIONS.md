# Technical Specifications

## Microservices Overview

The application architecture has expanded to include specialized Python microservices for high-performance AI inference, complementing the Node.js core server.

| Service | Port | Technology | Purpose |
| :--- | :--- | :--- | :--- |
| **Core Server** | 5000 | Node.js / Express | Chat management, Auth, File handling, Orchestration |
| **Audio Service** | 8000* | Python / FastAPI | Text-to-Speech, Voice Cloning (Qwen3-TTS) |
| **Image Service** | 8000* | Python / FastAPI | Text-to-Image, Image Editing (Qwen-Image) |
| **Video Service** | 8002 | Python / FastAPI | Video Generation (LTX-2) |

*> Note: Audio and Image services currently default to port 8000. Configuration required to run simultaneously.*

---

## 1. Audio Service (TTS & Cloning)

**Path:** `app/` (Root Python App) or independent deployment.

### Capabilities
- **Text-to-Speech**: High-quality speech generation using **Qwen2-Audio** / **Qwen3-TTS**.
- **Voice Cloning**: Zero-shot voice cloning capabilities via reference audio.
- **Voice Design**: Natural language prompting for voice characteristics (e.g., "A deep, raspy voice").

### API Endpoints
- `POST /api/v1/tts/clone`
    - **Inputs**: `text` (string), `ref_audio` (file), `ref_text` (string)
    - **Output**: Audio file (WAV/MP3)
- `POST /api/v1/tts/design`
    - **Inputs**: `text` (string), `instruct` (string - voice description)
    - **Output**: Audio file

---

## 2. Image Service (Image Studio)

**Path:** `image_service/`

### Capabilities
- **Text-to-Image**: Generation using **Qwen-Image-2512** pipeline.
- **Image-to-Image**: Editing and transformation using **Qwen-Image-Edit-2511**.

### API Endpoints
- `POST /generate`
    - **Inputs**: `prompt`, `negative_prompt`, `width`, `height`, `steps`, `guidance_scale`
    - **Output**: JSON with Base64 encoded image.
- `POST /edit`
    - **Inputs**: `file` (image), `prompt`, `mask` (optional)
    - **Output**: JSON with Base64 encoded image.

---

## 3. Video Service (Video Studio)

**Path:** `video_service/`

### Capabilities
- **Text-to-Video**: Generation using **Lightricks/LTX-2** (19B params).
- **Image-to-Video**: Animating static images.

### Architecture
- **Model**: LTX-2 (Transformers-based diffusion).
- **Pipeline**: Two-stage generation (Coarse -> Fine) managed via `ltx-pipelines`.
- **Hardware**: Requires High-VRAM GPU (24GB+ recommended).

### API Endpoints
- `POST /generate`
    - **Inputs**: `prompt`, `resolution`, `num_frames`
    - **Output**: Base64 MP4 video.
- `POST /image-to-video`
    - **Inputs**: `file` (image), `prompt`
    - **Output**: Base64 MP4 video.

---

## Frontend Integration

The React client integrates these services via distinct "Studio" modes:
1.  **LLM Chat**: Standard chat interface (Node.js backend).
2.  **Qwen3-TTS**: Audio generation interface (Audio Service).
3.  **Image Studio**: Generation and Editing logic (Image Service).
4.  **Video Studio**: Video generation interface (Video Service).

### State Management
- `useChatStore` manages the `appMode` ('chat' | 'tts' | 'image-studio' | 'video-studio') to toggle between layouts.
