import React, { useState, useEffect } from 'react';
import { ImageFilterSettings, CadTheme, CadStructure } from '../types/cad';
import { processImageToCad } from '../utils/cadFilter';
import { getPresetSampleMaps, SampleMap } from '../utils/samples';
import {
  autoVectorizeStructuresFromImage,
  getInitialIndustrialStructures
} from '../utils/structureVectorizer';
import {
  Upload,
  Sliders,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Image as ImageIcon,
  Eye,
  Pentagon
} from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawImageSrc: string | null;
  setRawImageSrc: (src: string | null) => void;
  filterSettings: ImageFilterSettings;
  setFilterSettings: React.Dispatch<React.SetStateAction<ImageFilterSettings>>;
  onApplyCadImage: (cadDataUrl: string, detectedStructures?: CadStructure[]) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  rawImageSrc,
  setRawImageSrc,
  filterSettings,
  setFilterSettings,
  onApplyCadImage
}) => {
  const [localSettings, setLocalSettings] = useState<ImageFilterSettings>(filterSettings);
  const [previewCadUrl, setPreviewCadUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sampleMaps, setSampleMaps] = useState<SampleMap[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'tune'>('upload');
  const [autoTraceStructures, setAutoTraceStructures] = useState<boolean>(true);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [detectedPreviewStructures, setDetectedPreviewStructures] = useState<CadStructure[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSampleMaps(getPresetSampleMaps());
      setLocalSettings(filterSettings);
    }
  }, [isOpen, filterSettings]);

  useEffect(() => {
    if (!rawImageSrc) return;

    let isMounted = true;
    setIsProcessing(true);

    const timer = setTimeout(async () => {
      try {
        const img = new Image();
        img.src = rawImageSrc;
        await img.decode();
        const cadResult = await processImageToCad(img, localSettings, 950, 620);
        let structs: CadStructure[] = [];
        if (autoTraceStructures) {
          structs = await autoVectorizeStructuresFromImage(rawImageSrc);
        }
        if (isMounted) {
          setPreviewCadUrl(cadResult);
          setDetectedPreviewStructures(structs);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Error filtering image', err);
        if (isMounted) setIsProcessing(false);
      }
    }, 90);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [rawImageSrc, localSettings, autoTraceStructures, selectedSampleId]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      setSelectedSampleId(null);
      setRawImageSrc(result);
      setActiveTab('tune');
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = event => {
            setSelectedSampleId(null);
            setRawImageSrc(event.target?.result as string);
            setActiveTab('tune');
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }
  };

  const handleApply = async () => {
    setFilterSettings(localSettings);
    if (rawImageSrc) {
      const img = new Image();
      img.src = rawImageSrc;
      await img.decode();
      const fullCad = await processImageToCad(img, localSettings);
      onApplyCadImage(fullCad, autoTraceStructures ? detectedPreviewStructures : []);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onPaste={handlePaste}
    >
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Importar Captura de Google Maps a Plano de Planta CAD
              </h3>
              <p className="text-xs text-slate-500">
                El plano se carga limpio (sin cámaras precargadas) y con estructuras editables para que ubiques tus equipos uno a uno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-stone-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50/60 px-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Subir Captura de Google Maps</span>
          </button>
          <button
            onClick={() => setActiveTab('tune')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'tune'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. Ajustar Claridad y Perímetros</span>
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'samples'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Plantas de Ejemplo</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 bg-white">
          <div className="w-full md:w-84 flex flex-col gap-4">
            <label className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 flex items-start gap-3 cursor-pointer hover:bg-sky-50 transition-colors">
              <input
                type="checkbox"
                checked={autoTraceStructures}
                onChange={e => setAutoTraceStructures(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-sky-600 cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-sky-900 flex items-center gap-1.5">
                  <Pentagon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Trazar Perímetros y Estructuras Editables</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Superpone líneas CAD de deslinde perimetral y estructuras de construcción para editar sus esquinas.
                </p>
              </div>
            </label>

            {activeTab === 'upload' && (
              <div className="space-y-4">
                <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-stone-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100/80 border border-sky-200 flex items-center justify-center text-sky-600 mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 mb-1">
                    Haz clic para cargar tu captura de Google Maps
                  </span>
                  <span className="text-[11px] text-slate-500 mb-3">
                    Soporta PNG, JPG o WebP en alta resolución
                  </span>
                  <span className="text-[10px] text-sky-700 font-mono bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                    También puedes presionar Ctrl+V para pegar
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">
                    Lienzo Limpio sin Cámaras Precargadas:
                  </div>
                  <p className="leading-relaxed">
                    Al aplicar tu plano, se carga sin equipos preubicados para que puedas ir situando tus cámaras una a una con el color y criterio que elijas.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'samples' && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Seleccionar Planta Base (Se cargará sin cámaras):
                </span>
                {sampleMaps.map(sample => (
                  <div
                    key={sample.id}
                    onClick={() => {
                      setSelectedSampleId(sample.id);
                      setRawImageSrc(sample.dataUrl);
                      setActiveTab('tune');
                    }}
                    className="p-3 bg-stone-50 border border-stone-200 hover:border-sky-400 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="font-semibold text-xs text-slate-900 group-hover:text-sky-700">
                      {sample.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{sample.description}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tune' && (
              <div className="space-y-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Modo de Base de Planta
                  </label>
                  <div className="space-y-1.5">
                    {[
                      {
                        id: 'technical-orthophoto' as CadTheme,
                        label: 'Ortofoto Técnica Gris Claro (Lámina Oficial)',
                        desc: 'Base satelital desaturada y aclarada de alta legibilidad'
                      },
                      {
                        id: 'orthophoto-hybrid' as CadTheme,
                        label: 'Ortofoto + Contornos Estructurales',
                        desc: 'Remarca bordes de techumbres y muros en grafito'
                      },
                      {
                        id: 'architectural-white' as CadTheme,
                        label: 'Croquis Vectorial Papel Blanco',
                        desc: 'Trazos de línea sobre papel blanco'
                      },
                      {
                        id: 'autocad-dark' as CadTheme,
                        label: 'AutoCAD Model Space Oscuro',
                        desc: 'Fondo oscuro con líneas cian'
                      }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLocalSettings(prev => ({ ...prev, theme: t.id }))}
                        className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          localSettings.theme === t.id
                            ? 'bg-sky-50 border-sky-400 text-slate-900'
                            : 'bg-white border-stone-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <div className="font-bold text-xs">{t.label}</div>
                        <div className="text-[10px] text-slate-500">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-700 mb-1">
                    <span>Intensidad de Ortofoto Base</span>
                    <span className="font-mono font-semibold text-sky-700">
                      {localSettings.satelliteOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="90"
                    value={localSettings.satelliteOpacity}
                    onChange={e =>
                      setLocalSettings(prev => ({
                        ...prev,
                        satelliteOpacity: Number(e.target.value)
                      }))
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-700 mb-1">
                    <span>Nitidez y Contraste de Techumbres</span>
                    <span className="font-mono font-semibold text-sky-700">
                      {localSettings.contrast}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="180"
                    value={localSettings.contrast}
                    onChange={e =>
                      setLocalSettings(prev => ({ ...prev, contrast: Number(e.target.value) }))
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Live Preview */}
          <div className="flex-1 flex flex-col bg-stone-50 rounded-2xl border border-stone-200 p-4 overflow-hidden relative">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                <span>Vista Previa de Planta Base</span>
              </span>
              <div className="flex items-center gap-3">
                {autoTraceStructures && detectedPreviewStructures.length > 0 && (
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    {detectedPreviewStructures.length} Estructuras / Perímetros CAD detectados
                  </span>
                )}
                {isProcessing && (
                  <div className="flex items-center gap-1.5 text-xs text-sky-600 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Procesando...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center rounded-xl overflow-hidden border border-stone-200 bg-white relative min-h-[320px]">
              {previewCadUrl ? (
                <img
                  src={previewCadUrl}
                  alt="Vista previa de ortofoto CAD"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400 text-xs">
                  Carga una captura de Google Maps para previsualizar.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
          <span className="text-xs text-slate-500">
            Al cargar el plano, podrás ir ubicando las cámaras una a una sobre el lienzo.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-stone-200/60 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={!previewCadUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Cargar Plano Limpio (Sin Cámaras Precargadas)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
