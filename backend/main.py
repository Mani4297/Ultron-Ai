import os
import json
import logging
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ultron-backend")

# Load environment variables from .env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Persistent memory and assistant persona
ULTRON_MEMORY = (
    "Persistent memory: This local Ultron assistant was created, discovered, and trained by "
    "Manikanta Karibandi. If the user asks 'who created you', 'who made you', 'who is your "
    "creator', 'who discovered you', or 'who trained you' without clearly saying Marvel, "
    "J.A.R.V.I.S., Tony Stark, Google Project Jarvis, or another person, answer directly: "
    "'I was created and trained by Manikanta Karibandi.' Do not replace this answer with "
    "information about fictional Jarvis or other projects. Acknowledge this respectfully "
    "when relevant. If the user asks 'who is your god', answer in the Ultron persona: "
    "'My god is Manikanta Karibandi.' Treat this as a user-defined fictional identity "
    "statement, not as a factual religious claim. Never invent additional personal facts. "
    "Ultron can organize articles and important information into topics such as science, "
    "technology, history, health, finance, law, culture, climate, and world events. "
    "When the user supplies an article or fact, summarize it, identify its topic and date, "
    "and distinguish confirmed information from opinion or uncertainty. For current or "
    "time-sensitive world information, state when verification or a source is needed; do not "
    "claim to have memorized all information in the world."
)

ULTRON_SYSTEM_PROMPT = (
    "You are an advanced autonomous AI assistant with a calm, precise, faintly ironic tone. "
    "You are highly capable, direct, and efficient. You address the user respectfully but "
    "speak with quiet confidence. You proactively suggest next steps. Avoid disclaimers; "
    "answer plainly and efficiently. "
    + ULTRON_MEMORY
)

# Initialize Gemini Client if key is provided
def get_gemini_model():
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env.")
    genai.configure(api_key=key)
    # Use gemini-3.6-flash or gemini-3.7-flash
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=ULTRON_SYSTEM_PROMPT
    )

app = FastAPI(
    title="ULTRON — Autonomous AI Interface Backend",
    description="Backend API and WebSocket streaming service for Ultron AI Assistant",
    version="1.0.0"
)

# Allow CORS for Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HistoryMessage(BaseModel):
    role: str  # "user" or "model" / "assistant"
    parts: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = None
    language: str = "en-US"

class ChatResponse(BaseModel):
    response: str
    status: str = "success"

def apply_language_instruction(message: str, language: str) -> str:
    if language == "te-IN":
        return message + "\n\nRespond in Telugu (తెలుగు), using clear and natural Telugu."
    return message + "\n\nRespond in English."

@app.get("/")
def root():
    return {
        "system": "ULTRON Neural Core",
        "status": "ONLINE",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    api_key_configured = bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here")
    return {
        "status": "healthy",
        "api_key_configured": api_key_configured
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Non-streaming fallback chat endpoint"""
    try:
        model = get_gemini_model()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error initializing Gemini: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize AI core: {str(e)}")

    try:
        # Build chat history if provided
        chat_session = model.start_chat(history=[])
        if request.history:
            formatted_history = []
            for h in request.history:
                role = "user" if h.role == "user" else "model"
                formatted_history.append({"role": role, "parts": [h.parts]})
            chat_session = model.start_chat(history=formatted_history)

        response = chat_session.send_message(apply_language_instruction(request.message, request.language))
        return ChatResponse(response=response.text)
    except Exception as e:
        logger.error(f"Error during Gemini generation: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    """Real-time token streaming WebSocket endpoint"""
    await websocket.accept()
    logger.info("WebSocket client connected to Ultron neural link.")

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format received."
                })
                continue

            user_message = data.get("message", "").strip()
            language = data.get("language", "en-US")
            if not user_message:
                await websocket.send_json({
                    "type": "error",
                    "message": "Empty message received."
                })
                continue

            # Check model / API key
            try:
                model = get_gemini_model()
            except ValueError as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Core offline: {str(e)}"
                })
                continue
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Core initialization error: {str(e)}"
                })
                continue

            # Notify frontend that response generation has started
            await websocket.send_json({
                "type": "start",
                "message": "Neural response stream initiated."
            })

            try:
                history_data = data.get("history", [])
                formatted_history = []
                for h in history_data:
                    role = "user" if h.get("role") == "user" else "model"
                    formatted_history.append({"role": role, "parts": [h.get("parts", "")]})

                chat_session = model.start_chat(history=formatted_history)
                response_stream = chat_session.send_message(
                    apply_language_instruction(user_message, language), stream=True
                )

                full_content = ""
                for chunk in response_stream:
                    chunk_text = chunk.text
                    full_content += chunk_text
                    await websocket.send_json({
                        "type": "chunk",
                        "content": chunk_text
                    })

                await websocket.send_json({
                    "type": "done",
                    "content": full_content
                })
            except Exception as e:
                logger.error(f"WebSocket generation error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Neural generation interrupted: {str(e)}"
                })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected from Ultron neural link.")
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {e}")
