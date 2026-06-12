import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Cpu, 
  RefreshCw, 
  BarChart2, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Coins, 
  Flame, 
  ChevronRight, 
  PieChart 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface IndicatorInfo {
  score: number;
  name: string;
  value?: number;
  sma?: number;
  high?: number;
  low?: number;
  ratio?: number;
  spyRoc?: number;
  tltRoc?: number;
  hygRoc?: number;
  lqdRoc?: number;
}

interface FearGreedData {
  index: number;
  classification: string;
  yesterday: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  oneYearAgo: number;
  components: {
    momentum: IndicatorInfo;
    strength: IndicatorInfo;
    breadth: IndicatorInfo;
    options: IndicatorInfo;
    volatility: IndicatorInfo;
    safeHaven: IndicatorInfo;
    junkBond: IndicatorInfo;
  };
  timestamp: string;
  backup?: boolean;
}

export default function FearGreedPanel() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIndex = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/market/fear-greed');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load fear & greed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIndex();
    const interval = setInterval(() => fetchIndex(), 15000); // Live sync 15s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sincronizando Indicador CNN FEAR & GREED...</p>
      </div>
    );
  }

  const indexVal = data?.index ?? 50;
  const classification = data?.classification ?? 'Neutral';

  // Pointer angle (semi-circle)
  const angle = (indexVal / 100) * 180 - 90;

  // Helper to resolve specific sub-metric labels
  const getSubLabel = (score: number) => {
    if (score < 25) return { text: 'Miedo Extremo', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (score < 45) return { text: 'Miedo', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    if (score <= 55) return { text: 'Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
    if (score <= 75) return { text: 'Codicia', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    return { text: 'Codicia Extrema', color: 'text-green-400', bg: 'bg-green-400/10' };
  };

  const getSubLabelForGauge = (classificationStr: string) => {
    const map: Record<string, { label: string; color: string; bg: string; border: string; desc: string }> = {
      'Extreme Fear': { label: 'Miedo Extremo', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', desc: 'Mercado deprimido por aversión extrema al riesgo. Oportunidad contraria histórica.' },
      'Fear': { label: 'Miedo', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', desc: 'Sentimiento negativo prevalece. Flujos de capital se repliegan hacia la seguridad.' },
      'Neutral': { label: 'Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Fuerzas balanceadas de compra y venta. Sincronía en rangos de consolidación.' },
      'Greed': { label: 'Codicia', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', desc: 'Euforia moderada. Los inversores aceleran compras de renta variable y activos de riesgo.' },
      'Extreme Greed': { label: 'Codicia Extrema', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', desc: 'Máximo sobrecalentamiento. Aversión al riesgo evaporada, riesgo de corrección táctico elevado.' },
    };
    return map[classificationStr] || { label: 'Neutral', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', desc: 'Fuerzas balanceadas de compra y venta.' };
  };

  const currentMeta = getSubLabelForGauge(classification);

  // Indicators mapping with custom icons and descriptive captions matching CNN
  const indicatorsList = [
    {
      key: 'momentum' as const,
      title: 'Impulso del Mercado',
      alias: 'Market Momentum',
      icon: TrendingUp,
      desc: 'S&P 500 frente a su media móvil de 125 días. Cuando el índice cotiza sustancialmente arriba, indica salud alcista constante.',
      details: (info: IndicatorInfo) => `S&P Proxy: $${info.value?.toFixed(1)} | SMA 125m: $${info.sma?.toFixed(1)}`
    },
    {
      key: 'strength' as const,
      title: 'Fuerza del Precio',
      alias: 'Stock Price Strength',
      icon: Flame,
      desc: 'Calcula el ratio de acciones que marcan máximos de 52 semanas frente a las que marcan mínimos de 52 semanas en la bolsa.',
      details: (info: IndicatorInfo) => `Máximo Anual: $${info.high?.toFixed(1)} | Mínimo Anual: $${info.low?.toFixed(1)}`
    },
    {
      key: 'breadth' as const,
      title: 'Amplitud de Mercado',
      alias: 'Stock Price Breadth',
      icon: BarChart2,
      desc: 'Analiza el volumen de negociación al alza frente al volumen a la baja (línea Avance/Descenso del volumen negociado).',
      details: (info: IndicatorInfo) => `Fuerza del Volumen Breadth: ${info.value}%`
    },
    {
      key: 'options' as const,
      title: 'Opciones Put y Call',
      alias: 'Put and Call Options',
      icon: PieChart,
      desc: 'La relación del volumen de opciones de cobertura (Puts) frente a las de compra (Calls). Ratios bajos expresan codicia.',
      details: (info: IndicatorInfo) => `Ratio Put/Call: ${info.ratio?.toFixed(2)}`
    },
    {
      key: 'volatility' as const,
      title: 'Volatilidad del Mercado',
      alias: 'Market Volatility',
      icon: Activity,
      desc: 'Compara el índice VIX (indicador de volatilidad implícita del S&P 500) frente a su media móvil simple registrada de 50 días.',
      details: (info: IndicatorInfo) => `Índice VIX: ${info.value?.toFixed(2)} | SMA 50d: ${info.sma?.toFixed(2)}`
    },
    {
      key: 'safeHaven' as const,
      title: 'Demanda de Refugio',
      alias: 'Safe Haven Demand',
      icon: Coins,
      desc: 'La diferencia de rendimiento (ROC de 20 días de mercado) entre las acciones del S&P 500 y los bonos refugio TLT.',
      details: (info: IndicatorInfo) => `Renta Variable: ${info.spyRoc?.toFixed(1)}% vs Bonos Refugio: ${info.tltRoc?.toFixed(1)}%`
    },
    {
      key: 'junkBond' as const,
      title: 'Bonos Basura',
      alias: 'Junk Bond Demand',
      icon: Layers,
      desc: 'La recompensa que exigen los inversores por asumir deuda corporativa especulativa (HYG) frente a activos estables (LQD).',
      details: (info: IndicatorInfo) => `Corporativo HYG: ${info.hygRoc?.toFixed(1)}% vs Grado de Inversión: ${info.lqdRoc?.toFixed(1)}%`
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in" id="cnn-fear-greed-real-time-panel">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1A1A1A] pb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-orange-500 animate-pulse" />
            CNN Business - Fear & Greed Index
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Replicación precisa y robusta del indicador de sentimiento líder. Integra las 7 variables financieras mundiales bajo el motor de CNN para guiar la toma de decisiones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.backup && (
            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-sm font-mono uppercase">
              DATOS RESILIENTES
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-500">SINCRO CON MERCADOS ACTIVADA</span>
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

      {/* Main Gauge and Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Semi-circle Gauge */}
        <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#1A1A1A] p-8 rounded-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 pointer-events-none" />
          
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#555] mb-4">INDICADOR ACTIVO EN TIEMPO REAL</span>

          {/* SVG Gauge */}
          <div className="relative w-full max-w-[280px] h-44 flex items-center justify-center mt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 200 135">
              <defs>
                <linearGradient id="cnnGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="25%" stopColor="#ef4444" />
                  <stop offset="45%" stopColor="#f97316" />
                  <stop offset="55%" stopColor="#eab308" />
                  <stop offset="75%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <filter id="reactGlowEffect" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background subtle arc grid circles */}
              <path d="M 30 110 A 70 70 0 0 1 170 110" fill="none" stroke="#262626" strokeWidth="1" strokeDasharray="2,4" />
              <path d="M 10 110 A 90 90 0 0 1 190 110" fill="none" stroke="#1c1c1c" strokeWidth="0.5" />

              {/* Arc paths */}
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="#1A1A1A"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Colored active path */}
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="url(#cnnGlow)"
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.95"
              />

              {/* Tick Marks for extreme precise alignment */}
              <line x1="20" y1="110" x2="12" y2="110" stroke="#ef4444" strokeWidth="2.5" />
              <line x1="46.9" y1="56.9" x2="41.2" y2="51.2" stroke="#f97316" strokeWidth="2" />
              <line x1="100" y1="30" x2="100" y2="20" stroke="#eab308" strokeWidth="2" />
              <line x1="153.1" y1="56.9" x2="158.8" y2="51.2" stroke="#10b981" strokeWidth="2" />
              <line x1="180" y1="110" x2="188" y2="110" stroke="#22c55e" strokeWidth="2.5" />

              {/* Tick Labels */}
              <text x="15" y="125" fill="#f87171" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">0</text>
              <text x="42" y="44" fill="#fb923c" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">25</text>
              <text x="100" y="15" fill="#fef08a" fontFamily="monospace" fontSize="9" fontWeight="bold" textAnchor="middle">50</text>
              <text x="158" y="44" fill="#34d399" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">75</text>
              <text x="185" y="125" fill="#4ade80" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle">100</text>

              {/* Dynamic pointer arrow needle */}
              <g transform="translate(100, 110)">
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-82"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform={`rotate(${angle})`}
                  style={{ transformOrigin: '0px 0px' }}
                  filter="url(#reactGlowEffect)"
                />
                <line
                  x1="0"
                  y1="-50"
                  x2="0"
                  y2="-80"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  transform={`rotate(${angle})`}
                  style={{ transformOrigin: '0px 0px' }}
                />
                <circle cx="0" cy="0" r="8" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="4.5" fill="#ef4444" />
                <circle cx="0" cy="0" r="2" fill="#000000" />
              </g>
            </svg>

            {/* Float value */}
            <div className="absolute bottom-1 bg-black/80 px-4 py-1.5 rounded border border-[#222] backdrop-blur-md">
              <motion.div 
                className="text-4xl font-black font-mono tracking-tighter text-white"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={indexVal}
              >
                {indexVal}
              </motion.div>
            </div>
          </div>

          <div className="mt-6 space-y-2 z-10 w-full">
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-sm border inline-block",
              currentMeta.bg, currentMeta.color, currentMeta.border
            )}>
              {currentMeta.label}
            </span>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-snug mt-1">
              {currentMeta.desc}
            </p>
          </div>
        </div>

        {/* Right Side: CNN's Interval Table */}
        <div className="lg:col-span-7 bg-[#09090D] border border-[#1A1A1A] p-6 rounded-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4 font-mono">Resumen de Índices Históricos (Estilo CNN)</h4>
            
            <div className="divide-y divide-[#16161C]">
              
              {/* Ahora */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  AHORA
                </span>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-bold font-mono px-2 py-0.5 rounded-sm", currentMeta.bg, currentMeta.color)}>
                    {classification === 'Extreme Fear' && 'Miedo Extremo'}
                    {classification === 'Fear' && 'Miedo'}
                    {classification === 'Neutral' && 'Neutral'}
                    {classification === 'Greed' && 'Codicia'}
                    {classification === 'Extreme Greed' && 'Codicia Extrema'}
                  </span>
                  <span className="text-sm font-black font-mono text-white w-8 text-right">{indexVal}</span>
                </div>
              </div>

              {/* Ayer */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm text-gray-400">Ayer</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">
                    {data?.yesterday && getSubLabel(data.yesterday).text}
                  </span>
                  <span className="text-sm font-mono text-gray-300 w-8 text-right">{data?.yesterday}</span>
                </div>
              </div>

              {/* Hace una semana */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm text-gray-400">Hace una semana</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">
                    {data?.oneWeekAgo && getSubLabel(data.oneWeekAgo).text}
                  </span>
                  <span className="text-sm font-mono text-gray-300 w-8 text-right">{data?.oneWeekAgo}</span>
                </div>
              </div>

              {/* Hace un mes */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm text-gray-400">Hace un mes</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">
                    {data?.oneMonthAgo && getSubLabel(data.oneMonthAgo).text}
                  </span>
                  <span className="text-sm font-mono text-gray-300 w-8 text-right">{data?.oneMonthAgo}</span>
                </div>
              </div>

              {/* Hace un año */}
              <div className="flex items-center justify-between py-3.5">
                <span className="text-sm text-gray-400">Hace un año</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500">
                    {data?.oneYearAgo && getSubLabel(data.oneYearAgo).text}
                  </span>
                  <span className="text-sm font-mono text-gray-300 w-8 text-right">{data?.oneYearAgo}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="p-4 bg-[#140C04] border border-[#ff91001a] rounded-sm flex items-start gap-4 mt-4">
            <Cpu className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-black uppercase text-orange-400 tracking-wider">Acoplamiento con Sistema Central</h5>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                La replicación exacta de CNN Business evita falsos positivos al sintonizar múltiplos de 7 variables independientes. Las alertas proactivas alimentan al <strong>Pentágono de Agentes</strong>, modificando dinámicamente las coberturas tecnológicas y los límites apalancados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* The 7 CNN Metrics Breakdown Grid */}
      <div className="space-y-4">
        <div className="border-b border-[#1A1A1A] pb-2">
          <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            Desglose Detallado de las 7 Métricas de CNN Business
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {indicatorsList.map((ind) => {
            const info = data?.components[ind.key];
            if (!info) return null;
            const subLabel = getSubLabel(info.score);

            const IconComp = ind.icon;

            return (
              <div 
                key={ind.key} 
                className="border border-[#16161C] hover:border-[#22222E] bg-[#07070A] hover:bg-[#0A0A0E] p-5 rounded-sm flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <IconComp className="w-4 h-4 text-orange-400 group-hover:text-orange-300 transition-colors" />
                      <span className="text-xs font-black text-white uppercase tracking-tight">{ind.title}</span>
                    </div>
                    <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded-sm font-bold uppercase", subLabel.bg, subLabel.color)}>
                      {subLabel.text}
                    </span>
                  </div>
                  
                  <span className="text-[9px] text-[#555] font-mono block uppercase tracking-wider mb-2">{ind.alias}</span>
                  <p className="text-xs text-gray-400 leading-relaxed">{ind.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#111] flex items-center justify-between gap-4">
                  <span className="text-[10px] font-mono text-gray-500">{ind.details(info)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500">Valor de Escala:</span>
                    <span className="text-xs font-bold font-mono text-white">{info.score}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
