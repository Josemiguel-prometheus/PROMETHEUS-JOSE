import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database;

export async function initDb() {
  const dbPath = process.env.DATABASE_PATH || 'database.db';
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Initialize DB schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS etfs (
      ticker TEXT PRIMARY KEY,
      name TEXT,
      sector TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT,
      message TEXT,
      agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT,
      price REAL,
      change_pct REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recommendations_24h (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      sector_lider TEXT,
      score REAL,
      vix_at_generation REAL,
      action TEXT,
      report TEXT,
      conviction TEXT
    );

    CREATE TABLE IF NOT EXISTS platform_improvements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      title TEXT,
      description TEXT,
      votes INTEGER DEFAULT 0,
      status TEXT,
      impact TEXT,
      github_milestone TEXT
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      assets TEXT,
      total_value REAL,
      cash REAL,
      benchmark_spy_price REAL
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      analyst_report TEXT,
      devil_advocate_report TEXT,
      final_recommendation TEXT,
      user_decision TEXT,
      user_reflection TEXT,
      market_context TEXT,
      global_conviction TEXT
    );

    CREATE TABLE IF NOT EXISTS learning_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT,
      insight TEXT,
      impact_level TEXT,
      applied INTEGER
    );
  `);

  // Seed portfolio, recommendations, and learning_insights if empty
  const portCountRow = await db.get('SELECT count(*) as count FROM portfolio');
  const portCount = portCountRow ? (portCountRow as any).count : 0;
  if (portCount === 0) {
    await db.run(`
      INSERT INTO portfolio (assets, total_value, cash, benchmark_spy_price) 
      VALUES ('{"XLK": 35, "XLF": 25, "XLE": 20, "XLV": 20}', 100000.00, 5000.00, 445.50)
    `);
  }

  const recsCountRow = await db.get('SELECT count(*) as count FROM recommendations');
  const recsCount = recsCountRow ? (recsCountRow as any).count : 0;
  if (recsCount === 0) {
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
  }

  const insightsCountRow = await db.get('SELECT count(*) as count FROM learning_insights');
  const insightsCount = insightsCountRow ? (insightsCountRow as any).count : 0;
  if (insightsCount === 0) {
    await db.run(`
      INSERT INTO learning_insights (type, insight, impact_level, applied)
      VALUES ('Calibración de Filtro Beta', 'Reducción del peso de momentum sectorial si el VIX cruza exponencialmente por encima de 24.', 'ALTO', 1)
    `);
    await db.run(`
      INSERT INTO learning_insights (type, insight, impact_level, applied)
      VALUES ('Correlaciones Estructurales', 'Ajuste de sensibilidad en XLRE (Real Estate) por spreads de tasas reales del tesoro a 10 años.', 'MEDIO', 1)
    `);
  }

  // Seed default weights if not present
  await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('rotation_weight_momentum', '0.6')");
  await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('rotation_weight_volatility', '0.2')");
  await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('rotation_weight_volume', '0.2')");

  // Seed platform_improvements if empty
  const imprCountRow = await db.get('SELECT count(*) as count FROM platform_improvements');
  const imprCount = imprCountRow ? (imprCountRow as any).count : 0;
  if (imprCount === 0) {
    const defaultImprovements = [
      ['Inteligencia & Modelos', 'Módulo Avanzado de Backtesting Bayesiano', 'Permite simular la efectividad de la rotación sectorial táctica frente a un portafolio Buy & Hold estático de SPY.', 42, 'APROBADO', 'ALTO', 'Sprint-v1.1'],
      ['Conectividad & Canales', 'Suscripción Inmediata Webhook / Telegram', 'Enviar señales tácticas de 24h directamente a canales de comunicación automatizados o carteras de auto-trading.', 19, 'SUGESTIÓN', 'MEDIO', 'Backlog'],
      ['Capa de Datos / Portafolio', 'Soporte de Cartera sin Fracciones de Títulos', 'Modificar el optimizador del Asesor de Rebalanceo para calcular lotes completos de ETFs según mínimos configurables.', 11, 'SUGESTIÓN', 'MEDIO', 'Backlog'],
      ['Optimización Técnica', 'Caché de Cotizaciones de Yahoo Finance', 'Mitigar limitaciones de tasa de la API de Yahoo Finance mediante pre-cacheo local de 60 segundos en transacciones concurrentes.', 55, 'IMPLEMENTADO', 'ALTO', 'Sprint-v1.0'],
      ['Simulación Estocástica', 'Pruebas de Estrés Basadas en Eventos Históricos', 'Integrar choques históricos reales (Pandemia 2020, Subprime 2008, Burbuja Dotcom) directamente al simulador del Abogado del Diablo.', 31, 'APROBADO', 'ALTO', 'Sprint-v1.1'],
      ['Seguridad de Datos', 'Control de Auditoría y Logs de Transacciones', 'Registro persistente de decisiones del supervisor ante variaciones rápidas de volatilidad interbancaria.', 8, 'SUGESTIÓN', 'BAJO', 'Backlog']
    ];
    for (const imp of defaultImprovements) {
      await db.run(
        'INSERT INTO platform_improvements (category, title, description, votes, status, impact, github_milestone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        imp[0], imp[1], imp[2], imp[3], imp[4], imp[5], imp[6]
      );
    }
  }

  // Seed recommendations_24h if empty
  const recCountRow = await db.get('SELECT count(*) as count FROM recommendations_24h');
  const recCount = recCountRow ? (recCountRow as any).count : 0;
  if (recCount === 0) {
    const historicalRecs = [
      ['XLK (Tecnología)', 3.84, 13.52, 'SOBREPONDERAR TÁCTICAMENTE', 'Alta fuerza de momentum en semiconductores soportada por flujos estructurales y volumen ascendente.', 'ALTA', '2026-05-17 12:00:00'],
      ['XLE (Energía)', 1.42, 17.80, 'MANTENER / CAUTELA', 'Presión geopolítica elevando crudo, pero la volatilidad intradiaria aconseja no incrementar ponderación.', 'MEDIA', '2026-05-18 12:00:00'],
      ['XLY (Consumo)', -0.85, 14.10, 'REDUCIR POSICIONES', 'Debilidad en ventas core del consumidor e índices de crédito ajustados. Desplazar hacia defensivos.', 'BAJA', '2026-05-19 12:00:00'],
      ['XLV (Salud)', 2.10, 18.25, 'SOBREPONDERAR DEFENSIVOS', 'El aumento del VIX sugiere rotación defensiva hacia salud tradicional. Spread de dividendo atractivo.', 'MEDIA', '2026-05-20 12:00:00']
    ];
    for (const rec of historicalRecs) {
      await db.run(
        'INSERT INTO recommendations_24h (sector_lider, score, vix_at_generation, action, report, conviction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        rec[0], rec[1], rec[2], rec[3], rec[4], rec[5], rec[6]
      );
    }
  }

  // Seed default ETFs if empty
  const countRow = await db.get('SELECT count(*) as count FROM etfs');
  const count = countRow ? (countRow as any).count : 0;
  
  if (count === 0) {
    const defaultEtfs = [
      ['SPX', 'S&P 500 Index', 'Macro'],
      ['VIX', 'Volatility Index', 'Macro'],
      ['DXY', 'US Dollar Index', 'Macro'],
      ['GLD', 'Gold ETF', 'Commodities'],
      ['SLV', 'Silver ETF', 'Commodities'],
      ['US10Y', 'US 10Y Yield', 'Fixed Income'],
      ['TLT', 'iShares 20+ Year Treasury Bond ETF', 'Fixed Income'],
      ['QQQ', 'Invesco QQQ Trust', 'Equity'],
      ['BTC-USD', 'Bitcoin', 'Crypto'],
      ['SPY', 'SPDR S&P 500 ETF Trust', 'Equity'],
      ['EEM', 'iShares MSCI Emerging Markets ETF', 'Equity'],
      ['HYG', 'High Yield Corporate Bond ETF', 'Fixed Income'],
      ['LQD', 'Investment Grade Corp Bond ETF', 'Fixed Income'],
      ['IWM', 'Russell 2000 ETF', 'Equity'],
      ['CL=F', 'Crude Oil WTI', 'Commodities'],
      ['HG=F', 'Copper Futures', 'Commodities'],
      ['XLE', 'Energy Select Sector SPDR', 'Energy'],
      ['XLB', 'Materials Select Sector SPDR', 'Materials'],
      ['XLI', 'Industrials Select Sector SPDR', 'Industrials'],
      ['XLY', 'Consumer Discretionary Select Sector SPDR', 'Consumer Discretionary'],
      ['XLP', 'Consumer Staples Select Sector SPDR', 'Consumer Staples'],
      ['XLV', 'Health Care Select Sector SPDR', 'Health Care'],
      ['XLF', 'Financial Select Sector SPDR', 'Financials'],
      ['XLK', 'Technology Select Sector SPDR', 'Technology'],
      ['XLC', 'Communication Services Select Sector SPDR', 'Communications'],
      ['XLU', 'Utilities Select Sector SPDR', 'Utilities'],
      ['XLRE', 'Real Estate Select Sector SPDR', 'Real Estate']
    ];
    
    for (const etf of defaultEtfs) {
      try {
        await db.run('INSERT INTO etfs (ticker, name, sector) VALUES (?, ?, ?)', etf[0], etf[1], etf[2]);
      } catch (e) {
        // Ignore duplicates
      }
    }
  }
  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}
