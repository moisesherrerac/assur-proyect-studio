import React, { useState } from 'react';
import { CadTheme } from '../types/cad';
import { AssurLogo } from './AssurLogo';
import {
  Eye,
  Grid,
  FileDown,
  Sparkles,
  Layers,
  Upload,
  Magnet,
  Save,
  FolderOpen,
  FilePlus,
  Undo2,
  Redo2,
  CheckCircle2,
  Compass
} from 'lucide-react';

interface ToolbarProps {
  showFov: boolean;
  setShowFov: (show: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  theme: CadTheme;
  setTheme: (theme: CadTheme) => void;
  onOpenConvertModal: () => void;
  onOpenPdfExport: () => void;
  onSaveProjectJson: () => void;
  onLoadProjectJson: () => void;
  onNewProject?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  northAngle?: number;
  onChangeNorthAngle?: (angle: number) => void;
  hasPlanImage?: boolean;
  autosaveStatus?: 'saved' | 'saving' | 'idle';
  onOpenAiAssistant: () => void;
  onToggleLayers: () => void;
  isLayersOpen: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  showFov,
  setShowFov,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  gridSize,
  setGridSize,
  theme,
  setTheme,
  onOpenConvertModal,
  onOpenPdfExport,
  onSaveProjectJson,
  onLoadProjectJson,
  onNewProject,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  northAngle = 0,
  onChangeNorthAngle,
  hasPlanImage = false,
  autosaveStatus = 'idle',
  onOpenAiAssistant,
  onToggleLayers,
  isLayersOpen
}) => {
  const [northMenuOpen, setNorthMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-3 z-40 select-none shadow-xs text-slate-800">
      {/* 1. Costado Izquierdo de Cabecera: Marca Assur Proyect Studio y Acción Principal de Plano */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <AssurLogo className="w-8 h-8 shrink-0 hover:scale-105 transition-transform" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-950 whitespace-nowrap leading-none">
              Assur Proyect Studio
            </span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-purple-700 hidden sm:inline leading-tight mt-0.5">
              CCTV & TELECOMUNICACIONES
            </span>
          </div>
        </div>

        {/* Botón Principal para Adjuntar Plano */}
        <button
          type="button"
          onClick={onOpenConvertModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ml-1"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{hasPlanImage ? 'Cambiar Plano' : 'Adjuntar Plano / Maps'}</span>
        </button>
      </div>

      {/* 2. Centro de Cabecera: Acciones del Proyecto, Guardado y Deshacer/Rehacer */}
      <div className="flex items-center gap-2">
        {/* Acciones de Archivo: Descargar, Abrir, Nuevo */}
        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
          <button
            type="button"
            onClick={onSaveProjectJson}
            title="Descargar archivo editable del proyecto (.cadmap) para continuar editando en cualquier momento"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-white rounded-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 text-purple-700" />
            <span className="hidden md:inline">Descargar (.cadmap)</span>
          </button>

          <button
            type="button"
            onClick={onLoadProjectJson}
            title="Abrir y continuar editando un archivo de proyecto (.cadmap o .json)"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-white rounded-md transition-all cursor-pointer whitespace-nowrap"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden lg:inline">Abrir</span>
          </button>

          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              title="Iniciar un nuevo proyecto en blanco (limpia el plano actual)"
              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-white rounded-md transition-all cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Historial de Cambios: Volver atrás (Deshacer) y Volver adelante (Rehacer) */}
        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Volver atrás / Deshacer último cambio (Ctrl+Z)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              canUndo
                ? 'text-slate-800 hover:text-slate-950 hover:bg-white cursor-pointer shadow-2xs'
                : 'text-slate-300 cursor-not-allowed opacity-40 select-none'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5 text-purple-700" />
            <span className="hidden sm:inline">Deshacer</span>
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Volver adelante / Rehacer cambio (Ctrl+Y o Ctrl+Shift+Z)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              canRedo
                ? 'text-slate-800 hover:text-slate-950 hover:bg-white cursor-pointer shadow-2xs'
                : 'text-slate-300 cursor-not-allowed opacity-40 select-none'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5 text-purple-700" />
            <span className="hidden sm:inline">Rehacer</span>
          </button>
        </div>

        {/* Indicador de Autoguardado en Tiempo Real */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-500">
          {autosaveStatus === 'saving' ? (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Guardando...
            </span>
          ) : autosaveStatus === 'saved' ? (
            <span className="flex items-center gap-1 text-emerald-600 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Autoguardado
            </span>
          ) : (
            <span className="text-slate-400 font-mono text-[10px]">Autoguardado listo</span>
          )}
        </div>
      </div>

      {/* 3. Costado Derecho de Cabecera: Visualización, Grilla, Snap, Norte, Tema & Exportación */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Capas CAD */}
        <button
          type="button"
          onClick={onToggleLayers}
          title="Gestor de Capas CAD (Tecla L)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            isLayersOpen
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-stone-50 border-stone-200 text-slate-700 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-700" />
          <span className="hidden sm:inline">Capas</span>
        </button>

        {/* Conos FOV */}
        <button
          type="button"
          onClick={() => setShowFov(!showFov)}
          title={showFov ? 'Ocultar Conos de Visión' : 'Mostrar Conos de Visión'}
          className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
            showFov
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-stone-50 border-stone-200 text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Retícula */}
        <button
          type="button"
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? 'Ocultar Retícula' : 'Mostrar Retícula'}
          className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
            showGrid
              ? 'bg-purple-50 border-purple-300 text-purple-700'
              : 'bg-stone-50 border-stone-200 text-slate-500 hover:text-slate-800'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Snap-to-Grid Toggle + Selector de Resolución */}
        <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            title="Ajuste a Grilla / Snap-to-Grid (Tecla S)"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              snapToGrid
                ? 'bg-emerald-50 text-emerald-700 border-r border-emerald-200'
                : 'text-slate-500 hover:text-slate-800 border-r border-stone-200'
            }`}
          >
            <Magnet className={`w-3.5 h-3.5 ${snapToGrid ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="hidden md:inline">Snap</span>
          </button>
          <select
            value={gridSize}
            onChange={e => {
              setGridSize(Number(e.target.value));
              if (!snapToGrid) setSnapToGrid(true);
            }}
            title="Resolución del ajuste a grilla (Snap Step)"
            className="bg-transparent px-1.5 py-1.5 text-[11px] font-mono font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value={10}>10px (1m)</option>
            <option value={20}>20px (2m)</option>
            <option value={35}>35px (3.5m)</option>
            <option value={70}>70px (7m)</option>
          </select>
        </div>

        {/* Ajuste de Orientación del Norte en el Plano */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNorthMenuOpen(prev => !prev)}
            title={`Orientación del Norte: ${Math.round(northAngle)}° (Clic para girar la flecha)`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-xs font-semibold text-purple-900 transition-colors cursor-pointer shadow-2xs"
          >
            <Compass
              className="w-3.5 h-3.5 text-purple-700 transition-transform duration-200"
              style={{ transform: `rotate(${northAngle}deg)` }}
            />
            <span className="font-mono text-[11px] font-bold text-purple-950">
              Norte {Math.round(northAngle)}°
            </span>
          </button>

          {northMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 p-3 z-50 text-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-stone-100 pb-1.5">
                <span className="flex items-center gap-1.5 text-purple-700">
                  <Compass className="w-4 h-4" />
                  Orientación Norte
                </span>
                <span className="font-mono text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                  {Math.round(northAngle)}°
                </span>
              </div>

              {/* Slider de ángulo */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0° (N)</span>
                  <span>90° (E)</span>
                  <span>180° (S)</span>
                  <span>270° (O)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  value={northAngle}
                  onChange={e => onChangeNorthAngle?.(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Botones rápidos cardinales */}
              <div className="grid grid-cols-4 gap-1 pt-1 border-t border-stone-100">
                {[
                  { label: 'N 0°', val: 0 },
                  { label: 'E 90°', val: 90 },
                  { label: 'S 180°', val: 180 },
                  { label: 'O 270°', val: 270 },
                  { label: 'NE 45°', val: 45 },
                  { label: 'SE 135°', val: 135 },
                  { label: 'SO 225°', val: 225 },
                  { label: 'NO 315°', val: 315 }
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => {
                      onChangeNorthAngle?.(p.val);
                    }}
                    className={`px-1 py-1 text-[10px] font-mono font-semibold rounded text-center transition-colors cursor-pointer ${
                      Math.round(northAngle) === p.val
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-stone-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selector de Tema CAD */}
        <select
          value={theme}
          onChange={e => setTheme(e.target.value as CadTheme)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer hidden xl:block"
        >
          <option value="technical-orthophoto">Planta Ortofoto Clara (Oficial)</option>
          <option value="orthophoto-hybrid">Ortofoto + Bordes CAD</option>
          <option value="architectural-white">Croquis Papel Blanco</option>
          <option value="autocad-dark">AutoCAD Dark Space</option>
        </select>

        {/* Auditoría IA */}
        <button
          type="button"
          onClick={onOpenAiAssistant}
          title="Auditoría de Ingeniería y Cálculo de Almacenamiento con IA"
          className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-slate-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-purple-700" />
        </button>

        {/* Exportar PDF */}
        <button
          type="button"
          onClick={onOpenPdfExport}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Exportar PDF</span>
        </button>
      </div>
    </header>
  );
};
