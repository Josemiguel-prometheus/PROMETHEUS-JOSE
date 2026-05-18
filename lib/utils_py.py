import yfinance as yf
import pandas as pd
from lib.database_py import log_system_event
import time

def check_connectivity():
    try:
        test = yf.download("SPY", period="1d", progress=False)
        return not test.empty
    except:
        return False

def load_market_data(tickers, safe_mode=False):
    """
    Carga datos con lógica de reintentos y soporte para Modo Seguro.
    Safe Mode reduce el periodo de carga para maximizar estabilidad.
    """
    period = "3mo" if safe_mode else "6mo"
    retries = 3
    
    for attempt in range(retries):
        try:
            tickers = [t for t in tickers if t]
            # yfinance a veces falla con muchos tickers, intentamos por partes si es necesario
            data = yf.download(tickers, period=period, interval="1d", progress=False, group_by='column')
            
            if data.empty:
                if attempt < retries - 1:
                    time.sleep(2)
                    continue
                return pd.DataFrame()
            
            close_data = data['Close'] if isinstance(data.columns, pd.MultiIndex) else data
            df = close_data.ffill().bfill()
            
            log_system_event("INFO", "DataFetcher", 
                             f"Sincronización exitosa ({'Safe' if safe_mode else 'Full'}): {len(tickers)} activos.")
            return df
            
        except Exception as e:
            log_system_event("WARNING", "DataFetcher", f"Intento {attempt+1} fallido: {str(e)}")
            if attempt < retries - 1:
                time.sleep(2)
            else:
                log_system_event("ERROR", "DataFetcher", f"Fallo definitivo carga datos: {str(e)}")
                return pd.DataFrame()

def calculate_rotation_score(data, spy_data, weights):
    # Momentum Relativo (ROC 20)
    try:
        returns = data.pct_change(20).iloc[-1]
        spy_ret = spy_data.pct_change(20).iloc[-1]
        rel_momentum = (returns - spy_ret) * 100
        
        # Volatilidad (20D)
        vol = data.pct_change().rolling(20).std().iloc[-1] * 100
        
        # Score Compuesto
        score = (rel_momentum * weights.get('momentum', 0.6)) - (vol * weights.get('volatility', 0.2))
        return round(score, 2), round(rel_momentum, 2)
    except:
        return 0.0, 0.0

def get_rotation_phase(score):
    if score > 3.5: return "Peak / Exhaustion", "🔴"
    elif score > 1.5: return "Strength / Acceleration", "🟢"
    elif score > 0: return "Early Rotation", "🔵"
    elif score > -2: return "Recovery / Bottoming", "🟡"
    else: return "Weakness / Distribution", "⚪"

def generate_excel_report(history_df, metrics, portfolio_data):
    import io
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Hoja 1: Historial
        if not history_df.empty:
            history_df.to_excel(writer, sheet_name='Historial de Decisiones', index=False)
        
        # Hoja 2: Métricas de Performance
        perf_df = pd.DataFrame([metrics])
        perf_df.to_excel(writer, sheet_name='Performance Summary', index=False)
        
        # Hoja 3: Portafolio Actual
        if portfolio_data:
            port_df = pd.DataFrame([portfolio_data])
            port_df.to_excel(writer, sheet_name='Estado Portafolio', index=False)
            
    return output.getvalue()

def calculate_portfolio_performance(portfolio_assets, market_prices, start_prices):
    # Calcula el retorno de la cartera vs el benchmark
    portfolio_return = 0
    for ticker, weight in portfolio_assets.items():
        if ticker in market_prices and ticker in start_prices:
            ret = (market_prices[ticker] / start_prices[ticker] - 1)
            portfolio_return += ret * (float(weight.strip('%')) / 100)
    
    spy_return = (market_prices['SPY'] / start_prices['SPY'] - 1)
    return portfolio_return, spy_return
