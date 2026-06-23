import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Activity, 
  Zap, 
  Users, 
  ShieldCheck, 
  History, 
  Settings, 
  Clock,
  RefreshCw,
  AlertTriangle,
  Scale,
  Database,
  Globe
} from 'lucide-react';
import { cn } from './lib/utils';

// Sub-components (we will create these next)
import Dashboard from './components/Dashboard';
import RotationsPanel from './components/RotationsPanel';
import RealTimeQuotes from './components/RealTimeQuotes';
import AgentsPanel from './components/AgentsPanel';
import SupervisorPanel from './components/SupervisorPanel';
import HistoryPanel from './components/HistoryPanel';
import ConfigPanel from './components/ConfigPanel';
import DevilAdvocatePanel from './components/DevilAdvocatePanel';
import Recommendations24hPanel from './components/Recommendations24hPanel';
import DataManagementPanel from './components/DataManagementPanel';
import GlobalLiquidityPanel from './components/GlobalLiquidityPanel';

const TABS = [
  { id: 'dashboard', label: 'Dashboard Principal', icon: TrendingUp },
  { id: 'global_liquidity', label: 'Índice de Liquidez Global', icon: Globe },
  { id: 'recommendations24h', label: '💡 Señales 30D & Mejoras', icon: Clock },
  { id: 'rotations', label: 'Rankings y Rotación', icon: Zap },
  { id: 'quotes', label: 'Cotizaciones en Tiempo Real', icon: Activity },
  { id: 'agents', label: 'Pentágono de Agentes', icon: Users },
  { id: 'devil', label: '⚖️ Abogado del diablo', icon: Scale },
  { id: 'supervisor', label: 'Supervisor', icon: ShieldCheck },
  { id: 'history', label: 'Historial y Análisis', icon: History },
  { id: 'data_management', label: 'Gestión de Datos', icon: Database },
  { id: 'config', label: 'Configuración', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/refresh', { method: 'POST' });
      setLastUpdate(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans selection:bg-[#E4E3E0] selection:text-[#0A0A0A]">
      {/* Header / Top Bar */}
      <header className="h-14 border-b border-[#1A1A1A] flex items-center justify-between px-6 bg-[#0F0F0F]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#141414] border border-[#2A2A2A] flex items-center justify-center rounded-sm">
            <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight uppercase">PROMETHEUS</h1>
            <p className="text-[10px] text-[#888] font-mono leading-none">ETF Rotation Intelligence System v1.0.0</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#141414] border border-[#2A2A2A] rounded-sm">
            <Clock className="w-3.5 h-3.5 text-[#666]" />
            <span className="text-[11px] font-mono text-[#888]">ÚLTIMA ACTUALIZACIÓN: {lastUpdate}</span>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-sm text-xs font-bold transition-all disabled:opacity-50",
              isRefreshing && "animate-pulse"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            REFRESH TOTAL
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-64 border-r border-[#1A1A1A] bg-[#0F0F0F] flex flex-col pt-4">
          <div className="px-4 mb-6">
            <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest mb-4">Módulos del Sistema</p>
            <div className="flex flex-col gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all relative group",
                    activeTab === tab.id 
                      ? "bg-[#1A1A1A] text-white border-l-2 border-orange-500" 
                      : "text-[#666] hover:text-[#AAA] hover:bg-[#141414]"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-orange-500" : "text-[#444]")} />
                  <span className="font-medium tracking-tight whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-6 border-t border-[#1A1A1A]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Estado: Óptimo</span>
            </div>
            <p className="text-[10px] text-[#444] leading-relaxed italic">
              "La paciencia es la piedra angular del rigor matemático."
            </p>
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#050505] custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-8 max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'global_liquidity' && <GlobalLiquidityPanel />}
              {activeTab === 'recommendations24h' && <Recommendations24hPanel />}
              {activeTab === 'rotations' && <RotationsPanel />}
              {activeTab === 'quotes' && <RealTimeQuotes />}
              {activeTab === 'agents' && <AgentsPanel />}
              {activeTab === 'devil' && <DevilAdvocatePanel />}
              {activeTab === 'supervisor' && <SupervisorPanel />}
              {activeTab === 'history' && <HistoryPanel />}
              {activeTab === 'data_management' && <DataManagementPanel />}
              {activeTab === 'config' && <ConfigPanel />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
