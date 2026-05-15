import yfinance as yf
import pandas as pd
from lib.database_py import log_system_event

def check_connectivity():
    try:
        test = yf.download("SPY", period="1d", progress=False)
        return not test.empty
    except:
        return False

def load_market_data(tickers):
    try:
        tickers = [t for t in tickers if t]
        data = yf.download(tickers, period="6mo", interval="1d", progress=False, group_by='column')
        if data.empty: return pd.DataFrame()
        close_data = data['Close'] if isinstance(data.columns, pd.MultiIndex) else data
        return close_data.ffill().bfill()
    except Exception as e:
        log_system_event("ERROR", "DataFetcher", str(e))
        return pd.DataFrame()

def calculate_rotation_score(data, spy_data, weights):
    # Momentum Relativo (ROC 20)
    returns = data.pct_change(20).iloc[-1]
    spy_ret = spy_data.pct_change(20).iloc[-1]
    rel_momentum = (returns - spy_ret) * 100
    
    # Volatilidad (20D)
    vol = data.pct_change().rolling(20).std().iloc[-1] * 100
    
    # Score Compuesto
    score = (rel_momentum * weights.get('momentum', 0.6)) - (vol * weights.get('volatility', 0.2))
    return round(score, 2), round(rel_momentum, 2)

def get_rotation_phase(score):
    if score > 3.5: return "Peak / Exhaustion", "🔴"
    elif score > 1.5: return "Strength / Acceleration", "🟢"
    elif score > 0: return "Early Rotation", "🔵"
    elif score > -2: return "Recovery / Bottoming", "🟡"
    else: return "Weakness / Distribution", "⚪"
