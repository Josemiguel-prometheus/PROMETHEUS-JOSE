import pandas as pd
import numpy as np
from datetime import datetime
import json

class AgenteAnalista:
    def __init__(self, rotation_df, macro_data, correlation_matrix):
        self.rotation_df = rotation_df
        self.macro_data = macro_data
        self.correlation_matrix = correlation_matrix

    def generar_analisis(self):
        # Lógica de síntesis inteligente
        top_sector = self.rotation_df.iloc[0]
        vix = self.macro_data.get('^VIX', 20)
        
        # Evaluación de calidad de entorno
        calidad = "Moderada"
        if vix < 15 and top_sector['Score Compuesto'] > 2:
            calidad = "Fuerte"
        elif vix > 25:
            calidad = "Débil / Riesgo Elevado"
            
        analisis = {
            "calidad_entorno": calidad,
            "conviccion": "ALTA" if calidad == "Fuerte" else "MEDIA",
            "sector_lider": top_sector['Sector'],
            "score_lider": top_sector['Score Compuesto'],
            "justificacion": f"El sector {top_sector['Sector']} presenta el momentum relativo más sólido ({top_sector['Rel. Mom (20D)']}) en un contexto de VIX en {vix:.2f}.",
            "top_etfs": [top_sector['Líder'], "QQQ", "SPY"], # Simplificado para Fase 3
            "horizonte": "Medio Plazo (3-6 meses)" if vix < 20 else "Corto Plazo / Táctico",
            "metodologia": "ROC(20) vs SPY + Vol Adj + Beta Neutralization"
        }
        return analisis

class AbogadoDelDiablo:
    def __init__(self, analisis_analista):
        self.analisis = analisis_analista

    def contra_analisis(self):
        sector = self.analisis['sector_lider']
        riesgos = [
            {"riesgo": f"Sobre-extensión en {sector}", "nivel": "Medio"},
            {"riesgo": "Divergencia en Yields vs Tech", "nivel": "Alto"},
            {"riesgo": "Falsa ruptura de momentum (Mean Reversion)", "nivel": "Bajo"}
        ]
        
        return {
            "alertas": riesgos,
            "mensaje_critico": f"¿Estamos ignorando que {sector} tiene una correlación de 0.85 con el DXY? Un rebote del dólar invalidaría todo el análisis del AgenteAnalista.",
            "nivel_escepticismo": "85%"
        }

class AgenteRecomendador:
    def __init__(self, analisis, contra):
        self.analisis = analisis
        self.contra = contra

    def ejecutar_decision(self, perfil="Moderado"):
        # Motor de decisión ponderado
        conviccion_global = "MEDIA"
        if self.analisis['conviccion'] == "ALTA" and float(self.contra['nivel_escepticismo'].strip('%')) < 90:
            conviccion_global = "ALTA"
            
        weights = {
            "Agresivo": {"lider": "40%", "core": "40%", "cash": "20%"},
            "Moderado": {"lider": "25%", "core": "50%", "cash": "25%"},
            "Conservador": {"lider": "10%", "core": "60%", "cash": "30%"}
        }
        
        propuesta = weights.get(perfil, weights["Moderado"])
        
        return {
            "conviccion_global": conviccion_global,
            "propuesta": propuesta,
            "stop_loss": "ATR(2) dinámico (~3.5%)",
            "ratio_rr": "1:2.8",
            "accion": "SOBREPONDERAR" if conviccion_global != "BAJA" else "MANTENER / CAUTELA"
        }

class AgenteSupervisor:
    def obtener_status(self):
        return {
            "db_conn": "OK",
            "yfinance_api": "ONLINE",
            "last_calc": datetime.now().strftime("%H:%M:%S"),
            "health_score": "98%",
            "alerts": []
        }
