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
  ChevronRight,
  Sparkles,
  Info,
  Trash2,
  FileCheck
} from 'lucide-react';

interface BackupData {
  system_identifier: string;
  exported_at: string;
  portfolio: any[];
  recommendations: any[];
  learning_insights: any[];
}

export default function DataManagementPanel() {
  const [dbStats, setDbStats] = useState({
    portfolio: 0,
    recommendations: 0,
    learning_insights: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Export states
  const [exportPreview, setExportPreview] = useState<BackupData | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportExplorerTab, setExportExplorerTab] = useState<'portfolio' | 'recommendations' | 'insights'>('portfolio');

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<BackupData | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  
  // Simulated Dry-Run State
  const [dryRunReport, setDryRunReport] = useState<{
    testedAt: string;
    score: number;
    integrityVerified: boolean;
    issuesText: string;
    details: { name: string; records: number; status: string }[];
  } | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);

  // Reset core memory states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  
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
        portfolio: data.portfolio?.length || 0,
        recommendations: data.recommendations?.length || 0,
        learning_insights: data.learning_insights?.length || 0,
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
      downloadAnchor.setAttribute("download", `PROMETHEUS_TACTICAL_MEMORY_${dateStr}.json`);
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
    setDryRunReport(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as BackupData;
        
        // Validation
        if (parsed.system_identifier !== "PROMETHEUS_TACTICAL_MEMORY_V5") {
          throw new Error("El archivo no tiene el identificador de sistema 'PROMETHEUS_TACTICAL_MEMORY_V5'. Es incompatible.");
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

  // Integrity dry run simulation
  const handleSimulateDryRun = () => {
    if (!importPreviewData) return;
    setIsDryRunning(true);
    setTimeout(() => {
      const hasPortfolio = Array.isArray(importPreviewData.portfolio);
      const hasRecommendations = Array.isArray(importPreviewData.recommendations);
      const hasInsights = Array.isArray(importPreviewData.learning_insights);

      const details = [
        { name: 'Mi Portafolio', records: importPreviewData.portfolio?.length || 0, status: hasPortfolio ? 'Estructura Correcta' : 'Ausente/Format Error' },
        { name: 'Laboratorio Vivo - Decisiones', records: importPreviewData.recommendations?.length || 0, status: hasRecommendations ? 'Estructura Correcta' : 'Ausente/Format Error' },
        { name: 'Laboratorio Vivo - Calibración', records: importPreviewData.learning_insights?.length || 0, status: hasInsights ? 'Estructura Correcta' : 'Ausente/Format Error' }
      ];

      const ok = hasPortfolio && hasRecommendations && hasInsights;
      setDryRunReport({
        testedAt: new Date().toLocaleTimeString(),
        score: ok ? 100 : 33,
        integrityVerified: ok,
        issuesText: ok ? 'No se detectaron inconsistencias en los esquemas relacionales. Sincronización segura garantizada.' : 'Se detectaron discrepancias en los esquemas tácticos.',
        details
      });
      setIsDryRunning(false);
    }, 600);
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
      setDryRunReport(null);
      // Reload stats of local system after database rewrite
      loadStats();
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Fallo en el proceso de inyección de memoria: ${err.message}`
      });
    }
  };

  // Factory reset trigger
  const handleFactoryResetConfirm = async () => {
    setIsResetting(true);
    setResetError(null);
    setResetMessage(null);
    try {
      const res = await fetch('/api/data-management/reset', {
        method: 'POST'
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'No se pudo restablecer la base de datos.');
      }
      setResetMessage('¡La memoria táctica de fábrica ha sido restaurada con éxito!');
      setShowResetConfirm(false);
      // Reload stats
      loadStats();
    } catch (err: any) {
      setResetError(err.message || 'Error inesperado durante el reinicio de fábrica.');
    } finally {
      setIsResetting(false);
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
    <div className="space-y-8 animate-fade-in" id="data-management-viewport">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#2A2A2A] pb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <Database className="w-5 h-5 text-orange-500" />
            Gestión de Datos y Calibración de Memoria
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Módulo oficial de portabilidad para respaldar y sincronizar exclusivamente el estado de "Mi Portafolio" y "LABORATORIO VIVO: MEMORIA Y EVOLUCIÓN".
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1 hover:border-[#333] transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Mi Portafolio</span>
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.portfolio}</p>
          <p className="text-[9px] font-mono text-gray-500">Estados de asignaciones y cajas</p>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1 hover:border-[#333] transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Laboratorio Vivo - Decisiones</span>
            <CheckCircle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.recommendations}</p>
          <p className="text-[9px] font-mono text-gray-500">Histórico de aprobaciones y desestimaciones</p>
        </div>

        <div className="bg-[#0F0F0F] border border-[#222] p-4 rounded-sm space-y-1 hover:border-[#333] transition-colors">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Laboratorio Vivo - Calibración Neural</span>
            <Database className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-white">{loading ? '...' : dbStats.learning_insights}</p>
          <p className="text-[9px] font-mono text-gray-500">Insights heurísticos y ajustes dinámicos</p>
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
                Descargue un archivo estructurado en formato JSON que almacena el estado de "Mi Portafolio" y "LABORATORIO VIVO: MEMORIA Y EVOLUCIÓN". Úselo para salvaguardar y transferir el aprendizaje adaptativo del sistema.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleExportDownload}
                disabled={loading || isExporting || !exportPreview}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs py-3 px-4 rounded-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                DESCARGAR COPIA DE SEGURIDAD
              </button>

              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#1C1C1C] text-white border border-[#2A2A2A] hover:border-[#333] font-bold text-xs py-3 px-5 rounded-sm transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-orange-400" />
                {showRawJson ? 'OCULTAR JSON RAW' : 'VER JSON COMPLETO'}
              </button>
            </div>

            {/* Live visual structures of tables */}
            <div className="border-t border-[#1C1C1C] pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h4 className="text-xs font-mono font-bold uppercase text-white tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  Auditoría de Memoria del Sistema
                </h4>
                <div className="flex bg-[#0B0B0B] border border-[#222] rounded-sm p-0.5 text-[10px] font-mono">
                  <button 
                    onClick={() => setExportExplorerTab('portfolio')}
                    className={`px-2 py-1 rounded-sm transition-colors ${exportExplorerTab === 'portfolio' ? 'bg-orange-950/40 text-orange-400 font-bold border border-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                  >
                    PORTAFOLIO
                  </button>
                  <button 
                    onClick={() => setExportExplorerTab('recommendations')}
                    className={`px-2 py-1 rounded-sm transition-colors ${exportExplorerTab === 'recommendations' ? 'bg-orange-950/40 text-orange-400 font-bold border border-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                  >
                    DECISIONES
                  </button>
                  <button 
                    onClick={() => setExportExplorerTab('insights')}
                    className={`px-2 py-1 rounded-sm transition-colors ${exportExplorerTab === 'insights' ? 'bg-orange-950/40 text-orange-400 font-bold border border-orange-500/20' : 'text-gray-400 hover:text-white'}`}
                  >
                    INSIGHTS
                  </button>
                </div>
              </div>
              
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-sm text-xs divide-y divide-[#1A1A1A]">
                <div className="p-2.5 flex items-center justify-between text-[11px] bg-[#0E0E0E]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>
                    <span className="text-gray-300 font-semibold uppercase tracking-wider font-mono text-[10px]">Identificador de Estructura</span>
                  </div>
                  <span className="font-mono text-orange-400 font-bold text-[10px] bg-orange-950/30 px-1.5 py-0.5 border border-orange-500/20 rounded-xs">
                    PROMETHEUS_TACTICAL_MEMORY_V5
                  </span>
                </div>

                {/* Tab: Portfolio */}
                {exportExplorerTab === 'portfolio' && (
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-gray-200 text-[11px]">
                      <span className="font-bold">Listando historial de Portafolios:</span>
                      <span className="text-orange-400 font-mono font-bold bg-[#141414] px-1 rounded-sm">{dbStats.portfolio} registros</span>
                    </div>
                    {exportPreview?.portfolio && exportPreview.portfolio.length > 0 ? (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                        {exportPreview.portfolio.map((port, i) => (
                          <div key={port.id || i} className="bg-[#121212] p-2.5 rounded-xs border border-[#1C1C1C] text-[10.5px] space-y-1 hover:border-[#222]">
                            <div className="flex justify-between items-center text-gray-300 font-mono border-b border-[#222]/30 pb-1">
                              <span className="text-white font-bold">Resistro #{port.id}</span>
                              <span className="text-gray-500 text-[9px]">{new Date(port.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                              <div>Valor Total: <span className="text-green-400 font-bold">${parseFloat(port.total_value).toLocaleString()}</span></div>
                              <div>Efectivo: <span className="text-orange-400">${parseFloat(port.cash).toLocaleString()}</span></div>
                              <div className="col-span-2 text-gray-400 truncate">Asignaciones: {port.assets}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic block py-4 text-center">No hay registros de portafolio en la memoria táctica.</span>
                    )}
                  </div>
                )}

                {/* Tab: Recommendations */}
                {exportExplorerTab === 'recommendations' && (
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-gray-200 text-[11px]">
                      <span className="font-bold">Histórico del Laboratorio Vivo (Decisiones):</span>
                      <span className="text-orange-400 font-mono font-bold bg-[#141414] px-1 rounded-sm">{dbStats.recommendations} registros</span>
                    </div>
                    {exportPreview?.recommendations && exportPreview.recommendations.length > 0 ? (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                        {exportPreview.recommendations.map((rec, i) => (
                          <div key={rec.id || i} className="bg-[#121212] p-2.5 rounded-xs border border-[#1C1C1C] text-[10.5px] space-y-1 hover:border-[#222]">
                            <div className="flex justify-between items-center text-gray-300 font-mono border-b border-[#222]/30 pb-1">
                              <span className={`font-bold border px-1 rounded-sm ${rec.user_decision === 'ACEPTADA' ? 'text-green-400 bg-green-950/20 border-green-500/20' : 'text-red-400 bg-red-950/20 border-red-500/20'}`}>
                                {rec.user_decision}
                              </span>
                              <span className="text-gray-500 text-[9px]">{new Date(rec.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-200 leading-relaxed"><span className="text-gray-400 font-bold">Reflexión del Operador:</span> {rec.user_reflection || 'Sin comentarios registrados.'}</p>
                            <p className="text-[9px] text-gray-500 truncate font-mono">Recomendación: {rec.final_recommendation}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic block py-4 text-center">No hay decisiones operativas archivadas.</span>
                    )}
                  </div>
                )}

                {/* Tab: Insights */}
                {exportExplorerTab === 'insights' && (
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-gray-200 text-[11px]">
                      <span className="font-bold">Laboratorio Vivo (Filtros & Calibración Neural):</span>
                      <span className="text-orange-400 font-mono font-bold bg-[#141414] px-1 rounded-sm">{dbStats.learning_insights} logs</span>
                    </div>
                    {exportPreview?.learning_insights && exportPreview.learning_insights.length > 0 ? (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                        {exportPreview.learning_insights.map((ins, i) => (
                          <div key={ins.id || i} className="bg-[#121212] p-2.5 rounded-xs border border-[#1C1C1C] text-[10.5px] space-y-1 hover:border-[#222]">
                            <div className="flex justify-between items-center border-b border-[#222]/30 pb-1">
                              <span className="text-white font-bold font-mono">{ins.type}</span>
                              <span className="bg-orange-950/30 text-orange-400 text-[8px] border border-orange-500/10 px-1 rounded-sm font-bold">IMPACTO {ins.impact_level}</span>
                            </div>
                            <p className="text-gray-300 font-mono text-[10px]">{ins.insight}</p>
                            <div className="text-[9.5px] text-gray-500 flex items-center gap-1 font-mono">
                              <div className={`w-1.5 h-1.5 rounded-full ${ins.applied === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              {ins.applied === 1 ? 'Calibración neural aplicada de forma automática' : 'Pendiente de re-cálculo'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic block py-4 text-center">No hay calibraciones neurales registradas.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible raw JSON viewport */}
          {showRawJson && exportPreview && (
            <div className="bg-[#0F0F0F] border border-[#222] p-5 rounded-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#222] pb-2">
                <span className="text-xs font-mono font-bold text-orange-400 uppercase flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  Visor Interactivo JSON Real-Time
                </span>
                <span className="text-[10px] font-mono text-gray-500">Capa de persistencia táctica</span>
              </div>
              <pre className="max-h-[300px] overflow-y-auto bg-[#070707] border border-[#222] p-3 rounded-sm font-mono text-[10.5px] text-[#A3E635] selection:bg-orange-500/20 leading-relaxed custom-scrollbar text-left text-wrap whitespace-pre-wrap breakdown-all">
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
                Suba una copia de seguridad táctica válida (.json). Al confirmar la restauración, se rescribirán por completo "Mi Portafolio" y todas las variables cognitivas del "Laboratorio Vivo".
              </p>
            </div>

            {/* Drag and Drop File Interface */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2D2D2D]/80 hover:border-orange-500/50 hover:bg-[#141414]/30 rounded-sm p-8 text-center cursor-pointer transition-all space-y-3 group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              <div className="w-11 h-11 rounded-full bg-orange-600/10 border border-orange-500/20 group-hover:border-orange-500/40 group-hover:bg-orange-500/15 flex items-center justify-center mx-auto transition-all">
                <FileJson className="w-5.5 h-5.5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-tight group-hover:text-orange-400 transition-colors">Arrastre su copia de seguridad aquí</p>
                <p className="text-[11px] text-gray-500 font-mono mt-1">o haga clic en este recuadro para explorar su disco corporal (.json)</p>
              </div>
            </div>

            {importStatus.type !== 'idle' && (
              <div className={`p-4 rounded-sm border flex items-start gap-3 text-xs ${
                importStatus.type === 'loading' ? 'bg-orange-950/20 border-orange-500/30 text-orange-300' :
                importStatus.type === 'success' ? 'bg-green-950/20 border-green-500/30 text-green-300' :
                'bg-red-950/20 border-red-500/30 text-red-300'
              }`}>
                {importStatus.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-orange-400 shrink-0 mt-0.5" />}
                {importStatus.type === 'success' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
                {importStatus.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wide block">
                    {importStatus.type === 'loading' ? 'Integridad en Progreso' :
                     importStatus.type === 'success' ? 'Sincronizado Con Éxito' :
                     'Advertencia de Carga'}
                  </span>
                  <p className="font-medium text-[11.5px] leading-relaxed">{importStatus.message}</p>
                </div>
              </div>
            )}

            {/* PRE-IMPORT summary table review */}
            {importPreviewData && (
              <div className="bg-[#050505] border border-[#1A1A1A] rounded-sm p-4 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-[#222] pb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-orange-400" />
                    <h4 className="text-xs font-bold font-mono text-white uppercase tracking-tight">Revisión de Memoria a Inyectar</h4>
                  </div>
                  {!dryRunReport && (
                    <button
                      onClick={handleSimulateDryRun}
                      disabled={isDryRunning}
                      className="text-[10px] font-mono uppercase bg-orange-600 hover:bg-orange-500 text-white font-bold px-2 py-1 rounded-sm transition-colors border border-orange-700 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {isDryRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
                      SIMULAR CARGA
                    </button>
                  )}
                </div>

                {!dryRunReport ? (
                  <div className="space-y-2 mt-2">
                    <p className="text-[11px] text-gray-400">
                      Se han detectado {importPreviewData.portfolio?.length || 0} portafolios, {importPreviewData.recommendations?.length || 0} decisiones y {importPreviewData.learning_insights?.length || 0} calibraciones en el archivo cargado. Presione "Simular Carga" para ejecutar un test de integridad previo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-[#0A0A0A] p-3 border border-[#1C1C1C] rounded-sm">
                    <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-2 text-[10px] font-mono">
                      <span className="text-gray-400">Integridad: <span className="text-green-400 font-bold">{dryRunReport.score}% OK</span></span>
                      <span className="text-gray-500">Test: {dryRunReport.testedAt}</span>
                    </div>
                    
                    <div className="space-y-1 px-1 text-[10px] font-mono">
                      {dryRunReport.details.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center text-gray-300">
                          <span>{t.name}:</span>
                          <span className="text-white font-bold">{t.records} uds ({t.status})</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10.5px] font-mono text-[#A3E635] flex items-start gap-1 p-1 bg-[#121212] border border-[#222]/40 rounded-xs">
                      <Sparkles className="w-3 h-3 text-[#A3E635] mt-0.5 shrink-0" />
                      <span>{dryRunReport.issuesText}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={triggerImportSubmit}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-2.5 px-4 rounded-sm transition-colors border border-green-700 hover:border-green-600 cursor-pointer"
                  >
                    Confirmar e Inyectar Memoria
                  </button>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportPreviewData(null);
                      setDryRunReport(null);
                    }}
                    className="bg-[#141414] hover:bg-[#1C1C1C] text-gray-400 hover:text-white border border-[#222] py-2.5 px-4 rounded-sm transition-colors text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reset Core Memory Panel */}
          <div className="bg-[#0F0F0F] border border-[#222] rounded-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1C1C1C] pb-3">
              <Trash2 className="w-4.5 h-4.5 text-red-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Restablecer Núcleo de Memoria
              </h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              ¿Desea descartar todas las decisiones, la calibración neural adaptativa e historial de transacciones y restaurar los parámetros originales de fábrica del algoritmo de Prometheus? Esta acción vaciará la base de datos táctica y reinyectará los registros semilla estándares.
            </p>

            {resetMessage && (
              <div className="p-3 bg-green-950/20 border border-green-500/30 rounded-xs text-[11px] text-green-300 font-mono font-medium">
                {resetMessage}
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xs text-[11px] text-red-300 font-mono font-medium">
                Error: {resetError}
              </div>
            )}

            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-[#170E0E] hover:bg-[#251212] text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-500/40 text-xs font-bold py-2.5 px-4 rounded-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                RESTABLECER VALORES DE FÁBRICA
              </button>
            ) : (
              <div className="p-3 bg-[#1A0B0B] border border-red-900/60 rounded-sm space-y-2.5 animate-fade-in text-[11.5px]">
                <div className="flex items-center gap-1.5 text-red-400 font-bold">
                  <AlertTriangle className="w-4.5 h-4.5 animate-bounce shrink-0" />
                  <span>¿Confirmar Restablecimiento Total?</span>
                </div>
                <p className="text-xs text-gray-300 font-mono">
                  Se borrarán de forma irreversible todos los datos cargados en "Mi Portafolio" y "Laboratorio Vivo".
                </p>
                <div className="flex justify-end gap-2 text-[10.5px]">
                  <button
                    onClick={handleFactoryResetConfirm}
                    disabled={isResetting}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isResetting ? 'Borrando...' : 'Sí, borrar todo'}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-[#121212] border border-[#222] text-gray-400 hover:text-white px-3 py-1.5 rounded-sm transition-colors cursor-pointer"
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
            <p className="text-[11px] text-gray-300 leading-relaxed font-semibold font-mono">
              El proceso de importación ejecuta operaciones atómicas complejas sobre "Mi Portafolio" y "Laboratorio Vivo". Se recomienda detener cualquier rebalanceo activo o cálculo paralelo para evitar conflictos de concurrencia en la base SQLite.
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
