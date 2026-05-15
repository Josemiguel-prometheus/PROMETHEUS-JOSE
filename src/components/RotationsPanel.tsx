import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  Grid3X3, 
  Info,
  Layers,
  Activity,
  Maximize2
} from 'lucide-react';
import { cn } from '../lib/utils';
import SectorDrilldown from './SectorDrilldown';

interface RotationSector {
  symbol: string;
  name: string;
  score: number;
  phase: string;
  change: number;
}

interface CorrelationRow {
  symbol: string;
  [key: string]: any;
}

export default function RotationsPanel() {
  const [rotations, setRotations] = useState<RotationSector[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationRow[]>([]);
  const [etfs, setEtfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [corrWindow, setCorrWindow] = useState('60d');
  const [selectedSector, setSelectedSector] = useState<RotationSector | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rotRes, corrRes, configRes] = await Promise.all([
          fetch('/api/analytics/rotations'),
          fetch('/api/analytics/correlation'),
          fetch('/api/config')
        ]);
        setRotations(await rotRes.json());
        setCorrelation(await corrRes.json());
        const configData = await configRes.json();
        setEtfs(configData.etfs);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 20000); 
    return () => clearInterval(interval);
  }, []);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Peak': return 'text-red-500 border-red-500/20 bg-red-500/5';
      case 'Strength': return 'text-green-500 border-green-500/20 bg-green-500/5';
      case 'Acceleration': return 'text-blue-500 border-blue-500/20 bg-blue-500/5';
      case 'Early Rotation': return 'text-orange-500 border-orange-500/20 bg-orange-500/5';
      default: return 'text-gray-500 border-gray-500/20 bg-gray-500/5';
    }
  };

  const tickers = correlation.length > 0 ? Object.keys(correlation[0]).filter(k => k !== 'symbol') : [];

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-orange-500" />
            <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">INTELIGENCIA SECTORIAL</h2>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ranking de Rotación GICS</h1>
          <p className="text-sm text-[#666]">Análisis de fuerza relativa y momentum compuesto de los 11 sectores principales.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="bg-[#141414] border border-[#2A2A2A] px-4 py-2 rounded-sm text-[10px] font-mono text-[#444]">
            METODOLOGÍA: 60% MOMENTUM + 20% VOL. ADJ. + 20% VOLUMEN
          </div>
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-green-500 uppercase">SYNC: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Phase Glossary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Peak', desc: 'Sobrecompra / Distribución', color: 'bg-red-500' },
          { label: 'Strength', desc: 'Tendencia Consolidada', color: 'bg-green-500' },
          { label: 'Acceleration', desc: 'Impulso Emergente', color: 'bg-blue-500' },
          { label: 'Early Rotation', desc: 'Inicio de Ciclo', color: 'bg-orange-500' },
          { label: 'Weakness', desc: 'Baja Fuerza Relativa', color: 'bg-gray-500' },
        ].map(p => (
          <div key={p.label} className="bg-[#0A0A0A] border border-[#1A1A1A] p-3 rounded-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", p.color)}></div>
              <span className="text-[10px] font-bold text-white uppercase">{p.label}</span>
            </div>
            <p className="text-[9px] text-[#444] font-medium leading-tight">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Rankings Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#141414] border-b border-[#1A1A1A]">
                  <th className="p-4 text-[10px] font-bold text-[#444] uppercase tracking-widest">Rank</th>
                  <th className="p-4 text-[10px] font-bold text-[#444] uppercase tracking-widest">Sector / ETF</th>
                  <th className="p-4 text-[10px] font-bold text-[#444] uppercase tracking-widest text-center">Fase</th>
                  <th className="p-4 text-[10px] font-bold text-[#444] uppercase tracking-widest text-right">Score</th>
                  <th className="p-4 text-[10px] font-bold text-[#444] uppercase tracking-widest text-right">Var %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {loading ? (
                  Array(11).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="p-4 h-12 bg-[#0A0A0A]"></td>
                    </tr>
                  ))
                ) : (
                  rotations.map((sector, idx) => (
                    <tr key={sector.symbol} className="hover:bg-[#111] transition-all group cursor-default">
                      <td className="p-4">
                        <span className="font-mono text-xs text-[#444] group-hover:text-white">#{idx + 1}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <button 
                            onClick={() => setSelectedSector(sector)}
                            className="font-bold text-sm text-white hover:text-orange-500 transition-colors text-left flex items-center gap-2"
                          >
                            {sector.symbol}
                            <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <span className="text-[10px] text-[#444] uppercase truncate max-w-[150px]">{sector.name.replace(' Select Sector SPDR Fund', '')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border",
                          getPhaseColor(sector.phase)
                        )}>
                          {sector.phase}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-sm text-white">{sector.score}</span>
                          <div className="w-12 h-1 bg-[#1A1A1A] rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-orange-500" 
                              style={{ width: `${Math.min(100, Math.max(0, (sector.score + 2) * 20))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className={cn(
                          "flex items-center justify-end gap-1 font-mono font-bold text-xs",
                          sector.change >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {sector.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(sector.change).toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Correlation Matrix & Risk Insights */}
        <div className="space-y-6">
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-[#666]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#AAA]">Correlación Dinámica</h3>
              </div>
              <select 
                value={corrWindow}
                onChange={(e) => setCorrWindow(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2A2A2A] text-[10px] font-bold text-[#666] outline-none px-2 py-0.5 rounded-sm"
              >
                <option value="30d">30D</option>
                <option value="60d">60D</option>
                <option value="90d">90D</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <div className="grid border-t border-l border-[#1A1A1A]" style={{ gridTemplateColumns: `repeat(${tickers.length + 1}, minmax(40px, 1fr))` }}>
                <div className="p-2 border-r border-b border-[#1A1A1A] bg-[#141414]"></div>
                {tickers.map(t => (
                  <div key={t} className="p-2 border-r border-b border-[#1A1A1A] bg-[#141414] text-center text-[9px] font-bold text-[#444]">{t}</div>
                ))}
                
                {correlation.map((row) => (
                  <div key={row.symbol} className="contents">
                    <div className="p-2 border-r border-b border-[#1A1A1A] bg-[#141414] text-[9px] font-bold text-[#444]">{row.symbol}</div>
                    {tickers.map(t => {
                      const val = row[t];
                      const opacity = Math.abs(val);
                      const bg = val > 0 ? `rgba(34, 197, 94, ${opacity * 0.3})` : `rgba(239, 68, 68, ${opacity * 0.3})`;
                      return (
                        <div 
                          key={t} 
                          title={`${row.symbol} vs ${t}: ${val}`}
                          className="p-2 border-r border-b border-[#1A1A1A] flex items-center justify-center text-[9px] font-mono font-bold"
                          style={{ backgroundColor: bg, color: opacity > 0.5 ? '#FFF' : '#666' }}
                        >
                          {val}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-[8px] font-bold text-[#444] uppercase tracking-widest">
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500/30"></div> Positiva</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500/30"></div> Negativa</div>
            </div>
          </div>

          {/* Diablo Insights specific to Rotations */}
          <div className="bg-purple-950/10 border border-purple-500/20 p-5 rounded-sm relative overflow-hidden">
            <div className="absolute top-2 right-2 opacity-10">
              <Activity className="w-12 h-12 text-purple-500" />
            </div>
            <div className="flex items-center gap-3 text-purple-500 mb-3">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Check de Sobre-Extensión</span>
            </div>
            <p className="text-[11px] text-[#AAA] leading-relaxed italic">
              "El XLK lidera el ranking con un score de 3.2, pero la correlación dinámica con US10Y ha pasado de -0.2 a -0.8 en 5 días. Cualquier repunte en yields provocará una rotación violenta hacia XLP/XLU."
            </p>
            <div className="mt-4 pt-4 border-t border-purple-500/10">
              <span className="text-[9px] font-bold text-purple-500/60 uppercase">ALERTA DEL DIABLO: RIESGO DE DISTRIBUCIÓN EN TECH</span>
            </div>
          </div>
        </div>
      </div>
      {selectedSector && (
        <SectorDrilldown 
            sector={selectedSector} 
            etfs={etfs} 
            onClose={() => setSelectedSector(null)} 
        />
      )}
    </div>
  );
}
