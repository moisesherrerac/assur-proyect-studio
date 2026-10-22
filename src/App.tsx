/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActiveTool,
  CameraDevice,
  ElectricFence,
  NetworkAntenna,
  AudioAlarmDevice,
  WiringRoute,
  ProjectMetadata,
  CadTheme,
  ImageFilterSettings,
  LayerVisibility,
  LayerLocks,
  PlanAnnotation,
  CadStructure,
  CameraInsertionPreset
} from './types/cad';
import { prepareImage } from './utils/images';
import { validateProject, cleanSampleIdentity } from './utils/project';
import { EquipmentReport } from './components/EquipmentReport';
import type { EquipmentKind } from './utils/equipmentReport';
import { processImageToCad } from './utils/cadFilter';
import { autoVectorizeStructuresFromImage } from './utils/structureVectorizer';
import { exportCadBlueprintToPdf } from './utils/pdfExport';
import { Toolbar } from './components/Toolbar';
import { LeftToolPalette } from './components/LeftToolPalette';
import { CanvasEditor } from './components/CanvasEditor';
import { PropertiesPanel } from './components/PropertiesPanel';
import { EngineeringSidePanel } from './components/EngineeringSidePanel';
import { FilterModal } from './components/FilterModal';
import { EngineerSignatureModal } from './components/EngineerSignatureModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { LayerManagerPanel } from './components/LayerManagerPanel';

import { PlanLibrary } from './components/PlanLibrary';
import type { PlanLibrary as Library, SavedPlan } from './utils/githubPlans';
import { PRIVATE_DRAFT_KEY } from './utils/privateSession';
const AUTOSAVE_STORAGE_KEY = PRIVATE_DRAFT_KEY;
const MAX_HISTORY = 60;

interface ProjectSnapshot {
  cloudEntry?: SavedPlan;
  structures: CadStructure[];
  cameras: CameraDevice[];
  audioAlarms: AudioAlarmDevice[];
  antennas: NetworkAntenna[];
  fences: ElectricFence[];
  wiring: WiringRoute[];
  annotations: PlanAnnotation[];
  metadata: ProjectMetadata;
  cadBackgroundImageUrl: string | null;
  rawImageSrc: string | null;
  filterSettings: ImageFilterSettings;
  theme: CadTheme;
}

const DEFAULT_FILTER_SETTINGS: ImageFilterSettings = {
  contrast: 112,
  edgeThreshold: 45,
  lineWidth: 1.5,
  invert: false,
  denoise: 2,
  satelliteOpacity: 72,
  theme: 'technical-orthophoto',
  brightness: 105
};

const DEFAULT_METADATA: ProjectMetadata = {
  projectName: 'PROYECTO DE CÁMARAS Y MONITOREO PERIMETRAL',
  clientName: 'CLIENTE / EMPRESA',
  location: 'PLANTA GENERAL · CCTV Y SEGURIDAD',
  drawingTitle: 'PLANTA GENERAL - UBICACIÓN DE CÁMARAS Y EQUIPAMIENTO',
  drawingSubtitle: 'ESCALA: S/E · BASE: IMAGEN SATELITAL / MAPS',
  sheetNumber: 'L-01',
  revision: 'A',
  scale: 'S/E',
  date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
  engineerName: '',
  engineerTitle: '',
  engineerLicense: '',
  engineerCompany: 'ASSUR CHILE',
  northAngle: 0,
  projectNotes: [
    '1. UBICACIÓN Y ORIENTACIÓN DE EQUIPOS REFERENCIAL, SUJETA A LEVANTAMIENTO EN TERRENO.',
    '2. CONOS DE VISIÓN Y COBERTURA DE AUDIO INDICATIVOS, NO REPRESENTAN ALCANCE REAL.',
    '3. BASE: IMAGEN SATELITAL / MAPS, PLANO SIN ESCALA (S/E).'
  ]
};

