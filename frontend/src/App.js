import React, { useState } from 'react';
import { Play, Download, Settings, Image as ImageIcon } from 'lucide-react';

function App() {
  const [text, setText] = useState("");
  const [step, setStep] = useState(1); // 1: Guion, 2: Clips, 3: Render

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold">AI Short Generator</h1>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lado Izquierdo: Configuración */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl mb-4 flex items-center gap-2">
            <Settings size={20} /> Configuración del Script
          </h2>
          <textarea 
            className="w-full h-40 bg-gray-700 p-4 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Pega tu guion aquí..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="mt-4 bg-blue-600 hover:bg-blue-700 w-full py-3 rounded-lg font-bold transition">
            Analizar y buscar clips
          </button>
        </div>

        {/* Lado Derecho: Preview y Selección */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-700">
           <ImageIcon size={48} className="text-gray-600 mb-2" />
           <p className="text-gray-500">La vista previa aparecerá aquí</p>
        </div>
      </main>
    </div>
  );
}

export default App;