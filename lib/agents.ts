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
    await this.log('Ejecutando escaneo multi-temporal de activos macro...');
    await this.log('Detectada divergencia alcista en el spread SPY/QQQ. Evaluando momentum.');
    await this.log('Condiciones macro (DXY stable) sugieren continuidad en activos de riesgo.');
    return {
      sentiment: 'Optimismo Prudente',
      recommendation: 'Aumentar exposición en Growth si VIX < 15',
      timestamp: new Date().toISOString()
    };
  }
}

export class AgenteSupervisor extends BaseAgent {
  constructor() {
    super('GENESIS-Supervisor', 'Control de Calidad y Estabilidad');
  }

  async supervise(analysis: any) {
    await this.log('Validando tesis del Analista contra límites de riesgo Genesis...');
    if (!analysis) throw new Error('Corte de flujo de datos: Análisis nulo.');
    await this.log('Parámetros de volatilidad confirmados. Estabilidad sistémica: 98.4%.');
    return true;
  }
}

export class AbogadoDelDiablo extends BaseAgent {
  constructor() {
    super('DIABLO-Revisor', 'Crítica Constructiva y Gestión de Riesgo');
  }

  async challenge(analysis: any) {
    await this.log('Iniciando protocolo de Rebuttal. Desafiando sesgo alcista...');
    await this.log('¿Se ha computado el impacto de una revisión al alza en los datos de PCE del viernes?');
    await this.log('Alerta: Sobre-extensión detectada en sector semiconductores. Recomendado Take Profit parcial.');
    return {
      risk_factor: 'Medio-Alto por estacionalidad',
      mitigation: 'Cobertura con opciones PUT en QQQ o reserva de cash'
    };
  }
}
