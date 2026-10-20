import React, { useState } from 'react';
import {
  CameraDevice,
  ElectricFence,
  NetworkAntenna,
  AudioAlarmDevice,
  WiringRoute,
  ProjectMetadata,
  CadTheme,
  CameraInsertionPreset
} from '../types/cad';
import { buildDynamicSymbology } from '../utils/symbology';
import {
  FileText,
  Shield,
  Edit3,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  PenTool,
  Printer,
  FileSpreadsheet,
  Save,
  Compass
} from 'lucide-react';

interface EngineeringSidePanelProps {
  cameras: CameraDevice[];
  antennas: NetworkAntenna[];
  audioAlarms: AudioAlarmDevice[];
  fences: ElectricFence[];
  wiring: WiringRoute[];
  structuresCount: number;
  cameraPreset: CameraInsertionPreset;
  metadata: ProjectMetadata;
  setMetadata: React.Dispatch<React.SetStateAction<ProjectMetadata>>;
  theme: CadTheme;
  onOpenSignatureModal: () => void;
  onExportPdf: () => void;
  onSaveProjectJson?: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const EngineeringSidePanel: React.FC<EngineeringSidePanelProps> = ({
  cameras,
  antennas,
  audioAlarms,
  fences,
  structuresCount,
  cameraPreset,
  metadata,
  setMetadata,
  onOpenSignatureModal,
  onExportPdf,
  onSaveProjectJson,
  isOpen,
  setIsOpen
}) => {
  const [activeTab, setActiveTab] = useState<'glosas' | 'notas' | 'resumen'>('glosas');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotesText, setTempNotesText] = useState(metadata.projectNotes.join('\n'));

  const { rows: dynamicSymRows } = buildDynamicSymbology(
    cameras,
    audioAlarms,
    antennas,
    fences,
    structuresCount,
    cameraPreset
  );

  const handleSaveNotes = () => {
    const lines = tempNotesText.split('\n').filter(l => l.trim().length > 0);
    setMetadata(prev => ({ ...prev, projectNotes: lines }));
    setIsEditingNotes(false);
  };

