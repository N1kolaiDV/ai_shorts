import React, { useEffect, useRef } from "react";

export const PreviewPlayer = ({ activeClipUrl, activeWord, audioRef, audioUrl, onTimeUpdate, isFinal, currentTime }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (isFinal && videoEl) {
      videoEl.muted = false;
      return;
    }
    if (!isFinal && videoEl && audioRef?.current) {
      if (!audioRef.current.paused) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    }
  }, [activeClipUrl, isFinal, audioRef]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 rounded-[2rem] overflow-hidden border-8 border-zinc-900 shadow-2xl">
      {activeClipUrl ? (
        <video
          ref={videoRef}
          src={activeClipUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted={!isFinal}
          controls={isFinal}
          loop={!isFinal}
          playsInline
          key={activeClipUrl}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-zinc-800 border-t-red-600 animate-spin" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sincronizando...</span>
        </div>
      )}

      {/* SUBTÍTULOS DINÁMICOS POR FRASE */}
      {!isFinal && activeWord && activeWord.words && (
        <div className="absolute inset-x-0 bottom-[18%] flex flex-wrap justify-center gap-x-2 gap-y-1 px-6 pointer-events-none z-50">
          {activeWord.words.map((w, i) => {
            const isHighlighted = currentTime >= w.start && currentTime <= w.end;
            
            return (
              <span
                key={i}
                className={`text-2xl font-black uppercase italic transition-all duration-75 ${
                  isHighlighted 
                    ? "text-yellow-400 scale-125 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)] z-10" 
                    : "text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                }`}
                style={{ 
                   WebkitTextStroke: isHighlighted ? "1px rgba(0,0,0,0.5)" : "none",
                   display: "inline-block"
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {!isFinal && (
        <audio key={audioUrl} ref={audioRef} src={audioUrl} onTimeUpdate={onTimeUpdate} className="hidden" />
      )}
    </div>
  );
};