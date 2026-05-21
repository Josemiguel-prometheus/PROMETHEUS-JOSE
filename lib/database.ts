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
  `);

  // Seed default weights if not present
  await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('rotation_weight_momentum', '0.6')");
  await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('rotation_weight_volatility', '0.2')");
  await db.run("INSERT OR IGNORE INTO config (key, value) VALUES ('rotation_weight_volume', '0.2')");

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
