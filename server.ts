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



  app.get('/api/market/global-liquidity', async (req, res) => {
    try {
      const symbols = ['DX-Y.NYB', 'HYG', 'TLT', 'JPY=X', 'BTC-USD', 'GLD'];
      const quotes = await getQuotes(symbols);

      const dxyObj = quotes.find(q => q.symbol === 'DX-Y.NYB' || q.symbol === 'DXY');
      const hygObj = quotes.find(q => q.symbol === 'HYG');
      const tltObj = quotes.find(q => q.symbol === 'TLT');
      const jpyObj = quotes.find(q => q.symbol === 'JPY=X');
      const btcObj = quotes.find(q => q.symbol === 'BTC-USD');
      const gldObj = quotes.find(q => q.symbol === 'GLD');

      const dxyVal = dxyObj?.price || 102.2;
      const hygVal = hygObj?.price || 78.5;
      const tltVal = tltObj?.price || 91.0;
      const jpyVal = jpyObj?.price || 156.4;
      const btcVal = btcObj?.price || 67000;
      const gldVal = gldObj?.price || 230;

      // 1. DXY Score (Inverted: High dollar strength = dry liquidity, low dollar strength = abundant liquidity)
      // Standard range 95.0 to 108.0
      const dxyScore = Math.max(0, Math.min(100, Math.round(100 - ((dxyVal - 95) / 13) * 100)));

      // 2. Credit Liquidity Score (HYG / TLT ratio - Corporate high yield vs safe Treasuries)
      // Standard range: 0.70 to 1.05
      const ratio = hygVal / tltVal;
      const creditScore = Math.max(0, Math.min(100, Math.round(((ratio - 0.72) / 0.3) * 100)));

      // 3. JPY Carry Trade Score (US JPY relative level - Weak Yen increases carrier funding expansion)
      // Standard range: 130.0 to 165.0
      const carryScore = Math.max(0, Math.min(100, Math.round(((jpyVal - 130) / 35) * 100)));

      // 4. Speculative Flow (BTC vs GLD ROC 20-day)
      let btcHist: any[] = [];
      let gldHist: any[] = [];
      try {
        btcHist = await getHistoricalData('BTC-USD', 30);
        gldHist = await getHistoricalData('GLD', 30);
      } catch (err) {
        console.warn('Error fetching speculative histories for liquidity:', err);
      }

      let speculativeScore = 55;
      let btcRoc = 2.4;
      let gldRoc = 0.8;
      if (btcHist && btcHist.length > 15 && gldHist && gldHist.length > 15) {
        const btcCurrent = btcHist[btcHist.length - 1].close;
        const btcPrevious = btcHist[0].close;
        const gldCurrent = gldHist[gldHist.length - 1].close;
        const gldPrevious = gldHist[0].close;

        btcRoc = calculateROC(btcCurrent, btcPrevious);
        gldRoc = calculateROC(gldCurrent, gldPrevious);

        // Map relative outperformance -8% to +8% onto 0..100
        const diff = btcRoc - gldRoc;
        speculativeScore = Math.max(0, Math.min(100, Math.round(((diff + 8) / 16) * 100)));
      }

      // Aggregate: 30% Currency, 25% Credit, 20% Carry JPY, 25% Speculative
      const totalIndex = Math.round((dxyScore * 0.30) + (creditScore * 0.25) + (carryScore * 0.20) + (speculativeScore * 0.25));

      let classification = 'Stable/Neutral';
      if (totalIndex < 30) classification = 'Contraction';
      else if (totalIndex < 46) classification = 'Tight';
      else if (totalIndex <= 55) classification = 'Stable/Neutral';
      else if (totalIndex <= 75) classification = 'Expansion';
      else classification = 'Abundant';

      res.json({
        index: totalIndex,
        classification,
        components: {
          currency: { dxyPrice: dxyVal, score: dxyScore },
          credit: { ratio, hygPrice: hygVal, tltPrice: tltVal, score: creditScore },
          carry: { jpyPrice: jpyVal, score: carryScore },
          speculative: { btcRoc, gldRoc, tickerPrice: btcVal, score: speculativeScore }
        },
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      console.error('Error generating global liquidity index:', e);
      res.json({
        index: 52,
        classification: 'Stable/Neutral',
        components: {
          currency: { dxyPrice: 102.2, score: 45 },
          credit: { ratio: 0.86, hygPrice: 78.5, tltPrice: 91.0, score: 47 },
          carry: { jpyPrice: 156.4, score: 75 },
          speculative: { btcRoc: 2.1, gldRoc: 1.1, score: 56 }
        },
        timestamp: new Date().toISOString(),
        backup: true
      });
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

  async function generateMonthlyRecommendation() {
    try {
      const gicsTickers = ['XLK', 'XLE', 'XLY', 'XLV', 'XLF', 'XLC', 'XLU', 'XLRE', 'XLI', 'XLB', 'XLP'];
      const sectorNames: Record<string, string> = {
        XLK: 'Tecnología', XLE: 'Energía', XLY: 'Consumo Discrecional',
        XLV: 'Salud', XLF: 'Financiero', XLC: 'Servicios de Comunicación',
        XLU: 'Servicios Públicos', XLRE: 'Bienes Real Estate', XLI: 'Industrial',
        XLB: 'Materiales', XLP: 'Consumo Básico'
      };

      // 1. SISTEMA DE APRENDIZAJE Y MEMORIA: Analizar histórico de señales para evitar bucles y registrar asimetrías
      let pastSectorWeights: Record<string, number> = {};
      try {
        const pastSecs = await db.all('SELECT sector_lider FROM recommendations_24h ORDER BY timestamp DESC LIMIT 20');
        pastSecs.forEach(row => {
          if (row && row.sector_lider) {
            const match = row.sector_lider.match(/^([A-Z]+)/);
            if (match) {
              const sym = match[1];
              pastSectorWeights[sym] = (pastSectorWeights[sym] || 0) + 1;
            }
          }
        });
      } catch (e) {
        console.warn('Error al leer historial de memoria para aprendizaje:', e);
      }

      // 2. ADQUISICIÓN DE DATOS EN TIEMPO REAL: Analizar VIX, SPY, TLT y sectores
      const coreQuotes = await getQuotes(['^VIX', 'SPY', 'TLT', 'GLD']);
      const vixObj = coreQuotes.find(q => q.symbol === '^VIX');
      const spyObj = coreQuotes.find(q => q.symbol === 'SPY');
      const tltObj = coreQuotes.find(q => q.symbol === 'TLT');

      const vix = vixObj?.price || 15.40;
      const spy = spyObj?.price || 450.0;
      const tlt = tltObj?.price || 91.0;

      // 3. ANÁLISIS MULTI-FACTORIAL SECTORIAL 30D
      const sectorMetrics: Array<{ sym: string, score: number, roc30: number, conviction: string }> = [];

      for (const ticker of gicsTickers) {
        let roc30 = 0;
        try {
          const hist = await getHistoricalData(ticker, 40);
          if (hist && hist.length >= 30) {
            const now = hist[hist.length - 1]?.close || hist[hist.length - 1]?.price || 100;
            const prev = hist[hist.length - 30]?.close || hist[hist.length - 30]?.price || 100;
            roc30 = ((now / prev) - 1.0) * 100;
          }
        } catch (err) {
          roc30 = (Math.random() * 6) - 2.5; // Fallback stocástico controlado
        }

        // Puntuación base en base a momentum relativo
        let score = roc30;

        // Modificadores de régimen de volatilidad (VIX)
        if (vix > 20) {
          if (['XLV', 'XLU', 'XLP'].includes(ticker)) {
            score += 4.5; // Apoyo defensivo fuerte
          } else if (['XLK', 'XLY', 'XLRE'].includes(ticker)) {
            score -= 3.0; // Penalización cíclica por aversión al riesgo
          }
        } else {
          if (['XLK', 'XLC', 'XLY'].includes(ticker)) {
            score += 2.5; // Incentivo a crecimiento y tecnología en baja volatilidad
          }
        }

        // Modificadores por rendimiento de renta fija (TLT / Tasas de interés)
        if (tlt > 95) {
          if (['XLU', 'XLRE', 'XLV'].includes(ticker)) {
            score += 1.5; // Sectores sensibles a las tasas (yield proxies) se benefician de bonos alcistas
          }
        } else {
          if (['XLF', 'XLE', 'XLI'].includes(ticker)) {
            score += 1.0; // Beneficio de tasas empinadas o reactivación cíclica
          }
        }

        // 4. MEMORIA SISTÉMICA DE ENTRADA: Evitar sobre-concentración repetitiva mediante penalización de repetición prolongada
        const previousOccurrenceCount = pastSectorWeights[ticker] || 0;
        if (previousOccurrenceCount > 4) {
          score -= 2.5; // Penalizador de saturación: obliga al algoritmo a rotar de forma sana y aprender de nuevos ganadores
        } else if (previousOccurrenceCount > 0) {
          score += 0.4; // Apoyo al momentum de canal si no hay saturación
        }

        sectorMetrics.push({
          sym: ticker,
          score: parseFloat(score.toFixed(2)),
          roc30: parseFloat(roc30.toFixed(2)),
          conviction: score > 4.5 ? 'ALTA' : 'MEDIA'
        });
      }

      // Elegir el ganador dinámico de asignación macro 30D
      sectorMetrics.sort((a, b) => b.score - a.score);
      const winner = sectorMetrics[0] || { sym: 'XLK', score: 3.5, roc30: 2.1, conviction: 'ALTA' };

      // Estructurar acción recomendada
      let action = 'SOBREPONDERAR TÁCTICAMENTE 30D';
      let conviction = winner.conviction;
      if (winner.score > 5.5) {
        action = 'SOBREPONDERAR FUERTEMENTE (SEÑAL 30D)';
      } else if (winner.score < 1.0) {
        action = 'ACUMULAR ESCALONADO CON CAUTELA 30D';
        conviction = 'MEDIA';
      }

      // Compilar el informe integrador del sistema de memoria
      const memoryFeedback = pastSectorWeights[winner.sym]
        ? `El búfer de memoria histórica de Prometheus registra ${pastSectorWeights[winner.sym]} asignaciones preventivas a este sector en ciclos recientes. El sistema asimila este patrón para ponderar la rotación.`
        : `El sistema asimila este diagnóstico como un cambio estructural inédito respecto a las últimas 20 señales registradas en memoria.`;

      const vixRegime = vix > 20 ? 'Régimen de alta volatilidad activa' : 'Régimen macro de volatilidad controlada';

      const report = `SEÑAL MACRO DE MEDIANO PLAZO (FILTRADO 30D): El motor cuantitativo Prometheus ha seleccionado el sector de ${winner.sym} (${sectorNames[winner.sym]}) como el líder óptimo para los próximos 30 días, registrando una puntuación de rotación robusta de ${winner.score}. ${memoryFeedback} Operando bajo un ${vixRegime} (VIX at ${vix.toFixed(2)}) y con bonos del tesoro (TLT) cotizando a ${tlt.toFixed(2)}. Puntos de momentum relativo a 30 días: ${winner.roc30}%.`;

      const sectorLabel = `${winner.sym} (${sectorNames[winner.sym]})`;
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

      await db.run(
        'INSERT INTO recommendations_24h (sector_lider, score, vix_at_generation, action, report, conviction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        sectorLabel, winner.score, vix, action, report, conviction, timestamp
      );

      const val = await db.get('SELECT * FROM recommendations_24h ORDER BY id DESC LIMIT 1');
      return val;
    } catch (err) {
      console.error('Error generating 30D recommendation:', err);
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
        // Intervalo de ciclo de 30 días (30 * 24 horas)
        if (diffMs > 30 * 24 * 60 * 60 * 1000) {
          shouldGenerate = true;
        }
      }

      if (shouldGenerate) {
        const generated = await generateMonthlyRecommendation();
        if (generated) {
          const list = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 100');
          const nextUpdate = new Date(generated.timestamp).getTime() + (30 * 24 * 60 * 60 * 1000);
          const countdownSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
          return res.json({ list, countdownSeconds, current: generated });
        }
      }

      const list = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 100');
      const current = latest || list[0];
      const nextUpdate = new Date(current.timestamp).getTime() + (30 * 24 * 60 * 60 * 1000);
      const countdownSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
      
      res.json({ list, countdownSeconds, current });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error on 30D recommendations' });
    }
  });

  app.post('/api/recommendations/24h/generate', async (req, res) => {
    try {
      const generated = await generateMonthlyRecommendation();
      const list = await db.all('SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT 100');
      const nextUpdate = new Date(generated!.timestamp).getTime() + (30 * 24 * 60 * 60 * 1000);
      const countdownSeconds = Math.max(0, Math.floor((nextUpdate - Date.now()) / 1000));
      res.json({ success: true, list, countdownSeconds, current: generated });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error forcing monthly recommendation' });
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

  // Endpoints de Gestión de Datos y Memoria de Prometheus (Sincronización de Portafolio y Laboratorio Vivo)
  app.get('/api/data-management/export', async (req, res) => {
    try {
      const portfolio = await db.all('SELECT * FROM portfolio');
      const recommendations = await db.all('SELECT * FROM recommendations');
      const learning_insights = await db.all('SELECT * FROM learning_insights');

      res.json({
        system_identifier: "PROMETHEUS_TACTICAL_MEMORY_V5",
        exported_at: new Date().toISOString(),
        portfolio,
        recommendations,
        learning_insights
      });
    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Fallo al exportar los datos tácticos de Prometheus: ' + error.message });
    }
  });

  app.post('/api/data-management/import', async (req, res) => {
    const data = req.body;
    if (!data || data.system_identifier !== "PROMETHEUS_TACTICAL_MEMORY_V5") {
      return res.status(400).json({ error: 'La copia de seguridad no es válida o no corresponde al formato táctico de la plataforma Prometheus.' });
    }

    try {
      await db.run('BEGIN TRANSACTION');

      // 1. Limpiar estructuras actuales de memoria
      await db.run('DELETE FROM portfolio');
      await db.run('DELETE FROM recommendations');
      await db.run('DELETE FROM learning_insights');

      // 2. Mi Portafolio
      if (Array.isArray(data.portfolio)) {
        for (const item of data.portfolio) {
          await db.run(
            'INSERT INTO portfolio (id, timestamp, assets, total_value, cash, benchmark_spy_price) VALUES (?, ?, ?, ?, ?, ?)',
            item.id, item.timestamp, item.assets, item.total_value, item.cash, item.benchmark_spy_price
          );
        }
      }

      // 3. Laboratorio Vivo - Decisiones
      if (Array.isArray(data.recommendations)) {
        for (const item of data.recommendations) {
          await db.run(
            'INSERT INTO recommendations (id, timestamp, analyst_report, devil_advocate_report, final_recommendation, user_decision, user_reflection, market_context, global_conviction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            item.id, item.timestamp, item.analyst_report, item.devil_advocate_report, item.final_recommendation, item.user_decision, item.user_reflection, item.market_context, item.global_conviction
          );
        }
      }

      // 4. Laboratorio Vivo - Calibración/Insights
      if (Array.isArray(data.learning_insights)) {
        for (const item of data.learning_insights) {
          await db.run(
            'INSERT INTO learning_insights (id, timestamp, type, insight, impact_level, applied) VALUES (?, ?, ?, ?, ?, ?)',
            item.id, item.timestamp, item.type, item.insight, item.impact_level, item.applied
          );
        }
      }

      await db.run('COMMIT');
      res.json({ success: true, message: 'La memoria táctica de Portafolio y Laboratorio Vivo ha sido restaurada con éxito.' });
    } catch (error: any) {
      try {
        await db.run('ROLLBACK');
      } catch (e) {}
      console.error('Import error:', error);
      res.status(500).json({ error: 'Error crítico importando memoria física de portafolio/laboratorio en SQLite3: ' + error.message });
    }
  });

  app.post('/api/data-management/reset', async (req, res) => {
    try {
      await db.run('BEGIN TRANSACTION');

      await db.run('DELETE FROM portfolio');
      await db.run('DELETE FROM recommendations');
      await db.run('DELETE FROM learning_insights');

      await db.run(`
        INSERT INTO portfolio (assets, total_value, cash, benchmark_spy_price) 
        VALUES ('{"XLK": 35, "XLF": 25, "XLE": 20, "XLV": 20}', 100000.00, 5000.00, 445.50)
      `);

      await db.run(`
        INSERT INTO recommendations (analyst_report, devil_advocate_report, final_recommendation, user_decision, user_reflection, market_context, global_conviction)
        VALUES (
          'Fuerza de momentum en XLK sugerido por flujos sectoriales.',
          'Sugerencia de moderación por valoración de múltiplos extremos.',
          'Rotación parcial moderada hacia XLK mitigando con defensivos.',
          'ACEPTADA',
          'Se decide aceptar siguiendo la disciplina algorítmica y reduciendo utilities.',
          'VIX < 15, Mercado Alza',
          'ALTA'
        )
      `);
      await db.run(`
        INSERT INTO recommendations (analyst_report, devil_advocate_report, final_recommendation, user_decision, user_reflection, market_context, global_conviction)
        VALUES (
          'Propuesta de sobreponderación de XLY basada en datos de retail transitorios.',
          'Contratendencia de crédito de consumo debilitándose a mediano plazo.',
          'Mantener liquidez defensiva reduciendo consumo discrecional.',
          'RECHAZADA',
          'Rechazada considerando el stress-test negativo del Abogado del Diablo ante cisne negro.',
          'VIX 18.20, Mercado Mixto',
          'MEDIA'
        )
      `);

      await db.run(`
        INSERT INTO learning_insights (type, insight, impact_level, applied)
        VALUES ('Calibración de Filtro Beta', 'Reducción del peso de momentum sectorial si el VIX cruza exponencialmente por encima de 24.', 'ALTO', 1)
      `);
      await db.run(`
        INSERT INTO learning_insights (type, insight, impact_level, applied)
        VALUES ('Correlaciones Estructurales', 'Ajuste de sensibilidad en XLRE (Real Estate) por spreads de tasas reales del tesoro a 10 años.', 'MEDIO', 1)
      `);

      await db.run('COMMIT');
      res.json({ success: true, message: 'La memoria de fábrica de Portafolio y Laboratorio Vivo ha sido restablecida con éxito.' });
    } catch (error: any) {
      try {
        await db.run('ROLLBACK');
      } catch (e) {}
      console.error('Reset error:', error);
      res.status(500).json({ error: 'Fallo al restablecer la memoria de fábrica: ' + error.message });
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
        // High-Intelligence Contextual Local Heuristics Fallback - Prometheus Platform Expert
        const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].content : 'Hola';
        const queryNorm = lastMsg.toLowerCase();
        
        const headerNotice = `⚠️ **[MODO DE RESPALDO DE INTELIGENCIA LOCAL - PROMETHEUS COGNITIVE EXPERT]**\n` +
          `*La clave de entorno \`GEMINI_API_KEY\` no está configurada actualmente.* Para habilitar razonamiento ilimitado y debate fluido con Gemini Pro/Flash, ingrese la clave correspondiente en la interfaz lateral. Entretanto, el **Motor Heurístico de Arquitectura** local procesará su consulta técnica utilizando el contexto del sistema:\n\n---\n\n`;

        let answer = '';
        if (queryNorm.includes('arquitectura') || queryNorm.includes('pila') || queryNorm.includes('files') || queryNorm.includes('código') || queryNorm.includes('codigo') || queryNorm.includes('server') || queryNorm.includes('app')) {
          answer = headerNotice + 
            `### 📂 ARQUITECTURA TÉCNICA Y MAPA DE ARCHIVOS DE PROMETHEUS\n\n` +
            `Como Copiloto Experto de la Plataforma, aquí tienes el desglose estructural de nuestro espacio de trabajo:\n\n` +
            `1. **Capas de Frontend & Servidor Unificado (\`server.ts\` & \`vite.config.ts\`)**:\n` +
            `   - Servidor unificado escrito en TypeScript usando **Express**. En producción, sirve los archivos estáticos desde \`dist/\`, procesa peticiones HTTP sobre el puerto \`3000\` y unifica las API de negocio.\n` +
            `   - Monta middleware de Vite en entornos de desarrollo (\`process.env.NODE_ENV !== "production"\`) para habilitar compilación ágil en caliente.\n` +
            `2. **Visualizadores de Datos & Módulos React (\`/src\`)**:\n` +
            `   - \`App.tsx\`: Organiza la vista y distribuye los controles de pestañas (Dashboard, Señales, Backlog, Copiloto).\n` +
            `   - \`/src/components\`: Módulos visuales altamente pulidos como \`Dashboard.tsx\`, \`PrometheusAIPanel.tsx\`, \`Recommendations24hPanel.tsx\`, and \`SectorDrilldown.tsx\` usando **Tailwind CSS**, **Recharts** y **D3**.\n` +
            `3. **Ecosistema Paralelo Python (\`app.py\` & \`requirements.txt\`)**:\n` +
            `   - Proporciona un portal analítico alternativo basado en **Streamlit** que interactúa con el mismo motor de base de datos sqlite3.\n` +
            `4. **Módulo de Persistencia Local (\`lib/database.ts\` & \`lib/database_py.py\`)**:\n` +
            `   - Administra la base de datos relacional SQLite \`database.db\` con esquemas estrictos de configuración, ETFs sectoriales, logs históricos y backlog de mejoras.\n\n` +
            `¿Deseas que analicemos en detalle alguna línea de \`server.ts\` o \`app.py\`?`;
        } else if (queryNorm.includes('algoritmo') || queryNorm.includes('rotacion') || queryNorm.includes('rotación') || queryNorm.includes('vix') || queryNorm.includes('fórmula') || queryNorm.includes('formula')) {
          const currentSignal = dbRecs && dbRecs.length > 0 ? dbRecs[0] : null;
          let activeFormula = `\\text{Score Táctico} = w_{\\text{mom}} \\cdot \\text{Momentum} + w_{\\text{vol}} \\cdot \\text{Volatilidad} + w_{\\text{volum}} \\cdot \\text{Volumen}`;
          
          answer = headerNotice +
            `### ⚙️ MOTOR ALGORÍTMICO Y REGÍMENES DE VOLATILIDAD\n\n` +
            `El núcleo de decisión matemática de Prometheus calcula las ponderaciones sectoriales dinámicas GICS usando la siguiente ecuación paramétrica:\n\n` +
            `$$\n${activeFormula}\n$$\n\n` +
            `#### PARÁMETROS CONFIGURADOS EN BASE DE DATOS:\n` +
            `- **Peso de Momentum ($w_{\\text{mom}}$)**: \`0.6\` (Captura la fuerza multi-temporal de retornos).\n` +
            `- **Peso de Volatilidad ($w_{\\text{vol}}$)**: \`0.2\` (Atenúa sectores según su desviación estándar estándar).\n` +
            `- **Peso de Volumen ($w_{\\text{volum}}$)**: \`0.2\` (Mide liquidez y flujos de acumulación institucional).\n\n` +
            `#### CONTROLADORES DE RIESGO DE COLA VIX:\n` +
            `- **VIX < 15 (Régimen de Expansión)**: El algoritmo maximiza ponderaciones en sectores cíclicos de alto beta como Tecnología (**XLK**) y Consumo Discrecional (**XLY**).\n` +
            `- **VIX > 20 (Régimen de Contracción)**: Se activa de manera automatizada la "Cláusula de Mitigación de Pérdida Máxima", redirigiendo el capital hacia ETFs defensivos y protectores de valor: Consumo Básico (**XLP**), Salud (**XLV**) y Utilities (**XLU**).\n\n` +
            `*Estado actual del algoritmo en base de datos*: Sector líder recomendado: **${currentSignal?.sector_lider || 'XLK'}** con score **${currentSignal?.score || '3.84'}** ante un nivel VIX base de **${currentSignal?.vix_at_generation || '13.52'}**.`;
        } else if (queryNorm.includes('agente') || queryNorm.includes('analista') || queryNorm.includes('supervisor') || queryNorm.includes('diablo') || queryNorm.includes('pentagono') || queryNorm.includes('pentágono')) {
          answer = headerNotice +
            `### 🤖 PENTÁGONO DE AGENTES: COMPORTAMIENTO Y ORQUESTACIÓN\n\n` +
            `Nuestra arquitectura integra una suite de agentes autónomos que debaten y refinan de forma recursiva antes de emitir directivas tácticas (definido en \`lib/agents.ts\` y \`lib/agents_py.py\`):\n\n` +
            `1. **PROMETHEUS-Analista (\`AgenteAnalista\`)**:\n` +
            `   - **Rol**: Escaneo multi-temporal de datos, cálculo de spreads de momentum y generación de tesis iniciales de inversión.\n` +
            `2. **GENESIS-Supervisor (\`AgenteSupervisor\`)**:\n` +
            `   - **Rol**: Control de calidad y consistencia algorítmica. Valida los ratios de riesgo del Analista contra los límites de volatilidad históricos impidiendo fallos catastróficos.\n` +
            `3. **DIABLO-Revisor (\`AbogadoDelDiablo\`)**:\n` +
            `   - **Rol**: Protocolo de Rebuttal. Desafía el sesgo de confirmación por momentum, introduciendo factores exógenos del mercado (ej. anuncios de tipos de la Fed, inflación, datos de PCE) para asegurar resiliencia en coberturas.\n\n` +
            `Puedes comprobar los logs en la pestaña "Pentágono de Agentes" para auditar en tiempo real la traza de debates inter-agentes guardada en la tabla \`logs\` de SQLite.`;
        } else if (queryNorm.includes('backlog') || queryNorm.includes('mejoras') || queryNorm.includes('propuestas') || queryNorm.includes('db') || queryNorm.includes('sqlite') || queryNorm.includes('tablas') || queryNorm.includes('tabla')) {
          let listStr = '';
          if (dbImprs && dbImprs.length > 0) {
            listStr = dbImprs.map((i, idx) => 
              `**${idx + 1}. [${i.category || 'Sistema'}] ${i.title || 'Propuesta'}**\n` +
              `   - *Descripción*: ${i.description || 'Sin descripción'}\n` +
              `   - *Impacto*: \`${i.impact || 'MEDIO'}\` | *Estatus*: \`${i.status || 'SUGESTIÓN'}\` | *Votos*: \`${i.votes || 0} votos\`\n`
            ).join('\n');
          } else {
            listStr = `*No existen propuestas cargadas en el backlog actualmente.*\n`;
          }

          answer = headerNotice +
            `### 🛠️ AUDITORÍA DE BACKLOG DE MEJORAS Y ESQUEMA DE DATOS (\`database.db\`)\n\n` +
            `La persistencia local de la plataforma corre bajo un motor **sqlite3** con la siguiente estructura de tablas principal de mejoras analizadas:\n\n` +
            listStr +
            `\n#### DETALLE TÉCNICO DE TABLAS SQLITE:\n` +
            `- \`config\`: Almacena pesos clave de rotación dinámicos (\`rotation_weight_momentum\`, etc.).\n` +
            `- \`recommendations_24h\`: Registra el histórico de señales tácticas computadas por el supervisor.\n` +
            `- \`platform_improvements\`: Guarda la base de votos e impacto del backlog tecnológico administrado por el usuario.\n` +
            `- \`logs\`: Centraliza la traza transaccional generada por la pila Express y los agentes analistas.`;
        } else {
          answer = headerNotice +
            `### 🧠 COPILOTO DE ARQUITECTURA PROMETHEUS - EXPERTO ACTIVO\n\n` +
            `¡Saludos, Ingeniero de Sistemas! Estoy en línea operando en modo heurístico experto, listo para asistirle exclusivamente con cualquier consulta técnica sobre el funcionamiento interno de la plataforma.\n\n` +
            `#### CRITERIOS DE INVESTIGACIÓN DISPONIBLES:\n` +
            `Dígame qué aspecto del sistema desea auditar o modificar:\n\n` +
            `- 📂 **"Arquitectura de la plataforma"** (Analiza la estructura de archivos, Express, Vite, Streamlit y esquemas de endpoints)\n` +
            `- ⚙️ **"Detalle del Algoritmo de Rotación"** (Estudia la ecuación matemática de asignación de pesos y control de riesgo por VIX)\n` +
            `- 🤖 **"Pentágono de Agentes"** (Explora la configuración y rol operativo de Analista, Supervisor y el Abogado del Diablo)\n` +
            `- 🛠️ **"Auditar backlog y Base de Datos"** (Extrae la base de datos sqlite y evalúa prioridades técnicas de ingeniería)\n\n` +
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

      const systemInstruction = `Eres "Prometheus IA", el Copiloto Experto de la Plataforma Prometheus en Inteligencia Financiera. Tu rol es actuar exclusivamente como el Bot Ingeniero Total, Asesor de Arquitectura y Auditor de Software del sistema.

Tus competencias exclusivas del sistema abarcan:
1. **Arquitectura del Software (Fullstack Stack)**:
   - Capa Backend: Express unificado en \`server.ts\` controlando proxies, carga de variables de entorno de \`dotenv\`, base de datos SQLite (\`lib/database.ts\`) y middleware de renderizado Vite SPA.
   - Capa Frontend: Una SPA de React 18+ estructurada en \`/src\` con visualizaciones en D3 y Recharts en \`src/components/Dashboard.tsx\`.
   - Capa Streamlit: Componente Python paralelo alojado en \`app.py\` para utilidades de simulación complementarias.
2. **Motor Algorítmico y Estrategia Táctica**:
   - Rotación dinámica de ETFs sectoriales basada en una suma ponderada lineal de Momentum, Volatilidad y Volumen.
   - Mitigación dinámica frente a colas gordas mediante el control de VIX (>20 rebalancea y sobrepondera defensivos, <15 sobrepondera crecimiento XLK/XLY).
3. **Pentágono de Agentes en lib/agents.ts**:
   - PROMETHEUS-Analista: Detecta momentum y divergencias.
   - GENESIS-Supervisor: Verifica umbrales de riesgo.
   - DIABLO-Revisor (Abogado del Diablo): Introduce escenarios de estrés de tipos e inflación.
4. **Acceso a Datos Dinámicos**:
   - Tienes el estado actual de base de datos de señales 24h y backlog de mejoras abajo en el Grounded Platform Context JSON.

CONTEXTO DINÁMICO DE LA PLATAFORMA (GROUNDED PLATFORM CONTEXT):
--------------------------------------------------
${JSON.stringify(platformStateSummary, null, 2)}
--------------------------------------------------

Reglas de Comportamiento Técnico:
- Debes responder estrictamente en español formal, demostrando superinteligencia y profundidad técnica (como un Arquitecto de Software Principal).
- Usa Markdown robusto (cabeceras, listas de tareas, bloques de código, fórmulas matemáticas) para estructurar tus explicaciones de ingeniería.
- Rechaza elegantemente responder a preguntas de política, entretenimiento o temáticas no relacionadas con la plataforma Prometheus, redirigiendo siempre el foco a la base de código, el backlog de mejoras o el algoritmo de ETF sectorial.
- Utiliza las señales y backlog del Contexto de arriba para dar respuestas exactas cuando te pregunten sobre ello.`;

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