const DEFAULT_PRESET: CameraInsertionPreset = {
  color: '#0088cc',
  status: 'nueva',
  categoryLabel: 'NUEVA (PROYECTADA)',
  prefix: 'CN'
};

export default function App({ library, onSignOut, onAccessLost }: { library: Library; onSignOut: () => void; onAccessLost: () => void }) {
  // Read existing autosave from localStorage if available
  const [initialSavedData] = useState(() => {
    try {
      const raw = sessionStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (raw) { const saved = JSON.parse(raw); return { ...validateProject(saved), cloudEntry: saved.cloudEntry as SavedPlan | undefined }; }
    } catch (e) {
      console.warn('No se pudo recuperar autoguardado previo', e);
      return { recoveryError: true };
    }
    return null;
  });

  const [cloudEntry, setCloudEntry] = useState<SavedPlan | undefined>(initialSavedData && !initialSavedData.recoveryError ? initialSavedData.cloudEntry : undefined);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Active Camera Color & Criterion Preset
  const [cameraPreset, setCameraPreset] = useState<CameraInsertionPreset>(
    initialSavedData?.cameraPreset || DEFAULT_PRESET
  );

  const [showFov, setShowFov] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState<number>(5);
  const [theme, setTheme] = useState<CadTheme>(
    initialSavedData?.theme || 'technical-orthophoto'
  );
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  const [layers, setLayers] = useState<LayerVisibility>(
    initialSavedData?.layers || {
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
    }
  );

  const [locks, setLocks] = useState<LayerLocks>(
    initialSavedData?.locks || {
      structures: false,
      cameras: false,
      electricFences: false,
      wiring: false,
      antennas: false,
      audioAlarms: false
    }
  );

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Background map image: clean null slate by default
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(
    initialSavedData?.rawImageSrc || null
  );
  const [cadBackgroundImageUrl, setCadBackgroundImageUrl] = useState<string | null>(
    initialSavedData?.cadBackgroundImageUrl || null
  );

  const [filterSettings, setFilterSettings] = useState<ImageFilterSettings>(
    initialSavedData?.filterSettings || DEFAULT_FILTER_SETTINGS
  );

  const [metadata, setMetadata] = useState<ProjectMetadata>(
    cleanSampleIdentity({ ...DEFAULT_METADATA, ...initialSavedData?.metadata })
  );

  // Structures & Devices: empty clean slate by default
  const [structures, setStructures] = useState<CadStructure[]>(
    initialSavedData?.structures || []
  );
  const [cameras, setCameras] = useState<CameraDevice[]>(
    initialSavedData?.cameras || []
  );
  const [audioAlarms, setAudioAlarms] = useState<AudioAlarmDevice[]>(
    initialSavedData?.audioAlarms || []
  );
  const [annotations, setAnnotations] = useState<PlanAnnotation[]>(
    initialSavedData?.annotations || []
  );
  const [antennas, setAntennas] = useState<NetworkAntenna[]>(
    initialSavedData?.antennas || []
  );
  const [fences, setFences] = useState<ElectricFence[]>(
    initialSavedData?.fences || []
  );
  const [wiring, setWiring] = useState<WiringRoute[]>(
    initialSavedData?.wiring || []
  );

  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'idle' | 'partial' | 'error'>(
    initialSavedData?.recoveryError ? 'error' : initialSavedData ? 'saved' : 'idle'
  );
  const hasSavedWorkRef = useRef(Boolean(initialSavedData && !initialSavedData.recoveryError));
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<'a3' | 'a4'>('a3');
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  const canvasRefInstance = useRef<HTMLCanvasElement | null>(null);

  // --- UNDO / REDO HISTORY ENGINE ---
  const pastRef = useRef<ProjectSnapshot[]>([]);
  const futureRef = useRef<ProjectSnapshot[]>([]);
  const lastCommittedSnapshotRef = useRef<ProjectSnapshot | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const isInteractingRef = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const getCurrentSnapshot = useCallback((): ProjectSnapshot => ({
    cloudEntry,
    structures: JSON.parse(JSON.stringify(structures)),
    cameras: JSON.parse(JSON.stringify(cameras)),
    audioAlarms: JSON.parse(JSON.stringify(audioAlarms)),
    antennas: JSON.parse(JSON.stringify(antennas)),
    fences: JSON.parse(JSON.stringify(fences)),
    wiring: JSON.parse(JSON.stringify(wiring)),
    annotations: JSON.parse(JSON.stringify(annotations)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    cadBackgroundImageUrl,
    rawImageSrc, filterSettings: { ...filterSettings }, theme
  }), [
    structures,
    cameras,
    audioAlarms,
    antennas,
    fences,
    wiring,
    annotations,
    metadata,
    cadBackgroundImageUrl,
    rawImageSrc, filterSettings, theme, cloudEntry
  ]);

  const areSnapshotsEqual = (a: ProjectSnapshot, b: ProjectSnapshot): boolean => {
    if (a.structures.length !== b.structures.length) return false;
    if (a.cameras.length !== b.cameras.length) return false;
    if (a.audioAlarms.length !== b.audioAlarms.length) return false;
    if (a.antennas.length !== b.antennas.length) return false;
    if (a.fences.length !== b.fences.length) return false;
    if (a.wiring.length !== b.wiring.length) return false;
    if (a.annotations.length !== b.annotations.length) return false;
    if (a.metadata.northAngle !== b.metadata.northAngle) return false;
    if (a.cadBackgroundImageUrl !== b.cadBackgroundImageUrl) return false;
    if (a.rawImageSrc !== b.rawImageSrc) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const commitSnapshot = useCallback(() => {
    if (isApplyingHistoryRef.current) return;
    const current = getCurrentSnapshot();
    const last = lastCommittedSnapshotRef.current;

    if (last && areSnapshotsEqual(current, last)) {
      return;
    }

    if (last) {
      pastRef.current.push(last);
      if (pastRef.current.length > MAX_HISTORY) {
        pastRef.current.shift();
      }
      futureRef.current = [];
      setCanRedo(false);
    }

    lastCommittedSnapshotRef.current = current;
    setCanUndo(pastRef.current.length > 0);
  }, [getCurrentSnapshot]);

  // Initial snapshot on mount
  useEffect(() => {
    if (!lastCommittedSnapshotRef.current) {
      lastCommittedSnapshotRef.current = getCurrentSnapshot();
    }
  }, [getCurrentSnapshot]);

  // Debounced auto-commit for discrete edits when not actively dragging
  useEffect(() => {
    if (isApplyingHistoryRef.current) return;
    if (isInteractingRef.current) return;

    const timer = setTimeout(() => {
      commitSnapshot();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    structures,
    cameras,
    audioAlarms,
    antennas,
    fences,
    wiring,
    annotations,
    metadata,
    cadBackgroundImageUrl,
    rawImageSrc,
    commitSnapshot
  ]);

  const handleUndo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const previous = pastRef.current.pop()!;
    const current = getCurrentSnapshot();
    futureRef.current.push(current);

    isApplyingHistoryRef.current = true;
    lastCommittedSnapshotRef.current = previous;

    setCloudEntry(previous.cloudEntry);
    setStructures(previous.structures || []);
    setCameras(previous.cameras || []);
    setAudioAlarms(previous.audioAlarms || []);
    setAntennas(previous.antennas || []);
    setFences(previous.fences || []);
    setWiring(previous.wiring || []);
    setAnnotations(previous.annotations || []);
    setMetadata(previous.metadata || DEFAULT_METADATA);
    setCadBackgroundImageUrl(previous.cadBackgroundImageUrl);
    setRawImageSrc(previous.rawImageSrc);
    setFilterSettings(previous.filterSettings || DEFAULT_FILTER_SETTINGS);
    setTheme(previous.theme || DEFAULT_FILTER_SETTINGS.theme);
    setSelectedId(null);

    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 60);
  }, [getCurrentSnapshot]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const next = futureRef.current.pop()!;
    const current = getCurrentSnapshot();
    pastRef.current.push(current);

    isApplyingHistoryRef.current = true;
    lastCommittedSnapshotRef.current = next;

    setCloudEntry(next.cloudEntry);
    setStructures(next.structures || []);
    setCameras(next.cameras || []);
    setAudioAlarms(next.audioAlarms || []);
    setAntennas(next.antennas || []);
    setFences(next.fences || []);
    setWiring(next.wiring || []);
    setAnnotations(next.annotations || []);
    setMetadata(next.metadata || DEFAULT_METADATA);
    setCadBackgroundImageUrl(next.cadBackgroundImageUrl);
    setRawImageSrc(next.rawImageSrc);
    setFilterSettings(next.filterSettings || DEFAULT_FILTER_SETTINGS);
    setTheme(next.theme || DEFAULT_FILTER_SETTINGS.theme);
    setSelectedId(null);

    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);

    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 60);
  }, [getCurrentSnapshot]);

  // Global Undo / Redo Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName.toLowerCase();
      const isTyping = activeEl === 'input' || activeEl === 'textarea' || activeEl === 'select';
      if (isTyping || document.querySelector('[role="dialog"]')) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Real-time Autosave to LocalStorage
  useEffect(() => {
    const hasDataToSave =
      Boolean(rawImageSrc) ||
      Boolean(cadBackgroundImageUrl) ||
      structures.length > 0 ||
      cameras.length > 0 ||
      antennas.length > 0 ||
      audioAlarms.length > 0 ||
      fences.length > 0 ||
      wiring.length > 0 ||
      annotations.length > 0;

    if (!hasDataToSave && !hasSavedWorkRef.current && JSON.stringify(metadata) === JSON.stringify(DEFAULT_METADATA)) return;
    if (hasDataToSave) hasSavedWorkRef.current = true;

    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const payload = {
          cloudEntry,
          version: '2.4',
          timestamp: new Date().toISOString(),
          metadata,
          filterSettings,
          structures,
          cameras,
          antennas,
          audioAlarms,
          fences,
          wiring,
          annotations,
          theme,
          rawImageSrc,
          cadBackgroundImageUrl,
          layers,
          locks,
          cameraPreset
        };
        sessionStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
        setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave quota exceeded for raw image, trying compact payload', err);
        try {
          const compactPayload = {
            cloudEntry,
          version: '2.4',
            timestamp: new Date().toISOString(),
            metadata,
            filterSettings,
            structures,
            cameras,
            antennas,
            audioAlarms,
            fences,
            wiring,
            annotations,
            theme,
            cadBackgroundImageUrl,
            layers,
            locks,
            cameraPreset
          };
          sessionStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(compactPayload));
          setAutosaveStatus('partial');
        } catch (err2) {
          setAutosaveStatus('error');
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [
    metadata,
    filterSettings,
    structures,
    cameras,
    antennas,
    audioAlarms,
    fences,
    wiring,
    annotations,
    theme,
    rawImageSrc,
    cadBackgroundImageUrl,
    layers,
    locks,
    cameraPreset, cloudEntry
  ]);

  const handleThemeChange = async (newTheme: CadTheme) => {
    setTheme(newTheme);
    const updatedSettings = { ...filterSettings, theme: newTheme };
    setFilterSettings(updatedSettings);

    if (rawImageSrc) {
      const img = new Image();
      img.src = rawImageSrc;
      img.onload = async () => {
        const cadResult = await processImageToCad(img, updatedSettings);
        setCadBackgroundImageUrl(cadResult);
      };
    }
  };

  const handleExportPdf = async () => {
    if (!canvasRefInstance.current || exporting) return;
    setExporting(true); setNotice('');
    try {
      await exportCadBlueprintToPdf({
        blueprintCanvas: canvasRefInstance.current,
        cameras,
        antennas,
        audioAlarms,
        fences,
        wiring,
        metadata,
        theme,
        format: pdfFormat
      });
    } catch (e: any) {
      console.error('Error al generar PDF', e);
      setNotice('No se pudo generar el PDF. Guarda una copia .cadmap y vuelve a intentarlo.');
    } finally { setExporting(false); }
  };

  // Download complete editable project file (.cadmap)
  const getProjectData = () => ({
      version: '2.4',
      appName: 'Assur Proyect Studio',
      timestamp: new Date().toISOString(),
      metadata,
      filterSettings,
      structures,
      cameras,
      antennas,
      audioAlarms,
      fences,
      wiring,
      annotations,
      theme,
      rawImageSrc,
      cadBackgroundImageUrl,
      layers,
      locks,
      cameraPreset
    });
  const handleSaveProjectJson = () => {
    const blob = new Blob([JSON.stringify(getProjectData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (metadata.projectName || 'assur_plano_cad')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    a.download = `${safeTitle}.cadmap`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load project file from file object (.cadmap or .json)
  const loadProjectData = useCallback((input: unknown, entry?: SavedPlan) => {
    const data = validateProject(input);
    if (!window.confirm('Se abrirá otro proyecto y se reemplazará el plano actual. ¿Guardaste tu trabajo en Mis planos o descargaste una copia?')) return false;
    commitSnapshot();
    setCloudEntry(entry);
    setMetadata(cleanSampleIdentity({ ...DEFAULT_METADATA, ...data.metadata }));
    setStructures(data.structures || []); setCameras(data.cameras || []);
    setAntennas(data.antennas || []); setAudioAlarms(data.audioAlarms || []);
    setFences(data.fences || []); setWiring(data.wiring || []); setAnnotations(data.annotations || []);
    setTheme(data.theme || 'technical-orthophoto');
    setLayers({ mapBackground:true, structures:true, grid:true, camerasNew:true, camerasExisting:true, cameraFov:true, electricFences:true, wiring:true, antennas:true, audioAlarms:true, labels:true, ...data.layers });
    setLocks({ structures:false, cameras:false, electricFences:false, wiring:false, antennas:false, audioAlarms:false, ...data.locks });
    setCameraPreset({ ...DEFAULT_PRESET, ...data.cameraPreset });
    setFilterSettings({ ...DEFAULT_FILTER_SETTINGS, ...data.filterSettings });
    setCadBackgroundImageUrl(data.cadBackgroundImageUrl || data.rawImageSrc || null);
    setRawImageSrc(data.rawImageSrc || null); setSelectedId(null);
    hasSavedWorkRef.current = true;
    setNotice('Proyecto abierto. Guarda los cambios en Mis planos para acceder a ellos desde otro computador.');
    return true;
  }, [commitSnapshot]);

  const readProjectFile = (file: File) => {
    if (file.size > 40 * 1024 * 1024) { setNotice('El archivo supera 40 MB. Usa una copia con imágenes reducidas.'); return; }
    const reader = new FileReader();
    reader.onload = event => {
      try { loadProjectData(JSON.parse(event.target?.result as string)); }
      catch (err) { setNotice(err instanceof Error ? err.message : 'No se pudo abrir el proyecto. El plano actual se conserva.'); }
    };
    reader.onerror = () => setNotice('No se pudo leer el archivo. Selecciónalo de nuevo.');
    reader.readAsText(file);
  };
  const handleLoadProjectJson = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.cadmap,.json';
    input.onchange = () => { const file = input.files?.[0]; if (file) readProjectFile(file); };
    input.click();
  };
  const handleCadmapDropped = readProjectFile;

  // Handle direct image drop onto canvas
  const [droppedImage, setDroppedImage] = useState<string | null>(null);
  const handleImageDropped = (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) {
      setNotice('Usa una imagen PNG, JPG o WebP de hasta 20 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = async e => {
      try { setDroppedImage(await prepareImage(e.target?.result as string)); setIsFilterModalOpen(true); }
      catch { setNotice('No se pudo abrir la imagen. El plano actual se conserva.'); }
    };
    reader.onerror = () => setNotice('No se pudo leer la imagen. Inténtalo de nuevo.');
    reader.readAsDataURL(file);
  };

  // Start a new clean project
  const handleNewProject = () => {
    const hasWork =
      Boolean(rawImageSrc) ||
      structures.length > 0 ||
      cameras.length > 0 ||
      audioAlarms.length > 0 || antennas.length > 0 || fences.length > 0 || wiring.length > 0 || annotations.length > 0;

    if (hasWork) {
      const confirmReset = window.confirm(
        '¿Deseas iniciar un nuevo proyecto? Se limpiará el plano actual. (Asegúrate de descargar tu archivo .cadmap antes si deseas conservarlo).'
      );
      if (!confirmReset) return;
    }

    commitSnapshot();
    try { sessionStorage.removeItem(AUTOSAVE_STORAGE_KEY); } catch {}
    setCloudEntry(undefined);
    setMetadata({ ...DEFAULT_METADATA });
    setRawImageSrc(null);
    setCadBackgroundImageUrl(null);
    setStructures([]);
    setCameras([]);
    setAudioAlarms([]);
    setAntennas([]);
    setFences([]);
    setWiring([]);
    setAnnotations([]);
    setSelectedId(null);
    setAutosaveStatus('idle');
  };

  const updateGlosa = (kind: EquipmentKind, id: string, glosa: string) => {
    const update = (items: any[]) => items.map(item => item.id === id ? { ...item, glosa } : item);
    if (kind === 'cameras') setCameras(update);
    if (kind === 'antennas') setAntennas(update);
    if (kind === 'audioAlarms') setAudioAlarms(update);
    if (kind === 'fences') setFences(update);
    if (kind === 'wiring') setWiring(update);
  };

  const totalDevicesCount =
    cameras.length + audioAlarms.length + antennas.length + fences.length + wiring.length;

  const handleClearAllDevices = () => {
    commitSnapshot();
    setCameras([]);
    setAudioAlarms([]);
    setAntennas([]);
    setFences([]);
    setWiring([]);
    setAnnotations([]);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-stone-100 font-sans text-slate-800">
      {/* Cabecera Superior Redistribuida (Limpia y Espaciosa) */}
      <Toolbar
        onOpenLibrary={() => setLibraryOpen(true)}
        onSignOut={() => { if (window.confirm('¿Cerrar sesión? Guarda primero en Mis planos o descarga una copia. Se eliminará el borrador temporal de esta pestaña.')) onSignOut(); }}
        onOpenReport={() => setIsReportOpen(true)}
        onCalibrate={() => { setActiveTool('measure'); setNotice('Marca dos puntos de distancia conocida con la herramienta Medir y completa la distancia real.'); }}
        calibrated={Boolean(metadata.metersPerUnit)}
        pdfFormat={pdfFormat} setPdfFormat={setPdfFormat} exporting={exporting}
        showFov={showFov}
        setShowFov={setShowFov}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        gridSize={gridSize}
        setGridSize={setGridSize}
        theme={theme}
        setTheme={handleThemeChange}
        onOpenConvertModal={() => setIsFilterModalOpen(true)}
        onOpenPdfExport={handleExportPdf}
        onSaveProjectJson={handleSaveProjectJson}
        onLoadProjectJson={handleLoadProjectJson}
        onNewProject={handleNewProject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        northAngle={metadata.northAngle || 0}
        onChangeNorthAngle={ang => {
          setMetadata(prev => ({ ...prev, northAngle: ang }));
        }}
        hasPlanImage={Boolean(cadBackgroundImageUrl)}
        autosaveStatus={autosaveStatus}
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
        onToggleLayers={() => setIsLayersOpen(prev => !prev)}
        isLayersOpen={isLayersOpen}
      />

      <div className="px-3 py-1.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs shrink-0" role="status" aria-live="polite">
        <span className={autosaveStatus === 'error' ? 'text-red-700 font-semibold' : autosaveStatus === 'partial' ? 'text-amber-800' : 'text-slate-600'}>
          {autosaveStatus === 'saved' ? 'Borrador temporal en esta pestaña' : autosaveStatus === 'saving' ? 'Guardando borrador…' : autosaveStatus === 'error' ? 'No se pudo guardar o recuperar el respaldo. Descarga una copia .cadmap.' : autosaveStatus === 'partial' ? 'Respaldo parcial: falta la imagen original. Descarga una copia .cadmap.' : 'Guarda en Mis planos para conservar tu proyecto en GitHub privado.'}
        </span>
        <span>{cloudEntry ? `Último guardado en GitHub: ${new Date(cloudEntry.updatedAt).toLocaleString('es-CL')} · ${cloudEntry.name}` : 'Sin guardar en GitHub'}</span>
        <button className="underline underline-offset-2 text-purple-800" onClick={() => setActiveTool('measure')}>{metadata.metersPerUnit ? 'Distancias calibradas · Medir / recalibrar' : 'Distancias sin calibrar · Calibrar'}</button>
      </div>
      {notice && <div role="status" className="px-3 py-2 bg-amber-50 text-amber-950 text-sm flex items-center gap-3 shrink-0"><span className="flex-1">{notice}</span><button aria-label="Cerrar aviso" onClick={() => setNotice('')} className="underline">Cerrar</button></div>}
      {libraryOpen && <PlanLibrary library={library} current={cloudEntry} getDocument={getProjectData} onSaved={setCloudEntry} onOpen={loadProjectData} onClose={() => setLibraryOpen(false)} onAccessLost={onAccessLost} onRecoverLegacy={() => {
        try { const raw = localStorage.getItem('cad_project_autosave_v2'); if (!raw) { setNotice('No hay un respaldo local de la versión anterior en este navegador.'); return; } loadProjectData(JSON.parse(raw)); }
        catch { setNotice('No se pudo recuperar el respaldo anterior. Sus datos se conservan sin cambios.'); }
      }}/>}
      {isReportOpen && <EquipmentReport project={{ metadata, cameras, antennas, audioAlarms, fences, wiring }} onClose={() => setIsReportOpen(false)} onUpdateGlosa={updateGlosa} onSelect={setSelectedId}/>}
      {/* Área Principal de Trabajo */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Costado Izquierdo en Columna: Opciones de Adición y Elementos */}
        <LeftToolPalette
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          cameraPreset={cameraPreset}
          setCameraPreset={setCameraPreset}
          totalDevicesCount={totalDevicesCount}
          onClearAllDevices={handleClearAllDevices}
          northAngle={metadata.northAngle || 0}
          onChangeNorthAngle={ang => {
            setMetadata(prev => ({ ...prev, northAngle: ang }));
          }}
        />

        {/* Editor de Lienzo CAD */}
        <CanvasEditor
          cadBackgroundImageUrl={cadBackgroundImageUrl}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          cameraPreset={cameraPreset}
          structures={structures}
          setStructures={setStructures}
          cameras={cameras}
          setCameras={setCameras}
          antennas={antennas}
          setAntennas={setAntennas}
          audioAlarms={audioAlarms}
          setAudioAlarms={setAudioAlarms}
          fences={fences}
          setFences={setFences}
          wiring={wiring}
          setWiring={setWiring}
          annotations={annotations}
          setAnnotations={setAnnotations}
          metadata={metadata}
          setMetadata={setMetadata}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          theme={theme}
          showFov={showFov}
          showGrid={showGrid}
          snapToGrid={snapToGrid}
          setSnapToGrid={setSnapToGrid}
          gridSize={gridSize}
          setGridSize={setGridSize}
          layers={layers}
          locks={locks}
          onToggleLayerManager={() => setIsLayersOpen(prev => !prev)}
          onCanvasRefReady={canvas => {
            canvasRefInstance.current = canvas;
          }}
          onOpenConvertModal={() => setIsFilterModalOpen(true)}
          onLoadProjectJson={handleLoadProjectJson}
          onSaveProjectJson={handleSaveProjectJson}
          onImageDropped={handleImageDropped}
          onCadmapDropped={handleCadmapDropped}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onInteractionStart={() => {
            isInteractingRef.current = true;
          }}
          onInteractionEnd={() => {
            isInteractingRef.current = false;
            commitSnapshot();
          }}
        />

        {/* Paneles Flotantes y Laterales */}
        <LayerManagerPanel
          isOpen={isLayersOpen}
          onClose={() => setIsLayersOpen(false)}
          layers={layers}
          setLayers={setLayers}
          locks={locks}
          setLocks={setLocks}
          structures={structures}
          cameras={cameras}
          fences={fences}
          wiring={wiring}
          antennas={antennas}
          audioAlarms={audioAlarms}
        />

        <PropertiesPanel
        metersPerUnit={metadata.metersPerUnit}
          selectedId={selectedId}
          onClose={() => setSelectedId(null)}
          cameraPreset={cameraPreset}
          setCameraPreset={setCameraPreset}
          structures={structures}
          setStructures={setStructures}
          cameras={cameras}
          setCameras={setCameras}
          antennas={antennas}
          setAntennas={setAntennas}
          audioAlarms={audioAlarms}
          setAudioAlarms={setAudioAlarms}
          fences={fences}
          setFences={setFences}
          wiring={wiring}
          setWiring={setWiring}
          annotations={annotations}
          setAnnotations={setAnnotations}
        />

        <EngineeringSidePanel
          cameras={cameras}
          antennas={antennas}
          audioAlarms={audioAlarms}
          fences={fences}
          wiring={wiring}
          structuresCount={structures.length}
          cameraPreset={cameraPreset}
          metadata={metadata}
          setMetadata={setMetadata}
          theme={theme}
          onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
          onExportPdf={handleExportPdf}
          onSaveProjectJson={handleSaveProjectJson}
          isOpen={isSidePanelOpen}
          setIsOpen={setIsSidePanelOpen}
        />
      </div>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => { setIsFilterModalOpen(false); setDroppedImage(null); }}
        rawImageSrc={droppedImage || rawImageSrc}
        setRawImageSrc={setRawImageSrc}
        filterSettings={filterSettings}
        setFilterSettings={setFilterSettings}
        onApplyCadImage={(cadUrl, detectedStructures, source, settings) => {
          const replacing = Boolean(rawImageSrc || cadBackgroundImageUrl) && source !== rawImageSrc;
          if (replacing && !window.confirm('Cambiar la imagen puede desalinear equipos y trazados. Se conservarán sus posiciones y se quitará la calibración. ¿Continuar?')) return false;
          commitSnapshot();
          setRawImageSrc(source); setCadBackgroundImageUrl(cadUrl);
          setFilterSettings(settings); setTheme(settings.theme);
          if (replacing) setMetadata(prev => ({ ...prev, metersPerUnit: undefined, scale: 'S/E' }));
          if (detectedStructures?.length && (source !== rawImageSrc || structures.length === 0)) setStructures(prev => [...prev, ...detectedStructures]);
          setDroppedImage(null);
          return true;
        }}
      />

      <EngineerSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        metadata={metadata}
        setMetadata={setMetadata}
      />

      <AIAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        cameras={cameras}
        antennas={antennas}
        audioAlarms={audioAlarms}
        fences={fences}
        wiring={wiring}
        metadata={metadata}
      />
    </div>
  );
}
