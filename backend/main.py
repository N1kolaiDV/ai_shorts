import os, time, shutil, traceback, asyncio, re, io, random
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import core.sprite_controller as sprite_controller
import gc
from core.profile_manager import load_profile
import torch
import requests


# Módulos propios
from modules.voice_engine import generate_audio, get_word_timestamps
from modules.asset_manager import AssetManager
from modules.processor import extract_keywords
from modules.video_engine import VideoEngine

app = FastAPI(title="AI Shorts API")

# --- CONFIGURACIÓN Y RUTAS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
JOBS_DIR = os.path.join(ASSETS_DIR, "jobs")
DOCS_OUTPUT_BASE = os.path.join(os.path.expanduser("~"), "Documents", "AI_Shorts_Finals")
API_URL = "http://127.0.0.1:8000"

# ----- N8N -----
N8N_WEBHOOK_URL = "http://localhost:5678/webhook/video-listo" 

# Asegurar directorios base
for d in [ASSETS_DIR, JOBS_DIR, DOCS_OUTPUT_BASE]:
    os.makedirs(d, exist_ok=True)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Estado global
export_progress = {"status": "esperando", "percent": 0, "final_url": None}

# --- UTILIDADES ---
def sanitize_filename(name: str, fallback: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_\-]+", "_", str(name or "").strip())
    return name.strip("_") or fallback

def group_timestamps(raw_timestamps):
    print(f"📦 Agrupando {len(raw_timestamps)} timestamps en segmentos de frases...")
    segments, temp_words = [], []
    for i, w in enumerate(raw_timestamps):
        temp_words.append(w)
        is_last = i == len(raw_timestamps) - 1
        gap = False if is_last else (raw_timestamps[i+1]["start"] - w["end"]) > 0.3
        has_punct = any(p in w["raw_word"] for p in {".", "!", "?", ","})
        duration = temp_words[-1]["end"] - temp_words[0]["start"]

        if gap or (has_punct and duration > 1.2) or duration > 3.5 or is_last:
            segments.append({
                "phrase": " ".join([x["word"] for x in temp_words]),
                "start": temp_words[0]["start"],
                "end": temp_words[-1]["end"],
                "words": list(temp_words)
            })
            temp_words = []
    print(f"✅ Segmentación finalizada: {len(segments)} frases creadas.")
    return segments

async def process_row(text, profile, title, keywords_override, job_id, job_path, output_dir, layout_override=None):
    success = False
    try:
        print(f"\n🚀 Iniciando procesamiento de fila | Job ID: {job_id}")
        sprite_controller._last_pose = None 
        gc.collect()

        # --- CARGA DE PERFIL Y CONFIGURACIÓN DE VOZ ---
        prof_data = load_profile(profile)
        voice_model = prof_data.get("voice_model", "es_ES-sharvard-medium")
        # Extraemos el estilo específico de ElevenLabs del JSON
        el_style = prof_data.get("elevenlabs_style", {})
        
        # 1. Rutas
        audio_dir = os.path.join(job_path, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        voice_path = os.path.join(audio_dir, "voice.wav")

        # 2. Audio (Pasando el modelo y el estilo del perfil)
        print(f"🎙️ Generando audio con modelo [{voice_model}] para: '{text[:50]}...'")
        
        # Pasamos el el_style como kwarg para que la API de ElevenLabs lo reciba
        audio_path = await generate_audio(
            text, 
            voice=voice_model, 
            save_path=voice_path, 
            elevenlabs_style=el_style
        )
        
        if not audio_path or not os.path.exists(audio_path):
            raise RuntimeError(f"Error: El audio no se generó en {voice_path}")
        print(f"🔊 Audio generado con éxito en: {audio_path}")

        # 3. Timestamps
        print(f"⏱️ Obteniendo timestamps de las palabras...")
        raw_ts = get_word_timestamps(audio_path, job_path, text)
        segments = group_timestamps(raw_ts)
        manager = AssetManager(profile_name=profile, job_id=job_id)

        # 4. Clips
        kw_override = (keywords_override or "").strip().replace(";", ",")
        clips = []
        print(f"🎬 Buscando y descargando {len(segments)} clips de video...")
        for j, seg in enumerate(segments):
            duracion_segmento = seg["end"] - seg["start"] + 0.5
            kw = kw_override if kw_override else extract_keywords(seg["phrase"])
            print(f"🔍 Búsqueda {j+1}/{len(segments)} | Keywords: {kw}")
            options = manager.search_stock_videos(kw)
            if options:
                chosen = random.choice(options[:5])
                p = manager.download_from_url(chosen["download_link"], f"clip_{j}", job_path, duration=duracion_segmento)
                if p: 
                    clips.append(os.path.abspath(p))
                    print(f"   📥 Clip {j+1} descargado.")

        # 5. Renderizado
        print(f"🏗️ Iniciando ensamblaje de video (Render)...")
        out_temp_dir = os.path.join(job_path, "output")
        os.makedirs(out_temp_dir, exist_ok=True)
        out_temp = os.path.join(out_temp_dir, "final_render.mp4")

        engine = VideoEngine(output_path=out_temp)
        engine.assemble_video(
            clip_paths=clips, 
            audio_path=os.path.abspath(audio_path), 
            segments=segments, 
            profile_name=profile, 
            job_path=job_path,
            layout_mode=layout_override
        )

        safe_title = sanitize_filename(title, fallback=f"video_{job_id}")
        final_path = os.path.join(output_dir, f"{safe_title}.mp4")
        os.makedirs(output_dir, exist_ok=True)
        
        shutil.copy2(out_temp, final_path)
        print(f"✨ VIDEO FINALIZADO Y GUARDADO EN: {final_path}")
        
        success = True
        
        # ESTE ES EL AVISO PARA N8N
        payload = {
            "job_id": job_id,
            "status": "completed",
            "file_path": os.path.abspath(final_path), # Ruta absoluta para que n8n la encuentre
            "title": title,
            "profile": profile
        }
        
        try:
            # Enviamos el aviso al Webhook de n8n
            response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=10)
            print(f"📡 Aviso enviado a n8n: {response.status_code}")
        except Exception as e:
            print(f"⚠️ n8n no respondió al aviso final: {e}")
            
        return final_path

    except Exception as e:
        print(f"❌ Error crítico procesando fila: {str(e)}")
        traceback.print_exc()
        success = False
        raise e
    finally:
        sprite_controller._last_pose = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        if success:
            try:
                # Un pequeño delay para asegurar que los archivos no estén bloqueados por FFmpeg
                time.sleep(2)
                shutil.rmtree(job_path, ignore_errors=True)
                print(f"🧹 Limpieza completada para el trabajo {job_id}")

            except Exception as e:
                print(f"⚠️ No se pudo eliminar la carpeta temporal: {e}")

