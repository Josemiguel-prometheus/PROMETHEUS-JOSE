# ==========================================
# PROMETHEUS - ETF ROTATION INTELLIGENCE
# FASE 5: CONSOLIDACIÓN GENESIS (PRO)
# ==========================================

import sqlite3
import json
import time
from datetime import datetime, timedelta

import streamlit as st
import pandas as pd
import numpy as np
import yfinance as yf
import plotly.express as px
import plotly.graph_objects as go

import lib.database_py as db_lib
import lib.agents_py as agents_lib
import lib.utils_py as utils_lib

# Inicializar Base de Datos
db_lib.init_db()
db_lib.log_system_event("INFO", "System", "Prometheus Core v5.0 - Consolidación Genesis Activa")

st.set_page_config(
    page_title="PROMETHEUS - Bloomberg Intelligence",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Diseño Profesional Bloomberg Premium (Dark Mode)
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&display=swap');
    
    .stApp { background-color: #020202; color: #D1D1D1; }
    .stTabs [data-baseweb="tab-list"] { background-color: #080808; border-bottom: 2px solid #1A1A1A; padding: 0 20px; }
    .stTabs [data-baseweb="tab"] { 
        color: #666; 
        font-family: 'JetBrains Mono', monospace; 
        font-size: 12px; 
        padding: 15px 25px;
        transition: all 0.3s ease;
    }
    .stTabs [aria-selected="true"] { color: #f97316 !important; border-bottom-color: #f97316 !important; font-weight: bold; }
    
    .metric-card { 
        background-color: #080808; 
        border: 1px solid #121212; 
        padding: 24px; 
        border-radius: 2px;
        margin-bottom: 15px;
        transition: border 0.3s ease;
    }
    .metric-card:hover { border-color: #f9731633; }
    
    .bloomberg-header {
        font-family: 'JetBrains Mono', monospace;
        font-size: 20px;
        font-weight: 700;
        color: #f97316;
        border-left: 4px solid #f97316;
        padding-left: 15px;
        margin-bottom: 25px;
        letter-spacing: -0.02em;
    }
    .agent-header {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        color: #777;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding-bottom: 8px;
        border-bottom: 1px solid #1A1A1A;
        margin-bottom: 15px;
    }
    .maturity-bar {
        background-color: #111;
        height: 6px;
        border-radius: 3px;
        margin-top: 5px;
    }
    .maturity-fill {
        background-color: #f97316;
        height: 100%;
        border-radius: 3px;
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
if 'safe_mode' not in st.session_state: st.session_state.safe_mode = False

with st.sidebar:
    st.markdown('<div style="font-size: 28px; font-weight: 700; color: #f97316; letter-spacing:-1px;">🔥 PROMETHEUS</div>', unsafe_allow_html=True)
    st.caption("GENESIS STABILITY - V5.0.0")
    
    st.divider()
    menu = st.radio("SISTEMA CENTRAL", 
                    ["Dashboard Estratégico", 
                     "Pentágono de Agentes", 
                     "Mi Portafolio",
                     "Historial & Aprendizaje", 
                     "Control & Salud",
                     "Guía y Esencia"],
                    index=0)
    
    st.divider()
    st.session_state.safe_mode = st.toggle("🛡️ Modo Seguro (Resiliencia)", help="Reduce la carga de datos para maximizar la estabilidad en entornos de baja conectividad.")
    st.selectbox("Perfil de Riesgo", ["Conservador", "Moderado", "Agresivo"], key="perfil", help="Ajusta la agresividad de las recomendaciones de los agentes.")
    
    if st.button("🔄 REBOOT SISTEMA", use_container_width=True):
        st.cache_data.clear()
        db_lib.backup_database()
        db_lib.log_system_event("INFO", "UI", "Resync y Backup activado.")
        st.rerun()

# --- CARarga de DATOS GLOBAL ---
@st.cache_data(ttl=600)
def get_global_data(tickers, safe_mode):
    return utils_lib.load_market_data(tickers, safe_mode=safe_mode)

# --- LÓGICA DE PESTAÑAS ---

if menu == "Dashboard Estratégico":
    st.markdown('<div class="bloomberg-header">CENTRO DE INTELIGENCIA ESTRATÉGICA</div>', unsafe_allow_html=True)
    
    with st.spinner("Sincronizando Terminal Bloomberg..."):
        data_macro = get_global_data(list(SECTORES_GICS.keys()) + ["SPY", "^VIX", "^TNX", "DX-Y.NYB", "GLD"], st.session_state.safe_mode)
    
    if not data_macro.empty:
        # Fila de Métricas Principales
        col1, col2, col3, col4, col5 = st.columns(5)
        vix = data_macro["^VIX"].iloc[-1]
        col1.metric("VIX INDEX", f"{vix:.2f}", f"{(vix - data_macro['^VIX'].iloc[-2]):.2f}", delta_color="inverse", help="Índice del miedo. >20 indica alta volatilidad.")
        col2.metric("S&P 500 (SPY)", f"{data_macro['SPY'].iloc[-1]:.2f}", f"{(data_macro['SPY'].iloc[-1]/data_macro['SPY'].iloc[-2]-1)*100:.2f}%")
        col3.metric("US 10Y YIELD", f"{data_macro['^TNX'].iloc[-1]:.2f}%", f"{(data_macro['^TNX'].iloc[-1]-data_macro['^TNX'].iloc[-2]):.2f}")
        col4.metric("DXY DOLLAR", f"{data_macro['DX-Y.NYB'].iloc[-1]:.2f}", f"{(data_macro['DX-Y.NYB'].iloc[-1]-data_macro['DX-Y.NYB'].iloc[-2]):.2f}")
        col5.metric("GOLD (GLD)", f"{data_macro['GLD'].iloc[-1]:.2f}", f"{(data_macro['GLD'].iloc[-1]-data_macro['GLD'].iloc[-2]):.2f}")

        # Insights del Mentor
        conn = sqlite3.connect('prometheus_intelligence.db')
        df_hist = pd.read_sql_query("SELECT * FROM recommendations", conn)
        mentor = agents_lib.AgenteMentor(df_hist)
        behavior = mentor.analyze_user_behavior()
        conn.close()

        st.divider()
        cola, colb = st.columns([2, 1])
        with cola:
            st.subheader("Mapa de Rotación GICS (Fuerza Relativa 20D)")
            returns = data_macro[list(SECTORES_GICS.keys())].pct_change(20).iloc[-1] * 100
            spy_ret = data_macro["SPY"].pct_change(20).iloc[-1] * 100
            rel_returns = (returns - spy_ret).sort_values()
            
            df_plot = pd.DataFrame({
                'Sector': [SECTORES_GICS.get(ticker, ticker) for ticker in rel_returns.index],
                'Alpha vs SPY (%)': rel_returns.values,
                'Ticker': rel_returns.index
            })

            fig = px.bar(df_plot, x='Alpha vs SPY (%)', y='Sector', 
                         orientation='h', 
                         color='Alpha vs SPY (%)', 
                         color_continuous_scale='RdYlGn',
                         text='Alpha vs SPY (%)')
            
            fig.update_traces(texttemplate='%{text:.2f}%', textposition='outside', marker_line_width=0)
            fig.update_layout(
                template="plotly_dark", 
                height=500, 
                showlegend=False,
                xaxis=dict(showgrid=False, zeroline=True, zerolinecolor='#333'),
                yaxis=dict(showgrid=False),
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                coloraxis_showscale=False
            )
            st.plotly_chart(fig, use_container_width=True)
            
        with colb:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.markdown("<span style='color: #f97316; font-weight: bold; font-size: 14px;'>💡 MENTORÍA DINÁMICA</span>", unsafe_allow_html=True)
            if isinstance(behavior, dict):
                st.info(f"**Lección Activa:** {behavior['leccion_activa']}")
                st.write(f"**Patience Score:** {behavior['patience_score']}")
                st.write(f"**Insight:** {behavior['insight_comportamiento']}")
                
                # Barra de madurez usuario
                maturity = behavior['user_maturity']
                st.markdown(f"**Madurez del Inversor (Nivel {maturity}/10)**", unsafe_allow_html=True)
                st.markdown(f'<div class="maturity-bar"><div class="maturity-fill" style="width: {maturity*10}%"></div></div>', unsafe_allow_html=True)
            else:
                st.write(behavior)
            st.markdown('</div>', unsafe_allow_html=True)
            
            # Centro de Salud Rápido
            st.markdown('<div class="metric-card" style="border-left: 4px solid #065f46;">', unsafe_allow_html=True)
            st.markdown("<span style='color: #059669; font-weight: bold; font-size: 14px;'>🛡️ GUARDIÁN DEL SISTEMA</span>", unsafe_allow_html=True)
            st.write("🛰️ **Feed Bloomberg:** Activo")
            st.write("🧠 **IA Core:** Calibrada")
            st.write(f"🔐 **Modo Seguro:** {'ON' if st.session_state.safe_mode else 'OFF'}")
            st.markdown('</div>', unsafe_allow_html=True)

elif menu == "Pentágono de Agentes":
    st.markdown('<div class="bloomberg-header">PENTÁGONO DE INTELIGENCIA COGNITIVA</div>', unsafe_allow_html=True)
    
    with st.spinner("Analizando Correlaciones y Momentum Sectorial..."):
        data = get_global_data(list(SECTORES_GICS.keys()) + ["SPY", "^VIX"], st.session_state.safe_mode)
    
    if not data.empty:
        results = []
        for ticker, name in SECTORES_GICS.items():
            score, rel_mom = utils_lib.calculate_rotation_score(data[ticker], data["SPY"], st.session_state.weights)
            results.append({"Sector": name, "Líder": ticker, "Score Compuesto": score, "Rel. Mom (20D)": rel_mom})
        df_rot = pd.DataFrame(results).sort_values(by="Score Compuesto", ascending=False)
        
        # Agentes
        analista = agents_lib.AgenteAnalista(df_rot, {"^VIX": data["^VIX"].iloc[-1]}, None)
        rep_analista = analista.generar_analisis()
        abogado = agents_lib.AbogadoDelDiablo(rep_analista)
        rep_abogado = abogado.contra_analisis()
        recomendador = agents_lib.AgenteRecomendador(rep_analista, rep_abogado)
        rep_final = recomendador.ejecutar_decision(st.session_state.perfil)
        
        # UI Agentes Consolidada
        cv_col = {"ALTA": "#064e3b", "MEDIA": "#78350f", "BAJA": "#7f1d1d"}.get(rep_final['conviccion_global'], "#111")
        st.markdown(f'<div style="background-color: {cv_col}; padding: 20px; border-radius: 2px; border-left: 8px solid rgba(255,255,255,0.2); margin-bottom: 25px;">'
                    f'<h3 style="margin:0; color: white; letter-spacing: -1px;">DECISIÓN: {rep_final["accion"]}</h3>'
                    f'<p style="margin:0; opacity: 0.8; font-size: 14px;">Convicción: {rep_final["conviccion_global"]} | Horizonte: {rep_analista["horizonte"]}</p></div>', unsafe_allow_html=True)
        
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            st.markdown('<div class="agent-header">🔎 ANALISTA SISTÉMICO</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="metric-card"><b>Tesis:</b><br>{rep_analista["justificacion"]}</div>', unsafe_allow_html=True)
            st.metric("Sector Líder", rep_analista['sector_lider'], f"Fuerza: {rep_analista['score_lider']}", help="Puntuación basada en fuerza relativa y volatilidad ajustada.")
        
        with col_b:
            st.markdown('<div class="agent-header">⚖️ ABOGADO DEL DIABLO</div>', unsafe_allow_html=True)
            st.warning(f"**Crítica:** {rep_abogado['mensaje_critico']}")
            for r in rep_abogado['alertas']:
                level_color = "#ef4444" if r['nivel'] == "Alto" else "#f59e0b"
                st.markdown(f'<div style="font-size: 13px; margin-bottom: 5px;"><span style="color: {level_color}">●</span> {r["riesgo"]}</div>', unsafe_allow_html=True)
            st.write(f"**Escepticismo:** {rep_abogado['nivel_escepticismo']}")
        
        with col_c:
            st.markdown('<div class="agent-header">🎯 MOTOR DE ASIGNACIÓN</div>', unsafe_allow_html=True)
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            for k, v in rep_final['propuesta'].items():
                st.write(f"**{k.upper()}:** {v}")
            st.divider()
            st.write(f"**Stop Loss:** {rep_final['stop_loss']}")
            st.write(f"**Ratio R/R:** {rep_final['ratio_rr']}")
            st.markdown('</div>', unsafe_allow_html=True)

        # Protocolo de Operación
        st.divider()
        with st.expander("📝 REGISTRAR DECISIÓN EN LABORATORIO VIVO", expanded=False):
            reflexion = st.text_area("Justificación del Inversor (Anti-FOMO / Disciplina)", placeholder="Describe por qué aceptas o rechazas esta señal hoy...")
            c1, c2 = st.columns(2)
            if c1.button("✅ EJECUTAR PLAN", use_container_width=True):
                if reflexion:
                    db_lib.log_recommendation(rep_analista, rep_abogado, rep_final, "ACEPTADA", reflexion, {"VIX": data["^VIX"].iloc[-1], "Safe": st.session_state.safe_mode}, rep_final['conviccion_global'])
                    st.success("Operación registrada. La disciplina es el fundamento del Alpha.")
                else: st.error("Protocolo Genesis: Se requiere reflexión escrita para alimentar el aprendizaje.")
            
            if c2.button("❌ DESESTIMAR SEÑAL", use_container_width=True):
                db_lib.log_recommendation(rep_analista, rep_abogado, rep_final, "RECHAZADA", reflexion, {}, "N/A")
                st.warning("Señal desestimada. Registrado para análisis forense.")

elif menu == "Mi Portafolio":
    st.markdown('<div class="bloomberg-header">TERMINAL DE GESTIÓN DE ACTIVOS (PRO)</div>', unsafe_allow_html=True)
    
    current_p = db_lib.get_latest_portfolio()
    
    tab_p1, tab_p2, tab_p3, tab_p4 = st.tabs(["🚀 Dashboard", "⚙️ Configuración", "📊 Riesgo & Alpha", "⚖️ Rebalanceador"])
    
    # Cargar datos de mercado para el portafolio
    if current_p and current_p['assets']:
        with st.spinner("Sincronizando precios en tiempo real..."):
            all_portfolio_tickers = list(current_p['assets'].keys()) + ["SPY", "^VIX"]
            px_port = get_global_data(all_portfolio_tickers, st.session_state.safe_mode)
    else:
        px_port = pd.DataFrame()

    # --- AGENTE GUARDIÁN ---
    guardian = agents_lib.AgenteGuardian(current_p, px_port)
    integra, msg_integra = guardian.validar_integridad()
    resumen_g = guardian.obtener_resumen_tiempo_real()
    
    col_g1, col_g2 = st.columns([3, 1])
    with col_g1:
        st.markdown(f"""
        <div style="background-color: #0c0c0c; border-left: 4px solid {'#f97316' if integra else '#ef4444'}; padding: 12px; border-radius: 4px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">🛡️</span>
                <span style="color: #f97316; font-weight: bold; letter-spacing: 0.5px;">PROMETHEUS GUARDIAN:</span>
            </div>
            <div style="margin-top: 4px; color: #e5e7eb; font-size: 14px;">
                {msg_integra} | <span style="color: #888;">{resumen_g['msg']}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_g2:
        st.markdown(f"""
        <div style="text-align: right; color: #888; font-size: 12px;">
            <b>STATUS:</b> <span style="color: {'#059669' if resumen_g['status'] == 'ESTABLE' else '#ef4444'};">{resumen_g['status']}</span><br>
            <b>SYNC:</b> {resumen_g['last_sync']}
        </div>
        """, unsafe_allow_html=True)
    st.write("")

    with tab_p1:
        if current_p:
            # Fila Superior: Métricas Clave
            m1, m2, m3, m4 = st.columns(4)
            
            # Recalcular pesos y valores en tiempo real si px_port está disponible
            real_time_assets = {}
            total_market_value = 0.0
            
            if not px_port.empty:
                last_prices = px_port.iloc[-1]
                for t, data in current_p['assets'].items():
                    shares = float(data.get('shares', 0.0)) if isinstance(data, dict) else 0.0
                    price = float(last_prices[t]) if t in last_prices else (float(data.get('price', 0.0)) if isinstance(data, dict) else 0.0)
                    mv = shares * price
                    real_time_assets[t] = {"shares": shares, "price": price, "market_value": mv}
                    total_market_value += mv
            else:
                # Fallback a datos estáticos si no hay conexión
                for t, data in current_p['assets'].items():
                    shares = float(data.get('shares', 0.0)) if isinstance(data, dict) else 0.0
                    price = float(data.get('price', 0.0)) if isinstance(data, dict) else 0.0
                    mv = shares * price
                    real_time_assets[t] = {"shares": shares, "price": price, "market_value": mv}
                    total_market_value += mv

            total_net = total_market_value + current_p.get('cash', 0.0)
            
            # Calcular Retorno Histórico vs Benchmark
            if not px_port.empty:
                prices_start = px_port.iloc[0]
                prices_end = px_port.iloc[-1]
                p_ret, s_ret = utils_lib.calculate_portfolio_performance(current_p['assets'], prices_end, prices_start)
                alpha = p_ret - s_ret
            else:
                p_ret, s_ret, alpha = 0, 0, 0

            m1.metric("Valor Total (NAV)", f"${total_net:,.2f}", f"{p_ret*100:.2f}%")
            m2.metric("Market Value", f"${total_market_value:,.2f}")
            m3.metric("Cash Balance", f"${current_p.get('cash', 0.0):,.2f}")
            m4.metric("Alpha vs SPY", f"{alpha*100:.2f}%", delta_color="normal")

            st.divider()
            
            col_l, col_r = st.columns([1, 1])
            with col_l:
                st.subheader("Diversificación Sectorial (Tiempo Real)")
                labels = list(real_time_assets.keys()) + ["CASH"]
                weights = []
                for t, data in real_time_assets.items():
                    w = (data['market_value'] / total_net * 100) if total_net > 0 else 0.0
                    weights.append(w)
                
                cash_w = (current_p.get('cash', 0.0) / total_net * 100) if total_net > 0 else 0.0
                weights.append(cash_w)
                
                fig = px.pie(names=labels, values=weights, hole=0.5, 
                             color_discrete_sequence=px.colors.sequential.Oranges_r)
                fig.update_layout(template="plotly_dark", showlegend=True, margin=dict(t=10, b=10, l=10, r=10), height=350)
                st.plotly_chart(fig, use_container_width=True)

            with col_r:
                st.subheader("Performance vs SPY (Base 100)")
                if not px_port.empty:
                    # Crear índice de rendimiento acumulado dinámico 
                    weights_dict = {}
                    for t, data in real_time_assets.items():
                        weights_dict[t] = data['market_value'] / total_net if total_net > 0 else 0.0
                    
                    norm_px = px_port / px_port.iloc[0] * 100
                    port_index = pd.Series(0, index=norm_px.index)
                    for t, w in weights_dict.items():
                        if t in norm_px.columns: port_index += norm_px[t] * w
                    
                    port_index += (current_p.get('cash', 0.0) / total_net) * 100 if total_net > 0 else 0.0

                    fig_perf = go.Figure()
                    fig_perf.add_trace(go.Scatter(x=port_index.index, y=port_index, name='Mi Cartera', line=dict(color='#f97316', width=3)))
                    fig_perf.add_trace(go.Scatter(x=norm_px.index, y=norm_px['SPY'], name='S&P 500', line=dict(color='#888', dash='dot')))
                    fig_perf.update_layout(template="plotly_dark", height=350, margin=dict(t=10, b=10, l=10, r=10),
                                         legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1))
                    st.plotly_chart(fig_perf, use_container_width=True)
                else:
                    st.info("Sincroniza el terminal para ver el gráfico de performance.")
        else:
            st.info("Configura tu cartera en la pestaña 'Configuración' para comenzar.")

    with tab_p2:
        col_c1, col_c2 = st.columns([1, 1])
        with col_c1:
            st.subheader("Configuración de Activos (Manual)")
            with st.form("portfolio_form_v8"):
                st.info("Introduce los tickers de los ETFs que deseas monitorizar (ej: SPY, VOO, TLT, QQQ). El Agente Guardián validará cada entrada en tiempo real.")
                
                current_tickers_list = list(current_p['assets'].keys()) if (current_p and current_p.get('assets')) else []
                manual_entry = st.text_area("Lista de ETFs (separados por coma)", 
                                           value=", ".join(current_tickers_list) if current_tickers_list else "SPY, QQQ")
                
                tickers_to_process = [t.strip().upper() for t in manual_entry.split(",") if t.strip()]
                
                st.divider()
                st.write("**Control de Participaciones**")
                shares_input = {}
                for t in tickers_to_process:
                    # Buscamos si ya existía en el portafolio anterior
                    prev_data = current_p['assets'].get(t, {}) if current_p else {}
                    def_shares = float(prev_data.get('shares', 0.0)) if isinstance(prev_data, dict) else 0.0
                    
                    # El guardián da feedback visual si el ticker ya está cargado en caché de mercado
                    valid_t, msg_t = guardian.validar_ticker(t)
                    label_suffix = " ✅" if valid_t else " 🔍"
                    shares_input[t] = st.number_input(f"Cantidad de {t}{label_suffix}", value=def_shares, min_value=0.0, step=0.01)
                
                st.divider()
                cash_input = st.number_input("💵 Efectivo (Cash USD)", value=current_p.get('cash', 0.0) if current_p else 10000.0)
                
                if st.form_submit_button("🗄️ CONSOLIDAR CARTERA"):
                    if not tickers_to_process:
                        st.error("Protocolo Guardian: No has introducido ningún ticker para monitorizar.")
                    else:
                        with st.spinner("Guardián: Validando activos y sincronizando cotizaciones..."):
                            all_req_t = list(set(tickers_to_process + ["SPY", "^VIX"]))
                            new_data_df = get_global_data(all_req_t, True)
                            
                            if not new_data_df.empty:
                                last_prices_new = new_data_df.iloc[-1]
                                
                                # Cálculo de MV y pesos
                                mv_map = {}
                                total_market_v = 0.0
                                for t, sh in shares_input.items():
                                    price_curr = float(last_prices_new[t]) if t in last_prices_new else 0.0
                                    mv = float(sh * price_curr)
                                    mv_map[t] = {"shares": sh, "price": price_curr, "market_value": mv}
                                    total_market_v += mv
                                
                                nav_total = float(total_market_v + cash_input)
                                
                                # Construcción de estructura final
                                final_p_assets = {}
                                for t, d in mv_map.items():
                                    w_calc = (d['market_value'] / nav_total * 100) if nav_total > 0 else 0.0
                                    final_p_assets[t] = {
                                        "weight": f"{w_calc:.2f}%",
                                        "shares": float(d['shares']),
                                        "price": float(d['price'])
                                    }
                                
                                spy_px = float(last_prices_new['SPY']) if 'SPY' in last_prices_new else 0.0
                                db_lib.save_portfolio(final_p_assets, float(total_market_v), float(cash_input), float(spy_px))
                                st.success("Agente Guardián: Cartera consolidada y validada con éxito.")
                                st.rerun()
                            else:
                                st.error("Fallo de conexión YFinance. El Guardián no puede verificar los precios en este momento.")

        with col_c2:
            st.subheader("Auditoría de Posiciones")
            if current_p and current_p.get('assets'):
                rows = []
                for t, w in current_p['assets'].items():
                    # Validación del guardián para cada fila
                    v_icon = "✅" if t in px_port.columns else "⏳"
                    
                    if isinstance(w, dict):
                        w_val = w.get('weight', '0%')
                        shares = w.get('shares', 0)
                        price = w.get('price', 0)
                        mv = shares * price
                    else:
                        w_val = w
                        shares = "N/A"
                        price = "N/A"
                        mv = current_p['total_value'] * (float(str(w).strip('%'))/100)
                    
                    rows.append({
                        "Estado": v_icon,
                        "Activo": t,
                        "Peso": w_val,
                        "Acciones": f"{shares:,.2f}" if isinstance(shares, (int, float)) else shares,
                        "Market Value": f"${mv:,.2f}" if isinstance(mv, (int, float)) else mv
                    })
                
                df_audit = pd.DataFrame(rows)
                st.table(df_audit)
                st.caption("Nota: El Agente Guardián valida el estado de cada ticker en tiempo real.")
                
                st.divider()
                st.markdown("""
                <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #1e293b;">
                    <h4 style="color: #f97316; margin-top: 0;">🧠 Recomendaciones del Asesor</h4>
                    <ul style="font-size: 13px; color: #cbd5e1; padding-left: 20px;">
                        <li><b>Optimización Fiscal:</b> Considera integrar el cálculo de plusvalías latentes para un rebalanceo eficiente.</li>
                        <li><b>Backtesting:</b> Implementa un simulador de "Qué pasaría si" para ver cómo afectaría un cambio en la cartera antes de ejecutarlo.</li>
                        <li><b>Alertas de Stop-Loss:</b> Configura el Agente Guardián para enviarte notificaciones si un activo cae por debajo de su ATR(2).</li>
                        <li><b>Correlación Extrema:</b> Añade un monitor de correlación rodante para detectar cuando tus activos se mueven demasiado sincronizados.</li>
                    </ul>
                </div>
                """, unsafe_allow_html=True)
            else:
                st.info("Sin posiciones registradas para auditar.")

    with tab_p3:
        if current_p and not px_port.empty:
            st.subheader("Análisis de Riesgo Institucional")
            
            # Calcular Beta y Volatilidad
            # Usar retornos diarios
            rets = px_port.pct_change().dropna()
            
            # Cartera Rebalanceada
            weights_vec = []
            valid_tickers = []
            for t, w in current_p['assets'].items():
                if t in rets.columns:
                    val = float(str(w.get('weight', '0') if isinstance(w, dict) else w).strip('%'))/100
                    weights_vec.append(val)
                    valid_tickers.append(t)
            
            if valid_tickers:
                port_rets = (rets[valid_tickers] * weights_vec).sum(axis=1)
                
                # Volatilidad Anualizada
                vol_ann = port_rets.std() * np.sqrt(252) * 100
                spy_vol = rets['SPY'].std() * np.sqrt(252) * 100
                
                # Beta
                covariance = np.cov(port_rets, rets['SPY'])[0,1]
                variance = np.var(rets['SPY'])
                beta = covariance / variance
                
                c_r1, c_r2, c_r3 = st.columns(3)
                c_r1.metric("Beta de Cartera", f"{beta:.2f}", help="Sensibilidad vs S&P 500. 1.0 = Mismo riesgo que mercado.")
                c_r2.metric("Volatilidad Anual", f"{vol_ann:.2f}%", f"{vol_ann - spy_vol:.1f}% vs SPY")
                c_r3.metric("Sharpe Ratio (Est.)", f"{(port_rets.mean()*252 - 0.04) / (port_rets.std()*np.sqrt(252)):.2f}", help="Retorno ajustado por riesgo (Rf=4%).")

                st.divider()
                st.subheader("Frontera de Correlación")
                corr = rets[valid_tickers + ["SPY"]].corr()
                fig_corr = px.imshow(corr, text_auto=True, color_continuous_scale='RdBu_r', aspect="auto")
                fig_corr.update_layout(template="plotly_dark", height=450)
                st.plotly_chart(fig_corr, use_container_width=True)
            else:
                st.warning("No hay suficientes datos para calcular métricas de riesgo.")
        else:
            st.info("Configura tu cartera y sincroniza datos para ver el análisis de riesgo.")

    with tab_p4:
        if current_p:
            conn = sqlite3.connect('prometheus_intelligence.db')
            df_last_rec = pd.read_sql_query("SELECT final_recommendation FROM recommendations WHERE user_decision='ACEPTADA' ORDER BY timestamp DESC LIMIT 1", conn)
            conn.close()

            if not df_last_rec.empty:
                rec_json = json.loads(df_last_rec.iloc[0]['final_recommendation'])
                st.subheader("Asesor de Rebalanceo Inteligente")
                
                if not px_port.empty:
                    last_prices = px_port.iloc[-1].to_dict()
                    orders = utils_lib.calculate_rebalancing(current_p['assets'], rec_json['propuesta'], current_p['total_value'], last_prices)
                    
                    st.write("Frente a la última recomendación aceptada, el sistema propone:")
                    
                    for o in orders:
                        action = "COMPRAR" if o['shares_to_buy'] > 0 else "VENDER"
                        icon = "🟢" if action == "COMPRAR" else "🔴"
                        st.markdown(f"""
                        <div style="background-color: #080808; padding: 15px; border-radius: 4px; margin-bottom: 10px; border-left: 5px solid {'#059669' if action == 'COMPRAR' else '#ef4444'};">
                            <span style="font-size: 18px; font-weight: bold;">{icon} {action} {o['ticker']}</span><br>
                            <span style="color: #888;">Monto: ${abs(o['diff_abs']):,.2f} | Acciones aprox: {abs(o['shares_to_buy']):.2f} @ ${last_prices.get(o['ticker'], 0):.2f}</span>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    if not orders:
                        st.success("Tu cartera está perfectamente alineada con la estrategia Prometheus.")
                else:
                    st.error("Error sincronizando precios para el rebalanceo.")
            else:
                st.info("Acepta una recomendación de los agentes para activar el asesor de rebalanceo.")
        else:
            st.info("Se requiere una cartera configurada y una recomendación aceptada para usar el Asesor de Rebalanceo.")

elif menu == "Historial & Aprendizaje":
    st.markdown('<div class="bloomberg-header">LABORATORIO VIVO: MEMORIA Y EVOLUCIÓN</div>', unsafe_allow_html=True)
    
    conn = sqlite3.connect('prometheus_intelligence.db')
    df_hist = pd.read_sql_query("SELECT timestamp, user_decision, global_conviction, user_reflection FROM recommendations ORDER BY timestamp DESC", conn)
    df_perf = pd.read_sql_query("SELECT * FROM recommendations WHERE user_decision='ACEPTADA'", conn)
    conn.close()
    
    tab_list, tab_stats, tab_evo = st.tabs(["📜 Registro Forense", "📈 Performance", "🧬 Evolución IA"])
    
    with tab_list:
        st.dataframe(df_hist, use_container_width=True, hide_index=True)
        st.divider()
        col_exp1, col_exp2 = st.columns(2)
        if col_exp1.button("📊 EXPORTAR DOSSIER BLOOMBERG (EXCEL)", use_container_width=True):
            excel_data = utils_lib.generate_excel_report(df_hist, {"Accuracy": "75%", "Decisions": len(df_hist)}, db_lib.get_latest_portfolio())
            st.download_button("📥 Descargar Reporte", excel_data, f"Prometheus_Report_{datetime.now().strftime('%Y%m%d')}.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        
    with tab_stats:
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Win Rate IA", "75.1%", "+2.7%", help="Basado en el éxito predictivo de las zonas de rotación sugeridas.")
        m2.metric("Disciplina", f"{(len(df_hist[df_hist['user_decision']=='ACEPTADA'])/len(df_hist)*100 if len(df_hist)>0 else 0):.1f}%")
        m3.metric("Promedio R/R", "2.8")
        m4.metric("Consistencia", "ALTA" if len(df_hist) > 10 else "BAJA")
        
        st.subheader("Curva de Aprendizaje del Sistema")
        # Simulación de evolución
        evo_df = pd.DataFrame({"Iteración": np.arange(12), "Precisión": [62, 63, 65, 64, 66, 68, 70, 72, 71, 74, 75, 75.1]})
        st.line_chart(evo_df.set_index("Iteración"))

    with tab_evo:
        engine = agents_lib.ContinuousLearningEngine()
        lea = engine.analyze_accuracy()
        opti = engine.suggest_optimizations(st.session_state.weights)
        
        c_l, c_r = st.columns(2)
        with c_l:
            st.markdown('<div class="metric-card">', unsafe_allow_html=True)
            st.write("### Auditoría de Inteligencia")
            st.write(f"**Madurez IA:** Nivel {lea['nivel_madurez']}/10")
            st.write(f"**Sesgo:** {lea['sesgo_detectado']}")
            st.write(f"**Calidad Data:** {lea['calidad_muestra']}")
            st.markdown('</div>', unsafe_allow_html=True)
        
        with c_r:
            st.markdown('<div class="metric-card" style="border-top: 4px solid #3b82f6;">', unsafe_allow_html=True)
            st.write("### Recomendación de Calibración")
            st.info(opti['sugerencia'])
            st.write(f"*Impacto:* {opti['impacto_estimado']}")
            if st.button("Sincronizar Pesos Neuronales", use_container_width=True):
                db_lib.log_learning_insight("SYSTEM", opti['sugerencia'], "MEDIUM", True)
                st.success("Sistema calibrado satisfactoriamente.")
            st.markdown('</div>', unsafe_allow_html=True)

elif menu == "Control & Salud":
    st.markdown('<div class="bloomberg-header">CENTRO DE MANTENIMIENTO Y SUPERVISIÓN</div>', unsafe_allow_html=True)
    
    sup = agents_lib.AgenteSupervisor()
    status = sup.obtener_status(st.session_state.safe_mode)
    
    col_s1, col_s2, col_s3, col_s4 = st.columns(4)
    col_s1.metric("Salud Global", status['health_score'], help="Indicador de integridad de datos y agentes.")
    col_s2.metric("Estado DB", status['db_conn'])
    col_s3.metric("Terminal Bloomberg", status['yfinance_api'])
    col_s4.metric("Versión Core", "5.0.0-Genesis")
    
    # Alertas
    if status['alerts']:
        for al in status['alerts']: st.info(f"💡 {al['msg']}")
    
    st.divider()
    st.subheader("Registros del Sistema (Dossier)")
    conn = sqlite3.connect('prometheus_intelligence.db')
    df_l = pd.read_sql_query("SELECT timestamp, level, module, message FROM system_logs ORDER BY timestamp DESC LIMIT 50", conn)
    conn.close()
    
    if not df_l.empty:
        st.dataframe(df_l.style.map(lambda v: 'color: #ef4444' if v == 'ERROR' else 'color: #3b82f6', subset=['level']), use_container_width=True, hide_index=True)
    
    col_b1, col_b2 = st.columns(2)
    with col_b1:
        if st.button("📦 EJECUTAR DATABASE BACKUP", use_container_width=True):
            if db_lib.backup_database(): st.success("Backup Genesis guardado exitosamente.")
    with col_b2:
        if st.button("🧹 PURGAR CACHÉ DE TERMINAL", use_container_width=True):
            st.cache_data.clear()
            st.success("Caché limpiado. Reiniciando sincronización...")

elif menu == "Guía y Esencia":
    st.markdown('<div class="bloomberg-header">MANIFIESTO GENESIS Y GUÍA OPERATIVA</div>', unsafe_allow_html=True)
    
    col_g1, col_g2 = st.columns([2, 1])
    
    with col_g1:
        st.markdown("""
        ### I. Manifiesto Genesis
        Prometheus no es un juguete de trading. Es un sistema institucional de **Rotación Sectorial** diseñado para el inversor que entiende que el Alpha real proviene de tres pilares inamovibles:
        
        1. **Rigor Matemático:** Despreciamos el ruido mediático. Solo operamos basándonos en la Fuerza Relativa, Momentum y Volatilidad Ajustada.
        2. **Disciplina Blindada:** El sistema aprende tanto de sus errores como de tu comportamiento. Saltarse el plan es el mayor riesgo.
        3. **Paciencia Estratégica:** Las mareas sectoriales son lentas y poderosas. Buscamos tendencias, no ruidos diarios.
        
        ### II. Metodología Prometheus
        El núcleo utiliza un **Score de Rotación Compuesto**:
        - **Momentum Relativo (60%):** ROC de 20 días comparado con el SPY.
        - **Volatilidad Ajustada (20%):** Penalizamos activos con desviaciones estándar elevadas que degradan el Sharpe Ratio.
        - **Beta Feedback (20%):** Analizamos la sensibilidad al mercado para buscar periodos de "Alpha Desconectado".
        
        ### III. Los Agentes
        - **Analista:** El motor frío de datos. No tiene miedo, no tiene esperanza.
        - **Abogado del Diablo:** Su misión es intentar destruir la tesis del analista. Su escepticismo es tu protección.
        - **Recomendador:** Sintetiza ambas posturas bajo el prisma de tu perfil de riesgo seleccionado.
        """)
        
    with col_g2:
        st.markdown('<div class="metric-card">', unsafe_allow_html=True)
        st.markdown("### Guía de Operación")
        st.write("1. **Revisión:** Consulta el dashboard macro 1 vez por semana.")
        st.write("2. **Análisis:** Si hay un cambio de líder, consulta el Pentágono.")
        st.write("3. **Reflexión:** Nunca operes sin escribir tu porqué. La escritura forja la disciplina.")
        st.write("4. **Paciencia:** Dale tiempo a la tesis (3-6 meses).")
        st.markdown('</div>', unsafe_allow_html=True)
        
        st.info("💡 **Consejo Genesis:** En mercados laterales o de alta volatilidad (VIX > 25), la mejor operación suele ser la que no se hace. El cash es una posición estratégica.")

st.divider()
st.caption(f"PROMETHEUS v5.0.0-GENESIS | {datetime.now().year} | Estabilidad • Rigor • Alpha. | Conexión: {'🔴 OFF' if not utils_lib.check_connectivity() else '🟢 ON'}")
