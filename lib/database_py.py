import sqlite3
import json
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