# --- ENDPOINTS ---
@app.post("/analyze")
async def analyze_text(request: dict):
    print(f"\n🔍 Recibida petición de análisis de texto.")
    profile, texto = request.get("profile"), request.get("texto", "")
    if not texto: raise HTTPException(400, "Texto vacío")

    # Obtener voz del perfil
    prof_data = load_profile(profile)
    voice_model = prof_data.get("voice_model", "es_ES-sharvard-medium")

    job_id = f"manual_{int(time.time())}"
    job_path = os.path.join(JOBS_DIR, job_id)
    os.makedirs(os.path.join(job_path, "audio"), exist_ok=True)

    print(f"🛠️ Generando previsualización con voz: {voice_model}")
    audio_path = await generate_audio(texto, voice=voice_model, save_path=os.path.join(job_path, "audio", "voice.wav"))
    
    raw_ts = get_word_timestamps(audio_path, job_path, texto)
    segments = group_timestamps(raw_ts)

    manager = AssetManager(profile_name=profile)
    kw_data = [{"keyword": extract_keywords(s["phrase"]), "phrase": s["phrase"], 
                "options": manager.search_stock_videos(extract_keywords(s["phrase"]))} for s in segments]

    return {"status": "success", "job_id": job_id, "segments": segments, "keywords_data": kw_data}


