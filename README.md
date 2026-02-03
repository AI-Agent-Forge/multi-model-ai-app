# Multi-Modal AI Agent Web App

A production-ready AI chat application featuring real-time streaming, multi-modal capabilities (text, images, files), and persistent history. Powered by **Google Gemini 1.5 Flash**.

![Tech Stack](https://img.shields.io/badge/Stack-NERN-blue)
![License](https://img.shields.io/badge/License-ISC-green)

## Features
- 💬 **Real-time Chat**: Smooth token-by-token streaming response (SSE).
- 🧠 **Context Aware**: Remembers conversation history within a session.
- 📁 **Multi-modal**: Upload images or files for the AI to analyze.
- 📜 **History**: Persistent chat sessions stored in SQLite.
- 🎨 **Premium UI**: Glassmorphism design, Dark Mode, and Framer Motion animations.

## Prerequisites
- **Node.js** (v18 or higher)
- **Google Gemini API Key**: Get one [here](https://aistudio.google.com/app/apikey).

## Quick Start

### 1. Install Dependencies
Run from the root directory:
```bash
npm install
```

### 2. Configure Environment
1.  Navigate to `server/`:
    ```bash
    cd server
    ```
2.  Copy the example env:
    ```bash
    cp .env.example .env
    ```
3.  Open `.env` and add your API Key:
    ```env
    GEMINI_API_KEY=your_actual_api_key
    ```

### 3. Run the App
From the **root** directory:
```bash
npm run dev
```
This will start:
- **Server**: `http://localhost:5000`
- **Client**: `http://localhost:5173`

## Project Structure
- **`client/`**: React + Vite frontend application.
- **`server/`**: Express backend with Gemini Service and SQLite DB.
- **`shared/`**: Shared TypeScript types and Drizzle Schema.
- **`docs/`**: Detailed documentation.

## Documentation
For detailed architecture and data flow, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).


git config --global user.name "nagagovindarajan" && git config --global user.email "nagagovindarajan@gmail.com"
Now let's check the diff and commit the changes: