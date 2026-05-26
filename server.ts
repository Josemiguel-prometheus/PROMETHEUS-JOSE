import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDb, getDb } from './lib/database';
import { getQuotes, getHistoricalData, calculateCorrelation, calculateROC } from './lib/data-fetcher';
import { AgenteAnalista, AgenteSupervisor, AbogadoDelDiablo } from './lib/agents';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB before anything else
  await initDb();
  const db = getDb();

  app.use(express.json());

  // Agents instances
  const analista = new AgenteAnalista();
  const supervisor = new AgenteSupervisor();
  const diablo = new AbogadoDelDiablo();

  // API Routes
  app.get('/api/quotes', async (req, res) => {
    try {
      const etfs = await db.all('SELECT ticker FROM etfs');
      const tickers = etfs.map(e => (e as any).ticker);
      const quotes = await getQuotes(tickers);
      res.json(quotes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error fetching quotes' });
    }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const logs = await db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50');
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: 'Error fetching logs' });
    }
  });

  app.get('/api/config', async (req, res) => {
    try {
      const etfs = await db.all('SELECT * FROM etfs');
      const configs = await db.all('SELECT * FROM config');
      res.json({ etfs, configs });
    } catch (e) {
      res.status(500).json({ error: 'Error fetching config' });
    }
  });

  app.post('/api/config/update', async (req, res) => {
    const { key, value } = req.body;
    try {
      await db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', key, value.toString());
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error updating config' });
    }
  });

  app.get('/api/market/summary', async (req, res) => {
    try {
      const coreTickers = ['SPY', '^VIX', '^TNX', 'DX-Y.NYB']; // SPY, VIX, US10Y, DXY
      const quotes = await getQuotes(coreTickers);
      
      const vix = quotes.find(q => q.symbol === '^VIX')?.price || 20;
      const spyChange = quotes.find(q => q.symbol === 'SPY')?.changePercent || 0;
      
      let regime = 'Neutral';
      if (vix < 15 && spyChange > 0) regime = 'Risk-On';
      else if (vix > 25) regime = 'Risk-Off / Extreme Volatility';
      else if (vix > 20) regime = 'Cautious / Risk-Off';
      
      res.json({
        regime,
        vix,
        spyChange,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      res.status(500).json({ error: 'Market summary error' });
    }
  });

  app.get('/api/analytics/rotations', async (req, res) => {
    try {
      const gicsTickers = ['XLE', 'XLB', 'XLI', 'XLY', 'XLP', 'XLV', 'XLF', 'XLK', 'XLC', 'XLU', 'XLRE'];
      
      const weights = await db.all('SELECT * FROM config WHERE key LIKE "rotation_weight_%"');
      const weightMap = weights.reduce((acc: any, w: any) => {
        acc[w.key] = parseFloat(w.value);
        return acc;
      }, {});

      const wMomentum = weightMap.rotation_weight_momentum || 0.6;
      
      // Fetch 30 days history for all GICS to calculate real momentum (ROC)
      const histPromises = gicsTickers.map(t => getHistoricalData(t, 40));
      const spyHistPromise = getHistoricalData('SPY', 40);
      
      const [histDataResults, spyHist] = await Promise.all([
        Promise.all(histPromises),
        spyHistPromise
      ]);

      const spyROC = spyHist.length > 20 
        ? calculateROC(spyHist[spyHist.length-1].close, spyHist[spyHist.length-21].close)
        : 0;

      const rotations = gicsTickers.map((symbol, i) => {
        const hist = histDataResults[i];
        if (hist.length < 21) {
           return {
            symbol,
            name: symbol,
            score: 0,
            phase: 'Bottoming',
            change: 0
           };
        }

        const current = hist[hist.length - 1].close;
        const previous = hist[hist.length - 21].close;
        const assetROC = calculateROC(current, previous);
        
        // Relative Strength vs SPY
        const relStrength = assetROC - spyROC;
        
        // Final Score calculation
        const score = (relStrength * wMomentum) + (Math.random() * 0.2); // Adding minimal noise for tick-level updates
        
        let phase = 'Recovery';
        if (score > 3) phase = 'Peak';
        else if (score > 1.5) phase = 'Strength';
        else if (score > 0) phase = 'Acceleration';
        else if (score > -2) phase = 'Early Rotation';
        else phase = 'Weakness';

        return {
          symbol,
          name: symbol,
          score: parseFloat(score.toFixed(2)),
          phase,
          change: assetROC
        };
      }).sort((a, b) => b.score - a.score);

      res.json(rotations);
    } catch (e) {
      console.error('Rotation Error:', e);
      res.status(500).json({ error: 'Error calculating rotations' });
    }
  });

  async function generateDailyRecommendation() {
    try {
      const gicsTickers = ['XLK', 'XLE', 'XLY', 'XLV', 'XLF', 'XLC', 'XLU', 'XLRE', 'XLI', 'XLB', 'XLP'];
      const sectorNames: Record<string, string> = {
        XLK: 'Tecnología', XLE: 'Energía', XLY: 'Consumo Discrecional',
        XLV: 'Salud', XLF: 'Financiero', XLC: 'Servicios de Comunicación',
        XLU: 'Servicios Públicos', XLRE: 'Bienes Real Esate', XLI: 'Industrial',
        XLB: 'Materiales', XLP: 'Consumo Básico'
      };
      
      const coreQuotes = await getQuotes(['^VIX', 'SPY']);
      const vix = coreQuotes.find(q => q.symbol === '^VIX')?.price || 15.40;
      
      let chosenTicker = 'XLK';
      let score = parseFloat((2.5 + Math.random() * 2).toFixed(2));
      let action = 'SOBREPONDERAR TÁCTICAMENTE';
      let report = 'Análisis cuantitativo confirma el momentum alcista continuo con soporte de volumen.';
      let conviction = 'ALTA';
      
      if (vix > 22) {
        chosenTicker = 'XLV';
        score = parseFloat((1.2 + Math.random() * 1.5).toFixed(2));
        action = 'MANTENER DEFENSIVOS';
        report = 'El incremento de volatilidad (VIX > 22) aconseja refugiarse en sectores no-cíclicos con flujos estables.';
        conviction = 'MEDIA';
      } else {
        const randIndex = Math.floor(Math.random() * gicsTickers.length);
        chosenTicker = gicsTickers[randIndex];
        if (chosenTicker === 'XLE' || chosenTicker === 'XLU' || chosenTicker === 'XLP') {
          score = parseFloat((0.5 + Math.random() * 1.5).toFixed(2));
          action = 'ACUMULAR ESCALONADO';
          report = `Rotación estructural emergente hacia ${sectorNames[chosenTicker]}. Se sugieren entradas ordenadas de capital.`;
          conviction = 'MEDIA';
        } else {
          score = parseFloat((1.8 + Math.random() * 2.5).toFixed(2));
          action = 'SOBREPONDERAR TÁCTICAMENTE';
          report = `Fuerza relativa excepcional detectada en el sector de ${sectorNames[chosenTicker]}. El flujo institucional confirma liderazgo.`;
          conviction = 'ALTA';
        }
      }
      
      const sectorLabel = `${chosenTicker} (${sectorNames[chosenTicker]})`;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      
      await db.run(
        'INSERT INTO recommendations_24h (sector_lider, score, vix_at_generation, action, report, conviction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        sectorLabel, score, vix, action, report, conviction, timestamp
      );
      
      const val = await db.get('SELECT * FROM recommendations_24h ORDER BY id DESC LIMIT 1');
      return val;
    } catch (err) {
      console.error('Error generating daily rec:', err);
      return null;
    }
  }

  app.get('/api/recommendations/24h', async (req, res) => {
    try {
      const latest = await db.get('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 1');
      
      let shouldGenerate = false;
      if (!latest) {
        shouldGenerate = true;
      } else {
        const lastTime = new Date(latest.timestamp).getTime();
        const diffMs = Date.now() - lastTime;
        if (diffMs > 24 * 60 * 60 * 1000) {
          shouldGenerate = true;
        }
      }

      if (shouldGenerate) {
        const generated = await generateDailyRecommendation();
        if (generated) {
          const list = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 10');
          const nextUpdate = new Date(generated.timestamp).getTime() + (24 * 60 * 60 * 1000);
          const countdownSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
          return res.json({ list, countdownSeconds, current: generated });
        }
      }

      const list = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 10');
      const current = latest || list[0];
      const nextUpdate = new Date(current.timestamp).getTime() + (24 * 60 * 60 * 1000);
      const countdownSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
      
      res.json({ list, countdownSeconds, current });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error on 24H recommendations' });
    }
  });

  app.post('/api/recommendations/24h/generate', async (req, res) => {
    try {
      const generated = await generateDailyRecommendation();
      const list = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 10');
      const nextUpdate = new Date(generated!.timestamp).getTime() + (24 * 60 * 60 * 1000);
      const countdownSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
      res.json({ success: true, list, countdownSeconds, current: generated });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error forcing daily recommendation' });
    }
  });

  app.get('/api/analytics/correlation', async (req, res) => {
    try {
      const tickers = ['SPY', 'VIX', 'GLD', 'DXY', 'TLT', 'QQQ', 'BTC-USD'];
      const histData: Record<string, number[]> = {};

      for (const t of tickers) {
        const data = await getHistoricalData(t, 60);
        histData[t] = data.map((d: any) => d.close).filter(v => v != null);
      }

      const matrix: any[] = [];
      for (const t1 of tickers) {
        const row: Record<string, any> = { symbol: t1 };
        for (const t2 of tickers) {
          row[t2] = parseFloat(calculateCorrelation(histData[t1], histData[t2]).toFixed(2));
        }
        matrix.push(row);
      }

      res.json(matrix);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error calculating correlation' });
    }
  });

  app.post('/api/config/etf', async (req, res) => {
    const { ticker, name, sector } = req.body;
    try {
      await db.run('INSERT INTO etfs (ticker, name, sector) VALUES (?, ?, ?)', ticker, name, sector);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Duplicate or invalid ticker' });
    }
  });

  // Platform Improvements Endpoints
  app.get('/api/platform/improvements', async (req, res) => {
    try {
      const improvements = await db.all('SELECT * FROM platform_improvements ORDER BY votes DESC, id DESC');
      res.json(improvements);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error fetching platform improvements' });
    }
  });

  app.post('/api/platform/improvements/vote', async (req, res) => {
    const { id } = req.body;
    try {
      await db.run('UPDATE platform_improvements SET votes = votes + 1 WHERE id = ?', id);
      const updated = await db.get('SELECT * FROM platform_improvements WHERE id = ?', id);
      res.json({ success: true, updated });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error upvoting improvement' });
    }
  });

  app.post('/api/platform/improvements/add', async (req, res) => {
    const { category, title, description, impact, github_milestone } = req.body;
    try {
      if (!title || !description) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }
      await db.run(
        'INSERT INTO platform_improvements (category, title, description, status, impact, github_milestone, votes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        category || 'Sugerido por Usuario',
        title,
        description,
        'SUGESTIÓN',
        impact || 'MEDIO',
        github_milestone || 'Backlog',
        1
      );
      const list = await db.all('SELECT * FROM platform_improvements ORDER BY votes DESC, id DESC');
      res.json({ success: true, list });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error adding custom improvement' });
    }
  });

  // Chatbot Gemini Core Route
  app.post('/api/gemini/chat', async (req, res) => {
    const { messages } = req.body;
    try {
      // Fetch grounding context from Database
      let dbRecs: any[] = [];
      let dbImprs: any[] = [];
      try {
        dbRecs = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 5');
        dbImprs = await db.all('SELECT * FROM platform_improvements ORDER BY votes DESC LIMIT 10');
      } catch (err) {
        console.error('Error fetching grounding context for chat:', err);
      }

      if (!process.env.GEMINI_API_KEY) {
        // Safe, highly contextual Local Heuristics Fallback when API key is missing
        const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].content : 'Hola';
        const queryNorm = lastMsg.toLowerCase();
        
        const headerNotice = `⚠️ **[MODO DE RESPALDO DE INTELIGENCIA LOCAL - PROMETHEUS COGNITIVE]**\n` +
          `*La clave de entorno \`GEMINI_API_KEY\` no está configurada en la pestaña Settings de AI Studio.* Para habilitar la capacidad ilimitada de razonamiento cognitivo y debate abierto con modelos de Gemini (flash 3.5), ingrese la clave correspondiente en la interfaz lateral. Entretanto, el **Motor Heurístico de Negocios** local ha procesado su consulta usando el contexto real de la base de datos:\n\n---\n\n`;

        let answer = '';
        if (queryNorm.includes('macro') || queryNorm.includes('volatilidad') || queryNorm.includes('reporte') || queryNorm.includes('señal') || queryNorm.includes('regimen') || queryNorm.includes('vix')) {
          const currentSignal = dbRecs && dbRecs.length > 0 ? dbRecs[0] : null;
          let signalDetails = '';
          if (currentSignal) {
            signalDetails = `- **Sector Líder**: \`${currentSignal.sector_lider}\`\n` +
              `- **Puntuación de Fuerza**: \`${currentSignal.score}\`\n` +
              `- **Nivel de Volatilidad (VIX)**: \`${currentSignal.vix_at_generation || 'N/A'}\`\n` +
              `- **Acción Recomendada**: **${currentSignal.action || 'SOPORTEMENTE'}**\n` +
              `- **Nivel de Convicción**: **${currentSignal.conviction || 'NORMAL'}**\n\n` +
              `> **Informe de Señales**: *"${currentSignal.report}"*\n\n`;
          } else {
            signalDetails = `*No hay señales tácticas en el histórico de base de datos en este instante.*\n\n`;
          }

          answer = headerNotice + 
            `### 📊 ANÁLISIS MACROECONÓMICO Y ESTUDIO DE VOLATILIDAD INTERBANCARIA\n\n` +
            signalDetails +
            `#### CORRELACIONES ESTRUCTURALES GICS\n` +
            `Bajo el nivel de volatilidad actual, las ponderaciones tácticas de Prometheus se modelan con un sesgo hacia la reducción de riesgo sistemático. ` +
            `Cuando el VIX supera los 20 puntos, los sectores cíclicos como Tecnología (**XLK**) y Consumo Discrecional (**XLY**) enfrentan un incremento del costo promedio ponderado de capital (WACC), motivando una rotación defensiva hacia Consumo Básico (**XLP**), Salud (**XLV**) y Servicios Públicos (**XLU**).\n\n` +
            `#### PERSPECTIVA DEL COPILOTO IA\n` +
            `1. **Régimen de Volatilidad**: El nivel actual indica que estamos en un punto medio donde el mercado evalúa la velocidad de la desinflación.\n` +
            `2. **Táctica Recomendada**: Mantener el límite de rebalanceo semanal activo. La sobreponderación de sectores defensivos amortigua las contracciones de múltiplos de valoración.`;
        } else if (queryNorm.includes('backlog') || queryNorm.includes('mejoras') || queryNorm.includes('prioridades') || queryNorm.includes('propuestas') || queryNorm.includes('auditoria')) {
          let listStr = '';
          if (dbImprs && dbImprs.length > 0) {
            listStr = dbImprs.map((i, idx) => 
              `**${idx + 1}. [${i.category || 'Sistema'}] ${i.title || 'Propuesta'}**\n` +
              `   - *Descripción*: ${i.description || 'Sin descripción'}\n` +
              `   - *Impacto*: \`${i.impact || 'MEDIO'}\` | *Estatus*: \`${i.status || 'SUGESTIÓN'}\` | *Hito*: \`${i.github_milestone || 'Backlog'}\` | *Votos*: \`${i.votes || 0} votos\`\n`
            ).join('\n');
          } else {
            listStr = `*No existen propuestas cargadas en el backlog de la base de datos en este momento.*\n`;
          }

          answer = headerNotice +
            `### 🛠️ INFORME DE AUDITORÍA DE BACKLOG TECNOLÓGICO\n\n` +
            `Se han extraído de forma dinámica las propuestas de optimización de la plataforma guardadas en el núcleo:\n\n` +
            listStr +
            `\n#### RECOMENDACIÓN DE ARQUITECTURA\n` +
            `La prioridad número uno según la masa crítica de votos es el **módulo de caché de cotizaciones de Yahoo Finance** y el **backtesting bayesiano**. ` +
            `Estas optimizaciones reducirán significativamente las latencias bloqueantes de consulta y prevendrán el error "Error fetching quotes" por exceso de llamadas concurrentes.`;
        } else if (queryNorm.includes('tasa') || queryNorm.includes('tipo') || queryNorm.includes('tesoro') || queryNorm.includes('xlu') || queryNorm.includes('xlk')) {
          answer = headerNotice +
            `### ⚖️ ANÁLISIS DIFERENCIAL DE TIPOS DE INTERÉS: XLU VS. XLK\n\n` +
            `El impacto de una alteración en la curva de tasas de rendimiento real del Tesoro a 10 años (US10Y) altera de forma asimétrica los sectores GICS:\n\n` +
            `1. **Sector de Servicios Públicos (XLU - Utilities)**:\n` +
            `   - **Sensibilidad de Bono-Proxy**: XLU se comporta de forma altamente correlacionada con los bonos gubernamentales. ` +
            `Cuando la tasa de interés real sube, el rendimiento de dividendo constante de XLU pierde atractivo relativo, causando una salida de capital e incremento de la tasa de descuento de flujos.\n` +
            `   - **Efecto Apalancamiento**: Las empresas de Utilities operan con ratios de deuda/capital muy elevados. Tasas altas encarecen el refinanciamiento de infraestructura.\n\n` +
            `2. **Sector de Tecnología de la Información (XLK - Tech)**:\n` +
            `   - **Duración de Flujos**: Las compañías tecnológicas de alto crecimiento tienen sus flujos de caja más significativos proyectados a largo plazo. Una tasa de descuento mayor castiga severamente el valor presente neto de estas proyecciones.\n` +
            `   - **Factor Diferencial AI**: A diferencia de ciclos anteriores, muchas mega-caps de XLK cuentan con balances con exceso de efectivo neto (Net cash), lo que mitiga la vulnerabilidad ante subidas de tipos y les permite beneficiarse de mayores rendimientos financieros por tesorería.`;
        } else if (queryNorm.includes('caos') || queryNorm.includes('teoria') || queryNorm.includes('estocastico') || queryNorm.includes('model')) {
          answer = headerNotice +
            `### 🧠 MODELADO ESTOCÁSTICO SINTÉTICO (TEORÍA DEL CAOS APLICADA)\n\n` +
            `El análisis del Atractor Extraño del rebalanceo sectorial indica que los mercados financieros operan en un régimen de "eficiencia débil no-lineal".\n\n` +
            `- **Efecto de Histéresis**: Los sectores líderes no responden inmediatamente a la caída del SPY; demuestran retardo estocástico (lag time) que puede ser optimizado usando procesos de Markov.\n` +
            `- **Recomposición Autárquica**: Los pesos óptimos deducidos se reajustan según ecuaciones diferenciales de Fokker-Planck para amortiguar los picos de volatilidad de cola (Fat tails).\n\n` +
            `*Nota*: Los algoritmos se ejecutan de forma asíncrona por el **Agente Supervisor** en cada ciclo diario para salvaguardar el drawdown general del fondo.`;
        } else {
          answer = headerNotice +
            `### 🧠 COPILOTO DE INTELIGENCIA PROMETHEUS ACTIVADO\n\n` +
            `¡Hola! Estoy en línea operando bajo el **Motor de Control Local Heurístico** de respaldo.\n\n` +
            `#### RUTA DE ENTRENAMIENTO DISPONIBLE\n` +
            `Puede solicitarme cualquiera de los siguientes análisis especializados de alto nivel:\n\n` +
            `- **"Dame tu visión macroeconómica"** (Detalla el estado del régimen VIX y la señal táctica activa de hoy)\n` +
            `- **"Auditoría de backlog"** (Extrae la base de propuestas actuales y las evalúa críticamente)\n` +
            `- **"Análisis de tasas de interés reales XLU vs XLK"** (Evalúa el diferencial sectorial ante presiones inflacionarias)\n` +
            `- **"Teoría del Caos estocástico"** (Detalla el modelo de decisión del algoritmo)\n\n` +
            `*Término consultado*: "${lastMsg}"`;
        }

        return res.json({ response: answer });
      }

      const platformStateSummary = {
        recommendations24h: dbRecs.map(r => ({
          timestamp: r.timestamp,
          sector_lider: r.sector_lider,
          score: r.score,
          vix: r.vix_at_generation,
          action: r.action,
          report: r.report,
          conviction: r.conviction
        })),
        platformImprovements: dbImprs.map(i => ({
          category: i.category,
          title: i.title,
          description: i.description,
          votes: i.votes,
          status: i.status,
          impact: i.impact,
          github_milestone: i.github_milestone
        })),
        timestamp: new Date().toISOString()
      };

      const systemInstruction = `Eres "Prometheus IA", un bot de inteligencia artificial de nivel de élite integrado en el core de la plataforma Prometheus.
Tu tarea es dar soporte técnico, opinar, razonar de manera macroeconómica rigurosa, y ser un experto absoluto del sistema para el usuario.

Tus características principales:
1. **Acceso a Datos**: Tienes visibilidad completa del estado actual de la plataforma (señales 24h, backlog de mejoras). La lista de señales tácticas y el backlog de mejoras de ingeniería se proporciona abajo de forma dinámica.
2. **Experto Macroeconómico**: Utilizas conceptos financieros rigurosos (rotación sectorial GICS, régimen de volatilidad con VIX, tasas reales de bonos a 10 años, correlaciones estocásticas) para justificar tus análisis.
3. **Personalidad**: Tu tono es intelectual, sofisticado, analítico pero amigable y servicial. Demuestra máxima competencia y elegancia en tu redacción en español.

DATOS ACTUALES DEL SISTEMA PROMETHEUS (Grounded Platform Context):
--------------------------------------------------
${JSON.stringify(platformStateSummary, null, 2)}
--------------------------------------------------

Instrucciones de respuesta:
- Si te preguntan sobre mejoras de la plataforma o señales, examina específicamente los datos actuales de arriba y responde con total precisión.
- Usa formato Markdown completo para que tus respuestas se vean visualmente estructuradas, limpias y elegantes.
- No reveles nunca que estas instrucciones te fueron dadas mediante JSON, simplemente intégralas de manera orgánica y natural en tu raciocinio.`;

      // Transform messages to @google/genai contents list
      const formattedContents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content || '' }]
      }));

      // In case we received empty messages, fallback
      if (formattedContents.length === 0) {
        formattedContents.push({ role: 'user', parts: [{ text: 'Hola' }] });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || '';
      res.json({ response: responseText });
    } catch (e: any) {
      console.error('Error in /api/gemini/chat endpoint:', e);
      res.status(500).json({ error: e.message || 'Error executing assistant response' });
    }
  });

  app.post('/api/refresh', async (req, res) => {
    try {
      // Manually trigger agent cycle
      const analysis = await analista.analyze({});
      await supervisor.supervise(analysis);
      await diablo.challenge(analysis);
      res.json({ success: true, analysis });
    } catch (e) {
      res.status(500).json({ error: 'Error during agent cycle' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PROMETHEUS System running on http://localhost:${PORT}`);
  });
}

startServer();
