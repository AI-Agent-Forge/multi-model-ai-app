# Product Requirements Document (PRD): AI Multi-Modal Agent Web App

**Version:** 1.0
**Status:** Draft
**Tech Stack:** React, Express.js, TypeScript, Tailwind CSS

## 1. Project Overview

We are building a high-fidelity, responsive AI Agent interface. The application serves as a central hub where users interact with an AI capable of handling multi-modal inputs (Text, Audio, Image, Video) and generating complex multi-modal outputs (Markdown, Charts, Media, Audio).

**Design Philosophy:**

* **Premium:** Generous whitespace, subtle borders, glassmorphism effects, high-quality typography (e.g., Inter or Geist Sans), and smooth micro-interactions.
* **Simple:** Minimal cognitive load. The focus is strictly on the content.

---

## 2. Core Layout & Architecture

The app follows a standard "Chat Shell" layout but must be responsive.

### 2.1 The Sidebar (Left)

* **Function:** Holds chat history and session management.
* **Behavior:**
* Fixed width on desktop (e.g., `w-64`), collapsible on mobile (Hamburger menu).
* **"New Chat" Button:** Prominent, sticky at the top.
* **History List:** Chronological list of previous sessions. Grouped by "Today", "Yesterday", "Previous 7 Days".
* **Actions:** Hovering over a history item reveals "Rename" and "Delete" icons.



### 2.2 The Main Chat Window (Center/Right)

* **Function:** The active workspace.
* **Behavior:**
* Scrollable container for the message stream.
* Sticky "Input Omnibar" at the bottom.
* **Empty State:** When a new chat starts, show a centered, welcoming logo with 3-4 "starter prompt" cards (e.g., "Generate a video about space").



---

## 3. Feature Specifications

### 3.1 The "Omnibar" (Input Area)

The input area is the control center. It must feel powerful yet uncluttered.

* **Text Input:** Auto-expanding textarea (rows 1 to 6). Supports `Shift+Enter` for new lines.
* **Attachment Handling:**
* **Icon:** A paperclip or generic `+` icon.
* **File Support:** Images (`.png`, `.jpg`), Videos (`.mp4`), Documents (`.pdf` - context only).
* **Preview:** When a file is selected, show a small thumbnail above the text bar with an "X" to remove it.


* **Voice Note Recorder:**
* **Icon:** Microphone.
* **Interaction:** Click to start recording -> UI changes to a waveform visualizer -> Click stop to send.
* **Tech:** Use the MediaStream Recording API.



### 3.2 The Message Stream (Outputs)

This is the most complex part of the UI. The message bubble component must be polymorphic (able to render different types of content based on the data received).

#### A. User Message Bubble

* Right-aligned.
* Distinct background color (e.g., Primary Brand Color).
* Shows text and any media attachments sent.

#### B. AI Response Bubble

* Left-aligned.
* Neutral background (e.g., `bg-gray-100` or `bg-zinc-800` for dark mode).
* **Streaming Text:** Text should appear via a "Typewriter effect" as tokens arrive from the server.

#### C. Special Output Types (The "Premium" Features)

1. **Markdown Rendering:**
* Headers, lists, bold/italics.
* **Code Blocks:** Must have syntax highlighting (use `react-syntax-highlighter`) and a "Copy to Clipboard" button.


2. **Data Visualization (Charts):**
* If the AI returns data struct for a chart, render it using **Recharts** or **Tremor**.
* **Pie Chart:** For distribution data.
* **Bar Chart:** For comparison data.
* *Requirement:* Charts must be interactive (tooltips on hover).


3. **Generated Media (Image/Video):**
* **Loading State:** While generating, show a shimmering skeleton loader or a progress ring.
* **Display:** Rounded corners, click to expand (Lightbox view).
* **Video:** Custom video player controls (Play/Pause/Download), avoid default browser controls for a premium look.


4. **Audio Response:**
* If the message contains an audio buffer/URL (translation/TTS).
* **UI:** Do not use the default `<audio>` tag. Build a custom player with a Play/Pause button and a visual progress bar (waveform style is preferred).



---

## 4. Technical Requirements for Engineering

### 4.1 Frontend (React + TS + Tailwind)

* **State Management:** Use **Zustand** or **Redux Toolkit** for managing chat history and global settings.
* **Data Fetching:** Use **React Query (TanStack Query)**. This is crucial for handling loading states, caching history, and optimistic updates.
* **Styling:**
* Use `clsx` or `tailwind-merge` for dynamic class handling.
* Define a `colors` object in `tailwind.config.js` for semantic naming (e.g., `bg-chat-bubble-user` instead of `bg-blue-500`).


* **Icons:** Use **Lucide React** or **Heroicons** for clean, consistent SVG icons.

### 4.2 Backend (Express + TS)

* **API Structure:** RESTful API.
* **Streaming:** Implement Server-Sent Events (SSE) or WebSockets for the AI text streaming.
* **File Uploads:** Use `Multer`. Store files in cloud storage (AWS S3 or Cloudinary) and return the URL to the frontend.
* **Database:** (Assuming MongoDB or PostgreSQL)
* `Session` Model: ID, UserID, Timestamp.
* `Message` Model: ID, SessionID, Sender (User/AI), Type (Text/Img/Video/Chart), Content (Text or JSON or URL).



---

## 5. UI/UX "Premium" Checklist (The Polish)

* **Dark Mode Support:** The app must support system preference toggling.
* **Scroll-to-bottom:** When a new message arrives, smooth scroll to the bottom. If the user is scrolled up reading history, do *not* force scroll down (show a "New message ↓" badge instead).
* **Glassmorphism:** Use `backdrop-blur-md` and semi-transparent backgrounds on the Sidebar and Top Navigation for a modern feel.
* **Feedback:** Toast notifications (using `sonner` or `react-hot-toast`) for success (e.g., "Link copied") or errors (e.g., "Generation failed").

---

### Suggested Project Structure

```text
/src
  /components
    /chat
      ChatWindow.tsx
      MessageBubble.tsx
      InputOmnibar.tsx
      /attachments
        AudioPlayer.tsx
        ChartRenderer.tsx  <-- Handles Pie/Bar logic
        CodeBlock.tsx
    /layout
      Sidebar.tsx
      AppLayout.tsx
  /hooks
    useChatStream.ts       <-- Custom hook for SSE
    useAudioRecorder.ts
  /types
    index.ts               <-- Shared TS interfaces

```

---

### Action Plan for Engineer

1. **Setup:** Initialize Repo with Vite + React + TS + Tailwind.
2. **Layout:** Build the responsive Shell (Sidebar + Main area).
3. **Chat Logic:** Implement basic text sending/receiving loop.
4. **Components:** Build the "Message Bubble" variants (Markdown, Image, Chart).
5. **Integration:** Connect to Express backend for streaming responses.
6. **Polish:** Add animations (Framer Motion recommended) and Dark Mode.
