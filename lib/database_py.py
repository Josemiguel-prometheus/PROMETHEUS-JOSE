import sqlite3
import json
import pandas as pd
from datetime import datetime

def init_db():
    conn = sqlite3.connect('prometheus_intelligence.db')
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
    conn = sqlite3.connect('prometheus_intelligence.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO recommendations 
        (analyst_report, devil_advocate_report, final_recommendation, user_decision, user_reflection, market_context, global_conviction)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (json.dumps(analyst), json.dumps(devil), json.dumps(recommendation), decision, reflection, json.dumps(context), conviction))
    conn.commit()
    conn.close()

def log_system_event(level, module, message):
    conn = sqlite3.connect('prometheus_intelligence.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO system_logs (level, module, message) VALUES (?, ?, ?)', (level, module, message))
    conn.commit()
    conn.close()

def save_portfolio(assets, total_value, spy_price):
    conn = sqlite3.connect('prometheus_intelligence.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO portfolio (assets, total_value, benchmark_spy_price) VALUES (?, ?, ?)', 
                   (json.dumps(assets), total_value, spy_price))
    conn.commit()
    conn.close()

def log_learning_insight(itype, insight, impact, applied=False):
    conn = sqlite3.connect('prometheus_intelligence.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO learning_insights (type, insight, impact_level, applied) VALUES (?, ?, ?, ?)', 
                   (itype, insight, impact, 1 if applied else 0))
    conn.commit()
    conn.close()

def save_settings_snapshot(weights, perfil, reason):
    conn = sqlite3.connect('prometheus_intelligence.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO settings_history (weights, perfil, reason) VALUES (?, ?, ?)', 
                   (json.dumps(weights), perfil, reason))
    conn.commit()
    conn.close()

def get_latest_portfolio():
    conn = sqlite3.connect('prometheus_intelligence.db')
    df = pd.read_sql_query("SELECT * FROM portfolio ORDER BY timestamp DESC LIMIT 1", conn)
    conn.close()
    if not df.empty:
        df['assets'] = df['assets'].apply(json.loads)
        return df.iloc[0].to_dict()
    return None
