# 🏛️ PROMETHEUS - ETF Rotation Intelligence System

Sistema avanzado de inteligencia institucional para la rotación táctica de ETFs y análisis macroeconómico cuantitativo, estructurado sobre una arquitectura asíncrona de agentes autónomos y una interfaz táctica inspirada en terminales financieras profesionales (Bloomberg / FactSet).

---

## 🌟 Características Principales

1. **Dashboard Institucional (Situación Sistémica en Tiempo Real)**:
   - Monitor de régimen macroeconómico (*Risk-On*, *Neutral*, *Risk-Off / Extreme Volatility*) basado en VIX, SPY y curvas de rendimiento.
   - Medidor de confianza sistémica y señales automatizadas *System Core*.
   - Alpha del día y lecturas de momentum con sparklines vectoriales de alta precisión.

2. **Índice de Liquidez Global Multi-Factorial**:
   - Monitoreo integrado de 4 pilares: Fortaleza de Divisa (DXY invertido), Estrés de Crédito (ratio HYG / TLT), Expansión de Carry Trade (USD/JPY) y Flujo Especulativo (ROC comparativo BTC vs GLD).
   - Clasificación dinámica de liquidez (*Contracción*, *Ajustada*, *Estable/Neutral*, *Expansiva*, *Abundante*).

3. **Rankings y Rotación Cuantitativa GICS**:
   - Evaluación multi-temporal de los 11 sectores del S&P 500 (Tecnología, Energía, Financiero, Salud, Consumo, etc.).
   - Cálculo de fuerza relativa contra el benchmark SPY y ponderaciones tácticas paramétricas.
   - Drilldown detallado por sector con desglose de ETFs representativos.

4. **Pentágono de Agentes Asíncronos**:
   - **PROMETHEUS-Analista**: Escaneo de momentum, correlaciones cruzadas y generación de tesis de rotación.
   - **GENESIS-Supervisor**: Control de límites de riesgo de cola, consistencia matemática y ratios de volatilidad.
   - **DIABLO-Revisor (Abogado del Diablo)**: Protocolo de refutación de cisnes negros, stress-testing de escenarios adversos y coberturas recomendadas.

5. **Diversificación Sectorial Consolidada**:
   - Mapeo y agrupación automática por sector real GICS, renta fija, materias primas, criptoactivos y reserva de efectivo (`CASH`).
   - Métricas de valoración a mercado ($) y ponderación porcentual precisa (%).

6. **Gestión de Datos y Memoria Táctica**:
   - Exportación e importación completa del estado cognitivo de la plataforma en JSON (`PROMETHEUS_TACTICAL_MEMORY_V5`).
   - Simulación de validación previa (*Dry-Run*) para verificar la integridad estructural antes de sincronizar con SQLite3.
   - Restablecimiento seguro a valores de fábrica.

---

## 💻 Pila Tecnológica

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion, Recharts, Lucide Icons.
- **Backend**: Node.js, Express, SQLite3 (con transacciones ACID).
- **IA y Razonamiento**: Google GenAI SDK (`@google/genai` con modelo Gemini Flash).
- **Datos de Mercado**: Motor de cotizaciones en tiempo real e históricos.
- **Ecosistema Alternativo Python**: Aplicación paralela en Streamlit (`app.py`, `agents.py`, `requirements.txt`).

---

## 📁 Estructura del Repositorio

```text
├── src/                          # Código fuente del Frontend React
│   ├── components/               # Módulos y paneles tácticos del sistema
│   │   ├── Dashboard.tsx         # Tablero ejecutivo y resumen macro
│   │   ├── GlobalLiquidityPanel.tsx # Indicador compuesto de liquidez global
│   │   ├── RotationsPanel.tsx    # Ranking de sectores y momentum relativo
│   │   ├── SectorDrilldown.tsx   # Ficha técnica detallada por sector
│   │   ├── RealTimeQuotes.tsx    # Monitor de cotizaciones y variaciones
│   │   ├── AgentsPanel.tsx       # Interfaz del pentágono de agentes
│   │   ├── DevilAdvocatePanel.tsx# Debate crítico y stress-testing
│   │   ├── SupervisorPanel.tsx   # Logs y auditoría de integridad
│   │   ├── HistoryPanel.tsx      # Gráficos históricos y análisis intradiario
│   │   ├── DataManagementPanel.tsx # Backup, restauración y dry-run de memoria
│   │   └── ConfigPanel.tsx       # Parámetros del algoritmo y gestión de ETFs
│   ├── App.tsx                   # Enrutador principal y barra de navegación
│   ├── index.css                 # Estilos globales y temas Tailwind
│   └── main.tsx                  # Entrada de la aplicación React
├── lib/                          # Capa de datos, agentes y utilidades compartidas
│   ├── agents.ts                 # Lógica de agentes en TypeScript
│   ├── data-fetcher.ts           # Adquisición de datos y cálculos matemáticos
│   └── database.ts               # Inicialización y esquemas de SQLite3
├── server.ts                     # Servidor Express y endpoints de la API REST
├── app.py                        # Versión alternativa del sistema en Streamlit
├── agents.py                     # Agentes cuantitativos en Python
├── requirements.txt              # Dependencias para el entorno Python
├── package.json                  # Dependencias y scripts de Node.js
├── vite.config.ts                # Configuración de compilación Vite
└── .gitignore                    # Reglas de exclusión para Git / GitHub
```

---

## 🚀 Puesta en Marcha Local

### Opción 1: Aplicación Web Fullstack (Node.js + React) - Recomendada

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno** (opcional para IA en vivo):
   ```bash
   cp .env.example .env
   # Agrega tu GEMINI_API_KEY en .env si deseas interactuar con Gemini AI
   ```

3. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Accede a la interfaz en `http://localhost:3000`.

4. **Compilar para producción**:
   ```bash
   npm run build
   npm start
   ```

---

### Opción 2: Aplicación en Python / Streamlit

1. **Crear e inicializar un entorno virtual**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # En Windows: venv\Scripts\activate
   ```

2. **Instalar los requisitos**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar la aplicación**:
   ```bash
   streamlit run app.py
   ```

---

## 🔒 Despliegue y Publicación en GitHub

El repositorio está configurado con exclusión estricta en `.gitignore` para:
- Claves privadas y credenciales (`GEMINI_API_KEY`, `.env*`)
- Archivos de base de datos volátiles (`*.sqlite`, `*.db`)
- Archivos de caché y compilación (`node_modules/`, `dist/`, `__pycache__/`, `*.pyc`)

---

## ⚖️ Licencia y Principios

Desarrollado bajo los tres principios fundamentales del sistema Genesis:
- **Paciencia**: Mitigación de sobre-operativa mediante filtrado riguroso de señales.
- **Rigor**: Validación cruzada multi-agente en cada recomendación táctica.
- **Estabilidad**: Preservación de capital ante regímenes extremos de volatilidad.

