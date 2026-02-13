import React from "react";
import { MonitorPlay, ImageOff } from "lucide-react"; 

export const StoryboardItem = ({ item, idx, selections, onSelect }) => {
  
  // Función para bypass de CORS/Referrer de Pexels
  const getProxiedUrl = (originalUrl) => {
    if (!originalUrl) return "";
    // Usamos el proxy wsrv.nl que es gratuito, rápido y limpia cabeceras de origen
    return `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full">
            {idx + 1}
          </span>
          <p className="text-[11px] font-black uppercase text-zinc-400 tracking-widest truncate max-w-[120px]">
            {item.keyword}
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {item.options && item.options.length > 0 ? (
          item.options.map((opt, i) => {
            const isSelected = selections[item.keyword] === opt.download_link;
            
            return (
              <button
                key={i}
                onClick={() => onSelect(item.keyword, opt.download_link)}
                className={`relative shrink-0 w-44 aspect-video rounded-xl border-2 transition-all duration-300 overflow-hidden bg-zinc-800 ${
                  isSelected 
                    ? "border-yellow-400 scale-[1.02] opacity-100" 
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img 
                  // APLICAMOS EL PROXY AQUÍ
                  src={getProxiedUrl(opt.preview_img)} 
                  className="w-full h-full object-cover"
                  alt={`Opción ${i}`}
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = `https://placehold.co/160x90/222/yellow?text=Error+Carga`;
                  }}
                />
                
                {isSelected && (
                  <div className="absolute inset-0 bg-yellow-400/10 flex items-center justify-center">
                    <div className="bg-yellow-400 text-black rounded-full p-1.5 shadow-lg">
                      <MonitorPlay size={16} fill="currentColor" />
                    </div>
                  </div>
                )}
                
                <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/70">
                  OPC {i + 1}
                </div>
              </button>
            );
          })
        ) : (
          <div className="w-full h-24 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-zinc-600 gap-2">
            <ImageOff size={20} />
            <span className="text-[10px] font-black uppercase">Sin resultados</span>
          </div>
        )}
      </div>
    </div>
  );
};