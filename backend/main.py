import os
import time
import shutil
import json
import traceback
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Parche para versiones nuevas de Pillow
import PIL.Image
if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

from modules.voice_engine import generate_audio, get_word_timestamps
from modules.asset_manager import AssetManager
from modules.processor import extract_keywords
from modules.video_engine import VideoEngine

app = FastAPI()

# Variable global para rastrear el progreso
export_progress = {"status": "esperando", "percent": 0}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de directorios
dirs = ["assets/audio", "assets/clips", "assets/output"]
for d in dirs:
    os.makedirs(d, exist_ok=True)

app.mount("/assets", StaticFiles(directory="assets"), name="assets")

class TextRequest(BaseModel):
    texto: str
    voice: str = "es-ES-AlvaroNeural"

@app.get("/export-status")
async def get_next_status():
    return export_progress

@app.post("/analyze")
async def analyze_text(request: TextRequest):
    try:
        keywords = extract_keywords(request.texto)
        audio_path = os.path.join("assets", "audio", "temp_preview.mp3")
        await generate_audio(request.texto, voice=request.voice, output_path=audio_path)
        timestamps = get_word_timestamps(audio_path) 

        manager = AssetManager()
        keywords_data = []
        for kw in keywords:
            options = manager.search_stock_videos(kw) 
            keywords_data.append({"keyword": kw, "options": options})

        return {
            "keywords_data": keywords_data,
            "timestamps": timestamps
        }
    except Exception as e:
        print(f"ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# --- FUNCIÓN DE PROCESAMIENTO EN SEGUNDO PLANO ---
def run_video_export(data: dict):
    global export_progress
    try:
        print("\n" + "="*50)
        print(">>> INICIANDO HILO DE EXPORTACIÓN")
        print("="*50)

        # 1. Preparación
        selections = data.get("selections", {})
        timestamps = data.get("timestamps", [])
        ruta_personal = data.get("output_path")
        
        def update_render_progress(val):
            global export_progress
            export_progress = {"status": "Renderizando video...", "percent": val}

        # 2. Fase de Descarga (10% - 45%)
        export_progress = {"status": "Descargando clips...", "percent": 10}
        manager = AssetManager()
        local_clips = []
        items = list(selections.items())
        
        for i, (kw, url) in enumerate(items):
            prog = 10 + int((i / len(items)) * 35)
            export_progress = {"status": f"Bajando: {kw}", "percent": prog}
            print(f"[*] {kw} ({prog}%)")
            path = manager.download_from_url(url, i)
            if path: local_clips.append(os.path.abspath(path))

        # 3. Fase de Render (50% - 95%)
        print("[*] Iniciando motor MoviePy...")
        audio_path = os.path.abspath("assets/audio/temp_preview.mp3")
        output_file = os.path.abspath("assets/output/temp_video.mp4")
        
        engine = VideoEngine(output_path=output_file)
        # El callback actualizará 'export_progress' automáticamente
        engine.assemble_video(local_clips, audio_path, timestamps, progress_callback=update_render_progress)

        # 4. Fase Final (95% - 100%)
        export_progress = {"status": "Guardando resultado...", "percent": 96}
        if not os.path.exists(ruta_personal):
            os.makedirs(ruta_personal, exist_ok=True)
            
        final_dest = os.path.join(ruta_personal, f"Short_{int(time.time())}.mp4")
        shutil.copy(output_file, final_dest)
        
        print(f"[SUCCESS] Video exportado a: {final_dest}")
        export_progress = {"status": "¡Listo!", "percent": 100}

    except Exception as e:
        print(f"\n[ERROR EN HILO] {str(e)}")
        traceback.print_exc()
        export_progress = {"status": f"Error: {str(e)}", "percent": 0}

@app.post("/export")
async def export_video(data: dict, background_tasks: BackgroundTasks):
    global export_progress
    # Reiniciamos el estado
    export_progress = {"status": "Iniciando proceso...", "percent": 1}
    
    # Agregamos la tarea pesada al background para no bloquear el servidor
    background_tasks.add_task(run_video_export, data)
    
    # Respondemos inmediatamente al frontend
    return {"message": "Exportación iniciada en segundo plano"}

if __name__ == "__main__":
    import uvicorn
    # Usamos 0.0.0.0 para evitar problemas de resolución de nombres locales
    uvicorn.run(app, host="0.0.0.0", port=8000)