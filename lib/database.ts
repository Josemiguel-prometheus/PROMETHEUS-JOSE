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
  `);

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
      ['HG=F', 'Copper Futures', 'Commodities']
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
