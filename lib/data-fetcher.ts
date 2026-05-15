import yahooFinance from 'yahoo-finance2';

export interface AssetQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

export async function getQuotes(symbols: string[]): Promise<AssetQuote[]> {
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // Normalize symbols for yahoo-finance2
          const replacements: Record<string, string> = {
            'SPX': '^GSPC',
            'VIX': '^VIX',
            'DXY': 'DX-Y.NYB',
            'US10Y': '^TNX',
            'NDX': '^NDX',
            'RUI': '^RUT',
            'DJI': '^DJI'
          };
          const normalizedSymbol = replacements[symbol] || symbol;
          const quote: any = await yahooFinance.quote(normalizedSymbol);
          return {
            symbol,
            price: quote.regularMarketPrice || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            name: quote.shortName || symbol
          };
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return null;
        }
      })
    );
    return results.filter((r): r is AssetQuote => r !== null);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

export async function getHistoricalData(symbol: string, days: number = 30) {
  const replacements: Record<string, string> = {
    'SPX': '^GSPC',
    'VIX': '^VIX',
    'DXY': 'DX-Y.NYB',
    'US10Y': '^TNX'
  };
  const normalizedSymbol = replacements[symbol] || symbol;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  try {
    const queryOptions = { period1: start, period2: end };
    return await yahooFinance.historical(normalizedSymbol, queryOptions);
  } catch (e) {
    console.error(`Error fetching history for ${symbol}:`, e);
    return [];
  }
}

export function calculateCorrelation(arr1: number[], arr2: number[]) {
  const n = Math.min(arr1.length, arr2.length);
  if (n < 2) return 0;

  const x = arr1.slice(0, n);
  const y = arr2.slice(0, n);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + (b * y[i]), 0);
  const sumX2 = x.reduce((a, b) => a + (b * b), 0);
  const sumY2 = y.reduce((a, b) => a + (b * b), 0);

  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateRotationScore(change: number, volume: number = 1, momentum: number = 1) {
  // Score formula: 50% Momentum + 30% Volatilidad Ajustada + 20% Volumen
  // Placeholder logic for now
  return (change * 0.5) + (momentum * 0.3) + (volume * 0.2);
}
