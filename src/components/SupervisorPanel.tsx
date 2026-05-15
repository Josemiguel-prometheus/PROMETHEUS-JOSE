import { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Terminal, Database, Globe, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface Log {
  id: number;
  level: string;
  message: string;
  agent: string;
  timestamp: string;
}

export default function SupervisorPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Polling logs every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Integridad DB', value: 'ÓPTIMA', icon: Database, color: 'text-green-500' },
          { label: 'Servicio API', value: 'ACTIVO', icon: Globe, color: 'text-green-500' },
          { label: 'Carga de CPU', value: '12.4%', icon: Activity, color: 'text-blue-500' },
          { label: 'Versión Core', value: 'v1.0.0A', icon: ShieldCheck, color: 'text-orange-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#141414] border border-[#2A2A2A] p-4 rounded-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={cn("text-lg font-bold font-mono tracking-tight", stat.color)}>{stat.value}</p>
            </div>
            <stat.icon className={cn("w-5 h-5", stat.color)} />
          </div>
        ))}
      </div>

      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-sm overflow-hidden flex flex-col h-[500px]">
        <div className="bg-[#141414] px-4 py-2 border-b border-[#2A2A2A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#AAA]">LOGS DEL SISTEMA (TIEMPO REAL)</span>
          </div>
          <button onClick={fetchLogs} className="text-[#666] hover:text-white transition-colors">
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1 custom-scrollbar">
          {loading ? (
            <div className="text-[#444]">Iniciando terminal del supervisor...</div>
          ) : logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="group border-l border-transparent hover:border-orange-500/50 pl-2 transition-all">
                <span className="text-[#444] mr-3">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={cn(
                  "mr-3 font-bold",
                  log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-yellow-500' : 'text-blue-500'
                )}>[{log.agent}]</span>
                <span className="text-[#AAA] group-hover:text-white transition-colors">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="text-[#444]">No hay logs disponibles en este momento.</div>
          )}
        </div>
        
        <div className="bg-[#0F0F0F] px-4 py-2 border-t border-[#2A2A2A] text-[10px] text-[#444] flex justify-between uppercase font-bold tracking-widest">
          <span>Buffer: 50 / 50 logs</span>
          <span>Status: Sincronizado</span>
        </div>
      </div>
    </div>
  );
}
