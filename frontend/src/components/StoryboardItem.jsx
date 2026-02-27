import React, { useMemo } from "react";
import { ImageOff, Check, Layers } from "lucide-react";

export const StoryboardItem = ({ item, idx, selections, onSelect }) => {
  const getProxiedUrl = (originalUrl) => {
    if (!originalUrl) return "";
    if (
      originalUrl.includes("placehold.jp") ||
      originalUrl.includes("placehold.co") ||
      originalUrl.includes("127.0.0.1") ||
      originalUrl.includes("localhost")
    ) {
      return originalUrl;
    }
    return `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;
  };

  const selectedLink = selections?.[item.keyword];

  const selectedOption = useMemo(() => {
    if (!item?.options?.length) return null;
    return item.options.find((o) => o.download_link === selectedLink) || item.options[0];
  }, [item, selectedLink]);

  return (
    <div className="rounded-[2rem] border border-white/5 bg-black/40 shadow-2xl overflow-hidden group hover:border-red-600/20 transition-all duration-300">
      {/* HEADER - Estilo Dark Studio */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-black bg-red-600 text-white px-2.5 py-1 rounded-lg shrink-0 shadow-[0_0_10px_rgba(220,38,38,0.3)] uppercase italic">
            #{idx + 1}
          </span>

          <div className="min-w-0">
            <p className="text-[13px] font-black tracking-tight text-zinc-100 uppercase truncate">
              {item.keyword}
            </p>
            <div className="flex items-center gap-1.5 opacity-50">
                <Layers size={10} />
                <p className="text-[10px] font-bold uppercase tracking-tighter">
                {item?.options?.length ? `${item.options.length} Clips` : "No clips"}
                </p>
            </div>
          </div>
        </div>

        {selectedOption && (
          <div className="flex items-center shrink-0">
            <div className="h-6 w-6 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center animate-in fade-in zoom-in duration-300">
              <Check size={12} className="text-red-500" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      {/* GRID DE OPCIONES - Rediseñado */}
      <div className="p-5">
        {item?.options?.length ? (
          <div className="grid grid-cols-2 gap-3">
            {item.options.slice(0, 6).map((opt, i) => {
              const isSelected = selections[item.keyword] === opt.download_link;
              const thumb = getProxiedUrl(opt.preview_img);

              return (
                <button
                  key={i}
                  onClick={() => onSelect(item.keyword, opt.download_link)}
                  className={[
                    "relative aspect-video rounded-xl overflow-hidden border transition-all duration-300 bg-zinc-900 group/btn",
                    isSelected
                      ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)] scale-[0.98]"
                      : "border-white/5 hover:border-white/20",
                  ].join(" ")}
                  title={`Seleccionar opción ${i + 1}`}
                >
                  <img
                    src={thumb}
                    className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110' : 'group-hover/btn:scale-105'}`}
                    alt={`${item.keyword} ${i + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://placehold.co/320x180/000/red?text=Error";
                    }}
                  />

                  {/* OVERLAYS */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none">
                    <div className="flex justify-start">
                        {isSelected && (
                        <div className="bg-red-600 text-white rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest shadow-lg">
                            ACTIVE
                        </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end">
                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[8px] font-black text-zinc-400 group-hover/btn:text-white transition-colors">
                        OPT-{i + 1}
                        </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {item.options.length > 6 && (
              <div className="col-span-2 text-center py-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                   + {item.options.length - 6} alternativas disponibles
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full py-10 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[1.5rem] bg-black/20 text-zinc-700 gap-3">
            <div className="p-3 bg-zinc-900/50 rounded-full">
                <ImageOff size={24} strokeWidth={1} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest italic">Clip no encontrado</span>
          </div>
        )}
      </div>
    </div>
  );
};