import streamlit as st
import pandas as pd
import yfinance as yf
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import numpy as np
from agents import AgenteAnalista, AgenteSupervisor, AbogadoDelDiablo

# Configuración de página estilo institucional
st.set_page_config(
    page_title="PROMETHEUS - ETF Rotation System",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilo Dark Mode Bloomberg
st.markdown("""
<style>
    .stApp { background-color: #050505; color: #E4E3E0; }
    .stHeader { background-color: #0F0F0F; }
    .css-1d391kg { background-color: #0F0F0F; }
    .metric-card { 
        background-color: #0F0F0F; 
        border: 1px solid #1A1A1A; 
        padding: 20px; 
        border-radius: 4px;
        text-align: center;
    }
</style>
""", unsafe_allow_stdio=True)

# Inicialización de Agentes
analista = AgenteAnalista()
supervisor = AgenteSupervisor()
diablo = AbogadoDelDiablo()

# Catálogo Sectores GICS
SECTORES_GICS = {
    "XLE": "Energy", "XLB": "Materials", "XLI": "Industrials", 
    "XLY": "Consumer Discretionary", "XLP": "Consumer Staples",
    "XLV": "Health Care", "XLF": "Financials", "XLK": "Technology",
    "XLC": "Communication Services", "XLU": "Utilities", "XLRE": "Real Estate"
}

@st.cache_data(ttl=60)
def get_rotation_data():
    tickers = list(SECTORES_GICS.keys()) + ['SPY']
    data = yf.download(tickers, period="6mo")['Close']
    
    # Calcular Momentum Relativo y ROC
    returns = data.pct_change(20).iloc[-1] # 1 mes
    spy_return = returns['SPY']
    
    rotations = []
    for ticker, name in SECTORES_GICS.items():
        rel_momentum = returns[ticker] - spy_return
        score = (rel_momentum * 100) + (np.random.randn() * 0.5) # Simulación de Score Compuesto
        
        # Fase del Ciclo
        if score > 2: phase = "Peak / Exhaustion"
        elif score > 0.5: phase = "Strength"
        elif score > -0.5: phase = "Acceleration"
        else: phase = "Weakness / Distribution"
        
        rotations.append({
            "Ticker": ticker,
            "Sector": name,
            "Score": round(score, 2),
            "Fase": phase,
            "ROI 30D": f"{returns[ticker]*100:.2f}%"
        })
    
    return pd.DataFrame(rotations).sort_values(by="Score", ascending=False)

def draw_correlation_matrix():
    tickers = ['SPY', 'QQQ', 'VIX', 'GLD', 'TLT', 'DXY', 'BTC-USD']
    data = yf.download(tickers, period="3mo")['Close']
    corr = data.corr()
    
    fig = px.imshow(corr, 
                    text_auto=True, 
                    aspect="auto", 
                    color_continuous_scale='RdYlGn',
                    labels=dict(color="Correlación"))
    fig.update_layout(title="Matriz de Correlación de Pearson (90D)")
    return fig

# Sidebar
with st.sidebar:
    st.title("🔥 PROMETHEUS")
    st.info("Fase 2: Motor de Rotación Sectorial")
    menu = st.radio("Módulos", ["Dashboard", "Rankings y Rotación", "Matriz de Correlación", "Configuración"])

if menu == "Dashboard":
    st.header("Terminal de Inteligencia Estratégica")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1: st.metric("VIX", "13.45", "-2.1%", delta_color="inverse")
    with col2: st.metric("SPY", "524.30", "+0.45%")
    with col3: st.metric("DXY", "104.2", "+0.1%")
    with col4: st.metric("BTC-USD", "67,200", "+3.2%")

    st.subheader("Análisis de Agentes (Fase 2)")
    tabA, tabB = st.tabs(["🏛️ Analista Prometheus", "👺 Abogado del Diablo"])
    
    with tabA:
        st.write("### Conclusión Cuantitativa")
        st.success("La rotación de capital favorece actualmente al sector tecnológico (XLK) mientras el spread de crédito HYG/LQD se mantenga estable.")
    
    with tabB:
        st.write("### Desafío de Tesis")
        st.warning("Advertencia: El RSI semanal de XLK indica sobrecompra extrema. No ignorar el potencial de rotación hacia sectores defensivos si el DXY rompe 105.")

elif menu == "Rankings y Rotación":
    st.header("Rankings de Fuerza Relativa GICS")
    df = get_rotation_data()
    st.table(df)
    
    st.subheader("Visualización de Momentum Sectorial")
    fig = px.bar(df, x="Sector", y="Score", color="Fase", 
                 title="Momentum Compuesto vs SPY",
                 color_discrete_map={"Peak": "#ef4444", "Strength": "#22c55e", "Acceleration": "#3b82f6"})
    st.plotly_chart(fig, use_container_width=True)

elif menu == "Matriz de Correlación":
    st.header("Gestión de Riesgo y Correlaciones")
    st.plotly_chart(draw_correlation_matrix(), use_container_width=True)
    st.info("Nota: Correlaciones extremas (>0.8 o <-0.8) indican riesgo de hacinamiento en operaciones.")

elif menu == "Configuración":
    st.header("Parámetros del Sistema")
    st.markdown("Ajustar pesos del Score de Rotación")
    m_weight = st.slider("Momentum", 0, 100, 60)
    v_weight = st.slider("Volatilidad", 0, 100, 20)
    vol_weight = st.slider("Volumen", 0, 100, 20)
    st.button("Guardar Configuración Genesis")

st.divider()
st.caption("PROMETHEUS v2.0 - Rigor, Disciplina, Alpha.")
