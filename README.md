# 🤖 ULTRON — Autonomous AI Interface

A sci-fi JARVIS/Ultron-inspired personal AI assistant web application powered by **FastAPI**, **Google Gemini AI**, and **Angular 19** with real-time WebSocket token streaming, HUD boot sequence, and Web Speech voice synthesis.

---

## ⚡ Quick Start Guide (For Complete Beginners)

Follow these simple steps to launch Ultron on your machine:

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

---

### 2. Start the Backend Server

1. Open a new Terminal / PowerShell window.
2. Navigate to the backend directory:
   ```powershell
   cd C:\Users\HP\.gemini\antigravity\scratch\ultron-ai\backend
   ```
3. Activate the Python virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
4. Confirm your Gemini API Key is in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=8000
   ```
5. Launch the backend server:
   ```powershell
   uvicorn main:app --reload --port 8000
   ```
   *The backend will be running at `http://127.0.0.1:8000` (API Docs at `http://127.0.0.1:8000/docs`).*

---

### 3. Start the Frontend Application

1. Open a second Terminal / PowerShell window.
2. Navigate to the frontend directory:
   ```powershell
   cd C:\Users\HP\.gemini\antigravity\scratch\ultron-ai\frontend
   ```
3. Start the Angular development server:
   ```powershell
   npm.cmd start
   ```
4. Open your browser and go to:
   **[http://localhost:4200](http://localhost:4200)**

---

## 🚀 Key Features

- **HUD Arc-Reactor Boot Loader**: Sequential diagnostic initialization screen.
- **Real-Time Token Streaming**: Real-time token delivery via WebSocket link (`/ws/chat`).
- **Dark Sci-Fi Theme**: `#0a0a0f` deep dark background with glowing `#ff3b1f` & `#ff5c00` accents, CRT scanlines, and Orbitron monospace HUD typography.
- **Voice Mode**: Browser Web Speech recognition (mic input) and SpeechSynthesis (deep sci-fi TTS output).
- **Tactical Command Modules**:
  - `SYSTEM STATUS`: Core bandwidth and capabilities overview.
  - `THREAT ASSESSMENT`: Tactical risk analysis and strategic forecasting.
  - `TASK LOG`: Local chronological conversation audit trail.
- **Config Deck**: Controls for auto-speech, streaming pacing delay, and memory purge.