@app.post("/export")
async def export_video(request: dict, background_tasks: BackgroundTasks):
    job_id = request["job_id"]
    selections = request["selections"]
    segments = request["timestamps"]
    profile = request.get("profile")
    
    # --- AQUÍ CAPTURAMOS LAS VARIABLES DEL REQUEST ---
    preset_from_front = request.get("preset")
    position_from_front = request.get("position")
    
    prof_data = load_profile(profile) or {}
    voice_model = prof_data.get("voice_model", "es_ES-sharvard-medium")

    async def run_export():
        success = False
        job_path = os.path.join(JOBS_DIR, job_id)
        try:
            export_progress.update({"status": "Descargando clips seleccionados...", "percent": 10})
            manager = AssetManager(profile_name=profile)
            
            clips = []
            for i, (seg_idx, url) in enumerate(selections.items()):
                print(f"📥 Descargando clip seleccionado {i+1}/{len(selections)}...")
                seg_data = segments[int(seg_idx)]
                duracion_segmento = seg_data["end"] - seg_data["start"] + 0.2
                p = manager.download_from_url(url, f"clip_{i}", job_path, duration=duracion_segmento)
                if p: clips.append(p)

            export_progress.update({"status": "Renderizando video final...", "percent": 50})
            print(f"🎬 Llamando al motor de video (VideoEngine)...")
            
            out_dir = os.path.join(job_path, "output")
            os.makedirs(out_dir, exist_ok=True)
            out_temp = os.path.join(out_dir, "final.mp4")

            await asyncio.to_thread(
                VideoEngine(output_path=out_temp).assemble_video,
                clip_paths=clips, 
                audio_path=os.path.join(job_path, "audio", "voice.wav"), 
                segments=segments, 
                profile_name=profile, 
                job_path=job_path,
                preset_from_front=preset_from_front,
                position_from_front=position_from_front
            )

            final_path = os.path.join(DOCS_OUTPUT_BASE, "Manual", f"video_{job_id}.mp4")
            os.makedirs(os.path.dirname(final_path), exist_ok=True)
            shutil.copy2(out_temp, final_path)
            
            print(f"✅ Exportación manual terminada: {final_path}")
            success = True
            export_progress.update({"status": "¡Completado!", "percent": 100, "final_url": f"file://{final_path}"})
        except Exception as e:
            print(f"❌ Error en exportación: {e}")
            export_progress.update({"status": f"Error: {str(e)}", "percent": 0})
        finally:
            if success:
                time.sleep(1.5)
                shutil.rmtree(job_path, ignore_errors=True)

    background_tasks.add_task(run_export)
    return {"message": "Exportación iniciada"}

@app.post("/batch")
async def batch_process(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    print(f"\n📂 Petición BATCH recibida. Leyendo archivo CSV...")
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content), sep=None, engine='python').rename(columns=lambda x: x.strip().lower())
        df = df.dropna(subset=['texto']) 
        print(f"📊 CSV cargado correctamente: {len(df)} filas válidas encontradas.")
    except Exception as e: 
        print(f"❌ Error al leer el CSV: {e}")
        raise HTTPException(400, "CSV inválido")
    
    async def run_batch():
        global export_progress
        for i, row in df.iterrows():
            print(f"\n--- Procesando fila {i+1} de {len(df)} ---")
            text = str(row.get("texto", "")).strip()
            if not text:
                print(f"⚠️ Fila {i+1} saltada (texto vacío).")
                continue
            
            layout_val = row.get("layout")
            layout_val = str(layout_val).strip() if pd.notna(layout_val) and str(layout_val).strip() != "" else None
            job_id = f"batch_{int(time.time())}_{i}"
            
            try:
                await process_row(
                    text=text, 
                    profile=row.get("profile"), 
                    title=row.get("titulo"),
                    keywords_override=row.get("keywords"), 
                    job_id=job_id,
                    job_path=os.path.join(JOBS_DIR, job_id), 
                    output_dir=os.path.join(DOCS_OUTPUT_BASE, "Batch"),
                    layout_override=layout_val
                )
                print(f"✅ Fila {i+1} completada con éxito.")
            except Exception as e:
                print(f"❌ Error procesando fila {i+1}: {e}")

            export_progress.update({
                "status": f"Batch: {i+1}/{len(df)}", 
                "percent": int(((i + 1) / len(df)) * 100)
            })
        print(f"\n🏁 PROCESO BATCH FINALIZADO.")

    background_tasks.add_task(run_batch)
    return {"message": "Batch iniciado", "rows": len(df)}

@app.post("/process-single")
async def process_single(request: dict, background_tasks: BackgroundTasks):
    """
    Recibe los datos de un solo video y lo procesa.
    """
    text = request.get("texto")
    profile = request.get("profile")
    title = request.get("titulo")
    keywords = request.get("keywords")
    layout = request.get("layout")

    if not text:
        raise HTTPException(400, "Falta el texto del video")

    job_id = f"n8n_{int(time.time())}"
    job_path = os.path.join(JOBS_DIR, job_id)
    output_dir = os.path.join(DOCS_OUTPUT_BASE, "n8n_Automation")

    # Lanzamos el proceso que ya tienes definido en background
    background_tasks.add_task(
        process_row,
        text=text,
        profile=profile,
        title=title,
        keywords_override=keywords,
        job_id=job_id,
        job_path=job_path,
        output_dir=output_dir,
        layout_override=layout
    )

    return {"status": "Procesamiento iniciado", "job_id": job_id, "title": title}


@app.get("/export-status")
async def get_status(): 
    return export_progress

# --- STATIC FILES ---
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
if os.path.exists(os.path.join(BASE_DIR, "frontend_dist")):
    app.mount("/", StaticFiles(directory=os.path.join(BASE_DIR, "frontend_dist"), html=True), name="ui")

if __name__ == "__main__":
    import uvicorn
    print("🛰️ Servidor AI Shorts iniciando en http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)