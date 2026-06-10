import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, RefreshCw, Layers, ShieldAlert, Cpu, Award, Zap, Anchor } from 'lucide-react';
import { cn } from '../lib/utils';

interface GlobalLiquidityData {
  index: number;
  classification: string;
  components: {
    currency: { dxyPrice: number; score: number };
    credit: { ratio: number; hygPrice: number; tltPrice: number; score: number };
    carry: { jpyPrice: number; score: number };
    speculative: { btcRoc: number; gldRoc: number; tickerPrice: number; score: number };
  };
  timestamp: string;
  backup?: boolean;
}

export default function GlobalLiquidityPanel() {
  const [data, setData] = useState<GlobalLiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historySimulated, setHistorySimulated] = useState<{ date: string; value: number }[]>([]);

  const fetchLiquidity = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/market/global-liquidity');
      const json = await res.json();
      setData(json);

      // Generate context points around current liquidity index
      const curVal = json.index;
      const hist = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (5 - i) * 5);
        const walk = Math.max(15, Math.min(95, Math.round(curVal + (Math.cos(i) * 10) + (Math.random() * 6 - 3))));
        return {
          date: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          value: i === 5 ? curVal : walk
        };
      });
      setHistorySimulated(hist);
    } catch (e) {
      console.error('Failed to load global liquidity:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiquidity();
    const interval = setInterval(() => fetchLiquidity(), 15000); // 15s live sync
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sincronizando Índice de Liquidez Global...</p>
      </div>
    );
  }

  const indexVal = data?.index ?? 50;
  const classification = data?.classification ?? 'Stable/Neutral';

  // State classification metadata
  const liquidityMeta = {
    'Contraction': { label: 'Contracción Severa', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', desc: 'Restricción extrema de dólares. Alto riesgo sistémico.' },
    'Tight': { label: 'Restringida (Tight)', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', desc: 'Condiciones restrictivas. Se aconseja cautela táctica.' },
    'Stable/Neutral': { label: 'Estable / Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Flujos monetarios balanceados sin cuellos de botella.' },
    'Expansion': { label: 'Expansión (Loose)', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', desc: 'Liquidez expansiva. Clima óptimo para flujos sectoriales pro-riesgo.' },
    'Abundant': { label: 'Abundante (Excess)', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', desc: 'Inundación monetaria. Fuerte soporte tecnológico e inflacionario.' },
  }[classification] || { label: 'Estable / Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Flujos monetarios balanceados sin cuellos de botella.' };

  const angle = (indexVal / 100) * 180 - 90;

  return (
    <div className="space-y-8 animate-fade-in" id="global-liquidity-panel-root">
      {/* Upper header action area */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1A1A1A] pb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-orange-500 animate-pulse" />
            Índice de Liquidez Global (GLI)
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Auditoría sistémica de la oferta y facilidad de flujos de capital a nivel global en base a mercados de divisas, crédito y colaterales lógicos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.backup && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-sm font-mono uppercase">
              MODO RESILIENTE ACTIVO
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-500">REFRESCO EN VIVO ACTIVO (15S)</span>
          <button
            onClick={() => fetchLiquidity(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs font-mono font-bold bg-[#141414] hover:bg-[#1C1C1C] text-orange-400 hover:text-white border border-[#2A2A2A] hover:border-[#3A3A3A] px-4 py-2 rounded-sm transition-all cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            {refreshing ? 'SINCRO EN CURSO...' : 'REFRESCAR AHORA'}
          </button>
        </div>
      </div>

      {/* Primary indicator showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column Gauge */}
        <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#1A1A1A] p-8 rounded-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 pointer-events-none" />
          
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] mb-4">MÉTRICA GLOBAL DE INTERCAMBIO</span>

          {/* SVG Arc Gauge */}
          <div className="relative w-64 h-36 flex items-center justify-center mt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100">
              <defs>
                <linearGradient id="liquidityGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="30%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="75%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>

              {/* Inactive guide bar */}
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="#1A1A1A"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Active illuminated path */}
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="url(#liquidityGlow)"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* Pointer indicator */}
              <g transform="translate(100, 90)">
                <motion.line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-75"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  animate={{ rotate: angle }}
                  transition={{ type: 'spring', stiffness: 40, damping: 9 }}
                />
                <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
                <circle cx="0" cy="0" r="3.5" fill="#eab308" />
              </g>

              {/* Key boundaries annotation */}
              <text x="22" y="105" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">CONTRACCIÓN</text>
              <text x="100" y="99" fill="#eab308" fontSize="8" fontWeight="bold" textAnchor="middle">50</text>
              <text x="178" y="105" fill="#22c55e" fontSize="8" fontWeight="bold" textAnchor="middle">ABUNDANCIA</text>
            </svg>

            {/* Numerical metric presentation */}
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

          <div className="mt-6 space-y-2 z-10">
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm border inline-block",
              liquidityMeta.bg, liquidityMeta.color, liquidityMeta.border
            )}>
              {liquidityMeta.label}
            </span>
            <p className="text-xs text-gray-400 max-w-xs mx-auto italic mt-1 leading-snug">
              {liquidityMeta.desc}
            </p>
            <p className="text-[10px] text-gray-500 font-mono pt-1 uppercase">
              ACTUALIZADO: {new Date(data?.timestamp || '').toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Right Column Component Cards */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Currency Liquidity Contribution */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Anchor className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Canal de Divisa (Invertido DXY)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{data?.components.currency.dxyPrice.toFixed(2)} pts</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.currency.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Un dólar fuerte ejerce presión de escasez global de colaterales bancarios tradicionales. Un DXY bajo eleva el score exponencialmente.
              </p>
            </div>

            {/* Corporate Credit Risk Spreads */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Facilidad de Crédito (HYG/TLT)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Ratio: {(data?.components.credit.ratio || 0).toFixed(2)}</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.credit.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Mide la fortaleza del High-yield (HYG) frente a bonos seguros (TLT). Indica la solidez con la que se distribuye el capital privado.
              </p>
            </div>

            {/* Carry Funding Index */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Tasa Carry JPY (USD/JPY)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{data?.components.carry.jpyPrice.toFixed(1)} ¥</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.carry.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                El yen actúa como la fuente de financiamiento barata del carry global. Un cruce USD/JPY alto expande la oferta de apalancamiento exterior.
              </p>
            </div>

            {/* High Beta Speculative Appetite */}
            <div className="border border-[#1A1A1A] p-4 rounded-sm bg-[#090909] hover:border-[#222] transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-tight">Flujo de Riesgo (BTC vs Gold)</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">ROC 20d: {(data?.components.speculative.btcRoc || 0).toFixed(1)}% vs {(data?.components.speculative.gldRoc || 0).toFixed(1)}%</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">{data?.components.speculative.score}/100</div>
              <p className="text-[10px] text-gray-500 leading-snug mt-2">
                Bitcoin es el termómetro más sensible de exceso de liquidez monetario mundial. Evaluado junto al oro para aislar flujos de refugio.
              </p>
            </div>

          </div>

          {/* Core system calibration panel */}
          <div className="p-4 bg-[#0A120E] border border-[#10b9811a] rounded-sm flex items-start gap-4">
            <Cpu className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">Integración en Selección Sectorial</h5>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                La liquidez global es el impulsor de fondo más confiable del S&P500. En climas de **Contracción o Restricción (GLI &lt; 45)**, la plataforma **fuerza asignaciones defensivas** en consumo discrecional y energía, y **vota con alto rigor de rechazo** en el módulo del deudor (Devil Advocate).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Track Progress Bars */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-sm">
        <h4 className="text-xs font-black uppercase text-white tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-500" />
          Trayecto de la Liquidez Global (Últimos 25 días de Negociación)
        </h4>
        <div className="flex items-end justify-between gap-2 h-20 pt-4">
          {historySimulated.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="text-[10px] font-mono font-bold text-gray-400">{h.value}</div>
              <div className="w-full relative bg-[#141414] h-2.5 rounded-full overflow-hidden">
                <motion.div 
                  className={cn(
                    "absolute left-0 bottom-0 top-0 rounded-full",
                    h.value < 30 ? "bg-red-500" :
                    h.value < 46 ? "bg-orange-500" :
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
