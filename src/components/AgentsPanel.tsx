import { Users, Bot, Zap, ShieldAlert, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

const AGENTS = [
  {
    id: 'analyst',
    name: 'PROMETHEUS-Analista',
    role: 'Analista de Rotación de ETFs',
    description: 'Motor de análisis cuantitativo enfocado en correlaciones macro y momentum de sectores GICS.',
    icon: Cpu,
    color: 'text-orange-500',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/5',
    principles: ['Rigor Matemático', 'Paciencia Estratégica', 'Neutralidad de Sesgo']
  },
  {
    id: 'supervisor',
    name: 'GENESIS-Supervisor',
    role: 'Control de Calidad y Estabilidad',
    description: 'Sistema guardián que verifica la consistencia de los datos y asegura que las recomendaciones no excedan el riesgo permitido.',
    icon: ShieldAlert,
    color: 'text-blue-500',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/5',
    principles: ['Estabilidad Sistémica', 'Robustez de Datos', 'Disciplina']
  },
  {
    id: 'devil',
    name: 'DIABLO-Revisor',
    role: 'Abogado del Diablo / Gestión de Riesgo',
    description: 'Módulo de pensamiento lateral dedicado a encontrar fallas en las tesis de inversión y proponer escenarios de estrés.',
    icon: Zap,
    color: 'text-purple-500',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/5',
    principles: ['Pensamiento Crítico', 'Antifragilidad', 'Evolución Constante']
  }
];

export default function AgentsPanel() {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight mb-2">Arquitectura de Agentes Inteligentes</h2>
        <p className="text-sm text-[#888] leading-relaxed">
          PROMETHEUS no es solo código; es un ecosistema de agentes con roles definidos que trabajan de forma asíncrona para destilar el ruido del mercado en inteligencia accionable. Los agentes operan bajo la "Esencia Genesis" de disciplina y largo plazo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {AGENTS.map((agent) => (
          <div key={agent.id} className={cn(
            "border p-6 rounded-sm flex flex-col h-full transition-all hover:translate-y-[-2px]",
            agent.borderColor,
            agent.bgColor
          )}>
            <div className="flex items-start justify-between mb-6">
              <div className={cn("p-3 rounded-md border", agent.borderColor)}>
                <agent.icon className={cn("w-6 h-6", agent.color)} />
              </div>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                ONLINE
              </span>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold tracking-tight mb-1">{agent.name}</h3>
              <p className="text-xs font-bold text-[#666] uppercase tracking-tighter mb-4">{agent.role}</p>
              <p className="text-xs text-[#AAA] leading-relaxed mb-6">
                {agent.description}
              </p>
              
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">Principios Genesis:</p>
                <div className="flex flex-wrap gap-2">
                  {agent.principles.map((p) => (
                    <span key={p} className="text-[10px] font-medium px-2 py-1 bg-[#141414] border border-[#2A2A2A] text-[#888] rounded-sm">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
              <button className="w-full py-2 bg-[#141414] border border-[#2A2A2A] hover:border-[#444] text-xs font-bold transition-all uppercase tracking-widest text-[#AAA] hover:text-white">
                Ver Logs del Agente
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Connection State Info */}
      <div className="p-6 bg-[#0F0F0F] border border-[#1A1A1A] rounded-sm">
        <div className="flex items-center gap-4 mb-4">
          <refresh-cw className="w-4 h-4 text-orange-500" />
          <h4 className="text-sm font-bold uppercase tracking-widest">Estado de la Orquestación</h4>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="bg-[#141414] p-3 border border-[#2A2A2A] rounded-sm">
              <p className="text-[10px] text-[#444] font-bold uppercase mb-1">Latencia del Analista</p>
              <p className="text-lg font-mono font-bold">1.2s</p>
            </div>
            <div className="bg-[#141414] p-3 border border-[#2A2A2A] rounded-sm">
              <p className="text-[10px] text-[#444] font-bold uppercase mb-1">Consistencia del Supervisor</p>
              <p className="text-lg font-mono font-bold text-green-500">99.8%</p>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#666] leading-relaxed italic border-l-2 border-orange-500/30 pl-4 py-1">
              "El sistema sincroniza cada ciclo con el pulso del mercado global, priorizando la integridad de los datos sobre la velocidad de ejecución. La arquitectura de micro-intervenciones permite ajustes granulares sin comprometer la estabilidad del sistema."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
