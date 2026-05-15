import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDb, getDb } from './lib/database';
import { getQuotes } from './lib/data-fetcher';
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
      res.json({ etfs });
    } catch (e) {
      res.status(500).json({ error: 'Error fetching config' });
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
