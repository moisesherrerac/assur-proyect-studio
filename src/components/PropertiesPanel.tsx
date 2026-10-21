import React from 'react';
import { distanceLabel } from '../utils/project';
import {
  CameraDevice,
  DeviceType,
  ElectricFence,
  NetworkAntenna,
  AudioAlarmDevice,
  WiringRoute,
  PlanAnnotation,
  CadStructure,
  StructureType,
  CadLineStyle,
  CadHatchPattern,
  CameraInsertionPreset
} from '../types/cad';
import { FENCE_PROFILES } from '../utils/fences';
import { CAMERA_CRITERIA_PRESETS, getCameraDefaultCriterion } from '../utils/symbology';
import {
  Video,
  Radio,
  Volume2,
  Zap,
  Cable,
  Trash2,
  X,
  Palette,
  Eye,
  RotateCw,
  Type,
  Pentagon,
  Ruler,
  CornerDownRight,
  Check
} from 'lucide-react';

interface PropertiesPanelProps {
  metersPerUnit?: number;
  selectedId: string | null;
  onClose: () => void;
  cameraPreset: CameraInsertionPreset;
  setCameraPreset: React.Dispatch<React.SetStateAction<CameraInsertionPreset>>;
  structures: CadStructure[];
  setStructures: React.Dispatch<React.SetStateAction<CadStructure[]>>;
  cameras: CameraDevice[];
  setCameras: React.Dispatch<React.SetStateAction<CameraDevice[]>>;
  antennas: NetworkAntenna[];
  setAntennas: React.Dispatch<React.SetStateAction<NetworkAntenna[]>>;
  audioAlarms: AudioAlarmDevice[];
  setAudioAlarms: React.Dispatch<React.SetStateAction<AudioAlarmDevice[]>>;
  fences: ElectricFence[];
  setFences: React.Dispatch<React.SetStateAction<ElectricFence[]>>;
  wiring: WiringRoute[];
  setWiring: React.Dispatch<React.SetStateAction<WiringRoute[]>>;
  annotations?: PlanAnnotation[];
  setAnnotations?: React.Dispatch<React.SetStateAction<PlanAnnotation[]>>;
}

