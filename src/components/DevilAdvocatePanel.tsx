import { useState, useEffect } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  HelpCircle, 
  Scale, 
  TrendingDown, 
  Play, 
  AlertTriangle,
  Flame, 
  CheckCircle, 
  RefreshCw 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

interface Criticism {
  sector: string;
  ticker: string;
  bullThesis: string;
  rebuttal: string;
  hedge: string;
}

const SECTOR_CRITICISMS: Criticism[] = [
  {
    sector: "Tecnología",
    ticker: "XLK",
    bullThesis: "El impulso de la inteligencia artificial y el gasto de infraestructura mantendrán múltiplos elevados indefinidamente.",
    rebuttal: "La concentración extrema en 3 valores (NVIDIA, Apple, Microsoft) distorsiona la realidad de mercado. Una moderación de CAPEX de estas empresas provocará un desplome violento con efecto dominó.",
    hedge: "Adquirir opciones PUT de QQQ con vencimiento a 90 días o sobreponderar TLT."
  },
  {
    sector: "Energía",
    ticker: "XLE",
    bullThesis: "La escasez de oferta geopolítica y el dividendo robusto garantizan un suelo alto de valoración.",
    rebuttal: "La erosión estructural de demanda a favor de renovables y posibles acuerdos comerciales de gran envergadura desactivará el efecto premium del crudo rápidamente.",
    hedge: "Tener reservas defensivas en GLD (Oro) para cobertura macro directa inducida por inflación."
  },
  {
    sector: "Salud",
    ticker: "XLV",
    bullThesis: "El sector es inmune a las recesiones por el envejecimiento demográfico orgánico.",
    rebuttal: "El riesgo político regulatorio de fijación de precios en medicamentos en año electoral impacta los márgenes históricos de farmacéuticas core.",
    hedge: "Asignación del 10% a bonos corporativos de alto grado líquidos."
  },
  {
    sector: "Financiero",
    ticker: "XLF",
    bullThesis: "Tasas altas prolongadas incrementan el margen de intermediación neto y flujo de préstamos.",
    rebuttal: "Las tasas altas destruyen los balances de los bancos regionales debido a pérdidas no realizadas en carteras HTM. Riesgo de estrés sistémico latente.",
    hedge: "Reducir bancos tradicionales y desviar ponderación hacia gestores de capital alternativo."
  },
  {
    sector: "Consumo Staple (Básico)",
    ticker: "XLP",
    bullThesis: "Poder de fijación de precios firme y baja elasticidad de demanda aseguran dividendos estables.",
    rebuttal: "La fatiga por inflación empuja a los consumidores hacia marcas blancas de distribuidores directos, contraiendo el margen bruto de las marcas premium de consumo.",
    hedge: "Reasignar hacia Servicios Públicos (XLU) que capturan la demanda constante de energía."
  }
];

