import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str = ""

    model_config = SettingsConfigDict(env_file=("../.env", "../.env.local"), extra="ignore")

settings = Settings()
app = FastAPI(title="Fibra Core - Python Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Only local in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(api_key=settings.openai_api_key)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "fibra-python"}

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY no configurada en el microservicio Python")

    try:
        # UploadFile.file is a SpooledTemporaryFile
        audio_content = await audio.read()
        
        # We need to pass a tuple (filename, content, content_type) to OpenAI
        audio_file = (audio.filename or "audio.webm", audio_content, audio.content_type or "audio/webm")
        
        transcript = await client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            response_format="json"
        )
        
        text = transcript.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Whisper no devolvio texto para el audio enviado")
            
        return {"text": text}
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))
