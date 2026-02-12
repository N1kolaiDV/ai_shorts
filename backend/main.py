import asyncio
import os
import json
from modules.voice_engine import generate_audio, get_word_timestamps
from modules.asset_manager import AssetManager
from modules.video_engine import VideoEngine
from modules.processor import extract_keywords

# Configuracion de entorno
os.environ["IMAGEMAGICK_BINARY"] = r"C:\Program Files\ImageMagick-6.9.13-Q16-HDRI\convert.exe"

async def crear_short_completo(texto):
    # Definicion de rutas
    audio_path = os.path.join("assets", "audio", "audio_final.mp3")
    json_path = "timestamps.json"
    clips_dir = os.path.join("assets", "clips")
    output_path = os.path.join("assets", "output", "mi_primer_short.mp4")

    # Asegurar existencia de directorios
    for folder in ["assets/audio", "assets/clips", "assets/output"]:
        os.makedirs(folder, exist_ok=True)

    # Paso 1: Analisis de texto y keywords
    print("Analizando texto y extrayendo keywords...")
    keywords = extract_keywords(texto)
    print(f"Keywords detectadas: {keywords}")

    # Paso 2: Generacion de audio
    print("Generando audio...")
    await generate_audio(texto) 
    # Mover el archivo generado a la ruta correcta si generate_audio no lo hace
    if os.path.exists("audio_final.mp3"):
        os.replace("audio_final.mp3", audio_path)

    # Paso 3: Sincronizacion de palabras (Whisper)
    print("Sincronizando timestamps...")
    get_word_timestamps(audio_path)

    # Paso 4: Descarga de videos de stock
    print("Descargando clips de video...")
    manager = AssetManager()
    # Limpiar clips anteriores para evitar mezclar contenido
    for f in os.listdir(clips_dir):
        os.remove(os.path.join(clips_dir, f))
        
    for i, kw in enumerate(keywords):
        manager.download_stock_video(kw, i)

    # Paso 5: Montaje y renderizado
    print("Renderizando video final...")
    engine = VideoEngine(
        audio_path=audio_path, 
        timestamps_path=json_path, 
        clips_dir=clips_dir
    )
    engine.assemble_video(output_path)
    
    print(f"Proceso finalizado. Archivo disponible en: {output_path}")

if __name__ == "__main__":
    guion_usuario = "La inteligencia artificial esta transformando la forma en que programamos software hoy en dia."
    asyncio.run(crear_short_completo(guion_usuario))