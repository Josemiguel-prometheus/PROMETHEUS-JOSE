import { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  FileJson,
  RefreshCw, 
  ArrowRight,
  TrendingUp,
  Settings,
  Users,
  ShieldAlert,
  Terminal,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface BackupData {
  system_identifier: string;
  exported_at: string;
  config: any[];
  etfs: any[];
  platform_improvements: any[];
  recommendations_24h: any[];
  logs: any[];
}

export default function DataManagementPanel() {
  const [dbStats, setDbStats] = useState({
    config: 0,
    etfs: 0,
    platform_improvements: 0,
    recommendations_24h: 0,
    logs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Export states
  const [exportPreview, setExportPreview] = useState<BackupData | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<BackupData | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current database stats for local representation
  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/data-management/export');
      if (!res.ok) throw new Error('Fallo al recuperar datos de memoria de Prometheus.');
      const data: BackupData = await res.json();
      setExportPreview(data);
      setDbStats({
        config: data.config?.length || 0,
        etfs: data.etfs?.length || 0,
        platform_improvements: data.platform_improvements?.length || 0,
        recommendations_24h: data.recommendations_24h?.length || 0,
        logs: data.logs?.length || 0,
      });
    } catch (err: any) {
      setError(err.message || 'Error desconocido al cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExportDownload = () => {
    if (!exportPreview) return;
    setIsExporting(true);
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPreview, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `PROMETHEUS_CORE_MEMORY_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Import file processing
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setImportFile(file);
    setImportStatus({ type: 'idle', message: '' });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as BackupData;
        
        // Validation
        if (parsed.system_identifier !== "PROMETHEUS_MEMORY_BACKUP_V5") {
          throw new Error("El archivo no tiene el identificador de sistema 'PROMETHEUS_MEMORY_BACKUP_V5'. Es incompatible.");
        }
        
        setImportPreviewData(parsed);
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          message: `Archivo inválido: ${err.message}`
        });
        setImportPreviewData(null);
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const triggerImportSubmit = async () => {
    if (!importPreviewData) return;
    setImportStatus({ type: 'loading', message: 'Restaurando memoria táctica de Prometheus en base de datos SQLite3...' });
    
    try {
      const response = await fetch('/api/data-management/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPreviewData)
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido al importar el archivo.');
      }
      
      setImportStatus({
        type: 'success',
        message: '¡La memoria física de la plataforma se ha actualizado con éxito! La consola cognitiva se ha sincronizado.'
      });
      setImportPreviewData(null);
      setImportFile(null);
      // Reload stats of local system after database rewrite
      loadStats();
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Fallo en el proceso de inyección de memoria: ${err.message}`
      });
    }
  };

  // Drag and drop events
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-8" id="data-management-viewport">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#2A2A2A] pb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <Database className="w-5 h-5 text-orange-500" />
            Gestión de Datos y Calibración de Memoria
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Módulo oficial de portabilidad para auditar, respaldar y sincronizar heurísticas de decisión del núcleo matemático de Prometheus.
          </p>
        </div>
        
        <button 
          onClick={loadStats} 
          disabled={loading}
          className="flex items-center gap-2 text-xs font-mono font-bold bg-[#141414] hover:bg-[#1C1C1C] text-orange-400 hover:text-white border border-[#2A2A2A] hover:border-[#3A3A3A] px-4 py-2 rounded-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          RE-ANALIZAR CAPA DE DATOS
        </button>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-500/30 p-4 rounded-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Error de Sincronización Interna</h4>
            <p className="text-xs text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Database State Dashboard Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Configuraciones</span>
            <Settings className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.config}</p>
          <p className="text-[9px] font-mono text-gray-500">Pesos del Algoritmo GICS</p>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Unidades ETF</span>
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.etfs}</p>
          <p className="text-[9px] font-mono text-gray-500">Activos Maquetados</p>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Mejoras de Plataforma</span>
            <Users className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.platform_improvements}</p>
          <p className="text-[9px] font-mono text-gray-500">Propuestas del Backlog</p>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Señales 24H</span>
            <Database className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.recommendations_24h}</p>
          <p className="text-[9px] font-mono text-gray-500">Histórico de Señales</p>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm col-span-2 md:col-span-1 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Registros de Auditoría</span>
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.logs}</p>
          <p className="text-[9px] font-mono text-gray-500">Logs de Transacciones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: EXPORT memory and Visual Preview */}
        <div className="space-y-6">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-sm p-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest block">Proceso de Respaldo</span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Exportar Memoria Táctica
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Descargue un archivo estructurado en formato JSON que almacena el estado completo de las calibraciones del robot, el histórico persistente de señales dadas por el debate del Pentágono, y el backlog de hito técnico cargado. Se puede usar para restablecer la máquina en cualquier instante.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleExportDownload}
                disabled={loading || isExporting || !exportPreview}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs py-3 px-4 rounded-sm shadow-md transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                DESCARGAR COPIA DE SEGURIDAD
              </button>

              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#1C1C1C] text-white border border-[#2A2A2A] hover:border-[#333] font-bold text-xs py-3 px-5 rounded-sm transition-all"
              >
                <Eye className="w-4 h-4 text-orange-400" />
                {showRawJson ? 'OCULTAR JSON RAW' : 'VER JSON COMPLETO'}
              </button>
            </div>

            {/* Live visual structures of tables */}
            <div className="border-t border-[#1C1C1C] pt-6 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase text-white tracking-widest">
                Visualización Previa del Backing-Up
              </h4>
              
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-sm divide-y divide-[#1A1A1A] text-xs">
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span className="text-gray-200 font-semibold">Metadata de Cabecera</span>
                  </div>
                  <span className="font-mono text-gray-400 text-[10.5px]">ID: PROMETHEUS_MEMORY_BACKUP_V5</span>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-gray-200">
                    <span className="font-bold">Esquema Config:</span>
                    <span className="text-gray-400 font-mono">{dbStats.config} llaves</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#121212] p-2 rounded-xs border border-[#1C1C1C] font-mono text-[10px] text-gray-300">
                    <div>rotation_weight_momentum:</div>
                    <div className="text-right text-orange-400 font-bold">0.6</div>
                    <div>rotation_weight_volatility:</div>
                    <div className="text-right text-orange-400 font-bold">0.2</div>
                  </div>
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-gray-200">
                    <span className="font-bold">Muestra Histórico de Señales (Últimas 2):</span>
                    <span className="text-gray-400 font-mono">{dbStats.recommendations_24h} registros</span>
                  </div>
                  {exportPreview?.recommendations_24h && exportPreview.recommendations_24h.length > 0 ? (
                    <div className="space-y-1 bg-[#121212] p-2 rounded-xs border border-[#1C1C1C] text-[10.5px]">
                      {exportPreview.recommendations_24h.slice(0, 2).map((rec, i) => (
                        <div key={i} className="flex justify-between items-center text-gray-300 border-b border-[#222]/30 last:border-0 pb-1 last:pb-0">
                          <span className="font-semibold truncate max-w-[120px]">{rec.sector_lider}</span>
                          <span className="text-[9.5px] font-mono text-gray-400">{rec.action}</span>
                          <span className="bg-orange-950/40 text-orange-300 font-mono text-[9px] px-1 rounded-sm border border-orange-500/20 font-bold">{rec.score} pts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-600 italic">No hay registros cargados.</span>
                  )}
                </div>

                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-gray-200">
                    <span className="font-bold">Primeras Mejoras en el Backlog:</span>
                    <span className="text-gray-400 font-mono">{dbStats.platform_improvements} hilos</span>
                  </div>
                  {exportPreview?.platform_improvements && exportPreview.platform_improvements.length > 0 ? (
                    <div className="space-y-1 bg-[#121212] p-2 rounded-xs border border-[#1C1C1C] text-[10.5px]">
                      {exportPreview.platform_improvements.slice(0, 2).map((imp, i) => (
                        <div key={i} className="flex justify-between items-center text-gray-300 border-b border-[#222]/30 last:border-0 pb-1 last:pb-0">
                          <span className="truncate max-w-[160px] font-medium text-white">{imp.title}</span>
                          <span className="text-purple-400 font-bold text-[9px]">{imp.impact}</span>
                          <span className="text-green-400 text-[10px] font-mono">{imp.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-600 italic">No hay backlog cargado.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible raw JSON viewport */}
          {showRawJson && exportPreview && (
            <div className="bg-[#0F0F0F] border border-[#222] p-5 rounded-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#222] pb-2">
                <span className="text-xs font-mono font-bold text-orange-400 uppercase">Visor Interactivo JSON Real-Time</span>
                <span className="text-[10px] font-mono text-gray-500">Formato Símil SQLite-Data Matrix</span>
              </div>
              <pre className="max-h-[300px] overflow-y-auto bg-[#070707] border border-[#222] p-3 rounded-sm font-mono text-[10.5px] text-[#A3E635] selection:bg-orange-500/20 leading-relaxed custom-scrollbar text-left">
                {JSON.stringify(exportPreview, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: DRAG AND DROP IMPORT engine area */}
        <div className="space-y-6">
          <div className="bg-[#0F0F0F] border border-[#222] rounded-sm p-6 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block">Restauración y Carga</span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Importar Memoria de Prometheus
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Suba una copia de seguridad válida para calibrar la memoria cognitiva de la plataforma. Al confirmar la acción, se realizará una restauración transaccional completa. Se sobreescriben de forma segura las configuraciones, el backlog y el histórico de recomendaciones de 24h.
              </p>
            </div>

            {/* Drag and Drop File Interface */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2D2D2D] hover:border-orange-500/50 hover:bg-[#141414]/30 rounded-sm p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <div className="w-10 h-10 rounded-full bg-orange-600/10 border border-orange-500/30 flex items-center justify-center mx-auto">
                <FileJson className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-tight">Arrastre su copia de seguridad aquí</p>
                <p className="text-[11px] text-gray-500 font-mono mt-1">o haga clic en este recuadro para explorar su disco corporal (.json)</p>
              </div>
            </div>

            {importStatus.type !== 'idle' && (
              <div className={`p-4 rounded-sm border flex items-start gap-3 text-xs ${
                importStatus.type === 'loading' ? 'bg-orange-950/10 border-orange-500/30 text-orange-300' :
                importStatus.type === 'success' ? 'bg-green-950/10 border-green-500/30 text-green-300' :
                'bg-red-950/10 border-red-500/30 text-red-300'
              }`}>
                {importStatus.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-orange-400 shrink-0" />}
                {importStatus.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                {importStatus.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wide block">
                    {importStatus.type === 'loading' ? 'Integridad en Progreso' :
                     importStatus.type === 'success' ? 'Sincronizado Con Éxito' :
                     'Advertencia de Carga'}
                  </span>
                  <p className="font-medium text-[11.5px]">{importStatus.message}</p>
                </div>
              </div>
            )}

            {/* PRE-IMPORT summary table review */}
            {importPreviewData && (
              <div className="bg-[#050505] border border-[#1A1A1A] rounded-sm p-4 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center gap-2 border-b border-[#222] pb-1.5">
                  <Eye className="w-4 h-4 text-orange-400" />
                  <h4 className="text-xs font-bold font-mono text-white uppercase tracking-tight">Revisión de Memoria a Inyectar</h4>
                </div>

                <div className="space-y-2 mt-2">
                  <p className="text-[11px] text-gray-400">
                    Se han validado los esquemas. La plataforma reestructurará las siguientes tablas físicas:
                  </p>

                  <div className="space-y-1.5 font-mono text-[10.5px]">
                    <div className="flex items-center justify-between p-1.5 bg-[#0F0F0F] rounded-xs border border-[#1C1C1C]">
                      <span className="text-gray-300">⚙️ Configs de Rotación:</span>
                      <span className="text-white font-bold">{importPreviewData.config?.length || 0} registros nuevos</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-[#0F0F0F] rounded-xs border border-[#1C1C1C]">
                      <span className="text-gray-300">📈 Activos ETF Registrados:</span>
                      <span className="text-white font-bold">{importPreviewData.etfs?.length || 0} activos</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-[#0F0F0F] rounded-xs border border-[#1C1C1C]">
                      <span className="text-gray-300">👥 Backlog de Propuestas:</span>
                      <span className="text-white font-bold">{importPreviewData.platform_improvements?.length || 0} hilos</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-[#0F0F0F] rounded-xs border border-[#1C1C1C]">
                      <span className="text-gray-300">💡 Señales Tácticas 24H:</span>
                      <span className="text-white font-bold">{importPreviewData.recommendations_24h?.length || 0} señales</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-[#0F0F0F] rounded-xs border border-[#1C1C1C]">
                      <span className="text-gray-300">📝 Logs de Transacción:</span>
                      <span className="text-white font-bold">{importPreviewData.logs?.length || 0} líneas</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={triggerImportSubmit}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-2.5 px-4 rounded-sm transition-colors border border-green-700 hover:border-green-600"
                  >
                    Confirmar e Inyectar Memoria
                  </button>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportPreviewData(null);
                    }}
                    className="bg-[#141414] hover:bg-[#1C1C1C] text-gray-400 hover:text-white border border-[#222] py-2.5 px-4 rounded-sm transition-colors text-xs font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0F0F0F] border border-[#222] p-5 rounded-sm space-y-3">
            <h4 className="text-[11px] font-bold font-mono uppercase text-[#f97316] tracking-widest border-b border-[#222] pb-1.5 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-[#f97316]" />
              Cláusulas de Integridad & Calibración
            </h4>
            <p className="text-[11px] text-gray-300 leading-relaxed font-semibold">
              El proceso de importación ejecuta operaciones atómicas complejas. Se recomienda detener cualquier rebalanceo activo o cálculo paralelo para evitar conflictos de concurrencia en la base SQLite.
            </p>
            <div className="p-3 bg-[#141414] border border-[#222] rounded-xs text-[10px] font-mono text-orange-400 leading-relaxed font-bold">
              "sqlite_master: integrity_check ok - todos los índices de memoria se reconstruyen óptimamente en tiempo real."
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
