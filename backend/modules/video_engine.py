import os
import random
import sys
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, AudioFileClip, vfx
from proglog import ProgressBarLogger

class ProgressoLogger(ProgressBarLogger):
    def __init__(self, update_func):
        super().__init__()
        self.update_func = update_func

    def callback(self, **kwargs):
        if self.state.get('bars'):
            bar_name = list(self.state['bars'].keys())[-1]
            bar = self.state['bars'][bar_name]
            index = bar['index']
            total = bar['total']
            if total > 0:
                percent_render = int((index / total) * 45)
                final_percent = 50 + percent_render
                if self.update_func:
                    self.update_func(final_percent)
                percent_raw = int((index / total) * 100)
                sys.stdout.write(f"\r[MOVIEPY] {bar_name}: {index}/{total} frames ({percent_raw}%) ")
                sys.stdout.flush()

class VideoEngine:
    def __init__(self, output_path="assets/output/temp_video.mp4"):
        self.output_path = output_path
        self.width, self.height = 1080, 1920

    def assemble_video(self, clip_paths, audio_path, timestamps, progress_callback=None):
        audio = AudioFileClip(audio_path)
        video_clips = []
        num_clips = len(clip_paths)
        words_per_clip = max(1, len(timestamps) // num_clips)
        crossfade_dur = 0.3 

        for i in range(num_clips):
            path = clip_paths[i]
            idx_start = i * words_per_clip
            start_t = timestamps[idx_start]['start']
            
            if i == num_clips - 1:
                end_t = audio.duration
            else:
                next_idx = min((i + 1) * words_per_clip, len(timestamps)-1)
                end_t = timestamps[next_idx]['start']
            
            dur = end_t - start_t
            
            try:
                # OPTIMIZACIÓN: target_resolution redimensiona vía FFmpeg al leer.
                clip = VideoFileClip(path, audio=False, target_resolution=(self.height, None))
                
                if clip.duration < dur:
                    clip = clip.fx(vfx.loop, duration=dur)
                else:
                    clip = clip.subclip(0, dur)

                if clip.w > self.width:
                    clip = clip.crop(x_center=clip.w/2, width=self.width)
                
                clip = clip.set_start(start_t).set_duration(dur).crossfadein(crossfade_dur)
                video_clips.append(clip)
            except Exception as e: 
                print(f"Error cargando clip {path}: {e}")
                continue

        background = CompositeVideoClip(video_clips, size=(self.width, self.height)).set_audio(audio)
        
        sub_clips = []
        for t in timestamps:
            duration = t['end'] - t['start']
            if duration <= 0: continue
            
            txt = TextClip(
                t['word'].upper(), fontsize=150, color='#FFFF00',
                font='Arial-Bold', stroke_color='black', stroke_width=4, method='label'
            ).set_start(t['start']).set_end(t['end'])
            
            txt = txt.set_position(('center', self.height * 0.70)).rotate(random.uniform(-2, 2))
            sub_clips.append(txt)

        final_video = CompositeVideoClip([background] + sub_clips, size=(self.width, self.height))
        
        my_logger = ProgressoLogger(progress_callback)

        # CONFIGURACIÓN CORREGIDA: Eliminamos los flags que causan error
        final_video.write_videofile(
            self.output_path, 
            fps=24, 
            codec="h264_nvenc", 
            audio_codec="aac",
            threads=os.cpu_count(), 
            preset="p1", 
            bitrate="4000k",
            ffmpeg_params=[
                "-pix_fmt", "yuv420p", # <--- CRÍTICO: Compatibilidad de video
                "-rc", "vbr",          # Bitrate variable (velocidad)
                "-cq", "28"            # Calidad constante
            ],
            logger=my_logger
        )
        
        print("\n[OK] Renderizado finalizado con éxito.")
        
        audio.close()
        background.close()
        for c in video_clips: c.close()
        return self.output_path