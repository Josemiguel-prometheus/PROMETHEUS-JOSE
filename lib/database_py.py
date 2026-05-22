import sqlite3
import json
import pandas as pd
from datetime import datetime
import os
import shutil

DB_PATH = 'prometheus_intelligence.db'

def get_db_connection():
    try:
        conn = sqlite3.connect(DB_PATH)
        return conn
    except Exception as e:
        print(f"CRITICAL: Database connection error: {str(e)}")
        return None

def init_db():
    conn = get_db_connection()
    if not conn: return
    cursor = conn.cursor()
    
    # Tabla de Historial de Recomendaciones y Aprendizaje
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            analyst_report TEXT,
            devil_advocate_report TEXT,
            final_recommendation TEXT,
            user_decision TEXT,
            user_reflection TEXT,
            market_context TEXT,
            global_conviction TEXT
        )
    ''')
    
    # Tabla de Logs del Supervisor
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            level TEXT,
            module TEXT,
            message TEXT
        )
    ''')

    # Tabla de Portafolio Real
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            assets TEXT, -- JSON con {ticker: {weight: %, shares: N, price: X}, ...}
            total_value REAL DEFAULT 100000.0,
            cash REAL DEFAULT 0.0,
            benchmark_spy_price REAL
        )
    ''')
    
    # Migración: Verificar si la columna 'cash' existe
    cursor.execute("PRAGMA table_info(portfolio)")
    columns = [column[1] for column in cursor.fetchall()]
    if 'cash' not in columns:
        cursor.execute("ALTER TABLE portfolio ADD COLUMN cash REAL DEFAULT 0.0")

    # Tabla de Insights de Aprendizaje
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS learning_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            type TEXT, -- SYSTEM or USER
            insight TEXT,
            impact_level TEXT,
            applied BOOLEAN DEFAULT 0
        )
    ''')

    # Tabla de Versiones de Configuración
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            weights TEXT, -- JSON
            perfil TEXT,
            reason TEXT
        )
    ''')

    # Tabla de Recomendaciones 24h
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recommendations_24h (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            sector_lider TEXT,
            score REAL,
            vix_at_generation REAL,
            action TEXT,
            report TEXT,
            conviction TEXT
        )
    ''')

    # Tabla de Mejoras de Plataforma
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS platform_improvements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            title TEXT,
            description TEXT,
            votes INTEGER DEFAULT 0,
            status TEXT,
            impact TEXT,
            github_milestone TEXT
        )
    ''')
    
    # Semillar recommendations_24h si está vacía
    cursor.execute("SELECT count(*) FROM recommendations_24h")
    if cursor.fetchone()[0] == 0:
        historical_recs = [
            ('XLK (Tecnología)', 3.84, 13.52, 'SOBREPONDERAR TÁCTICAMENTE', 'Alta fuerza de momentum en semiconductores soportada por flujos estructurales y volumen ascendente.', 'ALTA', '2026-05-17 12:00:00'),
            ('XLE (Energía)', 1.42, 17.80, 'MANTENER / CAUTELA', 'Presión geopolítica elevando crudo, pero la volatilidad intradiaria aconseja no incrementar ponderación.', 'MEDIA', '2026-05-18 12:00:00'),
            ('XLY (Consumo)', -0.85, 14.10, 'REDUCIR POSICIONES', 'Debilidad en ventas core del consumidor e índices de crédito ajustados. Desplazar hacia defensivos.', 'BAJA', '2026-05-19 12:00:00'),
            ('XLV (Salud)', 2.10, 18.25, 'SOBREPONDERAR DEFENSIVOS', 'El aumento del VIX sugiere rotación defensiva hacia salud tradicional. Spread de dividendo atractivo.', 'MEDIA', '2026-05-20 12:00:00')
        ]
        for rec in historical_recs:
            cursor.execute('''
                INSERT INTO recommendations_24h (sector_lider, score, vix_at_generation, action, report, conviction, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', rec)

    # Semillar platform_improvements si está vacía
    cursor.execute("SELECT count(*) FROM platform_improvements")
    if cursor.fetchone()[0] == 0:
        default_improvements = [
            ('Inteligencia & Modelos', 'Módulo Avanzado de Backtesting Bayesiano', 'Permite simular la efectividad de la rotación sectorial táctica frente a un portafolio Buy & Hold estático de SPY.', 42, 'APROBADO', 'ALTO', 'Sprint-v1.1'),
            ('Conectividad & Canales', 'Suscripción Inmediata Webhook / Telegram', 'Enviar señales tácticas de 24h directamente a canales de comunicación automatizados o carteras de auto-trading.', 19, 'SUGESTIÓN', 'MEDIO', 'Backlog'),
            ('Capa de Datos / Portafolio', 'Soporte de Cartera sin Fracciones de Títulos', 'Modificar el optimizador del Asesor de Rebalanceo para calcular lotes completos de ETFs según mínimos configurables.', 11, 'SUGESTIÓN', 'MEDIO', 'Backlog'),
            ('Optimización Técnica', 'Caché de Cotizaciones de Yahoo Finance', 'Mitigar limitaciones de tasa de la API de Yahoo Finance mediante pre-cacheo local de 60 segundos en transacciones concurrentes.', 55, 'IMPLEMENTADO', 'ALTO', 'Sprint-v1.0'),
            ('Simulación Estocástica', 'Pruebas de Estrés Basadas en Eventos Históricos', 'Integrar choques históricos reales (Pandemia 2020, Subprime 2008, Burbuja Dotcom) directamente al simulador del Abogado del Diablo.', 31, 'APROBADO', 'ALTO', 'Sprint-v1.1'),
            ('Seguridad de Datos', 'Control de Auditoría y Logs de Transacciones', 'Registro persistente de decisiones del supervisor ante variaciones rápidas de volatilidad interbancaria.', 8, 'SUGESTIÓN', 'BAJO', 'Backlog')
        ]
        for imp in default_improvements:
            cursor.execute('''
                INSERT INTO platform_improvements (category, title, description, votes, status, impact, github_milestone)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', imp)
    
    conn.commit()
    conn.close()

def log_recommendation(analyst, devil, recommendation, decision, reflection, context, conviction):
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO recommendations 
            (analyst_report, devil_advocate_report, final_recommendation, user_decision, user_reflection, market_context, global_conviction)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (json.dumps(analyst), json.dumps(devil), json.dumps(recommendation), decision, reflection, json.dumps(context), conviction))
        conn.commit()
    finally:
        conn.close()

def log_system_event(level, module, message):
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO system_logs (level, module, message) VALUES (?, ?, ?)', (level, module, message))
        conn.commit()
    finally:
        conn.close()

def save_portfolio(assets, total_value, cash, spy_price):
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO portfolio (assets, total_value, cash, benchmark_spy_price) VALUES (?, ?, ?, ?)', 
                       (json.dumps(assets), total_value, cash, spy_price))
        conn.commit()
    finally:
        conn.close()

def log_learning_insight(itype, insight, impact, applied=False):
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO learning_insights (type, insight, impact_level, applied) VALUES (?, ?, ?, ?)', 
                       (itype, insight, impact, 1 if applied else 0))
        conn.commit()
    finally:
        conn.close()

def save_settings_snapshot(weights, perfil, reason):
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO settings_history (weights, perfil, reason) VALUES (?, ?, ?)', 
                       (json.dumps(weights), perfil, reason))
        conn.commit()
    finally:
        conn.close()

def get_latest_portfolio():
    conn = get_db_connection()
    if not conn: return None
    try:
        df = pd.read_sql_query("SELECT * FROM portfolio ORDER BY timestamp DESC LIMIT 1", conn)
        if not df.empty:
            df['assets'] = df['assets'].apply(json.loads)
            return df.iloc[0].to_dict()
    finally:
        conn.close()
    return None

def backup_database():
    """Genera una copia de seguridad de la base de datos."""
    try:
        if os.path.exists(DB_PATH):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}_{DB_PATH}"
            if not os.path.exists("backups"):
                os.makedirs("backups")
            shutil.copy2(DB_PATH, os.path.join("backups", backup_name))
            log_system_event("INFO", "Database", f"Backup exitoso: {backup_name}")
            return True
    except Exception as e:
        log_system_event("ERROR", "Database", f"Fallo en backup: {str(e)}")
    return False


def get_recommendations_24h(limit=10):
    conn = get_db_connection()
    if not conn: return []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recommendations_24h ORDER BY timestamp DESC LIMIT ?", (limit,))
        cols = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(cols, row)))
        return results
    finally:
        conn.close()


def get_platform_improvements():
    conn = get_db_connection()
    if not conn: return []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM platform_improvements ORDER BY votes DESC, id DESC")
        cols = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(cols, row)))
        return results
    finally:
        conn.close()


def vote_platform_improvement(item_id):
    conn = get_db_connection()
    if not conn: return False
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE platform_improvements SET votes = votes + 1 WHERE id = ?", (item_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def add_platform_improvement(category, title, description, impact, github_milestone="Backlog"):
    conn = get_db_connection()
    if not conn: return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO platform_improvements (category, title, description, votes, status, impact, github_milestone)
            VALUES (?, ?, ?, 1, 'SUGESTIÓN', ?, ?)
        """, (category, title, description, impact, github_milestone))
        conn.commit()
        return True
    finally:
        conn.close()

