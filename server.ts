import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db from './lib/database';
import { getQuotes } from './lib/data-fetcher';
import { AgenteAnalista, AgenteSupervisor, AbogadoDelDiablo } from './lib/agents';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Agents instances
  const analista = new AgenteAnalista();
  const supervisor = new AgenteSupervisor();
  const diablo = new AbogadoDelDiablo();

  // API Routes
  app.get('/api/quotes', async (req, res) => {
    try {
      const etfs = db.prepare('SELECT ticker FROM etfs').all() as { ticker: string }[];
      const tickers = etfs.map(e => e.ticker);
      const quotes = await getQuotes(tickers);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching quotes' });
    }
  });

  app.get('/api/logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50').all();
    res.json(logs);
  });

  app.get('/api/config', (req, res) => {
    const etfs = db.prepare('SELECT * FROM etfs').all();
    res.json({ etfs });
  });

  app.post('/api/config/etf', (req, res) => {
    const { ticker, name, sector } = req.body;
    try {
      db.prepare('INSERT INTO etfs (ticker, name, sector) VALUES (?, ?, ?)').run(ticker, name, sector);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: 'Duplicate or invalid ticker' });
    }
  });

  app.post('/api/refresh', async (req, res) => {
    // Manually trigger agent cycle
    const analysis = await analista.analyze({});
    await supervisor.supervise(analysis);
    await diablo.challenge(analysis);
    res.json({ success: true, analysis });
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
