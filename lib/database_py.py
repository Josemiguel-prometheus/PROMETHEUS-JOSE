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
            assets TEXT, -- JSON con {ticker: %, ...}
            total_value REAL DEFAULT 100000.0,
            benchmark_spy_price REAL
        )
    ''')

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

def save_portfolio(assets, total_value, spy_price):
    conn = get_db_connection()
    if not conn: return
    try:
        cursor = conn.cursor()
        cursor.execute('INSERT INTO portfolio (assets, total_value, benchmark_spy_price) VALUES (?, ?, ?)', 
                       (json.dumps(assets), total_value, spy_price))
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
