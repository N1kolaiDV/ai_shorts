import asyncio
import edge_tts
import whisper
import json
import os

# Configuracion de voz: es-ES-AlvaroNeural es excelente y natural
VOICE = "es-ES-AlvaroNeural"

async def generate_audio(text, output_path="audio_final.mp3"):
    """Convierte texto a voz y lo guarda en un archivo mp3."""
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_path)
    if os.path.exists(output_path):
        return True
    return False

def get_word_timestamps(audio_path, output_json="timestamps.json"):
    """Analiza el audio y genera un JSON con el tiempo de cada palabra."""
    # Cargamos el modelo 'base' de Whisper (ligero y rapido para local)
    model = whisper.load_model("base")
    
    # Transcribimos activando los timestamps por palabra
    result = model.transcribe(audio_path, language="es", word_timestamps=True)
    
    words_data = []
    for segment in result['segments']:
        for word in segment['words']:
            words_data.append({
                "word": word['word'].strip().upper(),
                "start": word['start'],
                "end": word['end']
            })
    
    # Guardamos el resultado para que el VideoEngine lo use
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(words_data, f, indent=4, ensure_ascii=False)
    
    return words_data