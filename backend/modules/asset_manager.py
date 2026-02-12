import requests
import os
from config import PEXELS_API_KEY, BASE_ASSETS_DIR

class AssetManager:
    def __init__(self):
        self.api_key = PEXELS_API_KEY
        self.base_path = os.path.join(BASE_ASSETS_DIR, "clips")
        
        # Crear la carpeta de clips si no existe
        if not os.path.exists(self.base_path):
            os.makedirs(self.base_path)

    def download_stock_video(self, keyword, index):
        """Busca y descarga un video vertical de Pexels."""
        url = f"https://api.pexels.com/videos/search?query={keyword}&per_page=1&orientation=portrait"
        headers = {"Authorization": self.api_key}
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            if data['videos']:
                # Obtenemos el link del video con mejor calidad (pero que no pese demasiado)
                video_files = data['videos'][0]['video_files']
                # Buscamos un video mp4 de calidad hd o sd
                video_url = video_files[0]['link']
                
                output_path = os.path.join(self.base_path, f"clip_{index}_{keyword}.mp4")
                
                print(f"⏳ Descargando clip para: {keyword}...")
                video_data = requests.get(video_url).content
                with open(output_path, 'wb') as handler:
                    handler.write(video_data)
                
                print(f"✅ Clip guardado en: {output_path}")
                return output_path
            else:
                print(f"❌ No se encontraron videos para: {keyword}")
        else:
            print(f"❌ Error en la API de Pexels: {response.status_code}")
        return None

# Prueba rápida
if __name__ == "__main__":
    manager = AssetManager()
    # Probamos con una keyword
    manager.download_stock_video("coding", 1)