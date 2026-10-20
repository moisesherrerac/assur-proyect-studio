import React, { useState } from 'react';
import type { CadTheme } from '../types/cad';
import { AssurLogo } from './AssurLogo';
import { Save, FolderOpen, Upload, Undo2, Redo2, FileDown, FileText, ChevronDown, Ruler } from 'lucide-react';
interface ToolbarProps {
  showFov: boolean; setShowFov: (value: boolean) => void;
  showGrid: boolean; setShowGrid: (value: boolean) => void;
  snapToGrid: boolean; setSnapToGrid: (value: boolean) => void;
  gridSize: number; setGridSize: (value: number) => void;
  theme: CadTheme; setTheme: (value: CadTheme) => void;
  onOpenConvertModal: () => void; onOpenPdfExport: () => void;
  onSaveProjectJson: () => void; onLoadProjectJson: () => void; onNewProject?: () => void;
  onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean;
  northAngle?: number; onChangeNorthAngle?: (value: number) => void;
  hasPlanImage?: boolean; autosaveStatus?: 'saved' | 'saving' | 'idle' | 'partial' | 'error';
  onOpenAiAssistant: () => void; onToggleLayers: () => void; isLayersOpen: boolean;
  onOpenReport: () => void; onCalibrate: () => void; calibrated: boolean;
  pdfFormat: 'a3' | 'a4'; setPdfFormat: (value: 'a3' | 'a4') => void; exporting: boolean;
}
export const Toolbar: React.FC<ToolbarProps> = p => {
  const [viewOpen, setViewOpen] = useState(false);
  return <header className="bg-white border-b border-stone-200 px-3 py-2 z-40 text-slate-800 shrink-0">
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 mr-2"><AssurLogo className="w-7 h-7"/><span className="font-bold text-sm hidden sm:inline">Assur Proyect Studio</span></div>
      <button className="action-button" onClick={p.onOpenConvertModal}><Upload size={16}/>{p.hasPlanImage ? 'Imagen / filtros' : 'Cargar plano'}</button>
      <button className="action-button" onClick={p.onLoadProjectJson}><FolderOpen size={16}/>Abrir</button>
      <button className="action-button" onClick={p.onSaveProjectJson} title="Descargar copia editable .cadmap"><Save size={16}/>Guardar copia</button>
      <div className="flex gap-1">
        <button className="action-button" onClick={p.onUndo} disabled={!p.canUndo} aria-label="Deshacer" title="Deshacer (Ctrl+Z)"><Undo2 size={16}/></button>
        <button className="action-button" onClick={p.onRedo} disabled={!p.canRedo} aria-label="Rehacer" title="Rehacer (Ctrl+Y)"><Redo2 size={16}/></button>
      </div>
      <div className="relative">
        <button className="action-button" onClick={() => setViewOpen(!viewOpen)} aria-expanded={viewOpen}>Vista y opciones<ChevronDown size={14}/></button>
        {viewOpen && <div className="absolute left-0 top-full mt-2 w-72 max-w-[85vw] bg-white border border-stone-300 rounded-xl shadow-lg p-4 space-y-3 text-sm" onKeyDown={e => { if (e.key === 'Escape') {e.stopPropagation(); setViewOpen(false);} }}>
          <button className="action-button w-full" onClick={() => {p.onToggleLayers();setViewOpen(false);}}>{p.isLayersOpen ? 'Cerrar capas' : 'Abrir capas'}</button>
          <label className="flex gap-2"><input type="checkbox" checked={p.showFov} onChange={e=>p.setShowFov(e.target.checked)}/>Mostrar conos de visión</label>
          <label className="flex gap-2"><input type="checkbox" checked={p.showGrid} onChange={e=>p.setShowGrid(e.target.checked)}/>Mostrar retícula</label>
          <label className="flex gap-2"><input type="checkbox" checked={p.snapToGrid} onChange={e=>p.setSnapToGrid(e.target.checked)}/>Ajustar a grilla</label>
          <label className="block">Paso de grilla (unidades)<select className="form-control" value={p.gridSize} onChange={e=>p.setGridSize(Number(e.target.value))}>{[10,20,35,70].map(n=><option key={n} value={n}>{n} u</option>)}</select></label>
          <label className="block">Estilo del plano<select className="form-control" value={p.theme} onChange={e=>p.setTheme(e.target.value as CadTheme)}>
            <option value="technical-orthophoto">Ortofoto clara</option><option value="orthophoto-hybrid">Ortofoto y bordes</option><option value="architectural-white">Papel blanco</option><option value="autocad-dark">Fondo oscuro</option><option value="blueprint-blue">Blueprint azul</option>
          </select></label>
          <label className="block">Norte: {Math.round(p.northAngle || 0)}°<input aria-label="Orientación del norte" className="w-full" type="range" min="0" max="359" value={p.northAngle || 0} onChange={e=>p.onChangeNorthAngle?.(Number(e.target.value))}/></label>
          <button className="action-button w-full" onClick={()=>{p.onCalibrate();setViewOpen(false);}}><Ruler size={16}/>{p.calibrated ? 'Recalibrar distancia' : 'Calibrar distancia'}</button>
          <button className="action-button w-full" onClick={()=>{p.onOpenAiAssistant();setViewOpen(false);}}>Resumen técnico</button>
          <button className="action-button w-full text-red-700" onClick={()=>{p.onNewProject?.();setViewOpen(false);}}>Nuevo proyecto</button>
          <button className="text-xs underline text-slate-600" onClick={()=>setViewOpen(false)}>Cerrar opciones</button>
        </div>}
      </div>
      <div className="flex items-center gap-2 flex-wrap ml-auto">
        <button className="action-button" onClick={p.onOpenReport}><FileText size={16}/>Informe de equipos</button>
        <select aria-label="Tamaño del PDF del plano" className="action-button" value={p.pdfFormat} onChange={e=>p.setPdfFormat(e.target.value as 'a3'|'a4')}><option value="a3">A3</option><option value="a4">A4</option></select>
        <button className="action-button primary" onClick={p.onOpenPdfExport} disabled={p.exporting}><FileDown size={16}/>{p.exporting ? 'Generando…' : 'Plano PDF'}</button>
      </div>
    </div>
  </header>;
};
