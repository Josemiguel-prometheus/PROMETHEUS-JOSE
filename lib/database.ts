import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || 'database.db';
const db = new Database(dbPath);

// Initialize DB schema
db.exec(`
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
const count = db.prepare('SELECT count(*) as count FROM etfs').get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO etfs (ticker, name, sector) VALUES (?, ?, ?)');
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
      insert.run(etf[0], etf[1], etf[2]);
    } catch (e) {
      // Ignore duplicates
    }
  }
}

export default db;
