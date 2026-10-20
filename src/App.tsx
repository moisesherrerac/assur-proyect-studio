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

const AUTOSAVE_STORAGE_KEY = 'cad_project_autosave_v2';
const MAX_HISTORY = 60;

interface ProjectSnapshot {
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
  engineerName: 'Ing. Carlos Mendoza Rivera',
  engineerTitle: 'Ingeniero Electrónico y Telecomunicaciones',
  engineerLicense: 'Reg. Prof. N° 148921',
  engineerCompany: 'ASSUR PROYECT STUDIO',
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

export default function App() {
  // Read existing autosave from localStorage if available
  const initialSavedData = (() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('No se pudo recuperar autoguardado previo', e);
    }
    return null;
  })();

  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Active Camera Color & Criterion Preset
  const [cameraPreset, setCameraPreset] = useState<CameraInsertionPreset>(
    initialSavedData?.cameraPreset || DEFAULT_PRESET
  );

  const [showFov, setShowFov] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState<number>(20);
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
    initialSavedData?.metadata || DEFAULT_METADATA
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

  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'idle'>(
    initialSavedData ? 'saved' : 'idle'
  );

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
    structures: JSON.parse(JSON.stringify(structures)),
    cameras: JSON.parse(JSON.stringify(cameras)),
    audioAlarms: JSON.parse(JSON.stringify(audioAlarms)),
    antennas: JSON.parse(JSON.stringify(antennas)),
    fences: JSON.parse(JSON.stringify(fences)),
    wiring: JSON.parse(JSON.stringify(wiring)),
    annotations: JSON.parse(JSON.stringify(annotations)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    cadBackgroundImageUrl,
    rawImageSrc
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
    rawImageSrc
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
      if (isTyping) return;

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

    if (!hasDataToSave) return;

    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const payload = {
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
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
        setAutosaveStatus('saved');
      } catch (err) {
        console.warn('Autosave quota exceeded for raw image, trying compact payload', err);
        try {
          const compactPayload = {
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
          localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(compactPayload));
          setAutosaveStatus('saved');
        } catch (err2) {
          setAutosaveStatus('idle');
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
    cameraPreset
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
    if (!canvasRefInstance.current) return;
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
        format: 'a3'
      });
    } catch (e: any) {
      console.error('Error al generar PDF', e);
    }
  };

  // Download complete editable project file (.cadmap)
  const handleSaveProjectJson = () => {
    const projectData = {
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
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
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
  const loadProjectData = useCallback((data: any) => {
    if (data.metadata) setMetadata(data.metadata);
    if (data.structures) setStructures(data.structures);
    if (data.cameras) setCameras(data.cameras);
    if (data.antennas) setAntennas(data.antennas);
    if (data.audioAlarms) setAudioAlarms(data.audioAlarms);
    if (data.fences) setFences(data.fences);
    if (data.wiring) setWiring(data.wiring);
    if (data.annotations) setAnnotations(data.annotations);
    if (data.theme) setTheme(data.theme);
    if (data.layers) setLayers(data.layers);
    if (data.locks) setLocks(data.locks);
    if (data.cameraPreset) setCameraPreset(data.cameraPreset);
    if (data.filterSettings) setFilterSettings(data.filterSettings);

    if (data.cadBackgroundImageUrl) {
      setCadBackgroundImageUrl(data.cadBackgroundImageUrl);
    }
    if (data.rawImageSrc) {
      setRawImageSrc(data.rawImageSrc);
      if (!data.cadBackgroundImageUrl) {
        const img = new Image();
        img.src = data.rawImageSrc;
        img.onload = async () => {
          const cad = await processImageToCad(img, data.filterSettings || filterSettings);
          setCadBackgroundImageUrl(cad);
        };
      }
    }
    setSelectedId(null);
  }, [filterSettings]);

  const handleLoadProjectJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cadmap,.json';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target?.result as string);
          loadProjectData(data);
        } catch (err) {
          console.error('Archivo de proyecto inválido', err);
          alert('El archivo no tiene un formato válido de proyecto Assur CAD (.cadmap)');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Handle drag-and-drop of .cadmap file onto canvas
  const handleCadmapDropped = (file: File) => {
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const data = JSON.parse(event.target?.result as string);
        loadProjectData(data);
      } catch (err) {
        console.error('Archivo de proyecto inválido', err);
      }
    };
    reader.readAsText(file);
  };

  // Handle direct image drop onto canvas
  const handleImageDropped = (file: File) => {
    const reader = new FileReader();
    reader.onload = async event => {
      const dataUrl = event.target?.result as string;
      setRawImageSrc(dataUrl);
      const img = new Image();
      img.src = dataUrl;
      img.onload = async () => {
        const cadResult = await processImageToCad(img, filterSettings);
        const detected = await autoVectorizeStructuresFromImage(dataUrl);
        setCadBackgroundImageUrl(cadResult);
        setStructures(detected);
        setCameras([]);
        setAudioAlarms([]);
        setAntennas([]);
        setFences([]);
        setWiring([]);
        setSelectedId(null);
      };
    };
    reader.readAsDataURL(file);
  };

  // Start a new clean project
  const handleNewProject = () => {
    const hasWork =
      Boolean(rawImageSrc) ||
      structures.length > 0 ||
      cameras.length > 0 ||
      audioAlarms.length > 0;

    if (hasWork) {
      const confirmReset = window.confirm(
        '¿Deseas iniciar un nuevo proyecto? Se limpiará el plano actual. (Asegúrate de descargar tu archivo .cadmap antes si deseas conservarlo).'
      );
      if (!confirmReset) return;
    }

    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
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

      {/* Área Principal de Trabajo */}
      <div className="flex-1 flex overflow-hidden relative">
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
        onClose={() => setIsFilterModalOpen(false)}
        rawImageSrc={rawImageSrc}
        setRawImageSrc={setRawImageSrc}
        filterSettings={filterSettings}
        setFilterSettings={setFilterSettings}
        onApplyCadImage={(cadUrl, detectedStructures) => {
          commitSnapshot();
          setCadBackgroundImageUrl(cadUrl);
          setTheme(filterSettings.theme);
          setCameras([]);
          setAudioAlarms([]);
          setAntennas([]);
          setFences([]);
          setWiring([]);
          setAnnotations([]);
          setSelectedId(null);

          if (detectedStructures && detectedStructures.length > 0) {
            setStructures(detectedStructures);
          } else {
            setStructures([]);
          }
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
