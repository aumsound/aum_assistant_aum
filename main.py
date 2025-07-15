import os
import asyncio
import base64
import random
import string
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from dotenv import load_dotenv
import asyncpg

load_dotenv()

# --- CONFIGURATION ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
client = OpenAI(api_key=OPENAI_API_KEY)
AI_VOICE = "sage" #alloy, echo, fable, onyx, nova, and shimmer

with open("prompt.txt", "r", encoding="utf-8") as f:
    PROMPT_SYSTEM_MESSAGE = f.read()

# --- DATABASE SETUP ---
async def init_db():
    if DATABASE_URL:
        try:
            conn = await asyncpg.connect(DATABASE_URL)
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    session_code VARCHAR(20) UNIQUE NOT NULL,
                    conversation_log JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.close()
            print("✅ Database connected successfully")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
    else:
        print("⚠️  No DATABASE_URL found - running without database")

# --- FASTAPI APP ---
app = FastAPI()

@app.on_event("startup")
async def startup_event():
    await init_db()

def generate_session_code():
    chars = string.ascii_uppercase + string.digits
    return 'AUM-PASS-' + ''.join(random.choice(chars) for _ in range(4))

async def save_conversation(session_code, conversation_history):
    if DATABASE_URL:
        try:
            conn = await asyncpg.connect(DATABASE_URL)
            # Check if a record with this session_code already exists
            record = await conn.fetchrow('SELECT id FROM conversations WHERE session_code = $1', session_code)
            if record:
                await conn.execute(
                    'UPDATE conversations SET conversation_log = $1 WHERE session_code = $2',
                    json.dumps(conversation_history), session_code
                )
            else:
                await conn.execute(
                    'INSERT INTO conversations (session_code, conversation_log) VALUES ($1, $2)',
                    session_code, json.dumps(conversation_history)
                )
            await conn.close()
        except Exception as e:
            print(f"❌ Failed to save conversation: {e}")
    else:
        print(f"💬 Session {session_code}: Conversation not saved (no database)")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    session_code = generate_session_code()
    await websocket.send_json({"type": "session_code", "code": session_code})
    
    conversation_history = [{"role": "system", "content": PROMPT_SYSTEM_MESSAGE.replace("[PASS_CODE]", session_code)}]

    # --- Initial Greeting ---
    initial_greeting_text = "Hello. To generate your personal pass for AUM, I just need to ask a couple of questions. Are you ready?"
    conversation_history.append({"role": "assistant", "content": initial_greeting_text})
    
    response = client.audio.speech.create(
        model="tts-1", voice=AI_VOICE, input=initial_greeting_text
    )
    audio_base64 = base64.b64encode(response.content).decode('utf-8')
    await websocket.send_json({"type": "audio", "data": audio_base64})

    try:
        while True:
            # This is a simplified turn-based implementation
            # It waits for a complete audio message from the user
            data = await websocket.receive_bytes()
            
            # 1. Transcribe User's Audio
            transcript_path = "temp_transcript.webm"
            with open(transcript_path, "wb") as f:
                f.write(data)

            with open(transcript_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                )
            user_text = transcript.text
            conversation_history.append({"role": "user", "content": user_text})
            print(f"User said: {user_text}")

            # 2. Get AI Response
            ai_response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=conversation_history
            )
            ai_text = ai_response.choices[0].message.content
            conversation_history.append({"role": "assistant", "content": ai_text})
            print(f"AI said: {ai_text}")

            # 3. Convert AI Response to Speech
            response_audio = client.audio.speech.create(
                model="tts-1", voice=AI_VOICE, input=ai_text
            )
            audio_base64 = base64.b64encode(response_audio.content).decode('utf-8')
            
            # 4. Send Audio Response to Client
            await websocket.send_json({"type": "audio", "data": audio_base64})
            
            # 5. Save conversation log
            asyncio.create_task(save_conversation(session_code, conversation_history))

    except WebSocketDisconnect:
        print(f"Client disconnected. Session: {session_code}")
    except Exception as e:
        print(f"An error occurred: {e}")

# Mount the static directory to serve HTML, CSS, JS
app.mount("/", StaticFiles(directory="static", html=True), name="static") 