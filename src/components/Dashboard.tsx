import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

export default function Dashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        const macro = data.filter((q: Quote) => ['SPX', 'VIX', 'DXY', 'US10Y', 'GLD', 'BTC-USD'].includes(q.symbol));
        setQuotes(macro);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000); // Polling every 60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Market Condition Banner */}
      <div className="bg-[#141414] border border-[#2A2A2A] p-6 rounded-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-900/20 border border-blue-500/30 flex items-center justify-center rounded-sm">
            <Info className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Condiciones de Mercado Actuales</h2>
            <p className="text-xl font-bold tracking-tight">Consolidación Lateral - Sesgo Cauto</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[10px] text-[#666] font-mono mb-1">MENSAJE DEL SISTEMA:</p>
          <p className="text-sm font-medium text-[#AAA]">"El capital fluye hacia los más pacientes en entornos de alta volatilidad inducida."</p>
        </div>
      </div>

      {/* Macro Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-[#141414] border border-[#1A1A1A] animate-pulse rounded-sm"></div>
          ))
        ) : (
          quotes.map((quote) => (
            <div key={quote.symbol} className="bg-[#141414] border border-[#2A2A2A] p-5 rounded-sm hover:border-[#444] transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-widest">{quote.name}</p>
                  <h3 className="text-2xl font-mono font-bold tracking-tighter">{quote.symbol === 'SPX' ? 'S&P 500' : quote.symbol}</h3>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-sm",
                  quote.change >= 0 ? "bg-green-950 text-green-500" : "bg-red-950 text-red-500"
                )}>
                  {quote.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(quote.changePercent).toFixed(2)}%
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {quote.symbol.includes('USD') || quote.symbol === 'GLD' ? '$' : ''}
                  {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {quote.symbol === 'US10Y' ? '%' : ''}
                </span>
                <span className={cn(
                  "text-xs font-mono",
                  quote.change >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sector Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Rendimiento por Sectores (GICS)</h3>
          </div>
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-sm divide-y divide-[#1A1A1A]">
            {[
              { name: 'Tecnología', change: 1.2, status: 'Outperforming' },
              { name: 'Energía', change: -0.8, status: 'Underperforming' },
              { name: 'Financiero', change: 0.3, status: 'Neutral' },
              { name: 'Salud', change: 0.1, status: 'Neutral' },
              { name: 'Consumo Básico', change: 0.5, status: 'Defensive' },
            ].map((sector) => (
              <div key={sector.name} className="p-4 flex items-center justify-between hover:bg-[#1A1A1A] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-1.5 h-6 rounded-full", 
                    sector.change > 0 ? "bg-green-500" : sector.change < 0 ? "bg-red-500" : "bg-gray-500"
                  )}></div>
                  <span className="font-bold text-sm tracking-tight">{sector.name}</span>
                </div>
                <div className="flex items-center gap-8">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                    sector.status === 'Outperforming' ? "border-green-500 text-green-500" : 
                    sector.status === 'Underperforming' ? "border-red-500 text-red-500" : 
                    "border-gray-600 text-gray-500"
                  )}>
                    {sector.status}
                  </span>
                  <span className={cn("font-mono font-bold text-sm", sector.change >= 0 ? "text-green-500" : "text-red-500")}>
                    {sector.change >= 0 ? '+' : ''}{sector.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Alerta de Riesgo (Risk Matrix)</h3>
          <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-sm space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Ajuste de Volatilidad</span>
            </div>
            <p className="text-xs text-[#AAA] leading-relaxed">
              El VIX muestra divergencia con el spot del SPX. El sistema recomienda estrechar stops en posiciones de growth y aumentar exposición a renta fija de corto plazo (BIL/SHY).
            </p>
            <div className="pt-2 border-t border-red-500/10">
              <div className="flex justify-between text-[10px] font-mono text-red-500/60 uppercase mb-2">
                <span>Nivel de Alerta</span>
                <span>4 / 10</span>
              </div>
              <div className="h-1 bg-red-900/30 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 w-[40%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
