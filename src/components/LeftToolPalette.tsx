import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { ActiveTool, CameraInsertionPreset } from '../types/cad';
import { FENCE_PROFILES } from '../utils/fences';
import { CAMERA_CRITERIA_PRESETS } from '../utils/symbology';
import {
  MousePointer,
  Video,
  Radio,
  Volume2,
  Bell,
  Zap,
  Cable,
  Ruler,
  Server,
  Type,
  Pentagon,
  SquareDashedBottom,
  Palette,
  RotateCcw,
  ChevronRight,
  Disc,
  ScanLine,
  RotateCw,
  Compass
} from 'lucide-react';

interface LeftToolPaletteProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  cameraPreset: CameraInsertionPreset;
  setCameraPreset: React.Dispatch<React.SetStateAction<CameraInsertionPreset>>;
  totalDevicesCount: number;
  onClearAllDevices: () => void;
  northAngle?: number;
  onChangeNorthAngle?: (angle: number) => void;
}

export const LeftToolPalette: React.FC<LeftToolPaletteProps> = ({
  activeTool,
  setActiveTool,
  cameraPreset,
  setCameraPreset,
  totalDevicesCount,
  onClearAllDevices,
  northAngle = 0,
  onChangeNorthAngle
}) => {
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [northMenuOpen, setNorthMenuOpen] = useState(false);

  const railRef = useRef<HTMLElement>(null);
  const toolCount = totalDevicesCount > 0 ? 19 : 18;
  const [rows, setRows] = useState(toolCount);
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const fit = () => {
      const cellHeight = Number.parseFloat(getComputedStyle(rail).getPropertyValue('--rail-cell-height')) || 34;
      setRows(Math.max(1, Math.min(toolCount, Math.floor((rail.clientHeight - 12 + 2) / (cellHeight + 2)))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [toolCount]);
  const columns = Math.ceil(toolCount / rows);
  useEffect(() => {
    if (!cameraMenuOpen && !colorMenuOpen && !northMenuOpen) return;
    const close = () => { setCameraMenuOpen(false); setColorMenuOpen(false); setNorthMenuOpen(false); };
    const outside = (event: PointerEvent) => { if (!railRef.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') {event.stopPropagation(); close();} };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [cameraMenuOpen, colorMenuOpen, northMenuOpen]);

  const isCameraActive = activeTool.startsWith('camera-');

  return (
    <aside ref={railRef} aria-label="Herramientas del plano" className="tool-rail bg-white border-r border-stone-200 z-30 select-none shrink-0" style={{ '--rail-rows': rows, '--rail-columns': columns, '--rail-width': `calc(${columns} * var(--rail-cell-width) + ${(columns - 1) * 2 + 8}px)` } as React.CSSProperties}>
      {/* 1. SELECCIÓN */}
      <div className="flex flex-col items-center w-full px-2 mb-2">
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          title="Seleccionar / Mover Equipos / Editar Vértices (Esc)"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'select'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <MousePointer className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Puntero</span>
        </button>
      </div>

      <div data-rail-separator aria-hidden="true" />

      {/* 2. ARQUITECTURA & PERÍMETROS */}
      <div className="flex flex-col items-center w-full px-2 gap-1 mb-2">
        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">PLANO</span>
        
        <button
          type="button"
          onClick={() => setActiveTool('draw-building')}
          title="Trazar Estructura / Nave / Oficina poligonal cerrada (Enter para finalizar)"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'draw-building'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Pentagon className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Estructura</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('draw-perimeter')}
          title="Trazar Perímetro Predial con cotas en metros (Enter para finalizar)"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'draw-perimeter'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <SquareDashedBottom className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Perímetro</span>
        </button>

        {/* Ajuste de Orientación de la Flecha del Norte */}
        <div className="relative w-full mt-1">
          <button
            type="button"
            onClick={() => {
              setNorthMenuOpen(prev => !prev);
              setColorMenuOpen(false);
              setCameraMenuOpen(false);
            }}
            title={`Orientación de la Flecha del Norte: ${Math.round(northAngle)}° (Clic para girar)`}
            className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              northMenuOpen
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs'
            }`}
          >
            <Compass
              className="w-5 h-5 mb-0.5 transition-transform duration-200"
              style={{ transform: `rotate(${northAngle}deg)` }}
            />
            <span className="text-[9px] tracking-tight text-center font-bold leading-tight">
              Norte {Math.round(northAngle)}°
            </span>
          </button>

          {northMenuOpen && (
            <div className="tool-rail-popover absolute left-full top-0 ml-2 w-64 bg-white rounded-xl shadow-2xl border border-purple-200 p-3 z-50 flex flex-col gap-2.5">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-stone-100 pb-1.5">
                <span className="flex items-center gap-1.5 text-purple-700 text-xs font-bold">
                  <Compass className="w-4 h-4" />
                  Girar Flecha del Norte
                </span>
                <span className="font-mono text-purple-800 bg-purple-50 px-2 py-0.5 rounded text-xs font-bold">
                  {Math.round(northAngle)}°
                </span>
              </div>

              {/* Slider de rotación */}
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
                  aria-label="Orientación del norte en herramientas"
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
                    onClick={() => onChangeNorthAngle?.(p.val)}
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
      </div>

      <div data-rail-separator aria-hidden="true" />

      {/* 3. CÁMARAS CCTV */}
      <div className="flex flex-col items-center w-full px-2 gap-1 mb-2 relative">
        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">CCTV</span>

        {/* Botón principal de inserción 1 a 1 de Cámara */}
        <button
          type="button"
          onClick={() => setActiveTool('camera-bullet-new')}
          title="Insertar Cámara 1 a 1 con el color y criterio activo"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
            isCameraActive
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <div className="relative">
            <Video className="w-5 h-5 mb-1" />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow-xs"
              style={{ backgroundColor: cameraPreset.color }}
            />
          </div>
          <span className="text-[10px] tracking-tight text-center leading-tight">Cámara</span>
        </button>

        {/* Selector de Color y Criterio de Simbología */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => {
              setColorMenuOpen(prev => !prev);
              setCameraMenuOpen(false);
            }}
            title="Cambiar Color y Criterio de Cámara (Actualiza la Simbología)"
            className="w-full flex items-center justify-center gap-1 py-1 px-1 rounded-lg border border-stone-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer"
          >
            <span
              className="w-3 h-3 rounded-full border border-stone-300 shadow-2xs"
              style={{ backgroundColor: cameraPreset.color }}
            />
            <Palette className="w-3 h-3 text-slate-500" />
          </button>

          {/* Menú de colores/criterios */}
          {colorMenuOpen && (
            <div className="tool-rail-popover absolute left-full top-0 ml-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 p-2 z-50 flex flex-col gap-1">
              <div className="text-[11px] font-bold text-slate-700 px-2 py-1 border-b border-stone-100">
                Criterio y Color de Cámara
              </div>
              {CAMERA_CRITERIA_PRESETS.map(preset => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => {
                    setCameraPreset(preset);
                    setColorMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    cameraPreset.color === preset.color
                      ? 'bg-purple-50 text-purple-900 font-semibold'
                      : 'hover:bg-stone-100 text-slate-700'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                    style={{ backgroundColor: preset.color }}
                  />
                  <div className="flex flex-col truncate">
                    <span className="text-[11px] font-semibold">{preset.categoryLabel}</span>
                    <span className="text-[9px] text-slate-400 font-mono">Prefijo {preset.prefix}-</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tipos de Cámara secundarios (Domo, PTZ, etc.) */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => {
              setCameraMenuOpen(prev => !prev);
              setColorMenuOpen(false);
            }}
            title="Elegir otros tipos de cámara (Domo, PTZ, Fisheye, etc.)"
            className="w-full flex items-center justify-center py-1 text-[9px] font-semibold text-slate-500 hover:text-purple-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <span>Tipos</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {cameraMenuOpen && (
            <div className="tool-rail-popover absolute left-full top-0 ml-2 w-48 bg-white rounded-xl shadow-xl border border-stone-200 p-1.5 z-50 flex flex-col gap-1 text-xs">
              <div className="text-[11px] font-bold text-slate-700 px-2 py-1 border-b border-stone-100">
                Modelos de Cámara
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('camera-bullet-new');
                  setCameraMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-stone-100 text-slate-700 cursor-pointer"
              >
                <Video className="w-4 h-4 text-sky-600" />
                <span>Bullet Nueva</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('camera-dome');
                  setCameraMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-stone-100 text-slate-700 cursor-pointer"
              >
                <Disc className="w-4 h-4 text-purple-600" />
                <span>Domo Antivandálico</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('camera-ptz');
                  setCameraMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-stone-100 text-slate-700 cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-amber-600" />
                <span>PTZ 360° Zoom</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('camera-fisheye');
                  setCameraMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-stone-100 text-slate-700 cursor-pointer"
              >
                <Disc className="w-4 h-4 text-emerald-600" />
                <span>Fisheye 360°</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('camera-lpr');
                  setCameraMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-stone-100 text-slate-700 cursor-pointer"
              >
                <ScanLine className="w-4 h-4 text-indigo-600" />
                <span>LPR Patentes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('camera-bullet-existing');
                  setCameraMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-stone-100 text-slate-700 cursor-pointer"
              >
                <Video className="w-4 h-4 text-slate-400" />
                <span>Bullet Existente</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div data-rail-separator aria-hidden="true" />

      {/* 4. TELECOMUNICACIONES */}
      <div className="flex flex-col items-center w-full px-2 gap-1 mb-2">
        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">TELECOM</span>

        <button
          type="button"
          onClick={() => setActiveTool('antenna-ptp')}
          title="Antena Enlace Punto a Punto (PTP 5.8 GHz)"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'antenna-ptp'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Radio className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Antena PTP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('antenna-omni')}
          title="Antena Omni / WiFi Sectorial 360°"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'antenna-omni'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Radio className="w-5 h-5 mb-1 text-emerald-600" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Antena Omni</span>
        </button>
      </div>

      <div data-rail-separator aria-hidden="true" />

      {/* 5. AUDIO & SEGURIDAD */}
      <div className="flex flex-col items-center w-full px-2 gap-1 mb-2">
        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">AUDIO</span>

        <button
          type="button"
          onClick={() => setActiveTool('speaker-horn')}
          title="Bocina IP / Altavoz de Voceo y Disuasión"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'speaker-horn'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Volume2 className="w-5 h-5 mb-1 text-amber-600" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Bocina</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('siren-strobe')}
          title="Sirena con Estrobo de Alarma Perimetral"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'siren-strobe'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Bell className="w-5 h-5 mb-1 text-rose-600" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Sirena</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('rack-cabinet')}
          title="Gabinete / Rack de Comunicaciones y CCTV"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'rack-cabinet'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Server className="w-5 h-5 mb-1 text-slate-700" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Rack</span>
        </button>
      </div>

      <div data-rail-separator aria-hidden="true" />

      {/* 6. RED & CERCOS */}
      <div className="flex flex-col items-center w-full px-2 gap-1 mb-2">
        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">RED</span>

        {FENCE_PROFILES.map(profile => <button key={profile.type} type="button"
          onClick={() => setActiveTool(`electric-fence-${profile.type}`)}
          title={`Cerco eléctrico ${profile.label.toLowerCase()}: traza los puntos y pulsa Enter`}
          className={`w-full flex items-center gap-1 rounded-lg ${activeTool === `electric-fence-${profile.type}` ? 'bg-purple-50 border border-purple-300 font-bold' : 'hover:bg-stone-100'}`}>
          <Zap className="w-5 h-5" style={{color:profile.color}}/>
          <span>{profile.type==='madera'?'C. madera':profile.type==='metal'?'C. metálico':'C. muro'}</span>
        </button>)}

        <button
          type="button"
          onClick={() => setActiveTool('wiring-conduit')}
          title="Canalización y Tubería EMT / UTP / Fibra (Enter para finalizar)"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'wiring-conduit'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Cable className="w-5 h-5 mb-1 text-emerald-600" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Trazado</span>
        </button>
      </div>

      <div data-rail-separator aria-hidden="true" />

      {/* 7. HERRAMIENTAS & MEDIDAS */}
      <div className="flex flex-col items-center w-full px-2 gap-1 mb-2">
        <button
          type="button"
          onClick={() => setActiveTool('text-annotation')}
          title="Insertar Rótulo de Texto o Nota Técnica en el Plano"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'text-annotation'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Type className="w-5 h-5 mb-1 text-sky-600" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Texto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('measure')}
          title="Medir Distancia en Planta (Clic punto inicial y final)"
          className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === 'measure'
              ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Ruler className="w-5 h-5 mb-1 text-rose-600" />
          <span className="text-[10px] tracking-tight text-center leading-tight">Medir</span>
        </button>
      </div>

      {/* Limpiar Equipos si existen */}
      {totalDevicesCount > 0 && (
        <div className="mt-auto pt-2 w-full px-2">
          <button
            type="button"
            onClick={onClearAllDevices}
            title={`Limpiar todos los equipos instalados (${totalDevicesCount})`}
            className="w-full flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-semibold text-center leading-tight">Limpiar</span>
          </button>
        </div>
      )}
    </aside>
  );
};
