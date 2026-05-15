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
