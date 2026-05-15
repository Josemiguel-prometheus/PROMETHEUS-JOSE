import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { History, TrendingUp, Filter } from 'lucide-react';

const MOCK_HISTORICAL_DATA = [
  { name: '09:00', spy: 440, qqq: 370 },
  { name: '10:00', spy: 442, qqq: 375 },
  { name: '11:00', spy: 441, qqq: 378 },
  { name: '12:00', spy: 445, qqq: 382 },
  { name: '13:00', spy: 443, qqq: 380 },
  { name: '14:00', spy: 448, qqq: 385 },
  { name: '15:00', spy: 450, qqq: 390 },
];

export default function HistoryPanel() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Historial y Análisis de Tendencias</h2>
          <p className="text-xs text-[#666]">Rendimiento acumulado y señales de rotación históricas.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#141414] border border-[#2A2A2A] px-3 py-1.5 rounded-sm text-[10px] font-bold text-[#666] hover:text-white transition-all uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" />
          Filtrar Período
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#141414] border border-[#2A2A2A] p-6 rounded-sm h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Relación SPY vs QQQ (Intradiario)</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-[10px] font-bold text-[#666] uppercase">SPY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] font-bold text-[#666] uppercase">QQQ</span>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HISTORICAL_DATA}>
                <defs>
                  <linearGradient id="colorSpy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQqq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#444" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#444" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', borderRadius: '4px', fontSize: '12px' }}
                  itemStyle={{ color: '#E4E3E0' }}
                />
                <Area type="monotone" dataKey="spy" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorSpy)" />
                <Area type="monotone" dataKey="qqq" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorQqq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#2A2A2A] p-6 rounded-sm space-y-6 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#666]">Eventos de Rotación Detectados</h3>
          <div className="flex-1 space-y-4">
            {[
              { date: '15 Mayo 02:45', event: 'Rotación hacia Defensivos', desc: 'Aumento de flujo en XLP y XLV por volatilidad en Tech.', type: 'Alert' },
              { date: '14 Mayo 21:10', event: 'Divergencia DXY/Gold', desc: 'Correlación inversa rota. Señal de acumulación física.', type: 'Signal' },
              { date: '14 Mayo 16:30', event: 'Cierre de Sesión', desc: 'Consolidación en niveles de Fibonacci 0.618 del SPX.', type: 'Neutral' },
            ].map((item, i) => (
              <div key={i} className="group border-l-2 border-[#2A2A2A] hover:border-orange-500 pl-4 py-1 transition-all">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-mono text-orange-500/60 uppercase">{item.date}</span>
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border",
                    item.type === 'Alert' ? "border-red-500 text-red-500" : 
                    item.type === 'Signal' ? "border-green-500 text-green-500" : 
                    "border-gray-600 text-gray-500"
                  )}>
                    {item.type}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#DDD] group-hover:text-white transition-colors uppercase tracking-tight">{item.event}</h4>
                <p className="text-xs text-[#666] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <button className="w-full py-2 bg-[#0A0A0A] border border-[#2A2A2A] hover:bg-[#1A1A1A] text-[10px] font-bold uppercase tracking-[0.2em] transition-all">
            Ver Registro Histórico Completo
          </button>
        </div>
      </div>
    </div>
  );
}
