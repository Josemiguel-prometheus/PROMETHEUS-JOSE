import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Cpu, 
  TrendingUp, 
  Brain, 
  CheckCircle, 
  Lock, 
  BookOpen, 
  MessageSquare,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  CornerDownRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlatformStateSummary {
  recommendationsCount: number;
  improvementsCount: number;
  lastSignal?: string;
  conviction?: string;
}

// Highly robust custom markdown renderer for Prometheus AI responses
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-left text-gray-200">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Check for Headers
        if (trimmed.startsWith('#### ')) {
          return (
            <h5 key={lineIdx} className="text-xs font-bold font-mono text-orange-400 uppercase tracking-widest mt-3 mb-1">
              {trimmed.substring(5)}
            </h5>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lineIdx} className="text-sm font-bold text-orange-400 mt-4 mb-2 border-b border-[#1A1A1A] pb-1">
              {trimmed.substring(4)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lineIdx} className="text-base font-bold text-white mt-5 mb-2">
              {trimmed.substring(3)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={lineIdx} className="text-lg font-black text-white mt-6 mb-3">
              {trimmed.substring(2)}
            </h2>
          );
        }

        // Check for Horizontal Rule
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={lineIdx} className="border-t border-[#1A1A1A] my-4" />;
        }

        // Check for Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={lineIdx} className="border-l-2 border-orange-500/40 pl-3 py-1 bg-orange-500/5 my-2 text-[#D1D5DB] italic rounded-r-xs">
              {renderInlineStyles(trimmed.substring(2))}
            </blockquote>
          );
        }

        // Check for Bullet points (starts with '-', '*', '•')
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          return (
            <div key={lineIdx} className="flex gap-2 items-start pl-2 py-0.5">
              <span className="text-orange-500 font-bold select-none text-[10px] mt-1.5">▪</span>
              <span className="flex-1 text-[#D1D5DB] leading-relaxed">
                {renderInlineStyles(trimmed.substring(2))}
              </span>
            </div>
          );
        }

        // Check for Numbered lists (e.g. "1. ")
        const matchNum = trimmed.match(/^(\d+)\.\s(.*)/);
        if (matchNum) {
          return (
            <div key={lineIdx} className="flex gap-2 items-start pl-2 py-0.5">
              <span className="text-orange-400 font-mono font-bold select-none text-[11px] mt-0.5">{matchNum[1]}.</span>
              <span className="flex-1 text-[#D1D5DB] leading-relaxed">
                {renderInlineStyles(matchNum[2])}
              </span>
            </div>
          );
        }

        // Plain line - handle empty line as block spacer
        if (trimmed === '') {
          return <div key={lineIdx} className="h-2" />;
        }

        // Standard Paragraph
        return (
          <p key={lineIdx} className="leading-relaxed text-[#DFDFE4] text-[12.5px]">
            {renderInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
};

// Sub-parser for inline elements like **bold** and `code`
const renderInlineStyles = (text: string): React.ReactNode => {
  if (!text) return '';

  // Process bold blocks and inline code tags
  // We'll alternate splitting
  const parts: React.ReactNode[] = [];
  
  // Regex to split by **bold** or `code`
  // To keep it clean and robust, we can split on both or sequentially parse
  const tempParts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return tempParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-orange-400 font-semibold font-sans">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-orange-950/20 border border-orange-500/20 text-orange-200 font-mono text-[11px] px-1.5 py-0.2 rounded-xs select-all">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

export default function PrometheusAIPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '### 🧠 COPILOTO EXPERTO DE LA PLATAFORMA PROMETHEUS\nBienvenido, Ingeniero. Soy **Prometheus IA**, el agente cognitivo de nivel superior y custodio de la arquitectura de este ecosistema.\n\nEstoy **altamente entrenado** y de manera **exclusiva** para guiarte en:\n- 🛠️ **Arquitectura del Sistema**: Estructura general de Express, Vite/React, Streamlit y base de datos SQLite.\n- ⚙️ **Algoritmo de Rotación**: Formulación de momentum sectorial y mitigación de cola según el VIX.\n- 🤖 **Debate de Agentes (lib/agents.ts)**: El flujo consultivo del Pentágono entre el Analista, Supervisor y Revisor del Diablo.\n- 🗄️ **Base de Datos & Backlog**: Análisis crítico de propuestas y mejoras persistidas de ingeniería de la plataforma.\n\n¿Qué consulta técnica de base de código, optimización matemática o auditoría de agentes deseas iniciar hoy?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStateSummary>({
    recommendationsCount: 0,
    improvementsCount: 0
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Fetch contextual platform stats to display in the side telemetry
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [recRes, imprRes] = await Promise.all([
          fetch('/api/recommendations/24h'),
          fetch('/api/improvements')
        ]);
        const recData = await recRes.json();
        const imprData = await imprRes.json();

        setPlatformStats({
          recommendationsCount: (recData.list || []).length,
          improvementsCount: (imprData || []).length,
          lastSignal: recData.current?.sector_lider || 'N/A',
          conviction: recData.current?.conviction || 'N/A'
        });
      } catch (err) {
        console.error('Error fetching platform context for AI panel:', err);
      }
    };
    fetchStats();
  }, []);

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputValue;
    if (!text.trim() || isSending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `**Error de procesamiento técnico:**\nNo se pudo obtener una respuesta válida. Motivo: ${data.error || 'Respuesta vacía.'}` }]);
      }
    } catch (err: any) {
      console.error('Error in agent chat UI call:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error de conectividad de red:**\nSe perdió la sincronización con el servidor de IA.\n\n\`\`\`\n${err.message || err}\n\`\`\`` }]);
    } finally {
      setIsSending(false);
    }
  };

  const presetQueries = [
    {
      title: '📂 Arquitectura del Sistema',
      prompt: 'Explícame detalladamente la arquitectura técnica del sistema, incluyendo los archivos server.ts, app.py, lib/agents.ts y cómo colaboran en conjunto.'
    },
    {
      title: '⚙️ Algoritmo de Rotación',
      prompt: '¿Cuál es la fórmula matemática del algoritmo de rotación de ETFs y cómo reacciona cuantitativamente según las métricas del VIX?'
    },
    {
      title: '🤖 Pentágono de Agentes',
      prompt: 'Detalla el rol y funcionamiento cíclico de los tres agentes del sistema (Analista, Supervisor y Abogado del Diablo) detallados en lib/agents.ts.'
    },
    {
      title: '🛠️ Auditoría de Backlog & DB',
      prompt: 'Revisa críticamente las propuestas técnicas vigentes en el backlog sqlite3 y destaca cuáles tienen la mayor viabilidad e impacto.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1A1A1A] pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse inline-block"></span>
            🧠 Prometheus IA : Central de Soporte Cognitivo
          </h2>
          <p className="text-xs text-[#666] font-mono mt-1">
            Unidad cognitiva experta en base de código, algoritmo matemático y debate recursivo inter-agentes del ecosistema.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 font-mono text-[10px] bg-[#0F0F0F] border border-[#1A1A1A] px-3.5 py-1.5 rounded-sm">
          <BookOpen className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-400 font-bold uppercase">Memoria Integrada local</span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-300">Grounding Activo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Telemetry / System ground representation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-5 rounded-sm">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-orange-400 border-b border-[#1A1A1A] pb-2.5 mb-4 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              Nivel de Grounding
            </h3>
            
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              La IA de Prometheus toma decisiones complementando su conocimiento macro estructural con el estado de las variables y bases de datos locales:
            </p>

            <div className="space-y-2.5">
              <div className="bg-[#141414] border border-[#222] p-2.5 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-[11px] font-mono text-gray-300">Histórico de Señales 24h</span>
                </div>
                <span className="text-[11px] font-mono bg-orange-950/20 text-orange-400 px-2 py-0.5 rounded-xs font-bold border border-orange-500/10">
                  {platformStats.recommendationsCount} Registros
                </span>
              </div>

              <div className="bg-[#141414] border border-[#222] p-2.5 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-mono text-gray-300">Votación & Backlog</span>
                </div>
                <span className="text-[11px] font-mono bg-purple-950/20 text-purple-400 px-2 py-0.5 rounded-xs font-bold border border-purple-500/10">
                  {platformStats.improvementsCount} Propuestas
                </span>
              </div>

              <div className="bg-[#141414] border border-[#222] p-2.5 rounded-sm flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-400">Última Señal del Sistema:</span>
                <span className="text-[11px] font-bold text-white max-w-[150px] truncate">{platformStats.lastSignal || 'Buscando...'}</span>
              </div>

              <div className="bg-[#141414] border border-[#222] p-2.5 rounded-sm flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-400">Nivel de Convicción:</span>
                <span className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-xs border",
                  platformStats.conviction === 'ALTA' ? 'bg-green-950/30 text-green-400 border-green-500/10' : 'bg-yellow-950/30 text-yellow-500 border-yellow-500/10'
                )}>
                  {platformStats.conviction || 'ESPERANDO'}
                </span>
              </div>
            </div>
            
            <div className="border-t border-[#1A1A1A] pt-4 mt-5">
              <div className="flex items-center gap-2 text-[10px] text-[#666] font-mono">
                <RefreshCw className="w-3 h-3 animate-spin text-green-500" />
                <span>Sincronización automatizada Github ok</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0F0F0f] border border-[#1A1A1A] p-5 rounded-sm space-y-3">
            <h4 className="text-[11px] font-bold font-mono uppercase text-gray-300">Directrices Metodológicas</h4>
            <p className="text-[11px] text-[#888] leading-relaxed">
              Soporta queries complejas como análisis diferencial de sectores, impactos sectoriales de tipos de interés, simulación estadística e ingeniería del software de Prometheus.
            </p>
            <div className="p-3 bg-[#141414] border border-[#222] rounded-xs text-[10px] font-mono text-orange-400/80 leading-relaxed">
              "El modelo calcula las probabilidades aplicando optimización bayesiana en tiempo real."
            </div>
          </div>
        </div>

        {/* Right column: High Fidelity Chat Terminal */}
        <div className="lg:col-span-8 flex flex-col bg-[#0F0F0F] border border-[#1A1A1A] rounded-sm p-6 min-h-[500px]">
          
          {/* Active Terminal Header */}
          <div className="w-full flex items-center justify-between border-b border-[#222] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-orange-600/10 border border-orange-500/30 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-orange-500" />
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-[#0F0F0F] rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Core-AI Interpreter</h3>
                <p className="text-[10px] text-[#888] font-mono">Status: Awaiting input stream</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono bg-green-500/5 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">
                Grounded OK
              </span>
            </div>
          </div>

          {/* Message log space */}
          <div className="flex-1 overflow-y-auto max-h-[480px] min-h-[350px] space-y-4 pr-2 mb-4 custom-scrollbar">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={cn(
                  "p-4 rounded-sm border transition-all md:max-w-[85%] leading-relaxed flex items-start gap-4",
                  msg.role === 'user'
                    ? "bg-[#111111] border-[#333] text-[#E4E3E0] ml-auto flex-row-reverse"
                    : "bg-[#161616]/40 border-[#1A1A1A] text-gray-300 mr-auto"
                )}
              >
                {/* Avatar icon based on role */}
                <div className={cn(
                  "w-7 h-7 rounded-sm flex items-center justify-center shrink-0 font-mono text-[9px] font-bold border",
                  msg.role === 'user'
                    ? "bg-orange-600/10 border-orange-500/30 text-orange-400"
                    : "bg-purple-600/10 border-purple-500/30 text-purple-400"
                )}>
                  {msg.role === 'user' ? 'USR' : 'PMT'}
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5 border-b border-[#222]/30 pb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#777]">
                      {msg.role === 'user' ? 'Usuario Autorizado' : 'Core Engine Brain'}
                    </span>
                    <span className="text-[8px] text-[#555] font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <FormattedMarkdown content={msg.content} />
                </div>
              </div>
            ))}

            {isSending && (
              <div className="bg-[#161616]/40 border border-[#1D1D1D] p-4 rounded-sm text-xs text-gray-400 mr-auto md:max-w-[85%] flex items-center gap-3">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-gray-500">PROMETHEUS ENGINE IS RETRIEVING DATA...</p>
                  <p className="text-gray-300">Computando análisis macroeconómico y consultando el contexto local de base de datos...</p>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick recommendations panel */}
          <div className="border-t border-[#1A1A1A] pt-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#555] mb-2 px-1">Escenarios Sugeridos para Consulta Rápida</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.prompt)}
                  disabled={isSending}
                  className="bg-[#141414] hover:bg-[#1C1C1C]/70 border border-[#222] hover:border-[#333] transition-all p-2.5 rounded-sm text-left text-xs transition-colors group flex items-start gap-2.5 disabled:opacity-50"
                >
                  <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-orange-500/70 group-hover:text-orange-400 transition-colors shrink-0" />
                  <div>
                    <div className="font-bold text-[#CCCCCC] group-hover:text-white transition-colors text-[11px] mb-0.5">{q.title}</div>
                    <div className="text-[10px] text-[#666] line-clamp-1">{q.prompt}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Main user entry form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2.5"
            >
              <input 
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Introduzca su hipótesis macroeconómica o consulta técnica..."
                disabled={isSending}
                className="flex-1 bg-[#141414] border border-[#222] focus:border-orange-500/50 rounded-sm text-xs px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/20 disabled:opacity-50 transition-all font-sans"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-xs px-6 py-3 rounded-sm font-mono tracking-wider transition-all disabled:bg-orange-950/20 disabled:text-orange-900 flex items-center gap-2"
              >
                <span>COMPUTAR</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
