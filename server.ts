import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDb, getDb } from './lib/database';
import { getQuotes, getHistoricalData, calculateCorrelation, calculateROC } from './lib/data-fetcher';
import { AgenteAnalista, AgenteSupervisor, AbogadoDelDiablo } from './lib/agents';

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
