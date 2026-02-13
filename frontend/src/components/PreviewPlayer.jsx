import React, { useEffect } from "react";

export const PreviewPlayer = ({ activeClipUrl, activeWord, audioRef, audioUrl, onTimeUpdate }) => {
  
  // Sincronizar el video con el estado de reproducción del audio
  useEffect(() => {
    const videoElement = document.getElementById("preview-video");
    if (videoElement && audioRef.current) {
      if (!audioRef.current.paused) {
        videoElement.play().catch(() => {});
      } else {
        videoElement.pause();
      }
    }
  }, [activeClipUrl]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black group">
      {/* VIDEO DE FONDO (CLIP DE PEXELS) */}
      {activeClipUrl ? (
        <video
          id="preview-video"
          src={activeClipUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          key={activeClipUrl} // Fuerza recarga al cambiar de clip
        />
      ) : (
        <div className="text-zinc-700 text-xs font-bold uppercase tracking-widest">
          Esperando análisis...
        </div>
      )}

      {/* OVERLAY DE SUBTÍTULOS */}
      <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none">
        {activeWord && (
          <span className="text-white text-4xl font-black uppercase italic tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,1)] bg-yellow-500 px-4 py-1 rounded-sm">
            {activeWord.word}
          </span>
        )}
      </div>

      {/* AUDIO OCULTO QUE MANDA EL TIEMPO */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] opacity-20 hover:opacity-100 transition-opacity"
        controls
      />
    </div>
  );
};