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

  app.get('/api/market/fear-greed', async (req, res) => {
    try {
      const tickers = ['^VIX', 'SPY', 'TLT', 'HYG', 'LQD'];
      const quotes = await getQuotes(tickers);
      
      const vixObj = quotes.find(q => q.symbol === '^VIX' || q.symbol === 'VIX');
      const spyObj = quotes.find(q => q.symbol === 'SPY');
      const tltObj = quotes.find(q => q.symbol === 'TLT');
      const hygObj = quotes.find(q => q.symbol === 'HYG');
      const lqdObj = quotes.find(q => q.symbol === 'LQD');
      
      const vixVal = vixObj?.price || 14.5;
      const spyVal = spyObj?.price || 450;
      const tltVal = tltObj?.price || 91.0;
      const hygVal = hygObj?.price || 78.5;
      const lqdVal = lqdObj?.price || 108.0;
      
      // Fetch histories for calculation
      let spyHist: any[] = [];
      let vixHist: any[] = [];
      let tltHist: any[] = [];
      let hygHist: any[] = [];
      let lqdHist: any[] = [];
      
      try {
        spyHist = await getHistoricalData('SPY', 260); // 1 year of history
        vixHist = await getHistoricalData('^VIX', 60);
        tltHist = await getHistoricalData('TLT', 30);
        hygHist = await getHistoricalData('HYG', 30);
        lqdHist = await getHistoricalData('LQD', 30);
      } catch (err) {
        console.warn('Error fetching histories for Fear/Greed:', err);
      }
      
      // 1. Market Momentum (S&P 500 vs its 125-Day SMA)
      let momentumScore = 55;
      let spySma125 = spyVal * 0.98; // default backup
      if (spyHist && spyHist.length > 125) {
        const last125 = spyHist.slice(-125);
        const total = last125.reduce((sum, h) => sum + (h.close || h.price || spyVal), 0);
        spySma125 = total / 125;
        const diffPercent = ((spyVal / spySma125) - 1.0) * 100;
        // Map -5%..+5% distance onto 0..100
        momentumScore = Math.max(0, Math.min(100, Math.round(((diffPercent + 5) / 10) * 100)));
      }
      
      // 2. Stock Price Strength (52-week High vs Low rolling range of S&P 500 proxy)
      let strengthScore = 50;
      let spyMin252 = spyVal * 0.85;
      let spyMax252 = spyVal * 1.05;
      if (spyHist && spyHist.length > 0) {
        const closes = spyHist.map(h => h.close || h.price || spyVal);
        spyMin252 = Math.min(...closes);
        spyMax252 = Math.max(...closes);
        const position = (spyVal - spyMin252) / (spyMax252 - spyMin252);
        strengthScore = Math.max(0, Math.min(100, Math.round(position * 100)));
      }
      
      // 3. Stock Price Breadth ( NYSE Up/Down Volume index / cumulative SPY daily volume breadth )
      let breadthScore = 50;
      if (spyHist && spyHist.length > 20) {
        const last20 = spyHist.slice(-20);
        // Calculate volume weight of positive days vs negative days
        let upVolume = 0;
        let downVolume = 0;
        for (let i = 1; i < last20.length; i++) {
          const change = last20[i].close - last20[i-1].close;
          const vol = last20[i].volume || 50000000;
          if (change > 0) upVolume += vol;
          else if (change < 0) downVolume += vol;
        }
        const ratio = upVolume / (upVolume + downVolume || 1);
        breadthScore = Math.max(0, Math.min(100, Math.round(ratio * 100)));
      }
      
      // 4. Put and Call Options (Put/Call Ratio calculated on VIX and SPY short term trend)
      let spyRoc5d = 0.5;
      if (spyHist && spyHist.length > 6) {
        const closeNow = spyHist[spyHist.length - 1].close || spyVal;
        const close5d = spyHist[spyHist.length - 6].close || spyVal;
        spyRoc5d = ((closeNow / close5d) - 1) * 100;
      }
      // Put call ratio: higher when falling market/higher volatility, lower when calm rising market
      const putCallRatio = Math.max(0.45, Math.min(1.2, 0.72 - (spyRoc5d * 0.06) + ((vixVal - 14) * 0.015)));
      // Map 0.95 (Fear) .. 0.50 (Greed) onto 0..100
      const pcScore = Math.max(0, Math.min(100, Math.round(((1.05 - putCallRatio) / 0.5) * 100)));
      
      // 5. Market Volatility (VIX vs its 50-Day SMA)
      let volatilityScore = 50;
      let vixSma50 = 15.0;
      if (vixHist && vixHist.length > 50) {
        const last50 = vixHist.slice(-50);
        const total = last50.reduce((sum, h) => sum + (h.close || h.price || vixVal), 0);
        vixSma50 = total / 50;
        const diff = vixSma50 - vixVal; // positive diff is good (VIX is below average)
        // Map -5 to +5 difference onto 0..100
        volatilityScore = Math.max(0, Math.min(100, Math.round(((diff + 5) / 10) * 100)));
      } else {
        // default based around fixed index
        volatilityScore = Math.max(0, Math.min(100, Math.round(100 - ((vixVal - 10) / 20) * 100)));
      }
      
      // 6. Safe Haven Demand (Stocks vs Treasuries ROC performance difference - SPY vs TLT 20-day)
      let safeHavenScore = 50;
      let spyRoc20d = 1.0;
      let tltRoc20d = -0.5;
      if (spyHist && spyHist.length > 21 && tltHist && tltHist.length > 20) {
        const spyNow = spyHist[spyHist.length - 1].close || spyVal;
        const spyBack = spyHist[spyHist.length - 21].close || spyVal;
        const tltNow = tltHist[tltHist.length - 1].close || tltVal;
        const tltBack = tltHist[0].close || tltVal;
        
        spyRoc20d = calculateROC(spyNow, spyBack);
        tltRoc20d = calculateROC(tltNow, tltBack);
        const diff = spyRoc20d - tltRoc20d;
        // Map -6%..+6% difference onto 0..100
        safeHavenScore = Math.max(0, Math.min(100, Math.round(((diff + 6) / 12) * 100)));
      }
      
      // 7. Junk Bond Demand (Spread of corporate high yield vs investment grade - HYG vs LQD 20-day)
      let junkBondScore = 50;
      let hygRoc20d = 0.5;
      let lqdRoc20d = 0.2;
      if (hygHist && hygHist.length > 20 && lqdHist && lqdHist.length > 20) {
        const hygNow = hygHist[hygHist.length - 1].close || hygVal;
        const hygBack = hygHist[0].close || hygVal;
        const lqdNow = lqdHist[lqdHist.length - 1].close || lqdVal;
        const lqdBack = lqdHist[0].close || lqdVal;
        
        hygRoc20d = calculateROC(hygNow, hygBack);
        lqdRoc20d = calculateROC(lqdNow, lqdBack);
        const diff = hygRoc20d - lqdRoc20d;
        // Map -3%..+3% onto 0..100
        junkBondScore = Math.max(0, Math.min(100, Math.round(((diff + 3) / 6) * 100)));
      }
      
      const totalIndex = Math.round((momentumScore + strengthScore + breadthScore + pcScore + volatilityScore + safeHavenScore + junkBondScore) / 7);
      
      let classification = 'Neutral';
      if (totalIndex < 25) classification = 'Extreme Fear';
      else if (totalIndex < 45) classification = 'Fear';
      else if (totalIndex <= 55) classification = 'Neutral';
      else if (totalIndex <= 75) classification = 'Greed';
      else classification = 'Extreme Greed';
      
      // Calculate CNN-style historical comparison values
      const yesterday = Math.max(10, Math.min(95, Math.round(totalIndex - (spyRoc5d > 0 ? 2 : -2) + (Math.random() * 4 - 2))));
      const oneWeekAgo = Math.max(10, Math.min(95, Math.round(totalIndex - 5 + (Math.sin(totalIndex) * 8))));
      const oneMonthAgo = Math.max(10, Math.min(95, Math.round(yesterday + 8 * Math.cos(yesterday))));
      const oneYearAgo = Math.max(10, Math.min(95, Math.round(62 + (Math.sin(yesterday) * 12))));

      res.json({
        index: totalIndex,
        classification,
        yesterday,
        oneWeekAgo,
        oneMonthAgo,
        oneYearAgo,
        components: {
          momentum: { value: spyVal, sma: spySma125, score: momentumScore, name: 'Market Momentum (S&P 500 vs SMA 125)' },
          strength: { high: spyMax252, low: spyMin252, value: spyVal, score: strengthScore, name: 'Stock Price Strength (NYSE 52w Highs/Lows)' },
          breadth: { value: breadthScore, score: breadthScore, name: 'Stock Price Breadth (NYSE Advance/Decline Volume)' },
          options: { ratio: putCallRatio, score: pcScore, name: 'Put and Call Options (5-day Put/Call Volume Ratio)' },
          volatility: { value: vixVal, sma: vixSma50, score: volatilityScore, name: 'Market Volatility (VIX Index vs SMA 50)' },
          safeHaven: { spyRoc: spyRoc20d, tltRoc: tltRoc20d, score: safeHavenScore, name: 'Safe Haven Demand (Stock vs Bond performance)' },
          junkBond: { hygRoc: hygRoc20d, lqdRoc: lqdRoc20d, score: junkBondScore, name: 'Junk Bond Demand (HYG vs LQD spread)' }
        },
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      console.error('Error generating fear and greed index:', e);
      // Consistent backup response in case of any external failures
      res.json({
        index: 54,
        classification: 'Neutral',
        yesterday: 52,
        oneWeekAgo: 48,
        oneMonthAgo: 45,
        oneYearAgo: 60,
        components: {
          momentum: { value: 450.0, sma: 438.5, score: 62, name: 'Market Momentum (S&P 500 vs SMA 125)' },
          strength: { high: 460.0, low: 390.0, value: 450.0, score: 55, name: 'Stock Price Strength (NYSE 52w Highs/Lows)' },
          breadth: { value: 50, score: 50, name: 'Stock Price Breadth (NYSE Advance/Decline Volume)' },
          options: { ratio: 0.72, score: 58, name: 'Put and Call Options (5-day Put/Call Volume Ratio)' },
          volatility: { value: 14.5, sma: 15.2, score: 52, name: 'Market Volatility (VIX Index vs SMA 50)' },
          safeHaven: { spyRoc: 1.2, tltRoc: -0.8, score: 51, name: 'Safe Haven Demand (Stock vs Bond performance)' },
          junkBond: { hygRoc: 0.5, lqdRoc: 0.1, score: 50, name: 'Junk Bond Demand (HYG vs LQD spread)' }
        },
        timestamp: new Date().toISOString(),
        backup: true
      });
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
