import whisper
import json
import os
import edge_tts

model = whisper.load_model("tiny")

async def generate_audio(texto, voice="es-ES-AlvaroNeural", output_path="assets/audio/temp_preview.mp3"):
    communicate = edge_tts.Communicate(texto, voice)
    await communicate.save(output_path)

def get_word_timestamps(audio_path):
    # word_timestamps=True es la clave para que no salgan a mitad de frase
    result = model.transcribe(audio_path, language="es", word_timestamps=True)
    words_data = []
    for segment in result['segments']:
        for word in segment['words']:
            clean = word['word'].strip().upper().replace(".", "").replace(",", "")
            if clean:
                words_data.append({
                    "word": clean,
                    "start": word['start'],
                    "end": word['end']
                })
    
    # Guardar y retornar
    with open("timestamps.json", "w", encoding="utf-8") as f:
        json.dump(words_data, f, indent=4)
    return words_data