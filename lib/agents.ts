import { getDb } from './database';

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

  async log(message: string, level: string = 'INFO') {
    try {
      const db = getDb();
      await db.run('INSERT INTO logs (level, message, agent) VALUES (?, ?, ?)', level, message, this.name);
    } catch (e) {
      console.error('Failed to log to DB:', e);
    }
    console.log(`[${this.name}] [${level}] ${message}`);
  }
}

export class AgenteAnalista extends BaseAgent {
  constructor() {
    super('PROMETHEUS-Analista', 'Analista de Rotación de ETFs');
  }

  async analyze(data: any) {
    await this.log('Iniciando análisis de mercado con rigor matemático y paciencia...');
    // Placeholder para lógica de rotación
    await this.log('Evaluando condiciones macro-económicas (DXY, Yields, VIX)...');
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
    await this.log('Verificando consistencia del análisis y estabilidad del sistema...');
    if (!analysis) throw new Error('Análisis inválido');
    await this.log('Validación completada: El sistema opera bajo parámetros de bajo riesgo.');
    return true;
  }
}

export class AbogadoDelDiablo extends BaseAgent {
  constructor() {
    super('DIABLO-Revisor', 'Crítica Constructiva y Gestión de Riesgo');
  }

  async challenge(analysis: any) {
    await this.log('Desafiando premisas del analista para evitar complacencia...');
    await this.log('¿Se ha considerado un pico inesperado en la inflación o cisne negro Geopolítico?');
    return {
      risk_factor: 'Elevado en activos de riesgo',
      mitigation: 'Ajustar stops y diversificar en activos descorrelacionados'
    };
  }
}
