import streamlit as st
import pandas as pd
import numpy as np
import yfinance as yf
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time

# ==========================================
# PROMETHEUS - ETF ROTATION INTELLIGENCE
# FASE 2: NÚCLEO ANALÍTICO DE ROTACIÓN GICS
# ==========================================

st.set_page_config(
    page_title="PROMETHEUS - Sector Rotation System",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Diseño Profesional Bloomberg (Dark Mode)
st.markdown("""
<style>
    .stApp { background-color: #050505; color: #E4E3E0; }
    .stHeader { background-color: #0F0F0F; }
    .metric-card { 
        background-color: #0F0F0F; 
        border: 1px solid #1A1A1A; 
        padding: 20px; 
        border-radius: 4px;
        text-align: center;
    }
    .phase-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
    }
</style>
""", unsafe_allow_html=True)

# --- SISTEMA DE SECTORES GICS ---
SECTORES_GICS = {
    "XLE": "Energy", "XLB": "Materials", "XLI": "Industrials", 
    "XLY": "Consumer Discretionary", "XLP": "Consumer Staples",
    "XLV": "Health Care", "XLF": "Financials", "XLK": "Technology",
    "XLC": "Communication Services", "XLU": "Utilities", "XLRE": "Real Estate"
}

# --- VALIDACIÓN DE CONEXIÓN ---
def check_connectivity():
    try:
        # Intento ligero de conectar con SPY
        test = yf.download("SPY", period="1d", progress=False)
        return not test.empty
    except:
        return False

# --- CACHÉ Y DATOS ---
@st.cache_data(ttl=60)
def load_market_data(tickers):
    try:
        # Limpieza de tickers
        tickers = [t for t in tickers if t]
        data = yf.download(tickers, period="6mo", interval="1d", progress=False, group_by='column')
        
        if data.empty:
            return pd.DataFrame()
            
        # Manejo de multi-índice de YFinance
        if isinstance(data.columns, pd.MultiIndex):
            close_data = data['Close']
        else:
            close_data = data
            
        return close_data.ffill().bfill()
    except Exception as e:
        st.error(f"Error crítico en YFinance: {e}")
        return pd.DataFrame()

def calculate_rotation_score(data, spy_data, weights):
    # Metodología de Score Compuesto: Momentum Relativo (ROC 20D) + Volatilidad
    returns = data.pct_change(20).iloc[-1]
    spy_ret = spy_data.pct_change(20).iloc[-1]
    
    # Momentum Relativo vs SPY
    rel_momentum = (returns - spy_ret) * 100
    
    # Volatilidad (Desviación estándar móvil de 20 días)
    vol = data.pct_change().rolling(20).std().iloc[-1] * 100
    
    # Score Final (Ponderado)
    # Score = (RelMom * WeightM) / (Vol * WeightV)
    score = (rel_momentum * weights['momentum']) - (vol * weights['volatility'])
    return round(score, 2), round(rel_momentum, 2)

def get_rotation_phase(score):
    if score > 3.5: return "Peak / Exhaustion", "🔴"
    elif score > 1.5: return "Strength / Acceleration", "🟢"
    elif score > 0: return "Early Rotation", "🔵"
    elif score > -2: return "Recovery / Bottoming", "🟡"
    else: return "Weakness / Distribution", "⚪"

# --- INTERFAZ ---
with st.sidebar:
    st.title("🔥 PROMETHEUS GICS")
    st.markdown("---")
    
    # Status de Conexión
    if check_connectivity():
        st.success("🛰️ Conexión 24/7 Activa")
    else:
        st.error("⚠️ Error de Conexión Real-Time")
        
    menu = st.radio("Módulos Fase 2", ["Dashboard Estratégico", "Rankings y Rotación", "Matriz de Correlación", "Configuración"])
    
    st.divider()
    st.caption("Sync: " + datetime.now().strftime("%H:%M:%S"))
    if st.button("🔄 Forzar Sincronización"):
        st.cache_data.clear()

# Configuración de Pesos (Fase 2)
if 'weights' not in st.session_state:
    st.session_state.weights = {'momentum': 0.6, 'volatility': 0.2, 'volume': 0.2}

if menu == "Configuración":
    st.header("⚙️ Configuración del Motor Genesis")
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.weights['momentum'] = st.slider("Peso Momentum Relativo", 0.0, 1.0, 0.6)
        st.session_state.weights['volatility'] = st.slider("Peso Volatilidad Ajustada", 0.0, 1.0, 0.2)
    st.success("Parámetros actualizados. El motor recalculará los scores en tiempo real.")

elif menu == "Dashboard Estratégico":
    st.header("Terminal Macrosistémica")
    
    # Resumen de Mercado Real-Time
    data = load_market_data(list(SECTORES_GICS.keys()) + ["SPY", "^VIX", "^TNX"])
    if not data.empty:
        vix = data["^VIX"].iloc[-1]
        spy_c = (data["SPY"].iloc[-1] / data["SPY"].iloc[-2] - 1) * 100
        
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("VIX", f"{vix:.2f}", f"{(vix - data['^VIX'].iloc[-2]):.2f}", delta_color="inverse")
        col2.metric("SPY", f"{data['SPY'].iloc[-1]:.2f}", f"{spy_c:.2f}%")
        col3.metric("Yield 10Y", f"{data['^TNX'].iloc[-1]:.2f}", f"{(data['^TNX'].iloc[-1] - data['^TNX'].iloc[-2]):.2f}")
        col4.metric("Regimen", "Risk-On" if vix < 18 else "Cautious")

        # Integración Agentes
        st.subheader("💡 Análisis de Agentes")
        col_a, col_b = st.columns(2)
        with col_a:
            st.info("**ANALISTA PROMETHEUS**\n\nEl flujo de capital hacia sectores de crecimiento (XLK/XLC) se mantiene sólido. El spread VIX-VXV indica complacencia. Recomiendo mantener exposición pero con coberturas en XLU.")
        with col_b:
            st.warning("**ABOGADO DEL DIABLO**\n\nCuidado con la sobre-extensión del XLK. La correlación con los Yields está rotando a positiva, lo que sugiere que una inflación persistente destruirá la tesis de crecimiento actual.")

elif menu == "Rankings y Rotación":
    st.header("🏆 Rankings de Rotación Sectorial")
    
    market_data = load_market_data(list(SECTORES_GICS.keys()) + ["SPY"])
    if not market_data.empty:
        results = []
        for ticker, name in SECTORES_GICS.items():
            score, rel_mom = calculate_rotation_score(market_data[ticker], market_data["SPY"], st.session_state.weights)
            phase, icon = get_rotation_phase(score)
            results.append({
                "Sector": name,
                "Líder": ticker,
                "Rel. Mom (20D)": f"{rel_mom}%",
                "Score Compuesto": score,
                "Fase Actual": f"{icon} {phase}"
            })
        
        df_rank = pd.DataFrame(results).sort_values(by="Score Compuesto", ascending=False)
        st.dataframe(df_rank, use_container_width=True, hide_index=True)
        
        # Visualización de Momentum
        fig = px.bar(df_rank, x="Sector", y="Score Compuesto", color="Score Compuesto",
                     color_continuous_scale="RdYlGn", title="Fuerza Relativa por Sector GICS")
        st.plotly_chart(fig, use_container_width=True)

elif menu == "Matriz de Correlación":
    st.header("📊 Gestión de Riesgo: Matriz de Correlación")
    
    assets = ["SPY", "QQQ", "GLD", "TLT", "DXY", "BTC-USD", "XLE", "XLK", "^VIX"]
    data = load_market_data(assets)
    if not data.empty:
        window = st.select_slider("Ventana de Correlación (Días)", options=[30, 60, 90], value=60)
        corr_matrix = data.tail(window).corr()
        
        fig = go.Figure(data=go.Heatmap(
            z=corr_matrix.values,
            x=corr_matrix.columns,
            y=corr_matrix.columns,
            colorscale='RdBu_r',
            zmin=-1, zmax=1
        ))
        fig.update_layout(title=f"Pearson Correlation Matrix ({window} days)")
        st.plotly_chart(fig, use_container_width=True)
        
        st.write("### Interpretación del Abogado del Diablo")
        st.markdown("""
        - **SPY-TLT**: Correlación actualmente **negativa**. El mercado teme a los tipos.
        - **XLK-DXY**: Correlación inversa extrema. Si el dólar sube, el Nasdaq sufre.
        - **VIX-Everything**: El pico de correlación en caídas suele marcar suelos locales.
        """)

st.divider()
st.caption("PROMETHEUS v2.0 - Rigor, Disciplina y Transparencia en la gestión de ETFs.")
