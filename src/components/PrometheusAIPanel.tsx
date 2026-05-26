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
    <div className="space-y-2 text-left text-white">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Check for Headers
        if (trimmed.startsWith('#### ')) {
          return (
            <h5 key={lineIdx} className="text-xs font-bold font-mono text-orange-300 uppercase tracking-widest mt-3 mb-1">
              {trimmed.substring(5)}
            </h5>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lineIdx} className="text-sm font-bold text-orange-300 mt-4 mb-2 border-b border-[#2A2A2A] pb-1">
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
          return <hr key={lineIdx} className="border-t border-[#2A2A2A] my-4" />;
        }

        // Check for Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={lineIdx} className="border-l-2 border-orange-500/60 pl-3 py-1 bg-orange-500/10 my-2 text-white font-semibold italic rounded-r-xs">
              {renderInlineStyles(trimmed.substring(2))}
            </blockquote>
          );
        }

        // Check for Bullet points (starts with '-', '*', '•')
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          return (
            <div key={lineIdx} className="flex gap-2 items-start pl-2 py-0.5">
              <span className="text-orange-400 font-bold select-none text-[10px] mt-1.5">▪</span>
              <span className="flex-1 text-[#F3F4F6] text-[13px] leading-relaxed font-medium">
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
              <span className="flex-1 text-[#F3F4F6] text-[13px] leading-relaxed font-medium">
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
          <p key={lineIdx} className="leading-relaxed text-white text-[13px] font-medium">
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
  const tempParts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return tempParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-orange-300 font-bold font-sans">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-orange-950/40 border border-orange-500/30 text-orange-200 font-mono text-[11px] px-1.5 py-0.5 rounded-sm select-all font-bold">
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
    },
    {
      title: '📊 Cobertura Sectorial y VIX',
      prompt: '¿Cómo protegen el fondo los sectores defensivos XLU o XLP cuando el VIX supera el umbral crítico de 20 en la fórmula?'
    },
    {
      title: '📈 Simulación Estocástica',
      prompt: 'Explica cómo se aplica la teoría del caos y la compensación de colas gordas utilizando procesos estocásticos de Fokker-Planck.'
    },
    {
      title: '🧬 Caché & Yahoo Finance API',
      prompt: '¿De qué forma el backlog del sistema propone aliviar la cuota de peticiones y latencia en el backend mediante un módulo de caché robusto?'
    },
    {
      title: '🔌 Endpoints y Express API',
      prompt: '¿Qué servicios y rutas API expone el backend en server.ts para sincronizar el estado del frontend y persistir las señales en la base de datos?'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#2A2A2A] pb-4 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse inline-block"></span>
            🧠 Prometheus IA : Central de Soporte Cognitivo
          </h2>
          <p className="text-xs text-gray-300 font-mono mt-1">
            Unidad cognitiva experta en base de código, algoritmo matemático y debate recursivo inter-agentes del ecosistema.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 font-mono text-[10px] bg-[#0A0A0A] border border-[#222] px-3.5 py-1.5 rounded-sm">
          <BookOpen className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-400 font-bold uppercase">Memoria Integrada local</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-200">Grounding Activo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Telemetry / System ground representation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0A0A0A] border border-[#222] p-5 rounded-sm">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-orange-400 border-b border-[#222] pb-2.5 mb-4 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              Nivel de Grounding
            </h3>
            
            <p className="text-xs text-gray-200 leading-relaxed mb-4 font-medium">
              La IA de Prometheus toma decisiones complementando su conocimiento macro estructural con el estado de las variables y bases de datos locales:
            </p>

            <div className="space-y-2.5 border-b border-[#222] pb-4">
              <div className="bg-[#141414] border border-[#2A2A2A] p-2.5 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-450" />
                  <span className="text-[11px] font-mono text-gray-200 font-semibold">Histórico de Señales 24h</span>
                </div>
                <span className="text-[11px] font-mono bg-orange-950/40 text-orange-300 px-2 py-0.5 rounded-xs font-bold border border-orange-500/30">
                  {platformStats.recommendationsCount} Registros
                </span>
              </div>

              <div className="bg-[#141414] border border-[#2A2A2A] p-2.5 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-mono text-gray-200 font-semibold">Votación & Backlog</span>
                </div>
                <span className="text-[11px] font-mono bg-purple-950/40 text-purple-300 px-2 py-0.5 rounded-xs font-bold border border-purple-500/30">
                  {platformStats.improvementsCount} Propuestas
                </span>
              </div>

              <div className="bg-[#141414] border border-[#2A2A2A] p-2.5 rounded-sm flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-300 font-semibold">Última Señal:</span>
                <span className="text-[11px] font-bold text-white max-w-[150px] truncate">{platformStats.lastSignal || 'Buscando...'}</span>
              </div>

              <div className="bg-[#141414] border border-[#2A2A2A] p-2.5 rounded-sm flex items-center justify-between">
                <span className="text-[11px] font-mono text-gray-300 font-semibold">Nivel de Convicción:</span>
                <span className={cn(
                  "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-xs border",
                  platformStats.conviction === 'ALTA' ? 'bg-green-950/40 text-green-300 border-green-500/40' : 'bg-yellow-950/40 text-yellow-500 border-yellow-500/40'
                )}>
                  {platformStats.conviction || 'ESPERANDO'}
                </span>
              </div>
            </div>
            
            <div className="pt-4">
              <div className="flex items-center gap-2 text-[10px] text-green-400 font-mono font-bold">
                <RefreshCw className="w-3 h-3 animate-spin text-green-400" />
                <span>Sincronización automatizada Github ok</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-[#222] p-5 rounded-sm space-y-3">
            <h4 className="text-[11px] font-bold font-mono uppercase text-white tracking-widest border-b border-[#222] pb-1.5 flex items-center gap-2">Directrices Metodológicas</h4>
            <p className="text-[11px] text-gray-200 leading-relaxed font-semibold">
              Soporta queries complejas como análisis diferencial de sectores, impactos sectoriales de tipos de interés, simulación estadística e ingeniería del software de Prometheus.
            </p>
            <div className="p-3 bg-[#141414] border border-[#222] rounded-xs text-[10px] font-mono text-orange-300 leading-relaxed font-bold">
              "El modelo calcula las probabilidades aplicando optimización bayesiana en tiempo real."
            </div>
          </div>
        </div>

        {/* Right column: High Fidelity Chat Terminal */}
        <div className="lg:col-span-8 flex flex-col bg-[#0A0A0A] border border-[#222] rounded-sm p-6 min-h-[500px]">
          
          {/* Active Terminal Header */}
          <div className="w-full flex items-center justify-between border-b border-[#222] pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-orange-600/10 border border-orange-500/40 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-orange-400 shadow-orange-500/50" />
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-[#0A0A0A] rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Core-AI Interpreter</h3>
                <p className="text-[10px] text-gray-300 font-mono">Status: Awaiting input stream</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider">
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
                    ? "bg-[#1A1A1A] border-[#3F3F3F] text-white ml-auto flex-row-reverse shadow-md"
                    : "bg-[#131313] border-[#2A2A2A] text-white mr-auto shadow-md"
                )}
              >
                {/* Avatar icon based on role */}
                <div className={cn(
                  "w-7 h-7 rounded-sm flex items-center justify-center shrink-0 font-mono text-[9px] font-bold border",
                  msg.role === 'user'
                    ? "bg-orange-600/20 border-orange-500/40 text-orange-300"
                    : "bg-purple-600/20 border-purple-500/45 text-purple-300"
                )}>
                  {msg.role === 'user' ? 'USR' : 'PMT'}
                </div>

                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-1.5 border-b border-[#2A2A2A] pb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-300 font-bold">
                      {msg.role === 'user' ? 'Usuario Autorizado' : 'Core Engine Brain'}
                    </span>
                    <span className="text-[8px] text-gray-400 font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <FormattedMarkdown content={msg.content} />
                </div>
              </div>
            ))}

            {isSending && (
              <div className="bg-[#131313] border border-[#2A2A2A] p-4 rounded-sm text-xs text-white mr-auto md:max-w-[85%] flex items-center gap-3">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-orange-300 font-bold">PROMETHEUS ENGINE IS RETRIEVING DATA...</p>
                  <p className="text-gray-200 font-medium">Computando análisis macroeconómico y consultando el contexto local de base de datos...</p>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick recommendations panel */}
          <div className="border-t border-[#222] pt-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-extrabold mb-2 px-1">Escenarios Sugeridos para Consulta Rápida</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[175px] overflow-y-auto pr-1">
              {presetQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q.prompt)}
                  disabled={isSending}
                  className="bg-[#141414] hover:bg-[#1E1E1E] border border-[#222] hover:border-[#3E3E3E] transition-all p-2.5 rounded-sm text-left text-xs transition-colors group flex items-start gap-2.5 disabled:opacity-50"
                >
                  <CornerDownRight className="w-3.5 h-3.5 mt-0.5 text-orange-400 group-hover:text-orange-300 transition-colors shrink-0" />
                  <div>
                    <div className="font-bold text-white group-hover:text-orange-400 transition-colors text-[11px] mb-0.5">{q.title}</div>
                    <div className="text-[10px] text-gray-300 group-hover:text-gray-100 line-clamp-1">{q.prompt}</div>
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
                className="flex-1 bg-[#141414] border border-[#222] focus:border-orange-500/50 rounded-sm text-xs px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20 disabled:opacity-50 transition-all font-sans font-medium"
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