const STRUCTURE_COLORS = [
  { name: 'Grafito Técnico CAD', hex: '#0f172a' },
  { name: 'Gris Estructural', hex: '#334155' },
  { name: 'Azul Cian Técnico', hex: '#0284c7' },
  { name: 'Rojo Deslinde / Límite', hex: '#dc2626' },
  { name: 'Verde Área Industrial', hex: '#16a34a' },
  { name: 'Ámbar Perímetro', hex: '#d97706' }
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  metersPerUnit,
  selectedId,
  onClose,
  setCameraPreset,
  structures,
  setStructures,
  cameras,
  setCameras,
  antennas,
  setAntennas,
  audioAlarms,
  setAudioAlarms,
  fences,
  setFences,
  wiring,
  setWiring,
  annotations = [],
  setAnnotations
}) => {
  if (!selectedId) return null;

  const currentStruct = structures.find(s => s.id === selectedId);
  const currentCam = cameras.find(c => c.id === selectedId);
  const currentAnt = antennas.find(a => a.id === selectedId);
  const currentAud = audioAlarms.find(a => a.id === selectedId);
  const currentFence = fences.find(f => f.id === selectedId);
  const currentWire = wiring.find(w => w.id === selectedId);
  const currentAnn = annotations.find(a => a.id === selectedId);

  if (
    !currentStruct &&
    !currentCam &&
    !currentAnt &&
    !currentAud &&
    !currentFence &&
    !currentWire &&
    !currentAnn
  ) {
    return null;
  }

  const updateStructure = (fields: Partial<CadStructure>) => {
    setStructures(prev => prev.map(s => (s.id === selectedId ? { ...s, ...fields } : s)));
  };

  const updateCamera = (fields: Partial<CameraDevice>) => {
    setCameras(prev => prev.map(c => (c.id === selectedId ? { ...c, ...fields } : c)));
  };

  const deleteItem = () => {
    if (currentStruct) setStructures(prev => prev.filter(s => s.id !== selectedId));
    if (currentCam) setCameras(prev => prev.filter(c => c.id !== selectedId));
    if (currentAnt) setAntennas(prev => prev.filter(a => a.id !== selectedId));
    if (currentAud) setAudioAlarms(prev => prev.filter(a => a.id !== selectedId));
    if (currentFence) setFences(prev => prev.filter(f => f.id !== selectedId));
    if (currentWire) setWiring(prev => prev.filter(w => w.id !== selectedId));
    if (currentAnn && setAnnotations) {
      setAnnotations(prev => prev.filter(a => a.id !== selectedId));
    }
    onClose();
  };

  let structPerimeterMeters = 0;
  if (currentStruct && currentStruct.points.length >= 2) {
    const pts = currentStruct.points;
    const segCount = currentStruct.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < segCount; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      structPerimeterMeters += Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
  }

  return (
    <div className="w-80 bg-white border-l border-stone-200 flex flex-col h-full overflow-y-auto text-slate-800 shadow-lg z-20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50/90 sticky top-0 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          {currentStruct && <Pentagon className="w-4 h-4 text-sky-600 shrink-0" />}
          {currentCam && <Video className="w-4 h-4 text-sky-600 shrink-0" />}
          {currentAnt && <Radio className="w-4 h-4 text-blue-600 shrink-0" />}
          {currentAud && <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />}
          {currentFence && <Zap className="w-4 h-4 text-amber-600 shrink-0" />}
          {currentWire && <Cable className="w-4 h-4 text-emerald-600 shrink-0" />}
          {currentAnn && <Type className="w-4 h-4 text-sky-600 shrink-0" />}
          <span className="font-bold text-xs tracking-wide uppercase text-slate-800 truncate">
            {currentStruct
              ? 'Estructura / Perímetro CAD'
              : currentCam
              ? `Cámara ${currentCam.label}`
              : currentAud
              ? `Equipo ${currentAud.label}`
              : currentAnn
              ? 'Rótulo de Planta'
              : 'Propiedades'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={deleteItem}
            title="Eliminar elemento (Supr)"
            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* ============================================================
            EDITABLE CAD FLOOR PLAN STRUCTURE / PERIMETER INSPECTOR
           ============================================================ */}
        {currentStruct && (
          <>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900 flex items-start gap-2">
              <CornerDownRight className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Geometría CAD Editable:</span> Arrastra los cuadros
                azules en el plano para mover esquinas, o haz clic en{' '}
                <span className="font-mono font-bold text-sky-700">(+)</span> para añadir nuevos
                vértices.
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nombre en Planta (Etiqueta)
              </label>
              <input
                type="text"
                value={currentStruct.label}
                onChange={e => updateStructure({ label: e.target.value })}
                placeholder="Ej. NAVE PRINCIPAL / PERÍMETRO"
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tipo de Trazo
                </label>
                <select
                  value={currentStruct.type}
                  onChange={e => {
                    const nextType = e.target.value as StructureType;
                    updateStructure({
                      type: nextType,
                      lineStyle:
                        nextType === 'perimeter'
                          ? 'dash-dot'
                          : nextType === 'wall'
                          ? 'dashed'
                          : 'solid',
                      hatchPattern: nextType === 'building' ? 'roof-lines' : 'none',
                      fillOpacity: nextType === 'building' ? 0.26 : 0.04
                    });
                  }}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="building">Edificación / Nave</option>
                  <option value="perimeter">Perímetro / Deslinde</option>
                  <option value="wall">Muro / Eje Interior</option>
                  <option value="road">Patio / Vialidad</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Estilo de Línea CAD
                </label>
                <select
                  value={currentStruct.lineStyle}
                  onChange={e => updateStructure({ lineStyle: e.target.value as CadLineStyle })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="solid">Continua (Muro)</option>
                  <option value="dash-dot">Trazo-Punto (Perímetro)</option>
                  <option value="dashed">Segmentada (Cumbrera)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-600">
                  Color de Línea Estructural
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  {currentStruct.strokeColor}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {STRUCTURE_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => updateStructure({ strokeColor: c.hex })}
                    title={c.name}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
                      currentStruct.strokeColor === c.hex
                        ? 'border-sky-600 scale-110 shadow-xs'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <label
                  title="Color personalizado"
                  className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center cursor-pointer hover:border-stone-400 bg-stone-100 text-[10px] text-slate-700"
                >
                  +
                  <input
                    type="color"
                    value={currentStruct.strokeColor}
                    onChange={e => updateStructure({ strokeColor: e.target.value })}
                    className="opacity-0 w-0 h-0"
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                <span>Espesor de Muro / Perímetro</span>
                <span className="font-mono font-semibold text-sky-700">
                  {currentStruct.strokeWidth} px
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="0.2"
                value={currentStruct.strokeWidth}
                onChange={e => updateStructure({ strokeWidth: Number(e.target.value) })}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Achurado Arquitectónico de Planta
                </label>
                <select
                  value={currentStruct.hatchPattern}
                  onChange={e =>
                    updateStructure({ hatchPattern: e.target.value as CadHatchPattern })
                  }
                  className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="roof-lines">Líneas de Techumbre Industrial</option>
                  <option value="diagonal">Achurado Diagonal CAD (45°)</option>
                  <option value="solid-light">Sombreado Arquitectónico Suave</option>
                  <option value="none">Sin Achurado (Transparente)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Contraste de Superficie Interna</span>
                  <span className="font-mono font-semibold text-sky-700">
                    {Math.round(currentStruct.fillOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.04"
                  value={currentStruct.fillOpacity}
                  onChange={e => updateStructure({ fillOpacity: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-700 flex items-center gap-1.5 font-medium">
                  <Ruler className="w-3.5 h-3.5 text-sky-600" />
                  <span>Mostrar Cotas en Metros</span>
                </span>
                <input
                  type="checkbox"
                  checked={currentStruct.showDimensions ?? false}
                  onChange={e => updateStructure({ showDimensions: e.target.checked })}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-700 font-medium">
                  Cerrar Polígono Perimetral
                </span>
                <input
                  type="checkbox"
                  checked={currentStruct.closed}
                  onChange={e => updateStructure({ closed: e.target.checked })}
                  className="w-4 h-4 accent-sky-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-[11px] font-mono">
              <span className="text-slate-600">
                Vértices: <strong className="text-slate-900">{currentStruct.points.length}</strong>
              </span>
              <span className="text-sky-700 font-semibold">
                Perímetro: <strong>{distanceLabel(structPerimeterMeters, metersPerUnit)}</strong>
              </span>
            </div>

            {currentStruct.points.length > 3 && (
              <button
                type="button"
                onClick={() =>
                  updateStructure({
                    points: currentStruct.points.slice(0, currentStruct.points.length - 1)
                  })
                }
                className="w-full py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Deshacer último vértice ({currentStruct.points.length} →{' '}
                {currentStruct.points.length - 1})
              </button>
            )}
          </>
        )}

        {/* ============================================================
            CAMERA INSPECTOR (WITH DYNAMIC SYMBOLOGY COLOR & CRITERION)
           ============================================================ */}
        {currentCam && (
          <>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-600" />
                  <span>Criterio y Color en Simbología</span>
                </label>
                <span className="text-[10px] font-mono text-slate-500">{currentCam.color}</span>
              </div>

              <div className="space-y-1">
                {CAMERA_CRITERIA_PRESETS.map(preset => {
                  const isCurrent =
                    currentCam.color.toLowerCase() === preset.color.toLowerCase() &&
                    getCameraDefaultCriterion(currentCam) === preset.categoryLabel;
                  return (
                    <button
                      key={preset.prefix + preset.color}
                      type="button"
                      onClick={() => {
                        const numPart = currentCam.label.split('-')[1] || '01';
                        updateCamera({
                          color: preset.color,
                          status: preset.status,
                          categoryLabel: preset.categoryLabel,
                          label: `${preset.prefix}-${numPart}`
                        });
                        setCameraPreset(preset);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold shadow-2xs'
                          : 'bg-white border-stone-200/80 text-slate-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span className="truncate">{preset.categoryLabel}</span>
                      </div>
                      {isCurrent ? (
                        <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {preset.prefix}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color & Custom Symbology Criterion */}
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                  Color o Criterio Personalizado (Se refleja en Simbología):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentCam.color}
                    onChange={e => {
                      const newColor = e.target.value;
                      updateCamera({ color: newColor });
                      setCameraPreset(prev => ({ ...prev, color: newColor }));
                    }}
                    className="w-8 h-8 rounded cursor-pointer border border-stone-300 shrink-0"
                    title="Cambiar color de cámara y actualizar Simbología"
                  />
                  <input
                    type="text"
                    value={currentCam.categoryLabel ?? getCameraDefaultCriterion(currentCam)}
                    onChange={e => {
                      const val = e.target.value;
                      updateCamera({ categoryLabel: val });
                      setCameraPreset(prev => ({ ...prev, categoryLabel: val }));
                    }}
                    placeholder="Ej. FASE 2 / PERIMETRAL"
                    className="flex-1 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tag & Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Código (Tag)
                </label>
                <input
                  type="text"
                  value={currentCam.label}
                  onChange={e => updateCamera({ label: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tipo Símbolo
                </label>
                <select
                  value={currentCam.type}
                  onChange={e => updateCamera({ type: e.target.value as DeviceType })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-none cursor-pointer"
                >
                  <option value="camera-bullet">Cámara Bullet</option>
                  <option value="camera-ptz">Domo PTZ 360°</option>
                  <option value="camera-dome">Domo Fijo</option>
                  <option value="camera-lpr">Cámara LPR</option>
                </select>
              </div>
            </div>

            {/* FOV Cone & Rotation */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Campo Visual (FOV)</span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-sky-700">
                  {currentCam.rotation}°
                </span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Orientación (Giro)</span>
                  <span className="font-mono">{currentCam.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={currentCam.rotation}
                  onChange={e => updateCamera({ rotation: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              {currentCam.type !== 'camera-ptz' && (
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>Ángulo de Apertura</span>
                    <span className="font-mono">{currentCam.fovAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="110"
                    value={currentCam.fovAngle}
                    onChange={e => updateCamera({ fovAngle: Number(e.target.value) })}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                  <span>Alcance de Cono Visual</span>
                  <span className="font-mono">{distanceLabel(currentCam.range, metersPerUnit)} (referencial)</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="180"
                  value={currentCam.range}
                  onChange={e => updateCamera({ range: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
          </>
        )}

        {/* Audio / Speaker Properties */}
        {currentAud && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Código Etiqueta (Ej. BO-01)
              </label>
              <input
                type="text"
                value={currentAud.label}
                onChange={e =>
                  setAudioAlarms(prev =>
                    prev.map(a => (a.id === selectedId ? { ...a, label: e.target.value } : a))
                  )
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Color de Equipo
              </label>
              <input
                type="color"
                value={currentAud.color || '#eab308'}
                onChange={e =>
                  setAudioAlarms(prev =>
                    prev.map(a => (a.id === selectedId ? { ...a, color: e.target.value } : a))
                  )
                }
                className="w-10 h-8 rounded cursor-pointer border border-stone-300"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  <span>Orientación de Bocina</span>
                </span>
                <span className="font-mono">{currentAud.rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={currentAud.rotation}
                onChange={e =>
                  setAudioAlarms(prev =>
                    prev.map(a =>
                      a.id === selectedId ? { ...a, rotation: Number(e.target.value) } : a
                    )
                  )
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Plan Text Annotation Properties */}
        {currentAnn && setAnnotations && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Texto del Rótulo en Planta
              </label>
              <input
                type="text"
                value={currentAnn.text}
                onChange={e =>
                  setAnnotations(prev =>
                    prev.map(a => (a.id === selectedId ? { ...a, text: e.target.value } : a))
                  )
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                Orientación del Rótulo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAnnotations(prev =>
                      prev.map(a => (a.id === selectedId ? { ...a, vertical: false } : a))
                    )
                  }
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                    !currentAnn.vertical
                      ? 'bg-sky-50 border-sky-400 text-sky-700'
                      : 'bg-stone-50 border-stone-200 text-slate-600'
                  }`}
                >
                  Horizontal (0°)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAnnotations(prev =>
                      prev.map(a => (a.id === selectedId ? { ...a, vertical: true } : a))
                    )
                  }
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                    currentAnn.vertical
                      ? 'bg-sky-50 border-sky-400 text-sky-700'
                      : 'bg-stone-50 border-stone-200 text-slate-600'
                  }`}
                >
                  Vertical (90°)
                </button>
              </div>
            </div>
          </>
        )}

        {/* Antenna Properties */}
        {currentAnt && (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Etiqueta de Antena
              </label>
              <input
                type="text"
                value={currentAnt.label}
                onChange={e =>
                  setAntennas(prev =>
                    prev.map(a => (a.id === selectedId ? { ...a, label: e.target.value } : a))
                  )
                }
                className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                <span>Orientación</span>
                <span className="font-mono">{currentAnt.rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={currentAnt.rotation}
                onChange={e =>
                  setAntennas(prev =>
                    prev.map(a =>
                      a.id === selectedId ? { ...a, rotation: Number(e.target.value) } : a
                    )
                  )
                }
                className="w-full accent-sky-600"
              />
            </div>
          </>
        )}

        {/* Fence Properties */}
        {currentFence && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-3">Tipo de soporte
              <select className="form-control" value={currentFence.mountingType || ''} onChange={e=>{
                const profile=FENCE_PROFILES.find(p=>p.type===e.target.value);
                if(profile)setFences(prev=>prev.map(f=>f.id===selectedId?{...f,mountingType:profile.type,color:profile.color}:f));
              }}>
                {!currentFence.mountingType&&<option value="">Sin especificar (plano anterior)</option>}
                {FENCE_PROFILES.map(p=><option key={p.type} value={p.type}>{p.label}</option>)}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Zona de Cerco Eléctrico
            </label>
            <input
              type="text"
              value={currentFence.label}
              onChange={e =>
                setFences(prev =>
                  prev.map(f => (f.id === selectedId ? { ...f, label: e.target.value } : f))
                )
              }
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>
        )}

        {/* Wire Properties */}
        {currentWire && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Etiqueta de Canalización
            </label>
            <input
              type="text"
              value={currentWire.label}
              onChange={e =>
                setWiring(prev =>
                  prev.map(w => (w.id === selectedId ? { ...w, label: e.target.value } : w))
                )
              }
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};
