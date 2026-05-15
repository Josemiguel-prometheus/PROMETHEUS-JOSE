# ==========================================
# PROMETHEUS - ETF ROTATION INTELLIGENCE
# FASE 3: EL PENTÁGONO DE INTELIGENCIA
# ==========================================

import streamlit as st
import pandas as pd
import numpy as np
import yfinance as yf
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
import time

from lib.database_py import init_db, log_recommendation, log_system_event
from lib.agents_py import AgenteAnalista, AbogadoDelDiablo, AgenteRecomendador, AgenteSupervisor
from lib.utils_py import check_connectivity, load_market_data, calculate_rotation_score, get_rotation_phase

# Inicializar Base de Datos
init_db()

st.set_page_config(
    page_title="PROMETHEUS - Global Intelligence",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Diseño Profesional Bloomberg (Dark Mode)
st.markdown("""
<style>
    .stApp { background-color: #050505; color: #E4E3E0; }
    .stTabs [data-baseweb="tab-list"] { background-color: #0F0F0F; border-bottom: 1px solid #222; }
    .stTabs [data-baseweb="tab"] { color: #888; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .stTabs [aria-selected="true"] { color: #f97316 !important; border-bottom-color: #f97316 !important; }
    .metric-card { 
        background-color: #0F0F0F; 
        border: 1px solid #1A1A1A; 
        padding: 15px; 
        border-radius: 2px;
        margin-bottom: 10px;
    }
    .agent-header {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 0.1em;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
        margin-bottom: 15px;
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

# --- SIDEBAR & GLOBAL STATE ---
if 'perfil' not in st.session_state: st.session_state.perfil = "Moderado"
if 'weights' not in st.session_state: st.session_state.weights = {'momentum': 0.6, 'volatility': 0.2, 'volume': 0.2}

with st.sidebar:
    st.title("🔥 PROMETHEUS V3")
    st.caption("Fase 3: El Pentágono de Inteligencia")
    status_col1, status_col2 = st.columns([1, 4])
    with status_col1:
        st.write("🟢" if check_connectivity() else "🔴")
    with status_col2:
        st.caption("Conexión 24/7 Activa" if check_connectivity() else "Fallo de Datos")
    
    st.divider()
    menu = st.radio("Módulos Estratégicos", ["Dashboard Macro", "Análisis de Agentes (Pentágono)", "Rotación y Rankings", "Matriz de Correlación", "Supervisor y Logs", "Historial & Aprendizaje"])
    
    st.markdown("---")
    st.session_state.perfil = st.selectbox("Perfil de Riesgo", ["Conservador", "Moderado", "Agresivo"], index=1)
    
    if st.button("🔄 RECALCULAR GENESIS"):
        st.cache_data.clear()
        log_system_event("INFO", "UI", "Manual Recalculation Triggered")

# --- LÓGICA DE PESTAÑAS ---

if menu == "Dashboard Macro":
    st.header("📊 Terminal de Situación Sistémica")
    data = load_market_data(list(SECTORES_GICS.keys()) + ["SPY", "^VIX", "^TNX", "DX-Y.NYB", "GLD"])
    if not data.empty:
        col1, col2, col3, col4 = st.columns(4)
        vix = data["^VIX"].iloc[-1]
        col1.metric("VIX Index", f"{vix:.2f}", f"{(vix - data['^VIX'].iloc[-2]):.2f}", delta_color="inverse")
        col2.metric("S&P 500 (SPY)", f"{data['SPY'].iloc[-1]:.2f}", f"{(data['SPY'].iloc[-1]/data['SPY'].iloc[-2]-1)*100:.2f}%")
        col3.metric("US 10Y Yield", f"{data['^TNX'].iloc[-1]:.2f}", f"{(data['^TNX'].iloc[-1]-data['^TNX'].iloc[-2]):.2f}")
        col4.metric("DXY Dollar", f"{data['DX-Y.NYB'].iloc[-1]:.2f}", f"{(data['DX-Y.NYB'].iloc[-1]-data['DX-Y.NYB'].iloc[-2]):.2f}")

        st.divider()
        st.subheader("Estado de Rotación GICS")
        fig = go.Figure()
        for s in list(SECTORES_GICS.keys()):
            fig.add_trace(go.Scatter(y=data[s].pct_change(20)*100, name=s, mode='lines', line=dict(width=1)))
        fig.update_layout(height=400, template="plotly_dark", title="Relative Strength Trajectory (20D)")
        st.plotly_chart(fig, use_container_width=True)

elif menu == "Análisis de Agentes (Pentágono)":
    st.header("🧠 El Pentágono de Inteligencia Prometheus")
    
    # Preparar datos para agentes
    data = load_market_data(list(SECTORES_GICS.keys()) + ["SPY", "^VIX"])
    results = []
    for ticker, name in SECTORES_GICS.items():
        score, rel_mom = calculate_rotation_score(data[ticker], data["SPY"], st.session_state.weights)
        results.append({"Sector": name, "Líder": ticker, "Score Compuesto": score, "Rel. Mom (20D)": rel_mom})
    df_rot = pd.DataFrame(results).sort_values(by="Score Compuesto", ascending=False)
    
    # Inicializar Agentes
    analista = AgenteAnalista(df_rot, {"^VIX": data["^VIX"].iloc[-1]}, None)
    rep_analista = analista.generar_analisis()
    
    abogado = AbogadoDelDiablo(rep_analista)
    rep_abogado = abogado.contra_analisis()
    
    recomendador = AgenteRecomendador(rep_analista, rep_abogado)
    rep_final = recomendador.ejecutar_decision(st.session_state.perfil)
    
    # 1. Panel de Síntesis Central
    conv_color = {"ALTA": "#15803d", "MEDIA": "#a16207", "BAJA": "#b91c1c"}.get(rep_final['conviccion_global'], "#333")
    st.markdown(f"""
        <div style="background-color: {conv_color}; padding: 15px; border-radius: 4px; border-left: 10px solid rgba(255,255,255,0.3); margin-bottom: 30px;">
            <h3 style="margin: 0; color: white;">CONVICCIÓN GLOBAL: {rep_final['conviccion_global']}</h3>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">Propuesta Ejecutiva: {rep_final['accion']} | Calidad de Señal: {rep_analista['calidad_entorno']}</p>
        </div>
    """, unsafe_allow_html=True)
    
    # 2. Diseño de Tres Columnas
    col_analista, col_abogado, col_final = st.columns(3)
    
    with col_analista:
        st.markdown('<div class="agent-header">🔎 ANALISTA PROMETHEUS</div>', unsafe_allow_html=True)
        st.markdown(f"**Calidad Entorno:** {rep_analista['calidad_entorno']}")
        st.info(f"**Justificación:**\n{rep_analista['justificacion']}")
        st.write(f"**Foco Sectorial:** {rep_analista['sector_lider']}")
        st.write(f"**Score:** {rep_analista['score_lider']}")
        st.caption(f"Metodología: {rep_analista['metodologia']}")

    with col_abogado:
        st.markdown('<div class="agent-header" style="color: #666; border-bottom-color: #444;">⚖️ ABOGADO DEL DIABLO</div>', unsafe_allow_html=True)
        st.warning(f"**Escepticismo:** {rep_abogado['nivel_escepticismo']}")
        st.markdown(f"*{rep_abogado['mensaje_critico']}*")
        st.divider()
        for r in rep_abogado['alertas']:
            st.error(f"[{r['nivel']}] {r['riesgo']}")

    with col_final:
        st.markdown('<div class="agent-header">🎯 MOTOR DE DECISIÓN</div>', unsafe_allow_html=True)
        st.success(f"**ACCIÓN RECOMENDADA:** {rep_final['accion']}")
        st.write(f"**Stop Loss:** {rep_final['stop_loss']}")
        st.write(f"**Ratio R/R:** {rep_final['ratio_rr']}")
        
        st.markdown("**Asignación de Cartera Sugerida:**")
        cols = st.columns(len(rep_final['propuesta']))
        for i, (k, v) in enumerate(rep_final['propuesta'].items()):
            cols[i].metric(k.upper(), v)
            
    st.divider()
    # 3. Flujo de Confirmación
    st.subheader("📝 Protocolo de Ejecución Consciente")
    with st.expander("Confirmar Rotación de Cartera", expanded=True):
        col_btn1, col_btn2, col_btn3 = st.columns(3)
        reflection = st.text_area("¿Cuál es tu razonamiento principal para confirmar esta operación?", placeholder="Ej: Acepto los riesgos de sobre-extensión por el fuerte momentum en XLK...")
        
        if col_btn1.button("✅ ACEPTAR Y REGISTRAR", use_container_width=True):
            if reflection:
                log_recommendation(rep_analista, rep_abogado, rep_final, "ACEPTADA", reflection, {"perfil": st.session_state.perfil}, rep_final['conviccion_global'])
                st.success("Recomendación registrada en el Laboratorio Vivo. Disciplina es Alpha.")
                log_system_event("INFO", "Agents", "Recommendation Accepted by User")
            else:
                st.error("Protocolo de integridad: La reflexión es obligatoria para el aprendizaje del sistema.")
        
        if col_btn2.button("🛠️ MODIFICAR MANUALMENTE", use_container_width=True):
            st.info("Redirigiendo a panel de ajuste manual...")
            
        if col_btn3.button("❌ RECHAZAR", use_container_width=True):
            log_recommendation(rep_analista, rep_abogado, rep_final, "RECHAZADA", reflection, {}, "N/A")
            st.warning("Operación cancelada. El registro guardará los contra-argumentos.")

elif menu == "Rotación y Rankings":
    st.header("🏆 Rankings de Rotación Sectorial")
    market_data = load_market_data(list(SECTORES_GICS.keys()) + ["SPY"])
    if not market_data.empty:
        results = []
        for ticker, name in SECTORES_GICS.items():
            score, rel_mom = calculate_rotation_score(market_data[ticker], market_data["SPY"], st.session_state.weights)
            phase, icon = get_rotation_phase(score)
            results.append({"Sector": name, "Líder": ticker, "Rel. Mom (20D)": f"{rel_mom}%", "Score Compuesto": score, "Fase": f"{icon} {phase}"})
        df_rank = pd.DataFrame(results).sort_values(by="Score Compuesto", ascending=False)
        st.dataframe(df_rank, use_container_width=True, hide_index=True)

elif menu == "Matriz de Correlación":
    st.header("📊 Gestión de Riesgo: Matriz de Correlación")
    assets = ["SPY", "QQQ", "GLD", "TLT", "DXY", "BTC-USD", "XLE", "XLK", "^VIX"]
    data = load_market_data(assets)
    if not data.empty:
        window = st.select_slider("Ventana de Correlación (Días)", options=[30, 60, 90], value=60)
        corr_matrix = data.tail(window).corr()
        fig = go.Figure(data=go.Heatmap(z=corr_matrix.values, x=corr_matrix.columns, y=corr_matrix.columns, colorscale='RdBu_r', zmin=-1, zmax=1))
        st.plotly_chart(fig, use_container_width=True)

elif menu == "Supervisor y Logs":
    st.header("🛡️ Guardián del Sistema (AgenteSupervisor)")
    sup = AgenteSupervisor()
    status = sup.obtener_status()
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Salud Global", status['health_score'])
    col2.metric("Latencia Datos", "140ms", "OK")
    col3.metric("Última Sincro", status['last_calc'])
    col4.metric("Días Operativo", "1.5", "Genesis")
    
    st.divider()
    st.subheader("Logs de Integridad")
    import sqlite3
    conn = sqlite3.connect('prometheus_intelligence.db')
    df_logs = pd.read_sql_query("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 50", conn)
    st.dataframe(df_logs, use_container_width=True)
    
    if st.button("🚨 FORZAR RECALCULO Y LIMPIEZA DE CACHÉ", use_container_width=True):
        st.cache_data.clear()
        st.success("Sistema reiniciado. Sincronización en curso...")

elif menu == "Historial & Aprendizaje":
    st.header("📚 Laboratorio Vivo: Memoria de Decisiones")
    import sqlite3
    conn = sqlite3.connect('prometheus_intelligence.db')
    df_hist = pd.read_sql_query("SELECT * FROM recommendations ORDER BY timestamp DESC", conn)
    if not df_hist.empty:
        st.dataframe(df_hist, use_container_width=True)
        st.download_button("📥 Exportar para Análisis Forense", df_hist.to_csv().encode('utf-8'), "prometheus_history.csv", "text/csv")
    else:
        st.info("No hay registros previos. Comienza a operar en el Pentágono para iniciar el aprendizaje.")

st.divider()
st.caption("PROMETHEUS v3.0 - La Excelencia es un Hábito. Disciplina, Rigor y Transparencia.")
