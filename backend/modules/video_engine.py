import os
import json
import PIL.Image
# Parche de compatibilidad Pillow
if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.LANCZOS

from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, AudioFileClip

# Configuracion de ImageMagick
os.environ["IMAGEMAGICK_BINARY"] = r"C:\Program Files\ImageMagick-6.9.13-Q16-HDRI\convert.exe"

class VideoEngine:
    def __init__(self, audio_path, timestamps_path, clips_dir):
        self.audio_path = audio_path
        self.clips_dir = clips_dir
        with open(timestamps_path, 'r', encoding='utf-8') as f:
            self.word_timestamps = json.load(f)

    def create_subtitle_clip(self, word_data):
        duration = word_data['end'] - word_data['start']
        if duration <= 0: duration = 0.1
        
        return (TextClip(word_data['word'], 
                         fontsize=110, 
                         color='yellow', 
                         font='Arial-Bold', 
                         stroke_color='black', 
                         stroke_width=2,
                         method='caption',
                         size=(900, None))
                .set_start(word_data['start'])
                .set_duration(duration)
                .set_position(('center', 1400))) # Un poco más abajo del centro

    def assemble_video(self, output_path):
        # 1. Cargar Audio
        audio = AudioFileClip(self.audio_path)
        video_duration = audio.duration
        print(f"Duración del audio detectada: {video_duration}s")
        
        # 2. Cargar y Procesar Clips de Fondo
        clips_files = [os.path.join(self.clips_dir, f) for f in os.listdir(self.clips_dir) if f.endswith('.mp4')]
        if not clips_files:
            raise Exception("No hay clips para procesar.")

        processed_clips = []
        duration_per_clip = video_duration / len(clips_files)
        
        for i, file in enumerate(clips_files):
            clip = (VideoFileClip(file)
                    .without_audio() # Quitamos audio original del stock
                    .resize(height=1920)
                    .crop(x_center=540, y_center=960, width=1080, height=1920)
                    .set_duration(duration_per_clip)
                    .set_start(i * duration_per_clip))
            processed_clips.append(clip)

        # 3. Crear Subtítulos
        subtitle_clips = [self.create_subtitle_clip(w) for w in self.word_timestamps]

        # 4. Composición Final (Aquí estaba el error de la variable)
        # Unimos fondos y luego subtítulos encima
        final_video = CompositeVideoClip(processed_clips + subtitle_clips, size=(1080, 1920))
        final_video = final_video.set_audio(audio).set_duration(video_duration)

        # 5. Renderizado con parámetros de audio forzados
        print("Renderizando video final con audio...")
        final_video.write_videofile(
            output_path, 
            fps=24, 
            codec="libx264", 
            audio_codec="libmp3lame", 
            threads=4,                
            logger="bar"
        )