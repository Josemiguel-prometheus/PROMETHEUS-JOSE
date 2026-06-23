import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  AlertCircle, 
  Gauge, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Cpu,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

// Sparkline Component
function Sparkline({ data, color }: { data: number[], color: string }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;
  
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((val - min) / range) * height
  }));

  const pathContent = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathContent}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Sentiment Gauge Component
function SentimentGauge({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * (circumference / 2);
  
  return (
    <div className="relative flex flex-col items-center">
      <svg width="100" height="60" className="rotate-[180deg]">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="#1A1A1A"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${circumference / 2} ${circumference / 2}`}
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={value > 60 ? "#22c55e" : value > 40 ? "#eab308" : "#ef4444"}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${circumference / 2} ${circumference / 2}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
        <span className="text-xl font-bold font-mono tracking-tighter">{value}%</span>
        <p className="text-[8px] font-bold text-[#666] uppercase tracking-widest leading-none">Confianza</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [marketSummary, setMarketSummary] = useState<any>(null);
  const [rotations, setRotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sentimentValue] = useState(72); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quotesRes, summaryRes, rotationsRes] = await Promise.all([
          fetch('/api/quotes'),
          fetch('/api/market/summary'),
          fetch('/api/analytics/rotations')
        ]);
        
        const quotesData = await quotesRes.json();
        const macro = quotesData.filter((q: Quote) => 
          ['SPX', 'VIX', 'DXY', 'US10Y', 'GLD', 'BTC-USD', 'TLT'].includes(q.symbol)
        );
        
        setQuotes(macro);
        setMarketSummary(await summaryRes.json());
        setRotations(await rotationsRes.json());
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s synchronization
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Market Condition - Large Card */}
        <div className="lg:col-span-3 bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] -mr-32 -mt-32 transition-all group-hover:bg-orange-500/10"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-orange-600/10 border border-orange-500/20 flex items-center justify-center rounded-sm">
                <ShieldCheck className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">SITUACIÓN SISTÉMICA</h2>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-white mb-1">
                  {marketSummary ? `Régimen: ${marketSummary.regime}` : 'Calculando Régimen...'}
                </p>
                <div className="flex items-center gap-4 text-[#666] text-xs">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Momentum: {marketSummary?.spyChange > 0 ? 'Fuerte' : 'Neutral'}</span>
                  <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> VIX: {marketSummary?.vix.toFixed(2) || '---'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 md:border-l md:border-[#1A1A1A] md:pl-8">
              <div className="flex flex-col items-center justify-center mr-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[8px] font-bold text-green-500 uppercase tracking-widest">LIVE SYNC</span>
                </div>
                <span className="text-[9px] font-mono text-[#444]">{lastUpdated.toLocaleTimeString()}</span>
              </div>
              <SentimentGauge value={sentimentValue} />
              <div className="hidden sm:block">
                <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-1">💡 SEÑAL SYSTEM CORE</p>
                <p className="text-sm font-bold text-white uppercase italic">
                   "SOBREPONDERAR TÁCTICAMENTE XLK"
                </p>
                <p className="text-[9px] font-mono text-green-500 font-bold uppercase mt-1">
                   Líder: XLK (Score 4.25)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Small Highlight Card */}
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm flex flex-col justify-between hover:border-[#333] transition-all">
          <div>
            <h3 className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2">Alpha del Día</h3>
            <p className="text-lg font-bold text-white leading-tight">
              {rotations[0] ? `Liderazgo: ${rotations[0].symbol}` : 'Escaneando Sectores...'}
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[#1A1A1A]">
            <span className="text-[10px] font-mono text-orange-500">CONVICCIÓN AGENTE: ALTA</span>
            <ArrowUpRight className="w-4 h-4 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Main Grid: Metrics + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Core Metrics (Scrollable list or tight grid) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-28 bg-[#0F0F0F] border border-[#1A1A1A] animate-pulse rounded-sm"></div>
            ))
          ) : (
            quotes.map((quote) => (
              <motion.div 
                key={quote.symbol}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0F0F0F] border border-[#1A1A1A] p-4 rounded-sm flex flex-col justify-between hover:bg-[#121212] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[10px] font-bold text-[#444] uppercase tracking-tighter mb-0.5">{quote.name}</h4>
                    <span className="text-base font-mono font-bold text-white">{quote.symbol}</span>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono border",
                    quote.change >= 0 ? "text-green-500 border-green-500/20 bg-green-500/5" : "text-red-500 border-red-500/20 bg-red-500/5"
                  )}>
                    {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </div>
                </div>
                
                <div className="flex items-end justify-between gap-4 mt-4">
                  <div className="flex flex-col">
                    <span className="text-xl font-mono font-bold tracking-tighter">
                      {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={cn("text-[10px] font-mono", quote.change >= 0 ? "text-green-600" : "text-red-600")}>
                      {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                    </span>
                  </div>
                  <Sparkline 
                    data={Array.from({length: 10}, () => Math.random() * 100)} 
                    color={quote.change >= 0 ? "#22c55e" : "#ef4444"} 
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Right Col: Agent Commentary Stack + 24H Recommendation Panel */}
        <div className="space-y-6">
          
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold text-[#666] uppercase tracking-widest">FEED DE AGENTES (GENESIS)</h3>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-orange-500"></div>
              <div className="w-1 h-1 rounded-full bg-[#1A1A1A]"></div>
              <div className="w-1 h-1 rounded-full bg-[#1A1A1A]"></div>
            </div>
          </div>
          
          <div className="space-y-3">
            {[
              { 
                agent: 'Analista', 
                icon: Cpu, 
                msg: 'Fuerte descorrelación detectada en BTC vs Tech. Posible formación de suelo.',
                time: '2m ago'
              },
              { 
                agent: 'Supervisor', 
                icon: ShieldCheck, 
                msg: 'Límites de riesgo operativos. El DXY estable permite mayor exposición a EM.',
                time: '5m ago'
              },
              { 
                agent: 'Diablo', 
                icon: Zap, 
                msg: 'Alerta: Los rendimientos del 10Y amenazan con romper resistencia de 4.2%.',
                time: '12m ago'
              },
            ].map((entry, idx) => (
              <div key={idx} className="bg-[#0F0F0F] border border-[#1A1A1A] p-4 rounded-sm hover:border-[#333] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <entry.icon className="w-3 h-3 text-[#555]" />
                    <span className="text-[9px] font-bold text-[#AAA] uppercase tracking-widest">{entry.agent}</span>
                  </div>
                  <span className="text-[8px] font-mono text-[#444]">{entry.time}</span>
                </div>
                <p className="text-[11px] text-[#888] leading-relaxed italic border-l border-orange-500/20 pl-3">
                  "{entry.msg}"
                </p>
              </div>
            ))}
          </div>

          <div className="bg-red-950/10 border border-red-500/20 p-4 rounded-sm">
             <div className="flex items-center gap-2 text-red-500 mb-2">
               <AlertCircle className="w-4 h-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Risk Guard Active</span>
             </div>
             <p className="text-[10px] text-[#666] font-medium leading-normal">
               Exposición máxima en sector energético alcanzada. El sistema bloquea nuevas compras de XLE/XOP hasta normalización de volumen.
             </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Sector Heatmap Preview */}
      <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Matriz de Rendimiento GICS</h3>
            <span className="text-[9px] bg-[#1A1A1A] px-2 py-0.5 rounded-full text-[#444]">Relative vs SPY</span>
          </div>
          <button className="text-[10px] font-bold text-orange-500 hover:underline uppercase tracking-widest">Ver Ranking Completo</button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {loading ? (
            Array(11).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-[#0A0A0A] border border-[#1A1A1A] animate-pulse rounded-sm"></div>
            ))
          ) : (
            rotations.map((sector) => (
              <div key={sector.symbol} className="bg-[#0A0A0A] border border-[#1A1A1A] p-3 rounded-sm flex flex-col items-center justify-center gap-1 group hover:border-[#444] transition-all cursor-crosshair">
                <span className="text-[10px] font-bold text-[#444] group-hover:text-white transition-colors">{sector.symbol}</span>
                <div className={cn(
                  "h-1 w-full rounded-full",
                  sector.score > 1.5 ? "bg-green-500" : sector.score > 0 ? "bg-green-800" : sector.score > -1.5 ? "bg-red-800" : "bg-red-500"
                )}></div>
                <div className="flex items-center justify-between w-full mt-1">
                  <span className={cn("text-[9px] font-mono font-bold", sector.score >= 0 ? "text-green-500" : "text-red-500")}>
                    {sector.score > 0 ? '+' : ''}{sector.score}
                  </span>
                  <span className="text-[8px] font-bold text-[#333] uppercase">{sector.phase.split(' ')[0]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
