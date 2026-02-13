import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import axios from "axios";
import { 
  Navbar, NavbarBrand, Button, Textarea, ScrollShadow, Input, Progress
} from "@heroui/react"; 
import { Save, Sparkles, MonitorPlay, Clock, FolderOpen } from "lucide-react"; 

import { PreviewPlayer } from "./components/PreviewPlayer";
import { StoryboardItem } from "./components/StoryboardItem";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selections, setSelections] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [timestamps, setSubtitles] = useState([]); 
  const [exportStatus, setExportStatus] = useState({ status: "esperando", percent: 0 });
  
  const [settings, setSettings] = useState({
    outputPath: "C:/Users/nicol/Documents/AI_Shorts_Finals",
    voice: "es-ES-AlvaroNeural",
  });

  const audioRef = useRef(null);

  // 1. POLLING DE PROGRESO (Corregido para evitar peticiones infinitas)
  useEffect(() => {
    let interval;

    // Solo activamos el polling si estamos cargando y el progreso no es 100
    if (loading && exportStatus.percent < 100) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/export-status`);
          setExportStatus(res.data);
          
          if (res.data.percent >= 100) {
            clearInterval(interval);
            setLoading(false);
            setTimeout(() => alert("✨ ¡Video exportado con éxito!"), 300);
          }
        } catch (e) { 
          console.error("Error obteniendo el status:", e);
          // Si hay un error de red, detenemos el polling para no saturar la consola
          clearInterval(interval);
          setLoading(false);
        }
      }, 800); // Subido a 800ms para mayor estabilidad
    } else {
      // Si loading pasa a false o llegamos al 100, limpiamos inmediatamente
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [loading, exportStatus.percent]); // Ahora depende de ambos para re-evaluar

  // 2. SINCRONIZACIÓN DE SUBTÍTULOS PARA EL MONITOR
  const activeWord = useMemo(() => {
    return timestamps.find((t) => currentTime >= t.start && currentTime <= t.end);
  }, [timestamps, currentTime]);

  // 3. LÓGICA DEL MONITOR: Cambio de clip basado en tiempo de audio
  const activeClipUrl = useMemo(() => {
    if (results.length === 0) return null;
    const duration = audioRef.current?.duration || 0.1;
    const idx = Math.min(
      Math.floor((currentTime / duration) * results.length), 
      results.length - 1
    );
    const currentKeyword = results[idx]?.keyword;
    return selections[currentKeyword]; 
  }, [results, selections, currentTime]);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setResults([]); 
    setSelections({});
    setSubtitles([]);
    setExportStatus({ status: "esperando", percent: 0 });

    try {
      const response = await fetch(`${API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text, voice: settings.voice }),
      });

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      const data = await response.json();

      if (data.keywords_data && data.keywords_data.length > 0) {
        setResults(data.keywords_data);
        setSubtitles(data.timestamps || []);
        setAudioUrl(`${API}/assets/audio/temp_preview.mp3?t=${Date.now()}`); 

        const defaultSelections = {};
        data.keywords_data.forEach(item => {
          if (item.options && item.options.length > 0) {
            defaultSelections[item.keyword] = item.options[0].download_link;
          }
        });
        setSelections(defaultSelections);
      } else {
        alert("No se encontraron clips para este guion.");
      }
    } catch (err) {
      console.error("Error en handleAnalyze:", err);
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false); // Aquí termina el loading de análisis, no dispara el polling
    }
  };

  const handleSelect = useCallback((keyword, link) => {
    setSelections(prev => ({ ...prev, [keyword]: link }));
  }, []);

  const handleExport = async () => {
    if (Object.keys(selections).length < results.length || results.length === 0) { 
      alert("Debes elegir un clip para cada escena antes de exportar."); 
      return; 
    }
    
    // Al setear loading y percent en 1, el useEffect del Polling se activa
    setExportStatus({ status: "Preparando motores...", percent: 1 });
    setLoading(true);
    
    try {
      await axios.post(`${API}/export`, { 
        selections, 
        texto: text, 
        voice: settings.voice, 
        output_path: settings.outputPath, 
        timestamps 
      });
      // NO ponemos setLoading(false) aquí, dejamos que el polling lo haga al llegar al 100%
    } catch (err) { 
        console.error("Error al iniciar exportación:", err);
        alert("Error crítico al contactar con el backend."); 
        setLoading(false);
        setExportStatus({ status: "error", percent: 0 });
    }
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white overflow-hidden flex flex-col font-sans">
      <Navbar maxWidth="full" className="bg-black border-b border-white/10 h-16 shrink-0">
        <NavbarBrand className="gap-3">
          <Sparkles className="text-yellow-400" size={24} />
          <p className="font-black text-2xl uppercase italic tracking-tighter">
            Studio<span className="text-yellow-400">Pro</span>
          </p>
        </NavbarBrand>
      </Navbar>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex flex-col h-[280px] shrink-0 bg-zinc-900/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="px-6 py-3 border-b border-white/10 bg-black/20">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Editor de Guion</p>
            </div>

            <div className="flex-1 overflow-hidden relative">
              <ScrollShadow className="h-full w-full">
                <Textarea
                  variant="flat"
                  placeholder="Introduce tu guion aquí..."
                  value={text}
                  onValueChange={setText}
                  classNames={{
                    base: "h-full",
                    input: "text-lg font-medium p-6 min-h-full resize-none",
                    inputWrapper: "bg-transparent hover:bg-transparent shadow-none h-full"
                  }}
                />
              </ScrollShadow>
            </div>

            <div className="px-6 py-3 bg-black/40 border-t border-white/10 flex justify-end">
              <Button 
                color="warning" 
                className="font-black px-8 uppercase text-xs bg-yellow-400 text-black shadow-lg hover:scale-105" 
                onPress={handleAnalyze} 
                isLoading={loading && exportStatus.percent === 0}
                startContent={!loading && <MonitorPlay size={18} />}
              >
                Analizar y Buscar Clips
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Storyboard dinámico</p>
            <ScrollShadow className="flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4 pb-20">
                {results.map((item, idx) => (
                  <StoryboardItem 
                    key={idx} 
                    item={item} 
                    idx={idx} 
                    selections={selections} 
                    onSelect={handleSelect} 
                  />
                ))}
              </div>
            </ScrollShadow>
          </div>
        </div>

        <div className="w-[380px] shrink-0 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 flex flex-col bg-zinc-900/50 rounded-3xl p-5 border border-white/10 shadow-2xl relative">
            <p className="font-black text-[10px] tracking-widest text-zinc-500 uppercase mb-3 text-center">Monitor de Salida</p>
            
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/5 shadow-inner">
              <PreviewPlayer 
                  activeClipUrl={activeClipUrl} 
                  activeWord={activeWord}
                  audioRef={audioRef} 
                  audioUrl={audioUrl}
                  onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                />
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              {loading && exportStatus.percent > 0 && (
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 animate-pulse">
                  <div className="flex justify-between text-[10px] font-bold text-blue-400 mb-2 uppercase tracking-tighter">
                    <span className="flex items-center gap-2">
                      <Clock size={12} className="animate-spin" />
                      {exportStatus.status}
                    </span>
                    <span>{exportStatus.percent}%</span>
                  </div>
                  <Progress 
                    size="sm" 
                    value={exportStatus.percent} 
                    color="primary" 
                    classNames={{
                      indicator: "bg-gradient-to-r from-blue-600 to-cyan-400"
                    }}
                  />
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[9px] font-black text-zinc-500 uppercase ml-1 flex items-center gap-1">
                  <FolderOpen size={10} /> Ruta de Salida
                </p>
                <Input 
                  size="sm" 
                  variant="flat" 
                  value={settings.outputPath}
                  onChange={(e) => setSettings({...settings, outputPath: e.target.value})}
                  classNames={{ 
                    input: "text-[10px] font-bold text-yellow-500",
                    inputWrapper: "bg-black/40 border border-white/5"
                  }}
                />
              </div>

              <Button 
                fullWidth 
                color="primary" 
                size="lg" 
                className="font-black text-lg h-[60px] uppercase shadow-xl bg-blue-600 hover:bg-blue-500"
                onPress={handleExport} 
                isLoading={loading && exportStatus.percent > 0} 
                isDisabled={results.length === 0}
              >
                Finalizar Video
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}