  return (
    <div
      className={`relative bg-white border-l border-stone-200 flex flex-col h-full transition-all duration-200 z-30 shadow-md text-slate-800 ${
        isOpen ? 'w-80' : 'w-10'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Contraer Editor de Viñeta' : 'Editar Datos de Viñeta y Simbología'}
        className="absolute -left-3.5 top-12 z-40 w-7 h-7 bg-white border border-stone-300 hover:border-sky-500 text-sky-600 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 cursor-pointer"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {!isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          className="flex-1 flex flex-col items-center py-6 gap-8 select-none cursor-pointer hover:bg-stone-50"
        >
          <div className="transform -rotate-90 origin-center text-xs font-mono font-bold tracking-widest text-slate-600 whitespace-nowrap mt-16">
            VIÑETA Y SIMBOLOGÍA
          </div>
          <FileText className="w-4 h-4 text-sky-600 mt-16" />
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-3.5 border-b border-stone-200 bg-stone-50">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  Cajetín y Simbología
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sincronizado en vivo con la lámina CAD
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex gap-1.5">
              <button
                onClick={onExportPdf}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </button>
              {onSaveProjectJson && (
                <button
                  onClick={onSaveProjectJson}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Descargar archivo editable del proyecto (.cadmap)"
                >
                  <Save className="w-3.5 h-3.5 text-sky-600" />
                  <span>.cadmap</span>
                </button>
              )}
              <button
                onClick={onOpenSignatureModal}
                className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                title="Firmar o sellar plano"
              >
                <PenTool className="w-3.5 h-3.5 text-sky-600" />
                <span>Firma</span>
              </button>
            </div>
          </div>

          <div className="flex border-b border-stone-200 bg-stone-50/60 text-xs">
            <button
              onClick={() => setActiveTab('glosas')}
              className={`flex-1 py-2 px-2 text-center font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'glosas'
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Viñeta / Glosas
            </button>
            <button
              onClick={() => setActiveTab('resumen')}
              className={`flex-1 py-2 px-2 text-center font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'resumen'
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Simbología ({cameras.length})
            </button>
            <button
              onClick={() => setActiveTab('notas')}
              className={`flex-1 py-2 px-2 text-center font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'notas'
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Notas
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {activeTab === 'glosas' && (
              <div className="space-y-3">
                {/* Control de Orientación del Norte en el Plano */}
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-purple-700" />
                      Orientación del Norte (Lámina)
                    </span>
                    <span className="font-mono font-bold text-purple-800 bg-white border border-purple-200 px-2 py-0.5 rounded text-[11px]">
                      {Math.round(metadata.northAngle || 0)}°
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={metadata.northAngle || 0}
                    onChange={e =>
                      setMetadata(prev => ({ ...prev, northAngle: Number(e.target.value) }))
                    }
                    className="w-full accent-purple-600 cursor-pointer"
                  />

                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[
                      { label: 'N 0°', val: 0 },
                      { label: 'E 90°', val: 90 },
                      { label: 'S 180°', val: 180 },
                      { label: 'O 270°', val: 270 }
                    ].map(btn => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() =>
                          setMetadata(prev => ({ ...prev, northAngle: btn.val }))
                        }
                        className={`py-1 text-[10px] font-mono font-semibold rounded text-center transition-colors cursor-pointer ${
                          Math.round(metadata.northAngle || 0) === btn.val
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-white hover:bg-purple-100 text-purple-900 border border-purple-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Empresa / Firma Proyectista (Banner Cajetín)
                  </label>
                  <input
                    type="text"
                    value={metadata.engineerCompany}
                    onChange={e =>
                      setMetadata(prev => ({ ...prev, engineerCompany: e.target.value }))
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Proyecto
                  </label>
                  <input
                    type="text"
                    value={metadata.projectName}
                    onChange={e =>
                      setMetadata(prev => ({ ...prev, projectName: e.target.value }))
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Cliente / Mandante
                  </label>
                  <input
                    type="text"
                    value={metadata.clientName}
                    onChange={e =>
                      setMetadata(prev => ({ ...prev, clientName: e.target.value }))
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Contenido de Lámina
                  </label>
                  <input
                    type="text"
                    value={metadata.location}
                    onChange={e => setMetadata(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Título Inferior de Planta
                  </label>
                  <input
                    type="text"
                    value={
                      metadata.drawingTitle ||
                      'PLANTA GENERAL - UBICACIÓN DE CÁMARAS CCTV Y BOCINAS'
                    }
                    onChange={e =>
                      setMetadata(prev => ({ ...prev, drawingTitle: e.target.value }))
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Lámina N°
                    </label>
                    <input
                      type="text"
                      value={metadata.sheetNumber}
                      onChange={e =>
                        setMetadata(prev => ({ ...prev, sheetNumber: e.target.value }))
                      }
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Revisión
                    </label>
                    <input
                      type="text"
                      value={metadata.revision}
                      onChange={e => setMetadata(prev => ({ ...prev, revision: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Escala
                    </label>
                    <input
                      type="text"
                      value={metadata.scale}
                      onChange={e => setMetadata(prev => ({ ...prev, scale: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-slate-900 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Fecha
                    </label>
                    <input
                      type="text"
                      value={metadata.date}
                      onChange={e => setMetadata(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notas' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase text-[11px]">
                    Notas del Cajetín Lateral
                  </span>
                  {!isEditingNotes ? (
                    <button
                      onClick={() => {
                        setTempNotesText(metadata.projectNotes.join('\n'));
                        setIsEditingNotes(true);
                      }}
                      className="flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveNotes}
                      className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                  )}
                </div>

                {!isEditingNotes ? (
                  <div className="space-y-2 text-[11px] text-slate-700 font-mono">
                    {metadata.projectNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={10}
                    value={tempNotesText}
                    onChange={e => setTempNotesText(e.target.value)}
                    className="w-full bg-stone-50 border border-sky-400 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                )}
              </div>
            )}

            {activeTab === 'resumen' && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                    <span>Simbología Dinámica del Plano</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">CANT.</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  {dynamicSymRows.map(row => (
                    <div
                      key={row.id}
                      className="flex justify-between items-center py-1 border-b border-stone-200/60 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{row.title}</div>
                          <div className="text-[10px] text-slate-500 truncate">{row.subtitle}</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 ml-2 tabular-nums">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
