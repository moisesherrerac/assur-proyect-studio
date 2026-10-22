import React from 'react';
import { routeLength } from '../utils/workspace';
import { distanceLabel } from '../utils/project';
import {
  LayerVisibility,
  LayerLocks,
  CameraDevice,
  ElectricFence,
  NetworkAntenna,
  AudioAlarmDevice,
  WiringRoute,
  CadStructure
} from '../types/cad';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Video,
  Zap,
  Cable,
  Radio,
  Volume2,
  Grid,
  MapPin,
  Tag,
  X,
  Target,
  Pentagon
} from 'lucide-react';

interface LayerManagerPanelProps {
  metersPerUnit?: number;
  isOpen: boolean;
  onClose: () => void;
  layers: LayerVisibility;
  setLayers: React.Dispatch<React.SetStateAction<LayerVisibility>>;
  locks: LayerLocks;
  setLocks: React.Dispatch<React.SetStateAction<LayerLocks>>;
  structures: CadStructure[];
  cameras: CameraDevice[];
  fences: ElectricFence[];
  wiring: WiringRoute[];
  antennas: NetworkAntenna[];
  audioAlarms: AudioAlarmDevice[];
}

export const LayerManagerPanel: React.FC<LayerManagerPanelProps> = ({
  metersPerUnit,
  isOpen,
  onClose,
  layers,
  setLayers,
  locks,
  setLocks,
  structures,
  cameras,
  fences,
  wiring,
  antennas,
  audioAlarms
}) => {
  if (!isOpen) return null;

  const nuevasCount = cameras.filter(c => c.status === 'nueva').length;
  const existCount = cameras.filter(c => c.status !== 'nueva').length;

  const totalFenceUnits = routeLength(fences);
  const totalWireUnits = routeLength(wiring);

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLock = (key: keyof LayerLocks) => {
    setLocks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const showAll = () => {
    setLayers({
      mapBackground: true,
      structures: true,
      grid: true,
      camerasNew: true,
      camerasExisting: true,
      cameraFov: true,
      electricFences: true,
      wiring: true,
      antennas: true,
      audioAlarms: true,
      labels: true
    });
  };

  const hideAllElements = () => {
    setLayers(prev => ({
      ...prev,
      camerasNew: false,
      camerasExisting: false,
      cameraFov: false,
      electricFences: false,
      wiring: false,
      antennas: false,
      audioAlarms: false
    }));
  };

  const isolateLayer = (layerKey: keyof LayerVisibility) => {
    setLayers({
      mapBackground: true,
      structures: layerKey === 'structures',
      grid: true,
      camerasNew: layerKey === 'camerasNew',
      camerasExisting: layerKey === 'camerasExisting',
      cameraFov:
        layerKey === 'cameraFov' || layerKey === 'camerasNew' || layerKey === 'camerasExisting',
      electricFences: layerKey === 'electricFences',
      wiring: layerKey === 'wiring',
      antennas: layerKey === 'antennas',
      audioAlarms: layerKey === 'audioAlarms',
      labels: true
    });
  };

  const layerDefinitions: Array<{
    id: keyof LayerVisibility;
    lockKey?: keyof LayerLocks;
    cadCode: string;
    title: string;
    color: string;
    icon: React.ReactNode;
    countBadge?: string;
  }> = [
    {
      id: 'structures',
      lockKey: 'structures',
      cadCode: 'A-ESTR-PERIM',
      title: 'Perímetros y Estructuras (Editables)',
      color: '#0f172a',
      icon: <Pentagon className="w-3.5 h-3.5" />,
      countBadge: `${structures.length} pol.`
    },
    {
      id: 'camerasNew',
      lockKey: 'cameras',
      cadCode: 'C-CAM-NUEV',
      title: 'Cámaras Nuevas / Proyectadas',
      color: '#0284c7',
      icon: <Video className="w-3.5 h-3.5" />,
      countBadge: `${nuevasCount} uds`
    },
    {
      id: 'camerasExisting',
      lockKey: 'cameras',
      cadCode: 'C-CAM-EXIST',
      title: 'Cámaras Existentes / Otras',
      color: '#dc2626',
      icon: <Video className="w-3.5 h-3.5" />,
      countBadge: `${existCount} uds`
    },
    {
      id: 'cameraFov',
      cadCode: 'C-CAM-FOV',
      title: 'Conos de Visión y Alcance (FOV)',
      color: '#38bdf8',
      icon: <Target className="w-3.5 h-3.5" />,
      countBadge: `${nuevasCount + existCount} conos`
    },
    {
      id: 'electricFences',
      lockKey: 'electricFences',
      cadCode: 'E-FENCE-ELEC',
      title: 'Cerco Eléctrico & Avisos ⚡',
      color: '#d97706',
      icon: <Zap className="w-3.5 h-3.5" />,
      countBadge: distanceLabel(totalFenceUnits, metersPerUnit)
    },
    {
      id: 'wiring',
      lockKey: 'wiring',
      cadCode: 'T-CABL-COND',
      title: 'Canalización Conduit & UTP/FO',
      color: '#10b981',
      icon: <Cable className="w-3.5 h-3.5" />,
      countBadge: distanceLabel(totalWireUnits, metersPerUnit)
    },
    {
      id: 'antennas',
      lockKey: 'antennas',
      cadCode: 'T-WLAN-ANTE',
      title: 'Antenas de Red & Enlaces PTP',
      color: '#2563eb',
      icon: <Radio className="w-3.5 h-3.5" />,
      countBadge: `${antennas.length} uds`
    },
    {
      id: 'audioAlarms',
      lockKey: 'audioAlarms',
      cadCode: 'A-ALRM-AUDI',
      title: 'Bocinas IP, Sirenas & Racks',
      color: '#eab308',
      icon: <Volume2 className="w-3.5 h-3.5" />,
      countBadge: `${audioAlarms.length} uds`
    },
    {
      id: 'labels',
      cadCode: 'G-TEXT-GLOS',
      title: 'Etiquetas & Nomenclatura',
      color: '#334155',
      icon: <Tag className="w-3.5 h-3.5" />,
      countBadge: 'Textos'
    },
    {
      id: 'grid',
      cadCode: 'G-GRID-RETI',
      title: 'Retícula CAD & Coordenadas',
      color: '#64748b',
      icon: <Grid className="w-3.5 h-3.5" />,
      countBadge: distanceLabel(70, metersPerUnit)
    },
    {
      id: 'mapBackground',
      cadCode: 'B-MAPA-BASE',
      title: 'Plano Base / Imagen Maps',
      color: '#94a3b8',
      icon: <MapPin className="w-3.5 h-3.5" />,
      countBadge: 'Base CAD'
    }
  ];

  return (
    <div className="workspace-panel z-40 w-80 shrink-0 bg-white border border-stone-200 border-l shadow-sm overflow-hidden text-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Capas
            </h3>
            <p className="text-[11px] text-slate-500">
              Control independiente de visibilidad y bloqueo
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar capas"
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-stone-200/60 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-stone-200 bg-white text-[11px]">
        <span className="text-[10px] font-semibold text-slate-500 uppercase">Acciones Rápidas:</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={showAll}
            className="px-2.5 py-1 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold transition-colors cursor-pointer"
          >
            Todas ON
          </button>
          <button
            onClick={hideAllElements}
            className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Solo Planta + Estructuras
          </button>
        </div>
      </div>

      {/* Layers List */}
      <div className="p-2.5 overflow-y-auto space-y-1 text-xs">
        {layerDefinitions.map(layer => {
          const isVisible = layers[layer.id];
          const isLocked = layer.lockKey ? locks[layer.lockKey] : false;

          return (
            <div
              key={layer.id}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                isVisible
                  ? 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                  : 'bg-stone-50/20 border-stone-100 opacity-50'
              }`}
            >
              {/* Left: Swatch & Layer Names */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/15"
                  style={{ backgroundColor: layer.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-stone-200/80 text-slate-700 shrink-0">
                      {layer.cadCode}
                    </span>
                    <span
                      className={`text-[11px] font-semibold truncate ${
                        isVisible ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {layer.title}
                    </span>
                  </div>
                  {layer.countBadge && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {layer.countBadge}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => isolateLayer(layer.id)}
                  title="Aislar esta capa (Solo)"
                  className="px-1.5 py-1 text-[10px] font-mono font-semibold text-slate-500 hover:text-sky-700 hover:bg-stone-200/60 rounded transition-colors cursor-pointer"
                >
                  SOLO
                </button>

                {layer.lockKey && (
                  <button
                    type="button"
                    onClick={() => toggleLock(layer.lockKey!)}
                    title={isLocked ? 'Capa bloqueada (no se puede mover)' : 'Bloquear capa'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isLocked
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-stone-200/60'
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => toggleLayer(layer.id)}
                  title={isVisible ? 'Ocultar capa' : 'Mostrar capa'}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isVisible
                      ? 'text-sky-600 bg-sky-50 hover:bg-sky-100'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-stone-200/60'
                  }`}
                >
                  {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>11 Capas CAD Activas</span>
        <span className="text-sky-700 font-semibold">Atajo: Tecla [L]</span>
      </div>
    </div>
  );
};
