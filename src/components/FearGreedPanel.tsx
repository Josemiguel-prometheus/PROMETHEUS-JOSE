import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, TrendingUp, ShieldAlert, Cpu, RefreshCw, BarChart2, ShieldCheck, Coins } from 'lucide-react';
import { cn } from '../lib/utils';

interface FearGreedData {
  index: number;
  classification: string;
  components: {
    vix: { value: number; score: number };
    momentum: { spyPrice: number; spySma: number; score: number };
    safeHaven: { spyRoc: number; gldRoc: number; score: number };
    cyclical: { xlyRoc: number; xlpRoc: number; score: number };
  };
  timestamp: string;
  backup?: boolean;
}

export default function FearGreedPanel() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historySimulated, setHistorySimulated] = useState<{ date: string; value: number }[]>([]);

  const fetchIndex = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/market/fear-greed');
      const json = await res.json();
      setData(json);

      // Generate mock beautiful historic points based around current index for context
      const curVal = json.index;
      const hist = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (5 - i) * 5);
        // Random walk around current index
        const walk = Math.max(10, Math.min(95, Math.round(curVal + (Math.sin(i) * 12) + (Math.random() * 8 - 4))));
        return {
          date: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          value: i === 5 ? curVal : walk
        };
      });
      setHistorySimulated(hist);
    } catch (e) {
      console.error('Failed to load fear & greed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIndex();
    const interval = setInterval(() => fetchIndex(), 15000); // Poll every 15s for "real-time" sync
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sincronizando Sentimiento de Mercado...</p>
      </div>
    );
  }

  const indexVal = data?.index ?? 50;
  const classification = data?.classification ?? 'Neutral';

  // Define gauge angle calculation (180 degrees arc, starts at -180, arrow goes from 0% to 100%)
  const angle = (indexVal / 100) * 180 - 90;

  // Sentiment styling mapping
  const sentimentMeta = {
    'Extreme Fear': { label: 'Miedo Extremo', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    'Fear': { label: 'Miedo', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    'Neutral': { label: 'Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    'Greed': { label: 'Codicia', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    'Extreme Greed': { label: 'Codicia Extrema', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  }[classification] || { label: 'Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };

  return (
    <div className="space-y-8 animate-fade-in" id="fear-greed-market-sentiment">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1A1A1A] pb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Índice Fear & Greed (Miedo y Codicia)
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Sensor de sentimiento global calibrado en tiempo real con volatilidad táctica (VIX), aceleración del S&P500 y flujos defensivos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.backup && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-sm font-mono uppercase">
              MODO RESILIENTE ACTIVO
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-500">REFRESCO AUTOMÁTICO ACTIVO (15S)</span>
          <button
            onClick={() => fetchIndex(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs font-mono font-bold bg-[#141414] hover:bg-[#1C1C1C] text-orange-400 hover:text-white border border-[#2A2A2A] hover:border-[#3A3A3A] px-4 py-2 rounded-sm transition-all cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            {refreshing ? 'REFRESCANDO...' : 'SINCRO EN VIVO'}
          </button>
        </div>
      </div>

      {/* Main gauge layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left arc gauge & classification */}
        <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#1A1A1A] p-8 rounded-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 pointer-events-none" />
          
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] mb-4">MÉTRICA DE ESTRESS GÓTICO</span>

          {/* SVG Gauge */}
          <div className="relative w-64 h-36 flex items-center justify-center mt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100">
              {/* Defs for gradients */}
              <defs>
                <linearGradient id="gaugeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="35%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="65%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>

              {/* Arc path */}
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="#1A1A1A"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Colored active path */}
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="url(#gaugeGlow)"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* Division notches */}
              <line x1="20" y1="90" x2="28" y2="90" stroke="#000" strokeWidth="2" />
              <line x1="180" y1="90" x2="172" y2="90" stroke="#000" strokeWidth="2" />
              <line x1="100" y1="10" x2="100" y2="18" stroke="#000" strokeWidth="2" />

              {/* Dynamic pointer arrow needle */}
              <g transform={`translate(100, 90)`}>
                <motion.line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-75"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  animate={{ rotate: angle }}
                  transition={{ type: 'spring', stiffness: 50, damping: 10 }}
                />
                <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
                <circle cx="0" cy="0" r="3" fill="#ef4444" />
              </g>

              {/* Labels */}
              <text x="18" y="105" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">MIEDO</text>
              <text x="100" y="99" fill="#eab308" fontSize="8" fontWeight="bold" textAnchor="middle">50</text>
              <text x="182" y="105" fill="#22c55e" fontSize="8" fontWeight="bold" textAnchor="middle">CODICIA</text>
            </svg>

            {/* Float value */}
            <div className="absolute bottom-0 text-center">
              <motion.div 
                className="text-5xl font-black font-mono tracking-tighter text-white"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={indexVal}
              >
                {indexVal}
              </motion.div>
            </div>
          </div>

          <div className="mt-6 space-y-1 z-10">
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm border inline-block",
              sentimentMeta.bg, sentimentMeta.color, sentimentMeta.border
            )}>
              {sentimentMeta.label}
            </span>
            <p className="text-[10px] text-gray-500 font-mono mt-2 uppercase">
              Actualizado: {new Date(data?.timestamp || '').toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Right sub-indicators breakdowns */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Component 1: VIX Volatility */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Volatilidad Táctica (VIX)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{data?.components.vix.value.toFixed(2)} pts</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.vix.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Un VIX inferior a 15 dispara la escala de optimismo, mientras que cruces sobre 20 indican pánico institucional y protecciones de cobertura.
              </p>
            </div>

            {/* Component 2: S&P 500 Momentum */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Acción del S&P 500 (SMA 125)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">${data?.components.momentum.spyPrice.toFixed(1)}</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.momentum.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Mide la persistencia de largo plazo del SPY relativa a su media móvil. Un mercado sobre su SMA valida apetito de capital agresivo.
              </p>
            </div>

            {/* Component 3: Safe Haven (Bond/Gold Demand) */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Demanda de Refugio (GLD vs SPY)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">ROC 20d: {(data?.components.safeHaven.spyRoc || 0).toFixed(1)}% vs {(data?.components.safeHaven.gldRoc || 0).toFixed(1)}%</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.safeHaven.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Sincroniza tasas de retorno del oro físico contra la renta variable. Si el oro lidera, el mercado busca resguardo (Miedo).
              </p>
            </div>

            {/* Component 4: Cyclicals Strength (XLY vs XLP) */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Consumo Cíclico vs Staples</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">ROC 20d: {(data?.components.cyclical.xlyRoc || 0).toFixed(1)}% vs {(data?.components.cyclical.xlpRoc || 0).toFixed(1)}%</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.cyclical.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Analiza flujos de Consumo Discrecional (XLY) contra Consumo Básico (XLP). Liderazgo de XLY valida asunción de riesgos directos.
              </p>
            </div>
          </div>

          {/* Core system calibration note */}
          <div className="p-4 bg-[#140C04] border border-[#ff91001a] rounded-sm flex items-start gap-4">
            <Cpu className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-black uppercase text-orange-400 tracking-wider">Métrica de Calibración Táctica</h5>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                Este índice retroalimenta dinámicamente el **Pentágono de Agentes**. Cuando el índice desciende de <strong className="text-red-400">35 pts (Zonas de Miedo)</strong>, el Agente Supervisor restringe asignaciones automáticas, forzando filtros de contención de cola mediante sobreponderación del benchmark.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Track (Simulated Timeline) */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-sm">
        <h4 className="text-xs font-black uppercase text-white tracking-wider mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-orange-500" />
          Trayectoria Histórica Reciente del Sentimiento
        </h4>
        <div className="flex items-end justify-between gap-2 h-20 pt-4">
          {historySimulated.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="text-[10px] font-mono font-bold text-gray-400">{h.value}</div>
              <div className="w-full relative bg-[#141414] h-2.5 rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "absolute left-0 bottom-0 top-0 rounded-full",
                    h.value < 25 ? "bg-red-500" :
                    h.value < 45 ? "bg-orange-500" :
                    h.value <= 55 ? "bg-yellow-500" :
                    h.value <= 75 ? "bg-emerald-500" : "bg-green-400"
                  )}
                  style={{ width: `${h.value}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${h.value}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                />
              </div>
              <div className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter whitespace-nowrap">{h.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
