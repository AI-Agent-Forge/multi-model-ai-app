# Qwen Omni Integration

This document outlines the integration of the **Qwen Omni** model into the Multi-Model AI App. This feature enables real-time voice interaction, text chat, and audio file processing.

## 🚀 Overview

Qwen Omni (Qwen2-Audio) is a powerful multimodal model capable of understanding and generating audio. This integration brings it to the web application, allowing users to:

-   **Chat via Text**: Send text messages and receive text responses.
-   **Chat via Voice**: Use microphone input for real-time conversation.
-   **Voice Upload**: Upload audio files for the model to process and respond to.

##  architecture

### Frontend (`client/`)

The frontend is built with React and TypeScript. Key components include:

-   **`QwenOmniPage.tsx`**: The main page for the Qwen Omni interface.
-   **`QwenOmniLayout.tsx`**: Handles the layout structure for the chat interface.
-   **`Header.tsx`**: Contains the navigation menu to switch to "Qwen Omni" mode.
-   **`useChatStore.ts`**: Manages the application state, including the current mode (`qwen-omni`) and chat messages.

### Backend (`voice_service/`)

The backend service handles the communication with the Qwen Omni model.

-   **Service**: A Python-based service (likely FastAPI).
-   **Endpoints**:
    -   `POST /api/v1/voice/chat`: Endpoint for text-based chat.
    -   `POST /api/v1/voice/upload`: Endpoint for uploading audio files.
    -   `WebSocket /ws/chat`: Real-time bidirectional communication for voice chat.

### Data Flow

1.  **User Input**:
    -   **Text**: Sent via REST API or WebSocket.
    -   **Voice**: Captured via microphone, streamed via WebSocket, or uploaded as a file.
2.  **Processing**:
    -   The backend receives the input.
    -   For voice, it may transcode or preprocess audio.
    -   The input is forwarded to the Qwen Omni model (running locally or via API).
3.  **Response**:
    -   The model generates a response (text + audio).
    -   The backend sends this back to the frontend.
    -   The frontend displays the text and plays the audio.

## 🛠️ Setup & Running

### Prerequisites

-   Node.js (for frontend)
-   Python 3.10+ (for backend)
-   Qwen Omni model weights (if running locally)

### 1. Start the Backend

Navigate to the voice service directory and start the server:

```bash
cd voice_service
# Install dependencies
pip install -r requirements.txt
# Run the server
python main.py
```

### 2. Start the Frontend

Navigate to the client directory and start the development server:

```bash
cd client
# Install dependencies
npm install
# Start the app
npm run dev
```

### 3. Accessing the Feature

1.  Open your browser at `http://localhost:5173` (or the port shown in your terminal).
2.  Click the mode selector in the top header.
3.  Select **"Qwen Omni"** from the dropdown menu.
4.  Start chatting!

## 📝 Notes

-   Ensure your microphone permissions are granted for voice chat.
-   Verify that the backend service is running on the correct port (default is usually `5004`).
-   Check the browser console for any connection errors if the chat isn't working.
-   use this to run the swagger "uvicorn voice_service.main:app --host 0.0.0.0 --port 5004"
