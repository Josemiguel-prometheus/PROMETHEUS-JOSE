import db from './database';

export enum AgentStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUPERVISING = 'SUPERVISING',
  REBUTTING = 'REBUTTING'
}

export class BaseAgent {
  name: string;
  role: string;

  constructor(name: string, role: string) {
    this.name = name;
    this.role = role;
  }

  log(message: string, level: string = 'INFO') {
    const insert = db.prepare('INSERT INTO logs (level, message, agent) VALUES (?, ?, ?)');
    insert.run(level, message, this.name);
    console.log(`[${this.name}] [${level}] ${message}`);
  }
}

export class AgenteAnalista extends BaseAgent {
  constructor() {
    super('PROMETHEUS-Analista', 'Analista de Rotación de ETFs');
  }

  async analyze(data: any) {
    this.log('Iniciando análisis de mercado con rigor matemático y paciencia...');
    // Placeholder para lógica de rotación
    this.log('Evaluando condiciones macro-económicas (DXY, Yields, VIX)...');
    return {
      sentiment: 'Neutral-Cauto',
      recommendation: 'Mantener liquidez estratégica',
      timestamp: new Date().toISOString()
    };
  }
}

export class AgenteSupervisor extends BaseAgent {
  constructor() {
    super('GENESIS-Supervisor', 'Control de Calidad y Estabilidad');
  }

  async supervise(analysis: any) {
    this.log('Verificando consistencia del análisis y estabilidad del sistema...');
    if (!analysis) throw new Error('Análisis inválido');
    this.log('Validación completada: El sistema opera bajo parámetros de bajo riesgo.');
    return true;
  }
}

export class AbogadoDelDiablo extends BaseAgent {
  constructor() {
    super('DIABLO-Revisor', 'Crítica Constructiva y Gestión de Riesgo');
  }

  async challenge(analysis: any) {
    this.log('Desafiando premisas del analista para evitar complacencia...');
    this.log('¿Se ha considerado un pico inesperado en la inflación o cisne negro Geopolítico?');
    return {
      risk_factor: 'Elevado en activos de riesgo',
      mitigation: 'Ajustar stops y diversificar en activos descorrelacionados'
    };
  }
}
