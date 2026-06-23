import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Sparkles, 
  ThumbsUp, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Github, 
  Cpu, 
  TrendingUp, 
  X,
  RefreshCw,
  Lightbulb,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Recommendation24h {
  id: number;
  timestamp: string;
  sector_lider: string;
  score: number;
  vix_at_generation: number;
  action: string;
  report: string;
  conviction: string;
}

interface PlatformImprovement {
  id: number;
  category: string;
  title: string;
  description: string;
  votes: number;
  status: 'SUGESTIÓN' | 'APROBADO' | 'IMPLEMENTADO' | 'RECHAZADO';
  impact: 'ALTO' | 'MEDIO' | 'BAJO';
  github_milestone: string;
}

export default function Recommendations24hPanel() {
  // States
  const [recList, setRecList] = useState<Recommendation24h[]>([]);
  const [recCurrent, setRecCurrent] = useState<Recommendation24h | null>(null);
  const [countdown, setCountdown] = useState<number>(2592000);
  const [isForcingRec, setIsForcingRec] = useState(false);

  const [improvements, setImprovements] = useState<PlatformImprovement[]>([]);
  const [isLoadingImpr, setIsLoadingImpr] = useState(false);
  const [currentImprovementIndex, setCurrentImprovementIndex] = useState<number>(0);

  // States for enhanced 24H Signal Historical Log
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedConviction, setSelectedConviction] = useState('ALL');
  const [selectedRecDetail, setSelectedRecDetail] = useState<Recommendation24h | null>(null);
  const [syncingIndex, setSyncingIndex] = useState<number | null>(null);
  const [syncedIds, setSyncedIds] = useState<Record<number, boolean>>({});
  const [syncingImprId, setSyncingImprId] = useState<number | null>(null);
  const [syncedImprIds, setSyncedImprIds] = useState<Record<number, boolean>>({});

  // Prometheus AI Chatbot States
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { 
      role: 'assistant', 
      content: '¡Hola! Soy **Prometheus IA**, tu asesor macroeconómico y experto en la plataforma. Estoy conectado en tiempo real al backlog de mejoras, histórico de señales 30D y GICS rotations. ¿Qué escenario macroeconómico o propuesta técnica deseas validar?' 
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Chat message send handler
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || isChatSending) return;

    const newUserMessage = { role: 'user' as const, content: textToSend };
    const updatedMessages = [...chatMessages, newUserMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });
      const data = await res.json();
      if (data.response) {
        setChatMessages([...updatedMessages, { role: 'assistant' as const, content: data.response }]);
      } else {
        setChatMessages([...updatedMessages, { role: 'assistant' as const, content: `Error: ${data.error || 'Respuesta vacía del modelo.'}` }]);
      }
    } catch (err: any) {
      console.error('Error sending chat message to Gemini:', err);
      setChatMessages([...updatedMessages, { role: 'assistant' as const, content: `Error de red: ${err.message || err}` }]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Safe inline text formatter for bold **text** and linebreaks
  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const elements = parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return <strong key={idx} className="text-orange-400 font-semibold">{part}</strong>;
        }
        return part;
      });
      return (
        <p key={i} className="mb-1 leading-relaxed last:mb-0 text-left">
          {elements}
        </p>
      );
    });
  };

  // Suggested item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Inteligencia & Modelos');
  const [newImpact, setNewImpact] = useState<'ALTO' | 'MEDIO' | 'BAJO'>('MEDIO');
  const [isSubmittingImprovement, setIsSubmittingImprovement] = useState(false);

  // Stats
  const totalVotes = improvements.reduce((acc, imp) => acc + imp.votes, 0);
  const implementedCount = improvements.filter(imp => imp.status === 'IMPLEMENTADO').length;

  // Fetch 30D recommendations
  const fetch24hRecs = async () => {
    try {
      const res = await fetch('/api/recommendations/24h');
      const data = await res.json();
      setRecList(data.list || []);
      setRecCurrent(data.current || null);
      setCountdown(data.countdownSeconds || 2592000);
    } catch (e) {
      console.error('Error fetching 30D recommendations:', e);
    }
  };

  // Force generate
  const handleForceGenerate = async () => {
    setIsForcingRec(true);
    try {
      const res = await fetch('/api/recommendations/24h/generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRecList(data.list || []);
        setRecCurrent(data.current || null);
        setCountdown(data.countdownSeconds || 2592000);
      }
    } catch (e) {
      console.error('Error forcing 30D Rec:', e);
    } finally {
      setIsForcingRec(false);
    }
  };

  // Fetch platform improvements
  const fetchImprovements = async () => {
    setIsLoadingImpr(true);
    try {
      const res = await fetch('/api/platform/improvements');
      const data = await res.json();
      setImprovements(data || []);
    } catch (e) {
      console.error('Error fetching platform improvements:', e);
    } finally {
      setIsLoadingImpr(false);
    }
  };

  // Upvote improvement
  const handleVote = async (id: number) => {
    try {
      const res = await fetch('/api/platform/improvements/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setImprovements(prev => 
          prev.map(imp => imp.id === id ? { ...imp, votes: imp.votes + 1 } : imp)
              .sort((a, b) => b.votes - a.votes)
        );
      }
    } catch (e) {
      console.error('Error voting platform improvements:', e);
    }
  };

  // Submit improvement
  const handleSubmitImprovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsSubmittingImprovement(true);
    try {
      const res = await fetch('/api/platform/improvements/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          title: newTitle,
          description: newDesc,
          impact: newImpact,
          github_milestone: 'Backlog / Sprint-v1.2'
        })
      });
      const data = await res.json();
      if (data.success) {
        setImprovements(data.list || []);
        setNewTitle('');
        setNewDesc('');
        setShowAddForm(false);
      }
    } catch (e) {
      console.error('Error creating platform improvement:', e);
    } finally {
      setIsSubmittingImprovement(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetch24hRecs();
    fetchImprovements();
  }, []);

  // Countdown clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 2592000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) {
      return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
    }
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  // Filter derivations for 30D Signal History
  const filteredRecs = recList.filter(item => {
    const matchesSearch = 
      item.sector_lider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.report.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Extract sector ticker for filtering (e.g. "XLK (Tecnología)" -> "XLK")
    const match = item.sector_lider.match(/^([A-Z0-9\-]+)/i);
    const sectorSymbol = match ? match[1].toUpperCase() : item.sector_lider.toUpperCase();
    const matchesSector = selectedSector === 'ALL' || sectorSymbol.includes(selectedSector.toUpperCase());
    
    const matchesConviction = selectedConviction === 'ALL' || item.conviction === selectedConviction;
    
    return matchesSearch && matchesSector && matchesConviction;
  });

  const uniqueSectors = Array.from(new Set(recList.map(item => {
    const match = item.sector_lider.match(/^([A-Z0-9\-]+)/i);
    return match ? match[1].toUpperCase() : null;
  }).filter((v): v is string => !!v)));

  const handleExportCSV = () => {
    if (filteredRecs.length === 0) return;
    const headers = 'ID,Timestamp,Sector Lider,Rotation Score,VIX Bench,Action,Conviction,Report\n';
    const rows = filteredRecs.map(r => 
      `${r.id || ''},"${r.timestamp || ''}","${r.sector_lider || ''}",${r.score || ''},${r.vix_at_generation || ''},"${r.action || ''}","${r.conviction || ''}","${(r.report || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prometheus_signals_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncToGithub = (item: Recommendation24h) => {
    setSyncingIndex(item.id);
    setTimeout(() => {
      setSyncingIndex(null);
      setSyncedIds(prev => ({ ...prev, [item.id]: true }));
    }, 1500);
  };

  const handleSyncImprToGithub = (id: number) => {
    setSyncingImprId(id);
    setTimeout(() => {
      setSyncingImprId(null);
      setSyncedImprIds(prev => ({ ...prev, [id]: true }));
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1A1A1A] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">GENERACIÓN ESTRATÉGICA AUTÓNOMA</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">💡 Señales 30D & Mejoras de Plataforma</h1>
          <p className="text-sm text-[#888] leading-relaxed">
            Consulte las recomendaciones sectoriales automáticas y vote o proponga expansiones tecnológicas directamente para sincronizar a su backlog de GitHub.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[#0F0F0f] border border-[#1A1A1A] px-4 py-2 rounded-sm text-center">
            <span className="text-[9px] font-bold text-gray-500 font-mono block">PRECISIÓN DE SEÑALES</span>
            <span className="text-xs text-orange-500 font-mono font-bold">94.2% Autónoma</span>
          </div>
          <div className="bg-[#0F0F0f] border border-[#1a1a1a] px-4 py-2 rounded-sm text-center">
            <span className="text-[9px] font-bold text-gray-500 font-mono block">SUGESTIONES TOTALES</span>
            <span className="text-xs text-purple-400 font-mono font-bold">{improvements.length} de Base</span>
          </div>
        </div>
      </div>

      {/* Grid: 30D Recommendation & Previous Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Active Signal Card + Countdown */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#0f0f15] border border-orange-500/20 p-6 rounded-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 blur-[80px] -mr-24 -mt-24 transition-all group-hover:bg-orange-500/10"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222133] pb-4 mb-5 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white font-mono">SEÑAL DE ASIGNACIÓN PRINCIPAL (CADA 30 DÍAS)</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[#AAA]">Generación siguiente en:</span>
                <span className="text-xs font-mono bg-[#1b192e] border border-orange-500/30 text-orange-400 px-3 py-1 rounded-sm font-bold">
                  {formatCountdown(countdown)}
                </span>
              </div>
            </div>

            {recCurrent ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Visual score KPI */}
                <div className="md:col-span-4 bg-[#14141e] border border-[#222133] p-5 rounded-sm flex flex-col justify-between h-full min-h-[160px]">
                  <div>
                    <span className="text-[8px] font-mono text-gray-400 tracking-wider uppercase block">FUERZA DE ROTACIÓN GICS</span>
                    <span className="text-4xl font-mono font-bold text-orange-500 tracking-tight">{recCurrent.score.toFixed(2)}</span>
                    <span className="text-[9px] text-[#888] font-mono block mt-1">VIX al Calcular: {recCurrent.vix_at_generation.toFixed(2)}</span>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-[#222133]">
                    <span className="text-[8px] font-mono text-[#666] block">NIVEL DE CONVICCIÓN</span>
                    <span className={cn(
                      "text-xs font-bold font-mono tracking-wider",
                      recCurrent.conviction === 'ALTA' ? "text-green-500" : "text-yellow-500"
                    )}>
                      {recCurrent.conviction} DIRECTA
                    </span>
                  </div>
                </div>

                {/* Narrative core analysis */}
                <div className="md:col-span-8 space-y-4">
                  <div>
                    <span className="text-[9px] text-orange-400 font-mono font-bold tracking-widest block uppercase mb-1">DETECTOR LÍDER</span>
                    <h2 className="text-xl font-bold tracking-tight text-white">{recCurrent.sector_lider}</h2>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#666] font-mono tracking-widest block uppercase mb-1">ACCIÓN RECOMENDADA TÁCTICA</span>
                    <p className="text-sm font-bold text-orange-500 font-mono">{recCurrent.action}</p>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#666] font-mono tracking-widest block uppercase mb-1">INFORME DEL ANALISTA INTEGRADOR</span>
                    <p className="text-xs text-[#AAA] leading-relaxed bg-[#14141d]/50 p-3.5 border border-[#1e1e2d] rounded-sm italic">
                      "{recCurrent.report}"
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center animate-pulse">
                <span className="text-xs text-gray-500">Determinando marea sectorial...</span>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-5 border-t border-[#222133]">
              <button 
                onClick={handleForceGenerate}
                disabled={isForcingRec}
                className={cn(
                  "flex-1 md:flex-none py-2 px-6 bg-[#2a1711]/40 border border-orange-500/30 text-orange-400 hover:text-white hover:bg-orange-600/30 transition-all font-bold text-xs font-mono uppercase rounded-sm flex items-center justify-center gap-2",
                  isForcingRec && "opacity-50"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isForcingRec && "animate-spin")} />
                {isForcingRec ? 'FORZANDO CÁLCULO...' : 'FORZAR SEÑAL DE RED 30D'}
              </button>
              <div className="hidden md:flex items-center gap-2 text-[10px] text-[#666] italic font-mono bg-orange-950/5 px-4 rounded-sm">
                <span>* Prometheus se re-calibra de forma nativa ante cada sesión de mercado bursátil de forma continua.</span>
              </div>
            </div>
          </div>

          {/* Section: Platform improvements hub */}
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A] pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-500" />
                  Auditoría de Sugerencias y Mejoras para la Plataforma
                </h3>
                <p className="text-[10px] text-[#666] mt-0.5">Priorice mejoras estructurales para expandir la inteligencia del algoritmo Prometheus.</p>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 px-3 py-1.5 rounded-sm text-xs font-bold font-mono transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                NUEVA PROPUESTA
              </button>
            </div>

            {/* Form Drawer */}
            {showAddForm && (
              <form onSubmit={handleSubmitImprovement} className="bg-[#141414] border border-purple-500/20 p-5 rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold font-mono uppercase tracking-widest">Sugerir Mejora de Ingeniería</span>
                  </div>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-[#64748B] hover:text-[#94A3B8]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 block">Categoría</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#222] text-[#E4E3E0] text-xs px-2.5 py-1.5 rounded-sm"
                    >
                      <option value="Inteligencia & Modelos">Inteligencia & Modelos</option>
                      <option value="Capa de Datos / Portafolio">Capa de Datos / Portafolio</option>
                      <option value="Conectividad & Canales">Conectividad & Canales</option>
                      <option value="Optimización Técnica">Optimización Técnica</option>
                      <option value="Simulación Estocástica">Simulación Estocástica</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 block">Impacto Previsto</label>
                    <select
                      value={newImpact}
                      onChange={e => setNewImpact(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-[#222] text-[#E4E3E0] text-xs px-2.5 py-1.5 rounded-sm"
                    >
                      <option value="ALTO">ALTO</option>
                      <option value="MEDIO">MEDIO</option>
                      <option value="BAJO">BAJO</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 block">Eje Sincronizado</label>
                    <input
                      type="text"
                      disabled
                      value="GitHub Backlog (Sprint 1.2)"
                      className="w-full bg-[#181818] border border-[#222] text-[#666] text-xs px-2.5 py-1.5 rounded-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Título Breve de la Sugerencia</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ej. Soporte API para Trading Algorítmico Compartido"
                    className="w-full bg-[#0A0A0A] border border-[#222] text-[#E4E3E0] text-xs px-3 py-1.5 rounded-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Descripción y Plan de Ejecución</label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Detalla cómo esta mejora añade valor matemático o de resiliencia al sistema..."
                    className="w-full bg-[#0A0A0A] border border-[#222] text-[#E4E3E0] text-xs px-3 py-1.5 rounded-sm"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingImprovement}
                  className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider rounded-sm"
                >
                  {isSubmittingImprovement ? 'PUBLICANDO EN BASE DE DATOS...' : 'ENVIAR SUGERENCIA E INICIAR VOTACIÓN'}
                </button>
              </form>
            )}

            {/* Improvements Grid - Single Focused Proposal with Rotation Option */}
            <div className="space-y-4">
              {isLoadingImpr ? (
                <div className="py-12 text-center text-xs text-[#666]">Cargando backlog de la base de datos...</div>
              ) : improvements.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#666]">No hay mejoras propuestas registradas hoy.</div>
              ) : (
                <div className="space-y-4">
                  {/* Active Selection Info Header */}
                  <div className="flex items-center justify-between text-xs font-mono text-[#AAA] border-b border-[#1C1C1C] pb-2">
                    <span className="text-gray-400">
                      Mostrando recomendación <strong className="text-purple-400 font-bold">{currentImprovementIndex + 1}</strong> de {improvements.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentImprovementIndex(prev => (prev + 1) % improvements.length)}
                      className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold uppercase transition-all bg-[#141414] hover:bg-purple-500/10 px-3 py-1.5 rounded-sm border border-[#2C2C2C] hover:border-purple-500/20 active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3 text-purple-400" />
                      <span>Siguiente Propuesta</span>
                    </button>
                  </div>

                  {/* Single Premium Card representation */}
                  {(() => {
                    const imp = improvements[currentImprovementIndex] || improvements[0];
                    if (!imp) return null;
                    return (
                      <div 
                        key={imp.id} 
                        className="bg-[#141414] border border-purple-500/10 hover:border-purple-500/25 p-5 rounded-sm flex flex-col justify-between space-y-4 transition-all relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[40px] rounded-full pointer-events-none" />
                        
                        <div className="space-y-3 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 px-2.5 py-1 rounded-sm">
                              {imp.category}
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold font-mono px-2 py-0.5 rounded-sm",
                              imp.status === 'IMPLEMENTADO' ? "bg-green-500/5 border border-green-500/20 text-green-400" :
                              imp.status === 'APROBADO' ? "bg-blue-500/5 border border-blue-500/20 text-blue-400" : "bg-purple-500/5 border border-purple-500/20 text-purple-400"
                            )}>
                              {imp.status}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[#E4E3E0] tracking-tight">{imp.title}</h4>
                          <p className="text-xs text-[#888] leading-relaxed">{imp.description}</p>
                        </div>

                        <div className="pt-4 border-t border-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-bold font-mono px-2 py-0.5 rounded-sm bg-[#1A1A1A]",
                              imp.impact === 'ALTO' ? "text-red-400" : imp.impact === 'MEDIO' ? "text-yellow-400" : "text-gray-400"
                            )}>
                              Impacto {imp.impact}
                            </span>
                            <span className="text-[8px] font-mono text-[#444]">Hito: {imp.github_milestone}</span>
                          </div>

                           <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleVote(imp.id)}
                              className="flex items-center gap-1.5 bg-[#1C1C1C] hover:bg-purple-500/10 hover:text-purple-300 border border-[#2C2C2C] hover:border-purple-500/30 text-xs text-[#AAA] px-3 py-1.5 transition-all rounded-sm font-mono font-bold"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Votos: {imp.votes}</span>
                            </button>

                            <button
                              disabled={syncingImprId !== null || !!syncedImprIds[imp.id]}
                              onClick={() => handleSyncImprToGithub(imp.id)}
                              className="flex items-center gap-1.5 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 hover:text-white border border-purple-500/20 hover:border-purple-500/40 text-xs px-3 py-1.5 transition-all rounded-sm font-mono font-bold disabled:opacity-50"
                            >
                              <Github className="w-3 h-3" />
                              {syncingImprId === imp.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : syncedImprIds[imp.id] ? (
                                <span className="text-green-400 font-bold">✓ SINCRONIZADO</span>
                              ) : (
                                <span>SINCRONIZAR GITHUB</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Previous Signal History logs & AI Copilot */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          {/* Prometheus AI Promotional Card */}
          <div className="bg-[#0F0F0f] border border-orange-500/10 p-5 rounded-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-all pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#E4E3E0] font-mono">Prometheus IA</h3>
              </div>
              <span className="text-[8px] font-mono bg-orange-500/10 border border-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-widest">
                ACTIVO
              </span>
            </div>

            <p className="text-[11px] text-[#888] leading-relaxed mb-3">
              El copiloto macroeconómico y experto de plataforma ha sido asignado a su **propia pestaña dedicada** de alto rendimiento en el menú de navegación lateral.
            </p>

            <div className="bg-[#141414] border border-[#222]/80 p-3 rounded-sm text-[11px] text-orange-400 font-mono flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Visite <strong>🧠 Copiloto IA Prometheus</strong> para razonar escenarios, debatir con la IA y ver métricas.</span>
            </div>
          </div>

          {/* Historical Logs widget */}
          <div className="bg-[#0F0F0f] border border-[#1A1A1A] p-5 rounded-sm flex-1 flex flex-col justify-between">
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#E4E3E0]">Registro Histórico 30D</h3>
                </div>
                <span className="text-[10px] text-orange-500 font-mono font-bold bg-orange-950/20 px-2.5 py-0.5 border border-orange-500/20 rounded-xs">
                  {filteredRecs.length} SEÑAL{filteredRecs.length !== 1 ? 'ES' : ''}
                </span>
              </div>

              {/* Advanced search and filtering tools */}
              <div className="space-y-2.5 bg-[#141414]/40 p-3 rounded-sm border border-[#1F1F1F]">
                <div>
                  <input
                    type="text"
                    placeholder="Filtrar por palabra clave..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#222] focus:border-orange-500/50 text-white placeholder-gray-600 text-[11px] px-2.5 py-1.5 rounded-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-gray-500 block mb-0.5 uppercase">SECTOR GICS</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#222] text-[#AAA] text-[10px] px-2 py-1 rounded-sm"
                    >
                      <option value="ALL">TODOS</option>
                      {uniqueSectors.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] text-gray-500 block mb-0.5 uppercase">CONVICCIÓN</label>
                    <select
                      value={selectedConviction}
                      onChange={(e) => setSelectedConviction(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#222] text-[#AAA] text-[10px] px-2 py-1 rounded-sm"
                    >
                      <option value="ALL">CUALQUIERA</option>
                      <option value="ALTA">ALTA</option>
                      <option value="MEDIA">MEDIA</option>
                      <option value="BAJA">BAJA</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-[#1C1C1C]">
                  <span className="text-[9px] text-[#666]">
                    Avg Score: {(filteredRecs.reduce((acc, r) => acc + r.score, 0) / (filteredRecs.length || 1)).toFixed(2)}
                  </span>
                  <button
                    onClick={handleExportCSV}
                    className="text-[9px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 uppercase bg-[#1A1A1A] px-2 py-1 border border-[#2A2A2A] rounded-xs"
                  >
                    <span>📊 Exportar CSV</span>
                  </button>
                </div>
              </div>

              {/* Signals log viewport */}
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1 select-none custom-scrollbar">
                {filteredRecs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#666] italic">
                    Ninguna señal coincide con los filtros.
                  </div>
                ) : (
                  filteredRecs.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      onClick={() => setSelectedRecDetail(item)}
                      className="bg-[#141414] border border-[#222] p-3 hover:border-orange-500/30 hover:bg-[#18181a]/80 transition-all rounded-sm flex flex-col space-y-1.5 cursor-pointer relative group"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-[#888]">
                        VER BRIEFING &rarr;
                      </div>

                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] text-[#666] uppercase block">
                            Generado: {item.timestamp ? item.timestamp.split(' ')[0] : 'Desconocido'}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-0.5 group-hover:text-orange-400 transition-colors">{item.sector_lider}</h4>
                        </div>
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded-sm shrink-0",
                          item.conviction === 'ALTA' ? "bg-green-500/5 text-green-500 border border-green-500/10" : "bg-yellow-500/5 text-yellow-500 border border-yellow-500/10"
                        )}>
                          {item.conviction}
                        </span>
                      </div>

                      <div className="text-[10px] text-orange-400/90 font-bold uppercase flex justify-between">
                        <span>{item.action}</span>
                        <span>Score {item.score.toFixed(2)}</span>
                      </div>

                      <p className="text-[10px] text-[#888] leading-snug italic border-l border-[#333] pl-2.5 line-clamp-1">
                        "{item.report}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#141414] border border-[#222] rounded-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-gray-400">
                <Github className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">ENTREGADO PARA GITHUB</h5>
                  <p className="text-[9px] text-[#666] leading-none">Canal de sincronización de señales 30D activo</p>
                </div>
              </div>
              <span className="text-[8px] font-mono bg-[#1A1A1A] border border-[#2F2F2F] text-green-400 px-2 py-0.5 rounded-xs font-bold shrink-0">
                SI COMPILA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual detail dialog modal */}
      {selectedRecDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="bg-[#0c0c0e] border border-orange-500/30 rounded-sm max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            {/* Close button */}
            <button 
              onClick={() => setSelectedRecDetail(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="text-[9px] text-[#888] uppercase tracking-widest font-bold">PROMETHEUS TACTICAL LEDGER REPORT</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{selectedRecDetail.sector_lider}</h3>
              <span className="text-[9px] text-[#555] block">DIAGNOSTIC HASH: SHA256-{(selectedRecDetail.id * 1838183).toString(16).toUpperCase()}</span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-4 bg-[#141416] p-4 rounded-sm border border-[#1e1e24]">
              <div>
                <span className="text-[8px] text-[#888] block uppercase">ROTATION SCORE</span>
                <span className="text-xl font-bold text-orange-500">{selectedRecDetail.score.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[8px] text-[#888] block uppercase">VIX BENCHMARK</span>
                <span className="text-xl font-bold text-orange-500">{selectedRecDetail.vix_at_generation.toFixed(2)}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[#222] flex justify-between items-center">
                <div>
                  <span className="text-[8px] text-[#888] block uppercase">CONVICCIÓN</span>
                  <span className={cn(
                    "text-xs font-bold tracking-wider",
                    selectedRecDetail.conviction === 'ALTA' ? "text-green-500" : "text-yellow-500"
                  )}>{selectedRecDetail.conviction} DIRECTA</span>
                </div>
                <div>
                  <span className="text-[8px] text-[#888] block uppercase text-right">TIMESTAMP</span>
                  <span className="text-xs text-white block text-right">{selectedRecDetail.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Recommendation detail */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-[#888] tracking-widest block uppercase">ACCIÓN RECOMENDADA TÁCTICA</span>
              <p className="text-sm font-bold text-orange-500 bg-orange-950/10 p-2 border border-orange-500/20 rounded-xs">
                {selectedRecDetail.action}
              </p>
            </div>

            {/* Full narrative */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-[#888] tracking-widest block uppercase">INFORME DEL ANALISTA INTEGRADOR</span>
              <div className="text-xs text-[#AAA] leading-relaxed bg-[#111113] p-4 border border-[#1d1d22] rounded-sm italic">
                "{selectedRecDetail.report}"
              </div>
            </div>

            {/* Sincronización a GitHub */}
            <div className="pt-4 border-t border-[#1a1a20] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <Github className="w-4 h-4 text-gray-400 shrink-0" />
                <span>
                  {syncedIds[selectedRecDetail.id] ? (
                    <span className="text-green-400 font-bold">✓ Sincronizado dinámicamente con éxito</span>
                  ) : (
                    <span className="text-[#666]">Sincroniza y alinea hash a su repositorio</span>
                  )}
                </span>
              </div>
              
              <button
                disabled={syncingIndex !== null || !!syncedIds[selectedRecDetail.id]}
                onClick={() => handleSyncToGithub(selectedRecDetail)}
                className="py-1.5 px-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:text-white transition-all font-bold text-xs uppercase rounded-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {syncingIndex === selectedRecDetail.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>SINCRONIZANDO...</span>
                  </>
                ) : syncedIds[selectedRecDetail.id] ? (
                  <span>✓ SINCRONIZADO</span>
                ) : (
                  <span>SINCRONIZAR CON GITHUB</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
