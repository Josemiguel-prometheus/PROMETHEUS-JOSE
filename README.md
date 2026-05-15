# PROMETHEUS - ETF Rotation Intelligence System

## Descripción
Sistema avanzado de inteligencia para la rotación de ETFs basado en una arquitectura de agentes asíncronos. La Fase 1 establece los cimientos de estabilidad, rigor matemático y persistencia de datos.

## Tecnologías
- **Frontend**: React 19, Tailwind CSS 4, Motion, Recharts, Lucide Icons.
- **Backend**: Node.js (Express), SQLite3 (Persistencia).
- **AI/Agents**: Arquitectura de agentes (Analista, Supervisor, Diablo).
- **Data**: Yahoo Finance API (vía yahoo-finance2).

## Estructura del Proyecto
- `src/`: Código fuente del frontend React.
- `lib/`: Capa de datos, agentes y utilidades del servidor.
- `server.ts`: Punto de entrada del servidor Express + Vite.
- `app.py` & `agents.py`: Implementación base en Python (referencia/alternativa).

## Ejecución Local
1. Instalar dependencias: `npm install`
2. Iniciar servidor de desarrollo: `npm run dev`
3. Abrir `http://localhost:3000`

## Despliegue en Streamlit Community Cloud (Python)
Para la versión Python (Fase 1 simplificada):
1. Sincronizar repositorio con Github.
2. Conectar a Streamlit Cloud apuntando a `app.py`.
3. Asegurarse de que `requirements.txt` esté en la raíz.

## Valores Genesis
- **Paciencia**: El sistema evita el sobre-transaccionamiento.
- **Rigor**: Cada recomendación es filtrada por tres agentes.
- **Estabilidad**: Monitoreo constante del estado sistémico.
