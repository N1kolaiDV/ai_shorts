from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from modules.processor import extract_keywords
from modules.asset_manager import AssetManager
import os

app = FastAPI()

# Permitir que React se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    texto: str

@app.post("/analyze")
async def analyze_text(request: VideoRequest):
    # 1. Extraer Keywords
    keywords = extract_keywords(request.texto)
    
    # 2. Buscar opciones de clips en Pexels (sin descargar aún)
    manager = AssetManager()
    options = {}
    for kw in keywords:
        # Necesitaremos modificar AssetManager para que devuelva URLs de preview
        options[kw] = manager.get_video_previews(kw) 
        
    return {"keywords": keywords, "clip_options": options}

@app.post("/generate")
async def generate_video(data: dict):
    # Aquí irá la lógica de renderizado final recibiendo los IDs de clips elegidos
    return {"status": "processing", "video_url": "/assets/output/final.mp4"}