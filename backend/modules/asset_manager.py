import requests
import os

class AssetManager:
    def __init__(self):
        self.api_key = "6R2U1BUWMQj7rDUivI3YaNtOJlKLCfgTUzg9gIm08ttm6s9j9acNhsIQ" 
        self.base_url = "https://api.pexels.com/videos/search"
        self.headers = {"Authorization": self.api_key}

    def search_stock_videos(self, keyword, per_page=5):
        # PRIMER INTENTO: Búsqueda optimizada
        params = {
            "query": keyword, 
            "per_page": per_page,
            "orientation": "portrait"
        }
        
        try:
            print(f"--- Buscando en Pexels: {keyword} ---")
            response = requests.get(self.base_url, headers=self.headers, params=params)
            data = response.json()
            
            # Si no hay videos, intentamos una búsqueda más simple
            if not data.get("videos") or len(data.get("videos")) == 0:
                print(f"Sin resultados para '{keyword}', reintentando búsqueda simple...")
                params["query"] = keyword.split(' ')[0] # Solo la primera palabra
                response = requests.get(self.base_url, headers=self.headers, params=params)
                data = response.json()

            options = []
            for video in data.get("videos", []):
                files = video.get("video_files", [])
                if not files: continue
                
                # Seleccionar archivo (calidad sd o hd, no hace falta 4k para la preview)
                best_file = files[0] 
                for f in files:
                    if 720 <= f.get('width', 0) <= 1280:
                        best_file = f
                        break
                
                options.append({
                    "preview_img": video.get("image"),
                    "download_link": best_file["link"]
                })
            
            print(f"Resultados encontrados: {len(options)}")
            return options
        except Exception as e:
            print(f"Error de conexión Pexels: {e}")
            return []

    def download_from_url(self, url, index):
        clips_dir = os.path.join("assets", "clips")
        os.makedirs(clips_dir, exist_ok=True)
        save_path = os.path.join(clips_dir, f"clip_{index}.mp4")
        
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(save_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=1024 * 512):
                    if chunk: f.write(chunk)
            return save_path
        return None