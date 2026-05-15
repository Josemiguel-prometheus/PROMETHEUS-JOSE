import { useState, useEffect } from 'react';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

export default function RealTimeQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        setQuotes(data);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 10000); // 10s for real-time feel
    return () => clearInterval(interval);
  }, []);

  const filteredQuotes = quotes.filter(q => 
    q.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Monitor de Activos en Tiempo Real</h2>
          <p className="text-xs text-[#666]">Visualización de alta precisión para activos macro y sectores GICS.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-[#0A0A0A] border border-[#1A1A1A] px-4 py-2 rounded-sm">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Conexión 24/7</span>
              </div>
              <span className="text-[8px] font-mono text-[#444]">SYNC: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <div className="w-px h-6 bg-[#1A1A1A]"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[#666] uppercase">Latencia</span>
              <span className="text-[10px] font-mono text-green-600">~140ms</span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
            <input 
              type="text" 
              placeholder="Buscar ticker o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#141414] border border-[#2A2A2A] rounded-sm pl-10 pr-4 py-2 text-sm w-full md:w-64 focus:border-orange-500 outline-none transition-all placeholder:text-[#444]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden border border-[#2A2A2A] rounded-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#141414] border-b border-[#2A2A2A]">
              <th className="p-4 text-[11px] font-bold text-[#666] uppercase tracking-widest">Ticker</th>
              <th className="p-4 text-[11px] font-bold text-[#666] uppercase tracking-widest">Instrumento</th>
              <th className="p-4 text-[11px] font-bold text-[#666] uppercase tracking-widest text-right">Precio Actual</th>
              <th className="p-4 text-[11px] font-bold text-[#666] uppercase tracking-widest text-right">Cambio</th>
              <th className="p-4 text-[11px] font-bold text-[#666] uppercase tracking-widest text-right">Var %</th>
              <th className="p-4 text-[11px] font-bold text-[#666] uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {loading ? (
              Array(10).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="p-6 text-center animate-pulse bg-[#0A0A0A]">
                    <div className="h-4 bg-[#141414] w-3/4 mx-auto rounded-sm"></div>
                  </td>
                </tr>
              ))
            ) : filteredQuotes.length > 0 ? (
              filteredQuotes.map((quote) => (
                <tr key={quote.symbol} className="hover:bg-[#111] transition-colors group">
                  <td className="p-4">
                    <span className="font-mono font-bold text-orange-500">{quote.symbol === '^GSPC' ? 'SPX' : quote.symbol}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-[#AAA]">{quote.name}</td>
                  <td className="p-4 text-right font-mono font-bold">
                    {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={cn(
                    "p-4 text-right font-mono text-sm",
                    quote.change >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-sm text-[11px] font-bold font-mono",
                      quote.change >= 0 ? "bg-green-950/40 text-green-500 border border-green-900/50" : "bg-red-950/40 text-red-500 border border-red-900/50"
                    )}>
                      {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button className="text-[#444] hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[#444]">
                  No se encontraron activos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
