import React, { useMemo, useRef, useState, useEffect } from "react";
import axios from "axios";
import {
  Navbar,
  NavbarBrand,
  Button,
  Textarea,
  Progress,
  Card,
  CardHeader,
  CardBody,
  Chip,
} from "@heroui/react";
import { 
  Sparkles, 
  Video, 
  Wand2, 
  Film, 
  LayoutGrid, 
  ChevronRight, 
  Settings2,
  Type,
  FileSpreadsheet
} from "lucide-react";
import { PreviewPlayer } from "./components/PreviewPlayer";
import { StoryboardItem } from "./components/StoryboardItem";
import { CustomSelect } from "./components/CustomSelect";

const API = "http://127.0.0.1:8000";

const PRESETS = [
  { label: "Mr Beast (Viral)", value: "mrbeast.ass" },
  { label: "Hormozi (Amarillo)", value: "hormozi.ass" },
  { label: "Default", value: "default.ass" },
];

const POSITIONS = [
  { label: "Arriba", value: "top" },
  { label: "Centro", value: "center" },
  { label: "Abajo", value: "bottom" },
];

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [results, setResults] = useState([]);
  const [selections, setSelections] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [segments, setSegments] = useState([]); 
  
  // Estado para el progreso del Batch
  const [exportStatus, setExportStatus] = useState({ status: "esperando", percent: 0 });
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  const [settings, setSettings] = useState({
    outputPath: "C:/Users/nicol/Documents/AI_Shorts_Finals",
    preset: "mrbeast.ass",
    position: "bottom",
    fontSize: 150,
  });

  const audioRef = useRef(null);

  // MANEJO DE CSV (BATCH)
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setExportStatus({ status: "Subiendo y analizando CSV...", percent: 5 });

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await axios.post(`${API}/batch`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        // Reiniciamos estados para el modo Batch
        setResults([]);
        setSegments([]);
        alert(`🚀 ¡Procesamiento iniciado! Se generarán ${res.data.rows} videos en segundo plano.`);
    } catch (err) {
        console.error(err);
        const errorMsg = err.response?.data?.detail || "Error al subir el CSV";
        alert(errorMsg);
        setLoading(false);
    }
  };

  // POLLING DE ESTADO (Consulta al backend cada segundo)
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/export-status`);
          setExportStatus(res.data);
          
          // Si termina el batch o un video individual
          if (res.data.percent >= 100 && res.data.status.toLowerCase().includes("finalizado")) {
            setLoading(false);
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Error consultando status", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const activeWord = useMemo(() => {
    return segments.find((s) => currentTime >= s.start && currentTime <= s.end);
  }, [segments, currentTime]);

  const activeClipUrl = useMemo(() => {
    if (results.length === 0) return null;
    const duration = audioRef.current?.duration || 0.1;
    const idx = Math.min(Math.floor((currentTime / duration) * results.length), results.length - 1);
    const selectedLink = selections[results[idx]?.keyword];
    return selectedLink === "IA_GENERATED" ? results[idx].options?.[0]?.preview_img : selectedLink;
  }, [results, selections, currentTime]);

  const isExporting = loading || (exportStatus.percent > 0 && exportStatus.percent < 100);
  const hasStoryboard = results.length > 0;

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResults([]);
    setSegments([]); 
    setFinalVideoUrl(null);
    try {
      const response = await axios.post(`${API}/analyze`, { texto: text });
      const data = response.data;
      if (data.status === "success") {
        setCurrentJobId(data.job_id); 
        setResults(data.keywords_data);
        setSegments(data.segments || []); 
        setAudioUrl(`${data.audio_url}?t=${Date.now()}`);
        setAudioFile(data.audio_url); 
        const defaults = {};
        data.keywords_data.forEach((item) => {
          if (item.options?.length > 0) defaults[item.keyword] = item.options[0].download_link;
        });
        setSelections(defaults);
      }
    } catch (err) {
      alert("Error al analizar el guion");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentJobId) return alert("Analiza el guion primero");
    setLoading(true);
    try {
      await axios.post(`${API}/export`, {
        job_id: currentJobId,
        selections,
        timestamps: segments,
        preset: settings.preset,
        position: settings.position,
        fontSize: settings.fontSize,
      });
    } catch (err) {
      setLoading(false);
      alert("Error en exportación");
    } 
  };

  return (
    <div className="h-screen w-full bg-[#0f0f11] text-zinc-100 flex flex-col overflow-hidden font-sans">
      
      {/* NAVBAR CORREGIDA */}
      <Navbar maxWidth="full" className="bg-[#18181b]/80 border-b border-white/5 h-16 shrink-0">
        <NavbarBrand>
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1.5 rounded-lg">
              <Sparkles className="text-white fill-current" size={18} />
            </div>
            <p className="font-black text-xl tracking-tighter uppercase italic text-white">
              1Click <span className="text-red-500">Studio</span>
            </p>
          </div>
        </NavbarBrand>

        {/* CONTENEDOR DERECHO DE LA NAVBAR */}
        <div className="flex gap-4 items-center">
          {isExporting && (
            <Chip size="sm" color="danger" variant="dot" className="animate-pulse font-bold text-[10px] bg-red-500/10 border-red-500/20">
              PROCESANDO LOTES
            </Chip>
          )}
          
          <div className="h-8 w-px bg-white/10 mx-2" />
          
          <input type="file" id="csv-upload" hidden accept=".csv" onChange={handleCSVUpload} />
          <Button 
            size="md" 
            variant="shadow" 
            className="bg-zinc-800 hover:bg-red-600 text-white font-black text-[11px] border border-white/10 px-6 transition-all"
            onPress={() => document.getElementById('csv-upload').click()}
            startContent={<FileSpreadsheet size={16}/>}
          >
            MODO BATCH (50+ VIDEOS)
          </Button>
        </div>
      </Navbar>

      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          
          {/* EDITOR DE GUION REFORMADO */}
          <Card className="bg-[#18181b] border border-white/10 rounded-2xl flex flex-col h-[40%] shrink-0" shadow="none">
            <CardBody className="p-5 flex flex-col gap-4">
              
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-red-600 rounded-full" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Editor de Guion</span>
                </div>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-black h-9 px-6 rounded-xl uppercase italic text-[11px] shadow-lg shadow-red-600/20"
                  onPress={handleAnalyze}
                  isLoading={loading && !isExporting}
                >
                  Analizar Guion
                </Button>
              </div>

              <Textarea
                variant="flat"
                placeholder="Escribe o pega tu guion aquí..."
                value={text}
                onValueChange={setText}
                classNames={{
                  base: "flex-1 min-h-[100px]",
                  inputWrapper: "h-full bg-[#0f0f11] border border-white/5 rounded-2xl p-4 transition-colors focus-within:border-red-500/30",
                  input: "text-lg text-zinc-300 resize-none leading-relaxed",
                }}
              />

              {/* BARRA DE AJUSTES SIN SOLAPAMIENTOS */}
              <div className="flex items-center justify-between pt-2 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-[#0f0f11] p-1 rounded-xl border border-white/5">
                    <div className="pl-2">
                      <Settings2 size={16} className="text-red-500" />
                    </div>
                    <div className="w-48">
                      <CustomSelect 
                        options={PRESETS} 
                        selectedKey={settings.preset} 
                        onSelectionChange={(v) => setSettings(s => ({...s, preset: v}))} 
                      />
                    </div>
                    <div className="w-32">
                      <CustomSelect 
                        options={POSITIONS} 
                        selectedKey={settings.position} 
                        onSelectionChange={(v) => setSettings(s => ({...s, position: v}))} 
                      />
                    </div>
                  </div>

                  <div className="flex items-center bg-[#0f0f11] border border-white/5 rounded-xl px-3 h-10 gap-3 group">
                    <Type size={16} className="text-zinc-500 group-hover:text-red-500 transition-colors" />
                    <div className="flex flex-col -space-y-1">
                       <span className="text-[8px] font-black text-zinc-600 uppercase">FontSize</span>
                       <input 
                        type="number" 
                        className="bg-transparent w-12 text-[13px] font-black text-white outline-none" 
                        value={settings.fontSize} 
                        onChange={(e) => setSettings(s => ({...s, fontSize: e.target.value}))} 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-40">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                   <span className="text-[9px] font-bold uppercase tracking-widest">Auto-Save Active</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* STORYBOARD (Resto del espacio) */}
          <Card className="bg-[#18181b] border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden" shadow="none"><CardHeader className="px-5 py-3 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="text-zinc-500" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Storyboard Automatizado</span>
                </div>
             </CardHeader>
             <CardBody className="p-5 overflow-y-auto custom-scrollbar">
                {!hasStoryboard ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2 opacity-40">
                    <Film size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-widest italic">Análisis manual de clips</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((item, idx) => (
                      <StoryboardItem key={idx} item={item} idx={idx} selections={selections} onSelect={(kw, link) => setSelections(p => ({ ...p, [kw]: link }))} />
                    ))}
                  </div>
                )}
             </CardBody>
          </Card>
        </div>

        {/* MONITOR DERECHO (REPRODUCTOR Y EXPORT) - ANCHO AMPLIADO */}
        <div className="w-[450px] flex flex-col gap-4 shrink-0 h-full">
          <Card className="bg-[#18181b] border border-white/10 rounded-[2.5rem] flex-1 flex flex-col p-8 shadow-2xl relative overflow-hidden" shadow="none">
             {/* Fondo decorativo con gradiente para el monitor */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[100px] -z-10" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 blur-[100px] -z-10" />

             <div className="flex flex-col items-center justify-between gap-8 h-full">
                
                {/* SMARTPHONE FRAME - MÁS GRANDE */}
                <div className="w-full flex-1 relative flex items-center justify-center max-h-[65%]">
                    <div className="h-full aspect-[9/16] rounded-[2.5rem] border-[10px] border-[#0f0f11] bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden ring-2 ring-white/5">
                        <PreviewPlayer
                            activeClipUrl={finalVideoUrl || activeClipUrl}
                            activeWord={activeWord}
                            audioRef={audioRef}
                            audioUrl={audioUrl}
                            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                        />
                    </div>
                </div>

                {/* UI DE CONTROL Y PROGRESO */}
                <div className="w-full space-y-6">
                    
                    {/* BARRA DE PROGRESO DE EXPORTACIÓN - TAMAÑO GRANDE */}
                    {isExporting ? (
                      <div className="space-y-4 bg-[#0f0f11]/60 p-6 rounded-[1.5rem] border border-white/5 shadow-inner">
                        <div className="flex items-end justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Estado del Proceso</span>
                            <h4 className="text-sm font-black text-red-500 uppercase italic tracking-tighter">
                              {exportStatus.status}
                            </h4>
                          </div>
                          <span className="text-3xl font-black text-white italic tracking-tighter">
                            {exportStatus.percent}<span className="text-red-600 text-lg">%</span>
                          </span>
                        </div>
                        
                        <div className="relative pt-2">
                            <Progress 
                                size="md" 
                                value={exportStatus.percent} 
                                color="danger" 
                                className="h-3 rounded-full"
                                classNames={{
                                    indicator: "bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                }}
                            />
                        </div>

                        <div className="flex justify-center">
                             <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"/>
                                Motor de renderizado activo
                             </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[120px] border-2 border-dashed border-white/5 rounded-[1.5rem] flex items-center justify-center">
                         <p className="text-zinc-700 font-black uppercase italic tracking-tighter text-sm opacity-50">
                            Listo para exportar
                         </p>
                      </div>
                    )}

                    {/* ACCIÓN FINAL */}
                    <div className="grid grid-cols-1 gap-3">
                        <Button
                            fullWidth
                            className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[12px] rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-1 active:scale-95"
                            onPress={handleExport}
                            isLoading={isExporting && !loading}
                            isDisabled={!hasStoryboard}
                            startContent={!isExporting && <Video size={20} className="mr-1" />}
                        >
                            {isExporting ? "PROCESANDO..." : "RENDERIZAR VIDEO"}
                        </Button>
                        
                        {!isExporting && hasStoryboard && (
                           <p className="text-[9px] text-zinc-500 text-center font-bold uppercase tracking-tight opacity-50">
                              Aprox. 2-3 minutos por video
                           </p>
                        )}
                    </div>
                </div>
             </div>
          </Card>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>
    </div>
  );
}