export default function DevilAdvocatePanel() {
  const [chosenSector, setChosenSector] = useState<Criticism>(SECTOR_CRITICISMS[0]);
  
  // Stress Sliders
  const [yieldSpike, setYieldSpike] = useState(50); // bps
  const [vixLevel, setVixLevel] = useState(20); // index
  const [dxyStrength, setDxyStrength] = useState(101); // DXY level
  const [spendingSlump, setSpendingSlump] = useState(2); // % slump
  
  // Simulated Resilience
  const [resilienceScore, setResilienceScore] = useState(75);
  const [stressExplanation, setStressExplanation] = useState("");

  // Monte Carlo states
  const [simData, setSimData] = useState<any[]>([]);
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [cvar95, setCvar95] = useState(0);
  const [survivalProb, setSurvivalProb] = useState(0);

  // Recalculate stress metrics
  useEffect(() => {
    // Basic heuristics to determine resilience
    let score = 100;
    score -= (yieldSpike / 150) * 20; // Technology & utilities suffer from yields
    score -= ((vixLevel - 15) / 30) * 25; // General volatility
    score -= ((dxyStrength - 99) / 10) * 15; // Emerging markets/commodities stress
    score -= (spendingSlump / 10) * 20; // Cyclicals stress

    score = Math.max(5, Math.min(100, Math.floor(score)));
    setResilienceScore(score);

    // Dynamic warning text
    if (score < 45) {
      setStressExplanation("ESTRÉS ALTO: Riesgo extremo de rotación forzada. Se sugiere diversificación inmediata hacia CASH o activos protectores como GLD/TLT.");
    } else if (score < 70) {
      setStressExplanation("ESTRÉS MODERADO: La cartera aguanta pero experimenta fluctuación elevada. Reduzca cíclicos sensibles al rendimiento (XLK, XLY).");
    } else {
      setStressExplanation("SITUACIÓN RESILIENTE: Parámetros del modelo estables. La convicción alcista se mantiene intacta bajo el análisis del Abogado del Diablo.");
    }
  }, [yieldSpike, vixLevel, dxyStrength, spendingSlump]);

  // Monte Carlo Simulation Runner
  const handleRunSimulation = () => {
    setIsRunningSim(true);
    
    setTimeout(() => {
      const days = 60;
      const tPaths: number[][] = [];
      const numPaths = 12;
      const initialPrice = 100;
      
      // Drift & Volatility parameters based on current stress
      const drift = 0.0003 - (spendingSlump * 0.0001) - (yieldSpike * 0.000002);
      const volatility = 0.012 + (vixLevel * 0.0005);

      for (let p = 0; p < numPaths; p++) {
        const path = [initialPrice];
        for (let d = 1; d <= days; d++) {
          const rand = Math.sin(Math.random() * Math.PI * 2) * Math.sqrt(-2 * Math.log(Math.random() || 0.001)); // Box-Muller transform
          const lastPrice = path[d - 1];
          const newPrice = lastPrice * Math.exp(drift - 0.5 * Math.pow(volatility, 2) + volatility * rand);
          path.push(parseFloat(newPrice.toFixed(2)));
        }
        tPaths.push(path);
      }

      // Convert to recharts format
      const formattedData = Array.from({ length: days + 1 }, (_, dayIdx) => {
        const row: any = { day: `Ene ${dayIdx}` };
        tPaths.forEach((path, pathIdx) => {
          row[`Trayectoria ${pathIdx + 1}`] = path[dayIdx];
        });
        return row;
      });

      // Calculate Conditional Value at Risk (CVaR 95%)
      const finalPrices = tPaths.map(p => p[days]);
      const losses = finalPrices.map(p => initialPrice - p).sort((a, b) => b - a);
      const worstCount = Math.max(1, Math.floor(numPaths * 0.25));
      const worstLossesSum = losses.slice(0, worstCount).reduce((acc, l) => acc + l, 0);
      const calculatedCvar = parseFloat((worstLossesSum / worstCount).toFixed(2));
      
      // Calculate probability of not breaking a specific stop loss line (e.g. 88$)
      const thresholdPrice = 88;
      const survivedPaths = tPaths.filter(path => {
        return Math.min(...path) > thresholdPrice;
      });
      const prob = Math.floor((survivedPaths.length / numPaths) * 100);

      setSimData(formattedData);
      setCvar95(calculatedCvar);
      setSurvivalProb(prob);
      setIsRunningSim(false);
    }, 1200);
  };

  // Run initial simulation
  useEffect(() => {
    handleRunSimulation();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1A1A1A] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-purple-500" />
            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-[0.2em]">PENSAMIENTO CRÍTICO Y PRUEBAS DE ESTRÉS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">⚖️ Abogado del Diablo</h1>
          <p className="text-sm text-[#888] leading-relaxed">
            Módulo de debate estratégico de Prometheus. Desafiamos cada tesis alcista con simulaciones y escenarios de desastre macro.
          </p>
        </div>
        <div className="bg-purple-950/10 border border-purple-500/20 px-4 py-2 rounded-sm text-center">
          <span className="text-[9px] font-bold text-purple-400 font-mono block">MODO ESCÉPTICO: ACTIVO</span>
          <span className="text-xs text-purple-300 font-mono font-bold">Riesgo Sistémico Vigilado</span>
        </div>
      </div>

      {/* Main Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Stress Simulator & Monte Carlo */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section 1: Interactive Stress Test Simulator */}
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0] flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-500" />
                Simulador de Escenarios de Estrés (Macro Stress Matrix)
              </h3>
              <span className="text-[9px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-sm">
                SINCERIDAD MATEMÁTICA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-[#AAA] mb-1">
                    <span>Aumento de Rendimiento (10Y Yield Spike)</span>
                    <span className="text-purple-400 font-bold">+{yieldSpike} bps</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    step="10"
                    value={yieldSpike} 
                    onChange={e => setYieldSpike(Number(e.target.value))}
                    className="w-full accent-purple-500 bg-[#1A1A1A]"
                  />
                  <span className="text-[8px] text-[#444] font-mono uppercase tracking-wide">Impacta la tasa de descuento de activos de crecimiento</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-[#AAA] mb-1">
                    <span>Nivel de Volatilidad (Squeeze VIX index)</span>
                    <span className="text-purple-400 font-bold">{vixLevel} index</span>
                  </div>
                  <input 
                    type="range" 
                    min="15" 
                    max="50" 
                    step="1"
                    value={vixLevel} 
                    onChange={e => setVixLevel(Number(e.target.value))}
                    className="w-full accent-purple-500 bg-[#1A1A1A]"
                  />
                  <span className="text-[8px] text-[#444] font-mono uppercase tracking-wide">Simula pánico de ventas y liquidación forzosa</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-[#AAA] mb-1">
                    <span>Fortaleza del DXY (Dólar USA)</span>
                    <span className="text-purple-400 font-bold">{dxyStrength} index</span>
                  </div>
                  <input 
                    type="range" 
                    min="95" 
                    max="112" 
                    step="1"
                    value={dxyStrength} 
                    onChange={e => setDxyStrength(Number(e.target.value))}
                    className="w-full accent-purple-500 bg-[#1A1A1A]"
                  />
                  <span className="text-[8px] text-[#444] font-mono uppercase tracking-wide">Dolar fuerte penaliza activos emergentes y petroleras</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-[#AAA] mb-1">
                    <span>Caída del Consumo (Spending Slump)</span>
                    <span className="text-purple-400 font-bold">-${spendingSlump}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="15" 
                    step="1"
                    value={spendingSlump} 
                    onChange={e => setSpendingSlump(Number(e.target.value))}
                    className="w-full accent-purple-500 bg-[#1A1A1A]"
                  />
                  <span className="text-[8px] text-[#444] font-mono uppercase tracking-wide">Reduce ingresos de consumo discrecional y cíclicos</span>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-[#1A1A1A] items-center">
              <div className="bg-[#141414] p-4 border border-[#2A2A2A] rounded-sm text-center md:col-span-1">
                <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase block mb-1">Resiliencia</span>
                <span className={cn(
                  "text-3xl font-mono font-bold tracking-tight",
                  resilienceScore > 75 ? "text-green-500" : resilienceScore > 50 ? "text-yellow-500" : "text-red-500"
                )}>
                  {resilienceScore}%
                </span>
              </div>
              
              <div className="p-4 bg-purple-950/5 border border-purple-500/10 rounded-sm md:col-span-3">
                <div className="flex items-center gap-2 mb-1 text-purple-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Dossier de Cobertura Activo</span>
                </div>
                <p className="text-xs text-[#AAA] leading-normal italic">
                  "{stressExplanation}"
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Monte Carlo Simulation (Brownian motion) */}
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E4E3E0] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  Simulador de Choques Dinámicos (Monte Carlo 60D)
                </h3>
                <p className="text-[10px] text-[#666] mt-0.5">Iteraciones estocásticas basadas en el movimiento geométrico browniano con fatiga de estrés.</p>
              </div>
              
              <button
                onClick={handleRunSimulation}
                disabled={isRunningSim}
                className="flex items-center gap-2 bg-purple-900/50 hover:bg-purple-800 border border-purple-500/30 text-purple-200 hover:text-white px-3 py-1.5 rounded-sm text-xs font-bold transition-all"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRunningSim && "animate-spin")} />
                {isRunningSim ? "PROCESANDO..." : "CALCULAR MONTE CARLO"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* KPIs sidebar */}
              <div className="space-y-4 md:col-span-1">
                <div className="bg-[#141414] p-4 border border-[#2A2A2A] rounded-sm">
                  <span className="text-[8px] font-bold text-[#666] uppercase tracking-wider block mb-1">95% CVaR de Estrés</span>
                  <span className="text-xl font-mono font-bold text-red-500">-${cvar95}%</span>
                  <span className="text-[8px] text-[#444] font-mono block mt-1 leading-tight">Valor esperado condicional de la pérdida máxima</span>
                </div>

                <div className="bg-[#141414] p-4 border border-[#2A2A2A] rounded-sm">
                  <span className="text-[8px] font-bold text-[#666] uppercase tracking-wider block mb-1">Probabilidad de Supervivencia</span>
                  <span className="text-xl font-mono font-bold text-green-500">{survivalProb}%</span>
                  <span className="text-[8px] text-[#444] font-mono block mt-1 leading-tight">Probabilidad de no perforar barrera de stop loss ($88)</span>
                </div>
                
                <div className="border border-purple-900/10 p-3 bg-purple-500/5 rounded-sm">
                  <p className="text-[9px] text-[#666] leading-relaxed italic">
                    *El modelo estocástico corre 12 senderos independientes de precios con drift influenciado por los sliders macro superiores.
                  </p>
                </div>
              </div>

              {/* Monte carlo path chart */}
              <div className="md:col-span-3 h-[250px] w-full">
                {simData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                      <XAxis dataKey="day" stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                      <YAxis stroke="#444" fontSize={9} axisLine={false} tickLine={false} domain={[70, 130]} />
                      <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', borderRadius: '4px', fontSize: '10px' }} />
                      
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <Line
                          key={idx}
                          type="monotone"
                          dataKey={`Trayectoria ${idx + 1}`}
                          stroke={idx === 0 ? "#A855F7" : `#C084FC${Math.floor(25 + Math.random() * 40).toString(16)}`}
                          strokeWidth={idx === 0 ? 2 : 1}
                          dot={false}
                          activeDot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sector Case Rebuttals */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] p-6 rounded-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-[#1A1A1A] pb-3">
                <ShieldAlert className="w-4 h-4 text-purple-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">Análisis de Debate Sectorial</h3>
              </div>
              
              <p className="text-xs text-[#666] leading-relaxed mb-6">
                Seleccione un sector clave para auditar los argumentos bajistas y las acciones de choque del Abogado del Diablo.
              </p>

              {/* Selector buttons */}
              <div className="flex flex-col gap-2 mb-6">
                {SECTOR_CRITICISMS.map(c => (
                  <button
                    key={c.sector}
                    onClick={() => setChosenSector(c)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-xs font-bold font-mono transition-all text-left bg-[#141414]",
                      chosenSector.sector === c.sector 
                        ? "border-l-2 border-purple-500 text-white bg-purple-500/5" 
                        : "text-[#666] hover:text-[#AAA]"
                    )}
                  >
                    <span>{c.sector}</span>
                    <span className="text-[10px] font-mono text-purple-400">{c.ticker}</span>
                  </button>
                ))}
              </div>

              {/* Content Panel */}
              <div className="space-y-4 pt-4 border-t border-[#1A1A1A]">
                <div>
                  <span className="text-[9px] font-bold text-green-500 font-mono tracking-widest block uppercase">Tesis Alcista</span>
                  <p className="text-xs text-[#AAA] leading-relaxed mt-1">
                    "{chosenSector.bullThesis}"
                  </p>
                </div>

                <div className="bg-red-950/5 border border-red-500/10 p-3.5 rounded-sm">
                  <span className="text-[9px] font-bold text-red-400 font-mono tracking-widest block uppercase">Contra-Tesis Diablo</span>
                  <p className="text-xs text-[#E4E3E0] leading-relaxed mt-1 italic">
                    "{chosenSector.rebuttal}"
                  </p>
                </div>

                <div className="bg-purple-950/5 border border-purple-500/10 p-3.5 rounded-sm">
                  <span className="text-[9px] font-bold text-purple-400 font-mono tracking-widest block uppercase flex items-center gap-1">
                    🛡️ Cobertura Propuesta
                  </span>
                  <p className="text-xs text-[#AAA] leading-relaxed mt-1 font-medium text-purple-200">
                    {chosenSector.hedge}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-3 bg-purple-500/5 border border-purple-500/10 rounded-sm">
              <span className="text-[9px] font-mono text-[#666] block leading-snug text-center">
                VIGILANCIA COGNITIVA GENESIS STABILITY
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
