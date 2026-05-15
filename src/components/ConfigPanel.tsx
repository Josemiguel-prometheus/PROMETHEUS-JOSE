import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings2, Database, Sliders, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ConfigPanel() {
  const [etfs, setEtfs] = useState<{ ticker: string, name: string, sector: string }[]>([]);
  const [newEtf, setNewEtf] = useState({ ticker: '', name: '', sector: 'Equity' });

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setEtfs(data.etfs));
  }, []);

  const handleAddEtf = async () => {
    if (!newEtf.ticker) return;
    const res = await fetch('/api/config/etf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEtf)
    });
    if (res.ok) {
      setEtfs([...etfs, newEtf]);
      setNewEtf({ ticker: '', name: '', sector: 'Equity' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold tracking-tight">Gestión de Activos Bajo Monitoreo</h2>
          </div>
          
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-sm p-6 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#666] mb-4">Añadir Nuevo ETF / Índice</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input 
                type="text" 
                placeholder="Ticker (ej. SPY)" 
                value={newEtf.ticker}
                onChange={(e) => setNewEtf({...newEtf, ticker: e.target.value.toUpperCase()})}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-sm px-4 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input 
                type="text" 
                placeholder="Nombre del Activo" 
                value={newEtf.name}
                onChange={(e) => setNewEtf({...newEtf, name: e.target.value})}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-sm px-4 py-2 text-sm outline-none focus:border-orange-500"
              />
              <select 
                value={newEtf.sector}
                onChange={(e) => setNewEtf({...newEtf, sector: e.target.value})}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-sm px-4 py-2 text-sm outline-none focus:border-orange-500"
              >
                <option value="Equity">Equity</option>
                <option value="Macro">Macro</option>
                <option value="Fixed Income">Fixed Income</option>
                <option value="Commodities">Commodities</option>
                <option value="Crypto">Crypto</option>
                <option value="Sectors GICS">Sectors GICS</option>
              </select>
            </div>
            <button 
              onClick={handleAddEtf}
              className="flex items-center justify-center gap-2 w-full md:w-auto bg-[#1A1A1A] hover:bg-orange-600 border border-[#2A2A2A] text-white px-6 py-2 rounded-sm text-xs font-bold transition-all uppercase"
            >
              <Plus className="w-4 h-4" />
              Añadir al Monitor
            </button>
          </div>

          <div className="bg-[#141414] border border-[#2A2A2A] rounded-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A] border-b border-[#2A2A2A]">
                  <th className="p-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Ticker</th>
                  <th className="p-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Nombre</th>
                  <th className="p-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Sector</th>
                  <th className="p-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {etfs.map((etf) => (
                  <tr key={etf.ticker} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="p-4 font-mono font-bold text-orange-500">{etf.ticker}</td>
                    <td className="p-4 text-sm text-[#AAA]">{etf.name}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 border border-[#2A2A2A] text-[#666] rounded-full uppercase tracking-tighter">
                        {etf.sector}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-red-500/30 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <div className="bg-[#141414] border border-[#2A2A2A] p-6 rounded-sm space-y-6">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#AAA]">Ajustes del Sistema</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#666] uppercase mb-2">
                <span>Frecuencia de Polling</span>
                <span className="text-orange-500">60s</span>
              </div>
              <input type="range" className="w-full accent-orange-600" />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#666] uppercase mb-2">
                <span>Agresividad de Rotación</span>
                <span className="text-orange-500">Moderada</span>
              </div>
              <select className="bg-[#0A0A0A] border border-[#2A2A2A] text-[#AAA] rounded-sm px-3 py-1.5 text-xs w-full outline-none focus:border-orange-500">
                <option>Conservadora</option>
                <option selected>Moderada</option>
                <option>Agresiva</option>
                <option>Ultra-Long Term</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-[#2A2A2A] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#AAA]">Modo Debug</span>
                <div className="w-8 h-4 bg-[#222] rounded-full relative">
                  <div className="absolute right-1 top-1 w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#AAA]">Notificaciones Telegram</span>
                <div className="w-8 h-4 bg-[#222] rounded-full relative">
                  <div className="absolute left-1 top-1 w-2 h-2 bg-[#444] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-600/10 border border-orange-500/20 p-6 rounded-sm">
          <div className="flex items-center gap-3 text-orange-500 mb-3">
            <Info className="w-5 h-5" />
            <h4 className="text-xs font-bold uppercase tracking-wider underline underline-offset-4">Esencia Genesis</h4>
          </div>
          <p className="text-[11px] text-[#AAA] leading-relaxed italic">
            "Los ajustes de agresividad no incrementan la velocidad de tradeo, sino la sensibilidad de los agentes a divergencias estructurales. PROMETHEUS castiga la urgencia innecesaria."
          </p>
        </div>
      </div>
    </div>
  );
}
