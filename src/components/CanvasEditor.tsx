import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ActiveTool,
  CameraDevice,
  DeviceType,
  ElectricFence,
  FencePoint,
  NetworkAntenna,
  AudioAlarmDevice,
  WiringRoute,
  CadTheme,
  LayerVisibility,
  LayerLocks,
  ProjectMetadata,
  PlanAnnotation,
  CadStructure,
  CameraInsertionPreset
} from '../types/cad';
import { fitNotes, getNoteRuns } from '../utils/notes';
import { drawFittedText } from '../utils/canvasText';
import { nextLabel, distanceLabel } from '../utils/project';
import { GRID_STEPS, placePlanPoint, visibleGridStep } from '../utils/placement';
import { drawFenceLabel, fenceLabelLayout, fenceLabelAnchor, drawFencePath, fenceProfile, fenceTypeForTool, isElectricFenceTool } from '../utils/fences';
import { buildDynamicSymbology, DynamicSymbologyRow } from '../utils/symbology';
import {
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  MousePointer,
  Video,
  Magnet,
  Upload,
  FolderOpen,
  Undo2,
  Redo2,
  Compass
} from 'lucide-react';
import { computePlanFramingBounds, MAP_X, MAP_Y, MAP_W, MAP_H } from '../utils/framing';

interface CanvasEditorProps {
  cadBackgroundImageUrl: string | null;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  cameraPreset: CameraInsertionPreset;
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
  metadata: ProjectMetadata;
  setMetadata?: React.Dispatch<React.SetStateAction<ProjectMetadata>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  theme: CadTheme;
  showFov: boolean;
  showGrid: boolean;
  snapToGrid?: boolean;
  setSnapToGrid?: (snap: boolean) => void;
  gridSize?: number;
  setGridSize?: (size: number) => void;
  layers?: LayerVisibility;
  locks?: LayerLocks;
  onToggleLayerManager?: () => void;
  onCanvasRefReady?: (canvas: HTMLCanvasElement) => void;
  onOpenConvertModal?: () => void;
  onLoadProjectJson?: () => void;
  onSaveProjectJson?: () => void;
  onImageDropped?: (file: File) => void;
  onCadmapDropped?: (file: File) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

// Fixed logical sheet dimensions (A3 Landscape aspect ratio 2200 x 1555 px)
export const SHEET_W = 2200;
export const SHEET_H = 1555;
export { MAP_X, MAP_Y, MAP_W, MAP_H };

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  cadBackgroundImageUrl,
  activeTool,
  setActiveTool,
  cameraPreset,
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
  setAnnotations,
  metadata,
  setMetadata,
  selectedId,
  setSelectedId,
  theme,
  showFov,
  showGrid,
  snapToGrid = false,
  setSnapToGrid,
  gridSize = 5,
  setGridSize,
  layers = {
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
  },
  locks = {
    structures: false,
    cameras: false,
    electricFences: false,
    wiring: false,
    antennas: false,
    audioAlarms: false
  },
  onToggleLayerManager,
  onCanvasRefReady,
  onOpenConvertModal,
  onLoadProjectJson,
  onSaveProjectJson,
  onImageDropped,
  onCadmapDropped,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onInteractionStart,
  onInteractionEnd
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState<number>(0.65);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isDraggingLabel, setIsDraggingLabel] = useState(false);
  const [isRotatingItem, setIsRotatingItem] = useState(false);
  const [isRotatingNorth, setIsRotatingNorth] = useState(false);
  const [draggingVertex, setDraggingVertex] = useState<{
    kind: 'structure' | 'fence' | 'wiring';
    id: string;
    index: number;
  } | null>(null);
  const [draggingStructureBody, setDraggingStructureBody] = useState<{
    id: string;
    startWorld: FencePoint;
    initialPoints: FencePoint[];
  } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [currentPoints, setCurrentPoints] = useState<FencePoint[]>([]);
  const [cursorPos, setCursorPos] = useState<FencePoint>({ x: 0, y: 0 });
  const [measurePoints, setMeasurePoints] = useState<FencePoint[]>([]);
  const [knownDistance, setKnownDistance] = useState('');
  const [calibrationError, setCalibrationError] = useState('');

  const [bgImgLoaded, setBgImgLoaded] = useState<number>(0);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const sigImageRef = useRef<HTMLImageElement | null>(null);

  // Fit sheet to screen helper
  const fitSheetToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const scale = Math.min((cw - 40) / SHEET_W, (ch - 40) / SHEET_H, 1.2);
    setZoom(scale);
    setPan({
      x: (cw - SHEET_W * scale) / 2,
      y: (ch - SHEET_H * scale) / 2
    });
  }, []);

  useEffect(() => {
    fitSheetToScreen();
    const observer = new ResizeObserver(fitSheetToScreen);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', fitSheetToScreen);
    return () => { observer.disconnect(); window.removeEventListener('resize', fitSheetToScreen); };
  }, [fitSheetToScreen]);

  // Load processed CAD / Orthophoto image
  useEffect(() => {
    if (!cadBackgroundImageUrl) {
      bgImageRef.current = null;
      return;
    }
    const img = new Image();
    img.src = cadBackgroundImageUrl;
    img.onload = () => {
      bgImageRef.current = img;
      setBgImgLoaded(prev => prev + 1);
    };
  }, [cadBackgroundImageUrl]);

  // Load engineer signature if present
  useEffect(() => {
    if (!metadata.engineerSignatureDataUrl) {
      sigImageRef.current = null;
      setBgImgLoaded(prev => prev + 1);
      return;
    }
    const img = new Image();
    img.src = metadata.engineerSignatureDataUrl;
    img.onload = () => {
      sigImageRef.current = img;
      setBgImgLoaded(prev => prev + 1);
    };
  }, [metadata.engineerSignatureDataUrl]);

  useEffect(() => {
    if (canvasRef.current && onCanvasRefReady) {
      onCanvasRefReady(canvasRef.current);
    }
  }, [onCanvasRefReady]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): FencePoint => ({
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    }),
    [pan, zoom]
  );

  // Snap a world coordinate to the CAD Grid relative to MAP_X, MAP_Y origin
  const snapPoint = useCallback(
    (pt: FencePoint, forceDisable = false): FencePoint => {
      return placePlanPoint(pt,snapToGrid&&!forceDisable,gridSize,{x:MAP_X,y:MAP_Y});
    },
    [snapToGrid, gridSize]
  );

  // Helper to draw a realistic 2D CAD Bullet Camera symbol in any custom color
  const drawBulletCameraSymbol = (
    ctx: CanvasRenderingContext2D,
    color: string,
    scale = 1
  ) => {
    ctx.save();
    ctx.scale(scale, scale);

    // 1. Dark Mounting Base Plate (Left/Rear)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-16, -6, 4, 12);
    ctx.strokeRect(-16, -6, 4, 12);

    // 2. Bracket Arm Neck
    ctx.fillStyle = '#334155';
    ctx.fillRect(-12, -2.5, 5, 5);
    ctx.strokeRect(-12, -2.5, 5, 5);

    // 3. Main Bullet Camera Housing (Colored dynamically per camera color!)
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-7, -7, 17, 14, 2);
    ctx.fill();
    ctx.stroke();

    // Top sunshield line detail
    ctx.beginPath();
    ctx.moveTo(-5, -4.5);
    ctx.lineTo(8, -4.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Front Dark Lens Barrel
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.3;
    ctx.fillRect(10, -5, 4, 10);
    ctx.strokeRect(10, -5, 4, 10);

    ctx.restore();
  };

  // Helper to draw a 2D CAD PTZ Dome Bullseye symbol in any custom color
  const drawPtzDomeSymbol = (
    ctx: CanvasRenderingContext2D,
    color: string,
    scale = 1
  ) => {
    ctx.save();
    ctx.scale(scale, scale);

    // Outer colored ring
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White separator ring
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dark inner dome core
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Center specular dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1, -1, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Helper to draw a 2D CAD Horn Speaker (Bocina de Audio) symbol
  const drawSpeakerHornSymbol = (
    ctx: CanvasRenderingContext2D,
    color: string,
    scale = 1,
    withWaves = true
  ) => {
    ctx.save();
    ctx.scale(scale, scale);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-13, -4.5, 6, 9);
    ctx.strokeRect(-13, -4.5, 6, 9);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-7, -2.5, 3, 5);
    ctx.strokeRect(-7, -2.5, 3, 5);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-4, -4.5);
    ctx.lineTo(8, -10.5);
    ctx.lineTo(8, 10.5);
    ctx.lineTo(-4, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillRect(8, -11.5, 2.5, 23);
    ctx.strokeRect(8, -11.5, 2.5, 23);

    if (withWaves) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let r = 16; r <= 28; r += 6) {
        ctx.beginPath();
        ctx.arc(6, 0, r, -Math.PI / 3.2, Math.PI / 3.2);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Helper to render the entire CAD Sheet onto any 2D context (screen OR high-res PDF export)
  const renderCadSheet = useCallback(
    (ctx: CanvasRenderingContext2D, isExportMode = false) => {
      const isDarkSheet = theme === 'autocad-dark' || theme === 'blueprint-blue';
      const sheetBg = isDarkSheet ? '#0b1322' : '#ffffff';
      const inkColor = isDarkSheet ? '#e2e8f0' : '#000000';
      const subInkColor = isDarkSheet ? '#94a3b8' : '#334155';

      // 1. Sheet Paper Background
      ctx.fillStyle = sheetBg;
      ctx.fillRect(0, 0, SHEET_W, SHEET_H);

      // 2. Outer & Inner Normative CAD Frame (1..8 horizontal, A..F vertical)
      const outerM = 22;
      const innerM = 52;
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(outerM, outerM, SHEET_W - outerM * 2, SHEET_H - outerM * 2);

      ctx.lineWidth = 3.2;
      ctx.strokeRect(innerM, innerM, SHEET_W - innerM * 2, SHEET_H - innerM * 2);

      const cols = 8;
      const colW = (SHEET_W - innerM * 2) / cols;
      ctx.font = 'bold 14px "Plus Jakarta Sans", monospace';
      ctx.fillStyle = inkColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 1.2;

      for (let i = 0; i < cols; i++) {
        const cx = innerM + i * colW + colW / 2;
        ctx.fillText(String(i + 1), cx, (outerM + innerM) / 2);
        ctx.fillText(String(i + 1), cx, SHEET_H - (outerM + innerM) / 2);
        if (i > 0) {
          const divX = innerM + i * colW;
          ctx.beginPath();
          ctx.moveTo(divX, outerM);
          ctx.lineTo(divX, innerM);
          ctx.moveTo(divX, SHEET_H - innerM);
          ctx.lineTo(divX, SHEET_H - outerM);
          ctx.stroke();
        }
      }

      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      const rowH = (SHEET_H - innerM * 2) / rows.length;
      for (let j = 0; j < rows.length; j++) {
        const cy = innerM + j * rowH + rowH / 2;
        ctx.fillText(rows[j], (outerM + innerM) / 2, cy);
        ctx.fillText(rows[j], SHEET_W - (outerM + innerM) / 2, cy);
        if (j > 0) {
          const divY = innerM + j * rowH;
          ctx.beginPath();
          ctx.moveTo(outerM, divY);
          ctx.lineTo(innerM, divY);
          ctx.moveTo(SHEET_W - innerM, divY);
          ctx.lineTo(SHEET_W - outerM, divY);
          ctx.stroke();
        }
      }

      // 3. Main Map Viewport Area (Clipped to MAP_X, MAP_Y, MAP_W, MAP_H)
      ctx.save();
      ctx.beginPath();
      ctx.rect(MAP_X, MAP_Y, MAP_W, MAP_H);
      ctx.clip();

      ctx.fillStyle = isDarkSheet ? '#0f172a' : '#f1f5f9';
      ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);

      // Draw Treated Google Maps Orthophoto fitted to exact framing bounds
      if (layers.mapBackground && bgImageRef.current) {
        const img = bgImageRef.current;
        const bounds = computePlanFramingBounds(img.width, img.height);
        ctx.drawImage(img, bounds.x, bounds.y, bounds.w, bounds.h);

        // Technical framing border around the plan
        ctx.strokeStyle = isDarkSheet ? 'rgba(56, 189, 248, 0.45)' : 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
      } else if (!isExportMode) {
        // Technical framing guide when no plan image is attached
        ctx.save();
        ctx.strokeStyle = isDarkSheet ? 'rgba(56, 189, 248, 0.18)' : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(MAP_X + 60, MAP_Y + 60, MAP_W - 120, MAP_H - 120);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Draw Fine Architectural CAD Coordinate Grid over the Orthophoto
      if ((showGrid || (snapToGrid && !isExportMode)) && layers.grid) {
        const guideStep = visibleGridStep(gridSize,zoom);
        // Screen guides never force positions; free placement remains fully continuous.
        if (!isExportMode) {
          ctx.strokeStyle = isDarkSheet
            ? 'rgba(56, 189, 248, 0.11)'
            : 'rgba(100, 116, 139, 0.11)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let gx = MAP_X; gx <= MAP_X + MAP_W; gx += guideStep) {
            ctx.moveTo(gx, MAP_Y);
            ctx.lineTo(gx, MAP_Y + MAP_H);
          }
          for (let gy = MAP_Y; gy <= MAP_Y + MAP_H; gy += guideStep) {
            ctx.moveTo(MAP_X, gy);
            ctx.lineTo(MAP_X + MAP_W, gy);
          }
          ctx.stroke();
        }

        // Printed guides retain their spacing; interactive guides adapt to zoom.
        if (showGrid) {
          const gridStep = isExportMode ? 70 : guideStep*5;
          ctx.strokeStyle = isDarkSheet
            ? 'rgba(56, 189, 248, 0.24)'
            : 'rgba(100, 116, 139, 0.34)';
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          for (let gx = MAP_X; gx <= MAP_X + MAP_W; gx += gridStep) {
            ctx.moveTo(gx, MAP_Y);
            ctx.lineTo(gx, MAP_Y + MAP_H);
          }
          for (let gy = MAP_Y; gy <= MAP_Y + MAP_H; gy += gridStep) {
            ctx.moveTo(MAP_X, gy);
            ctx.lineTo(MAP_X + MAP_W, gy);
          }
          ctx.stroke();
        }
      }

      // 3B. DRAW EDITABLE FLOOR PLAN PERIMETERS & CONSTRUCTION STRUCTURES (CAD)
      if (layers.structures !== false) {
        structures.forEach(st => {
          if (st.points.length < 2) return;
          const isSelected = selectedId === st.id && !isExportMode;
          const baseStroke = isDarkSheet
            ? st.type === 'perimeter'
              ? '#38bdf8'
              : '#e2e8f0'
            : st.strokeColor || '#0f172a';

          ctx.save();

          ctx.beginPath();
          ctx.moveTo(st.points[0].x, st.points[0].y);
          for (let i = 1; i < st.points.length; i++) {
            ctx.lineTo(st.points[i].x, st.points[i].y);
          }
          if (st.closed && st.points.length >= 3) {
            ctx.closePath();
          }

          if (st.closed && st.points.length >= 3) {
            if (st.fillOpacity > 0) {
              ctx.fillStyle = isDarkSheet
                ? `rgba(15, 23, 42, ${Math.min(0.65, st.fillOpacity + 0.15)})`
                : `rgba(255, 255, 255, ${st.fillOpacity})`;
              ctx.fill();
            }

            if (st.hatchPattern !== 'none') {
              ctx.save();
              ctx.clip();

              let minX = Infinity,
                maxX = -Infinity,
                minY = Infinity,
                maxY = -Infinity;
              st.points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
              });

              ctx.strokeStyle = isDarkSheet
                ? 'rgba(148, 163, 184, 0.25)'
                : 'rgba(15, 23, 42, 0.22)';
              ctx.lineWidth = 0.85;

              if (st.hatchPattern === 'roof-lines') {
                const p0 = st.points[0];
                const p1 = st.points[1];
                const edgeAngle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
                const cx = (minX + maxX) / 2;
                const cy = (minY + maxY) / 2;
                const diag = Math.hypot(maxX - minX, maxY - minY);

                ctx.translate(cx, cy);
                ctx.rotate(edgeAngle);
                ctx.beginPath();
                for (let d = -diag; d <= diag; d += 12) {
                  ctx.moveTo(d, -diag);
                  ctx.lineTo(d, diag);
                }
                ctx.stroke();
              } else if (st.hatchPattern === 'diagonal') {
                const diag = Math.hypot(maxX - minX, maxY - minY);
                ctx.beginPath();
                for (let x = minX - diag; x <= maxX + diag; x += 14) {
                  ctx.moveTo(x, minY - 10);
                  ctx.lineTo(x + (maxY - minY + 20), maxY + 10);
                }
                ctx.stroke();
              } else if (st.hatchPattern === 'solid-light') {
                ctx.fillStyle = isDarkSheet
                  ? 'rgba(56, 189, 248, 0.12)'
                  : 'rgba(226, 232, 240, 0.45)';
                ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
              }

              ctx.restore();

              ctx.beginPath();
              ctx.moveTo(st.points[0].x, st.points[0].y);
              for (let i = 1; i < st.points.length; i++) {
                ctx.lineTo(st.points[i].x, st.points[i].y);
              }
              ctx.closePath();
            }
          }

          if (!isDarkSheet) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            ctx.lineWidth = (st.strokeWidth || 2.4) + 2.4;
            ctx.setLineDash([]);
            ctx.stroke();
          }

          ctx.strokeStyle = isSelected ? '#0284c7' : baseStroke;
          ctx.lineWidth = isSelected ? (st.strokeWidth || 2.4) + 1.2 : st.strokeWidth || 2.4;

          if (st.lineStyle === 'dashed') {
            ctx.setLineDash([10, 6]);
          } else if (st.lineStyle === 'dash-dot') {
            ctx.setLineDash([16, 6, 3, 6]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          if (st.type === 'building' && st.closed && st.points.length >= 3) {
            let cx = 0,
              cy = 0;
            st.points.forEach(p => {
              cx += p.x;
              cy += p.y;
            });
            cx /= st.points.length;
            cy /= st.points.length;

            ctx.beginPath();
            st.points.forEach((p, idx) => {
              const dx = cx - p.x;
              const dy = cy - p.y;
              const len = Math.hypot(dx, dy) || 1;
              const ix = p.x + (dx / len) * 4.5;
              const iy = p.y + (dy / len) * 4.5;
              if (idx === 0) ctx.moveTo(ix, iy);
              else ctx.lineTo(ix, iy);
            });
            ctx.closePath();
            ctx.strokeStyle = isSelected
              ? 'rgba(2, 132, 199, 0.65)'
              : isDarkSheet
              ? 'rgba(226, 232, 240, 0.55)'
              : 'rgba(15, 23, 42, 0.65)';
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }

          const numPts = st.points.length;
          const segCount = st.closed ? numPts : numPts - 1;

          for (let i = 0; i < segCount; i++) {
            const p1 = st.points[i];
            const p2 = st.points[(i + 1) % numPts];
            const segPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (st.type === 'building' || st.type === 'perimeter') {
              ctx.fillStyle = isSelected ? '#0284c7' : baseStroke;
              ctx.fillRect(p1.x - 2.5, p1.y - 2.5, 5, 5);
            }

            if ((st.showDimensions || isSelected) && segPx >= 65 && layers.labels) {
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              const meters = distanceLabel(segPx, metadata.metersPerUnit);
              let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
              if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
              }

              ctx.save();
              ctx.translate(midX, midY);
              ctx.rotate(angle);

              const dimText = meters;
              ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
              const tw = ctx.measureText(dimText).width + 8;

              ctx.fillStyle = isDarkSheet ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.88)';
              ctx.fillRect(-tw / 2, -14, tw, 12);

              ctx.fillStyle = isSelected
                ? '#0284c7'
                : isDarkSheet
                ? '#bae6fd'
                : '#1e293b';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(dimText, 0, -8);
              ctx.restore();
            }
          }

          if (st.label && layers.labels && st.points.length >= 3) {
            let cx = 0,
              cy = 0;
            st.points.forEach(p => {
              cx += p.x;
              cy += p.y;
            });
            cx /= st.points.length;
            cy /= st.points.length;

            if (st.type === 'perimeter') {
              cx = (st.points[0].x + st.points[1].x) / 2;
              cy = (st.points[0].y + st.points[1].y) / 2 - 16;
            }

            ctx.font = 'bold 10.5px "Chakra Petch", "Plus Jakarta Sans", monospace';
            const tw = ctx.measureText(st.label).width + 12;
            ctx.fillStyle = isDarkSheet ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.85)';
            ctx.strokeStyle = isSelected ? '#0284c7' : 'rgba(100, 116, 139, 0.5)';
            ctx.lineWidth = 1;
            ctx.fillRect(cx - tw / 2, cy - 9, tw, 18);
            ctx.strokeRect(cx - tw / 2, cy - 9, tw, 18);

            ctx.fillStyle = isSelected ? '#0284c7' : isDarkSheet ? '#e2e8f0' : '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(st.label, cx, cy + 0.5);
          }

          if (isSelected && !locks.structures) {
            for (let i = 0; i < segCount; i++) {
              const p1 = st.points[i];
              const p2 = st.points[(i + 1) % numPts];
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2;

              ctx.fillStyle = '#ffffff';
              ctx.strokeStyle = '#0284c7';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(mx, my, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              ctx.beginPath();
              ctx.moveTo(mx - 3, my);
              ctx.lineTo(mx + 3, my);
              ctx.moveTo(mx, my - 3);
              ctx.lineTo(mx, my + 3);
              ctx.stroke();
            }

            st.points.forEach(pt => {
              ctx.fillStyle = '#0284c7';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.fillRect(pt.x - 6, pt.y - 6, 12, 12);
              ctx.strokeRect(pt.x - 6, pt.y - 6, 12, 12);
            });
          }

          ctx.restore();
        });
      }

      // 4. Draw Plan Text Annotations
      if (layers.labels) {
        annotations.forEach(ann => {
          const isSel = selectedId === ann.id && !isExportMode;
          ctx.save();
          ctx.translate(ann.x, ann.y);
          if (ann.vertical) {
            ctx.rotate(-Math.PI / 2);
          }
          ctx.font = `bold ${ann.fontSize || 15}px "Plus Jakarta Sans", monospace`;
          const textW = ctx.measureText(ann.text).width;
          const boxW = textW + 22;
          const boxH = 30;

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = isSel ? '#0284c7' : '#1e293b';
          ctx.lineWidth = isSel ? 2.5 : 1.3;
          ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
          ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ann.text, 0, 1);
          ctx.restore();
        });
      }

      // 5. Draw Electric Fences
      if (layers.electricFences) {
        fences.forEach(fence => {
          if (fence.points.length < 2) return;
          const isSelected = selectedId === fence.id && !isExportMode;

          drawFencePath(ctx, fence.points, fence, (fence.strokeWidth ?? 2.5) + (isSelected ? 1.5 : 0));
          if (layers.labels) drawFenceLabel(ctx, fence, isSelected);

          fence.points.forEach((pt, idx) => {
            if (isSelected) {
            ctx.fillStyle = '#0284c7';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isSelected ? 6 : 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            }

            if (idx < fence.points.length - 1 && layers.labels && fence.showWarningSigns !== false) {
              const nextPt = fence.points[idx + 1];
              const segLen = Math.hypot(nextPt.x - pt.x, nextPt.y - pt.y);
              if (segLen > 140) {
                const midX = (pt.x + nextPt.x) / 2;
                const midY = (pt.y + nextPt.y) / 2;
                ctx.fillStyle = '#fef08a';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.fillRect(midX - 18, midY - 9, 36, 18);
                ctx.strokeRect(midX - 18, midY - 9, 36, 18);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('ELEC.', midX, midY);
              }
            }
          });
        });
      }

      // 6. Draw Wiring / Conduit Routes
      if (layers.wiring) {
        wiring.forEach(wire => {
          if (wire.points.length < 2) return;
          const isSelected = selectedId === wire.id && !isExportMode;

          ctx.beginPath();
          ctx.moveTo(wire.points[0].x, wire.points[0].y);
          for (let i = 1; i < wire.points.length; i++) {
            ctx.lineTo(wire.points[i].x, wire.points[i].y);
          }
          ctx.strokeStyle = wire.color || '#059669';
          ctx.lineWidth = isSelected ? 4 : 2.2;
          ctx.setLineDash([8, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          if (isSelected) {
            wire.points.forEach(pt => {
              ctx.fillStyle = '#0284c7';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.fillRect(pt.x - 5, pt.y - 5, 10, 10);
              ctx.strokeRect(pt.x - 5, pt.y - 5, 10, 10);
            });
          }
        });
      }

      // 7. Polyline / Structure Polygon in progress
      if (currentPoints.length > 0 && !isExportMode) {
        const isBuildingTool = activeTool === 'draw-building';
        const isPerimTool = activeTool === 'draw-perimeter';

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.lineTo(cursorPos.x, cursorPos.y);
        if ((isBuildingTool || isPerimTool) && currentPoints.length >= 2) {
          ctx.closePath();
          ctx.fillStyle = isBuildingTool
            ? 'rgba(2, 132, 199, 0.15)'
            : 'rgba(15, 23, 42, 0.06)';
          ctx.fill();
        }

        ctx.strokeStyle =
          isElectricFenceTool(activeTool)
            ? fenceProfile(fenceTypeForTool(activeTool)).color
            : activeTool === 'wiring-conduit'
            ? '#059669'
            : '#0284c7';
        ctx.lineWidth = 2.6;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        currentPoints.forEach((pt, idx) => {
          ctx.fillStyle = idx === 0 ? '#10b981' : '#0284c7';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.fillRect(pt.x - 5, pt.y - 5, 10, 10);
          ctx.strokeRect(pt.x - 5, pt.y - 5, 10, 10);
        });
        ctx.restore();
      }

      // Helper to draw AutoCAD MLEADER Callout Box
      const drawMleaderCallout = (
        devX: number,
        devY: number,
        offX: number,
        offY: number,
        labelText: string,
        isSelected: boolean
      ) => {
        if (!layers.labels) return;
        const boxX = devX + offX;
        const boxY = devY + offY;

        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const textMetrics = ctx.measureText(labelText);
        const boxW = Math.max(46, textMetrics.width + 14);
        const boxH = 20;

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(devX, devY);
        ctx.lineTo(boxX, boxY);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(devX, devY, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = isSelected ? '#0284c7' : '#1e293b';
        ctx.lineWidth = isSelected ? 2 : 1.1;
        ctx.fillRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH);
        ctx.strokeRect(boxX - boxW / 2, boxY - boxH / 2, boxW, boxH);

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, boxX, boxY + 0.5);
      };

      // 8. Draw Antennas
      if (layers.antennas) {
        antennas.forEach(ant => {
          const isSelected = selectedId === ant.id && !isExportMode;
          const rad = (ant.rotation * Math.PI) / 180;
          const halfAngle = ((ant.beamWidth || 45) / 2) * (Math.PI / 180);
          const range = ant.range || 110;

          if (showFov && layers.cameraFov) {
            ctx.fillStyle = 'rgba(37, 99, 235, 0.16)';
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(ant.x, ant.y);
            ctx.arc(ant.x, ant.y, range, rad - halfAngle, rad + halfAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
          }

          drawMleaderCallout(
            ant.x,
            ant.y,
            ant.labelOffsetX ?? -38,
            ant.labelOffsetY ?? -28,
            ant.label,
            isSelected
          );

          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.rotate(rad);
          ctx.fillStyle = ant.color || '#2563eb';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 10, -Math.PI / 2, Math.PI / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
      }

      // 9. Draw Audio Speakers (Bocinas BO-##) & Sirens & Racks
      if (layers.audioAlarms) {
        audioAlarms.forEach(dev => {
          const isSelected = selectedId === dev.id && !isExportMode;
          const rad = (dev.rotation * Math.PI) / 180;

          drawMleaderCallout(
            dev.x,
            dev.y,
            dev.labelOffsetX ?? 38,
            dev.labelOffsetY ?? -30,
            dev.label,
            isSelected
          );

          ctx.save();
          ctx.translate(dev.x, dev.y);
          ctx.rotate(rad);

          if (isSelected) {
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
          }

          if (dev.type === 'speaker-horn') {
            drawSpeakerHornSymbol(ctx, dev.color || '#eab308', 1.15, true);
          } else if (dev.type === 'siren-strobe') {
            ctx.fillStyle = dev.color || '#dc2626';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', 0, 0);
          } else {
            ctx.fillStyle = dev.color || '#1e293b';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5;
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RACK', 0, 0);
          }

          ctx.restore();
        });
      }

      // 10. Draw Security Cameras with Dashed FOV & MLEADER Callouts
      cameras.forEach(cam => {
        const isNueva = cam.status === 'nueva';
        if (isNueva && !layers.camerasNew) return;
        if (!isNueva && !layers.camerasExisting) return;

        const camColor = cam.color || (isNueva ? '#0284c7' : '#dc2626');

        if (showFov && layers.cameraFov) {
          const range = cam.range || 85;
          const rad = (cam.rotation * Math.PI) / 180;

          if (cam.type === 'camera-ptz' || cam.type === 'camera-fisheye') {
            ctx.save();
            ctx.translate(cam.x, cam.y);

            ctx.fillStyle = `${camColor}1c`;
            ctx.strokeStyle = camColor;
            ctx.lineWidth = 1.3;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, range, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            const cardinals = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
            cardinals.forEach(ang => {
              ctx.save();
              ctx.rotate(ang);
              ctx.fillStyle = camColor;
              ctx.beginPath();
              ctx.moveTo(24, 0);
              ctx.lineTo(16, -4.5);
              ctx.lineTo(16, 4.5);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            });

            ctx.restore();
          } else {
            const halfAngle = ((cam.fovAngle || 52) / 2) * (Math.PI / 180);

            ctx.fillStyle = `${camColor}28`;
            ctx.strokeStyle = camColor;
            ctx.lineWidth = 1.25;
            ctx.setLineDash([5, 3]);

            ctx.beginPath();
            ctx.moveTo(cam.x, cam.y);
            ctx.arc(cam.x, cam.y, range, rad - halfAngle, rad + halfAngle);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      });

      cameras.forEach(cam => {
        const isNueva = cam.status === 'nueva';
        if (isNueva && !layers.camerasNew) return;
        if (!isNueva && !layers.camerasExisting) return;

        const isSelected = selectedId === cam.id && !isExportMode;
        const camColor = cam.color || (isNueva ? '#0284c7' : '#dc2626');
        const rad = (cam.rotation * Math.PI) / 180;

        const defaultOffX = Math.round(-Math.cos(rad) * 44);
        const defaultOffY = Math.round(-Math.sin(rad) * 44 - 12);

        drawMleaderCallout(
          cam.x,
          cam.y,
          cam.labelOffsetX ?? defaultOffX,
          cam.labelOffsetY ?? defaultOffY,
          cam.label,
          isSelected
        );

        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.rotate(rad);

        if (isSelected) {
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (cam.type === 'camera-ptz' || cam.type === 'camera-fisheye') {
          drawPtzDomeSymbol(ctx, camColor, 1.15);
        } else {
          drawBulletCameraSymbol(ctx, camColor, 1.15);
        }

        ctx.restore();

        if (isSelected) {
          const handleDist = 52;
          const hx = cam.x + Math.cos(rad) * handleDist;
          const hy = cam.y + Math.sin(rad) * handleDist;

          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(cam.x, cam.y);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hx, hy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // 11. Draw Measurement Tool
      if (measurePoints.length > 0 && !isExportMode) {
        const p1 = measurePoints[0];
        const p2 = measurePoints.length > 1 ? measurePoints[1] : cursorPos;
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const meters = distanceLabel(distPx, metadata.metersPerUnit);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.fillStyle = '#e11d48';
        const measureWidth = Math.max(60, ctx.measureText(meters).width + 20);
        ctx.fillRect(midX - measureWidth / 2, midY - 11, measureWidth, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meters, midX, midY);
      }

      // 11B. Draw Live AutoCAD OSNAP Grid Marker & Orthogonal Alignment Crosshairs
      const isCursorInMap =
        cursorPos.x >= MAP_X &&
        cursorPos.x <= MAP_X + MAP_W &&
        cursorPos.y >= MAP_Y &&
        cursorPos.y <= MAP_Y + MAP_H;

      const isSnapActiveForCursor =
        snapToGrid &&
        !isExportMode &&
        isCursorInMap &&
        (activeTool !== 'select' || isDraggingItem || Boolean(draggingVertex));

      if (isSnapActiveForCursor) {
        ctx.save();
        // Subtle orthogonal alignment laser lines
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.lineWidth = 0.9;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cursorPos.x, MAP_Y);
        ctx.lineTo(cursorPos.x, MAP_Y + MAP_H);
        ctx.moveTo(MAP_X, cursorPos.y);
        ctx.lineTo(MAP_X + MAP_W, cursorPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Classic AutoCAD Green OSNAP Square + Crosshair at snapped coordinate
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(cursorPos.x - 6, cursorPos.y - 6, 12, 12);
        ctx.beginPath();
        ctx.moveTo(cursorPos.x - 10, cursorPos.y);
        ctx.lineTo(cursorPos.x + 10, cursorPos.y);
        ctx.moveTo(cursorPos.x, cursorPos.y - 10);
        ctx.lineTo(cursorPos.x, cursorPos.y + 10);
        ctx.stroke();
        ctx.restore();
      }

      // 12. AutoCAD UCS Coordinate Icon
      const ucsX = MAP_X + 35;
      const ucsY = MAP_Y + MAP_H - 32;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#000000';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(ucsX - 4, ucsY - 4, 8, 8);
      ctx.beginPath();
      ctx.moveTo(ucsX, ucsY);
      ctx.lineTo(ucsX, ucsY - 44);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ucsX, ucsY - 48);
      ctx.lineTo(ucsX - 3.5, ucsY - 39);
      ctx.lineTo(ucsX + 3.5, ucsY - 39);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Y', ucsX, ucsY - 55);

      ctx.beginPath();
      ctx.moveTo(ucsX, ucsY);
      ctx.lineTo(ucsX + 44, ucsY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ucsX + 48, ucsY);
      ctx.lineTo(ucsX + 39, ucsY - 3.5);
      ctx.lineTo(ucsX + 39, ucsY + 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', ucsX + 52, ucsY);

      ctx.restore(); // End Map Viewport Clip

      // Map Viewport Outer Border
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(MAP_X, MAP_Y, MAP_W, MAP_H);

      // 13. Bottom-Left Plan Title Block (Below Map Viewport)
      const titleBubbleX = MAP_X + 26;
      const titleBubbleY = MAP_Y + MAP_H + 54;
      const bubbleR = 23;

      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(titleBubbleX, titleBubbleY, bubbleR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(titleBubbleX - bubbleR, titleBubbleY);
      ctx.lineTo(titleBubbleX + bubbleR, titleBubbleY);
      ctx.stroke();

      ctx.fillStyle = inkColor;
      ctx.font = 'bold 13px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', titleBubbleX, titleBubbleY - 10);
      ctx.font = 'bold 11px "Chakra Petch", sans-serif';
      ctx.fillText(metadata.sheetNumber || 'L-01', titleBubbleX, titleBubbleY + 10);

      const titleTextX = titleBubbleX + bubbleR + 16;
      ctx.textAlign = 'left';
      ctx.font = 'bold 26px "Chakra Petch", sans-serif';
      ctx.fillStyle = inkColor;
      const mainTitle =
        metadata.drawingTitle || 'PLANTA GENERAL - UBICACIÓN DE CÁMARAS CCTV Y BOCINAS';
      ctx.fillText(mainTitle, titleTextX, titleBubbleY - 7);

      const ruleEndX = MAP_X + 1020;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(titleBubbleX + bubbleR, titleBubbleY + 7);
      ctx.lineTo(ruleEndX, titleBubbleY + 7);
      ctx.stroke();

      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(titleBubbleX + bubbleR, titleBubbleY + 11);
      ctx.lineTo(ruleEndX, titleBubbleY + 11);
      ctx.stroke();

      ctx.font = '600 13px "Chakra Petch", monospace';
      ctx.fillStyle = subInkColor;
      ctx.fillText(
        metadata.drawingSubtitle ||
          `ESCALA: ${metadata.scale || 'S/E'} · BASE: IMAGEN SATELITAL REFERENCIAL`,
        titleTextX,
        titleBubbleY + 25
      );

      // =========================================================================
      // 14. RIGHT-SIDE FORMAL ENGINEERING COLUMN (DYNAMIC COLOR SYMBOLOGY)
      // =========================================================================
      const sideX = 1808;
      const sideW = SHEET_W - innerM - sideX;
      const sideTop = innerM;
      const sideBottom = SHEET_H - innerM;

      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sideX, sideTop);
      ctx.lineTo(sideX, sideBottom);
      ctx.stroke();

      // 14A. NORTH COMPASS ARROW BLOCK (Rotación Dinámica Ajustable)
      const northCenterX = sideX + sideW / 2;
      const northCenterY = sideTop + 118;
      const northR = 50;
      const northAngle = metadata.northAngle || 0;
      const northRad = (northAngle * Math.PI) / 180;

      // Anillo exterior con marcas técnicas
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(northCenterX, northCenterY, northR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(northCenterX, northCenterY, northR - 5, 0, Math.PI * 2);
      ctx.stroke();

      // Graduaciones cardinales en el anillo
      for (let deg = 0; deg < 360; deg += 30) {
        const tickRad = (deg * Math.PI) / 180;
        const isMajor = deg % 90 === 0;
        const rInner = isMajor ? northR - 11 : northR - 6;
        ctx.lineWidth = isMajor ? 1.6 : 0.8;
        ctx.beginPath();
        ctx.moveTo(northCenterX + Math.cos(tickRad) * rInner, northCenterY + Math.sin(tickRad) * rInner);
        ctx.lineTo(northCenterX + Math.cos(tickRad) * northR, northCenterY + Math.sin(tickRad) * northR);
        ctx.stroke();
      }

      // Aguja Rotatoria del Norte
      ctx.save();
      ctx.translate(northCenterX, northCenterY);
      ctx.rotate(northRad);

      // Letra 'N' orientada al norte real
      ctx.fillStyle = inkColor;
      ctx.font = 'bold 18px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('N', 0, -northR - 7);

      const tipY = -northR - 2;
      const baseLeftX = -15;
      const baseRightX = 15;
      const baseY = northR - 12;
      const notchY = 16;

      // Mitad Izquierda (Clara)
      ctx.fillStyle = sheetBg;
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, tipY);
      ctx.lineTo(baseLeftX, baseY);
      ctx.lineTo(0, notchY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mitad Derecha (Tinta Sólida)
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.moveTo(0, tipY);
      ctx.lineTo(baseRightX, baseY);
      ctx.lineTo(0, notchY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Punto pivote central
      ctx.fillStyle = sheetBg;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // Indicador de ángulo debajo del compás
      ctx.fillStyle = subInkColor;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NORTE ${Math.round(northAngle)}°`, northCenterX, northCenterY + northR + 18);

      let curY = sideTop + 198;

      const drawBlackSectionBar = (title: string, yPos: number) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(sideX, yPos, sideW, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Chakra Petch", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, sideX + 14, yPos + 15);
      };

      drawBlackSectionBar('SIMBOLOGÍA', curY);
      curY += 30;

      ctx.fillStyle = subInkColor;
      ctx.font = 'bold 10.5px "Chakra Petch", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('CANT.', sideX + sideW - 14, curY + 13);
      curY += 20;

      // Build Dynamic Symbology Rows based on actual placed camera colors & criteria!
      const { rows: dynamicRows, codeSummaryLines } = buildDynamicSymbology(
        cameras,
        audioAlarms,
        antennas,
        fences,
        structures.length,
        cameraPreset, wiring
      );

      // Adapt row height if many distinct camera colors/criteria are added
      const maxSymRows = dynamicRows.length;
      const legendSpace = Math.max(100, sideBottom - 370 - curY - 160);
      const rowHeight = Math.max(24, Math.min(51, Math.floor(legendSpace / Math.max(1,maxSymRows))));

      const drawSymRow = (
        drawIconFn: (cx: number, cy: number) => void,
        title: string,
        subtitle: string,
        countStr: string,
        yPos: number
      ) => {
        drawIconFn(sideX + 38, yPos + rowHeight / 2);

        ctx.save();
        ctx.fillStyle = inkColor;
        drawFittedText(ctx, title, sideX + 72, yPos + 5, sideW - 132, rowHeight < 34 ? rowHeight - 10 : rowHeight - 21,
          { size: rowHeight < 34 ? 10.5 : 12.5, minSize: 8, maxLines: rowHeight < 34 ? 1 : 2 });
        ctx.fillStyle = subInkColor;
        if (rowHeight >= 34) drawFittedText(ctx, subtitle, sideX + 72, yPos + rowHeight - 16, sideW - 132, 13,
          { size: 10, minSize: 9, weight: '600', maxLines: 1 });
        ctx.fillStyle = inkColor;
        drawFittedText(ctx, countStr, sideX + sideW - 48, yPos + 5, 32, rowHeight - 10,
          { size: 14.5, minSize: 11, maxLines: 1, align: 'right', middle: true });
        ctx.restore();

        ctx.strokeStyle = isDarkSheet ? '#334155' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sideX + 12, yPos + rowHeight);
        ctx.lineTo(sideX + sideW - 12, yPos + rowHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      dynamicRows.slice(0, maxSymRows).forEach((row: DynamicSymbologyRow) => {
        drawSymRow(
          (cx, cy) => {
            ctx.save();
            ctx.translate(cx, cy);
            if (row.symbolKind === 'ptz') {
              drawPtzDomeSymbol(ctx, row.color, 1.0);
            } else if (row.symbolKind === 'bullet' || row.symbolKind === 'dome') {
              drawBulletCameraSymbol(ctx, row.color, 1.05);
            } else if (row.symbolKind === 'speaker') {
              drawSpeakerHornSymbol(ctx, row.color, 0.95, false);
            } else if (row.symbolKind === 'antenna') {
              ctx.fillStyle = row.color;
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.arc(0, 0, 9, -Math.PI / 2, Math.PI / 2);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            } else if (row.symbolKind === 'fence') {
              drawFencePath(ctx,[{x:-20,y:0},{x:20,y:0}],{mountingType:row.fenceMountingType,color:row.color});
            } else if (row.symbolKind === 'wiring') {
              ctx.strokeStyle=row.color;ctx.lineWidth=2.5;ctx.setLineDash([6,3]);ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(18,0);ctx.stroke();ctx.setLineDash([]);
            } else if (row.symbolKind === 'siren') {
              ctx.fillStyle=row.color;ctx.strokeStyle=inkColor;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.stroke();
              ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',0,0);
            } else if (row.symbolKind === 'rack') {
              ctx.fillStyle=row.color;ctx.fillRect(-11,-10,22,20);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;
              for(const y of [-5,0,5]){ctx.beginPath();ctx.moveTo(-7,y);ctx.lineTo(7,y);ctx.stroke();}
            } else {
              ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
              ctx.strokeStyle = inkColor;
              ctx.lineWidth = 2;
              ctx.fillRect(-15, -8, 30, 16);
              ctx.strokeRect(-15, -8, 30, 16);
              ctx.lineWidth = 0.8;
              ctx.strokeRect(-12, -5, 24, 10);
            }
            ctx.restore();
          },
          row.title,
          row.subtitle,
          String(row.count),
          curY
        );
        curY += rowHeight;
      });

      if (!dynamicRows.length) {
        ctx.fillStyle=subInkColor;ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('SIN ELEMENTOS INCORPORADOS',sideX+14,curY+20);curY+=32;
      }
      curY += 12;

      // Dynamic Summary Legend Footer Codes

      ctx.textAlign = 'left';
      ctx.fillStyle = inkColor;
      ctx.font = '600 11px "Chakra Petch", monospace';
      codeSummaryLines.slice(0, 3).forEach((line: string, idx: number) => {
        ctx.fillText(line.slice(0, 34), sideX + 14, curY + idx * 16);
      });

      const totY = curY + Math.max(1, codeSummaryLines.slice(0, 3).length) * 16 + 4;
      ctx.font = 'bold 12px "Chakra Petch", monospace';
      ctx.fillText(
        dynamicRows.length ? `TOTAL: ${dynamicRows.reduce((sum,row)=>sum+row.count,0)} ELEMENTOS` : '',
        sideX + 14,
        totY
      );

      curY = totY + 20;

      // 14C. NOTAS HEADER BAR
      drawBlackSectionBar('NOTAS', curY);
      curY += 44;

      ctx.fillStyle = inkColor;
      ctx.textAlign = 'left';
      const noteBottom = sideBottom - 370 - (sigImageRef.current ? 70 : 16);
      const noteFont = (run: { bold?: boolean; italic?: boolean }, size: number) => `${run.italic ? 'italic ' : ''}${run.bold ? 700 : 400} ${size}px "Chakra Petch", Arial, sans-serif`;
      const fittedNotes = fitNotes(getNoteRuns(metadata), sideW - 28, noteBottom - curY, (text, run, size) => {
        ctx.font = noteFont(run, size);
        return ctx.measureText(text).width;
      });
      for (const line of fittedNotes.lines) {
        let x = sideX + 14;
        ctx.textBaseline = 'alphabetic';
        for (const run of line.runs) {
          ctx.font = noteFont(run, fittedNotes.size);
          ctx.fillText(run.text, x, curY);
          const width = ctx.measureText(run.text).width;
          if (run.underline) { ctx.beginPath(); ctx.lineWidth = 0.8; ctx.strokeStyle = inkColor; ctx.moveTo(x, curY + 2); ctx.lineTo(x + width, curY + 2); ctx.stroke(); }
          x += width;
        }
        curY += fittedNotes.lineHeight;
      }
      if (fittedNotes.remainder.length) {
        ctx.font = '700 12px "Chakra Petch", Arial, sans-serif';
        ctx.fillText('CONTINÚA EN ANEXO DE NOTAS', sideX + 14, Math.max(curY + 10, noteBottom - 8));
      }

      // 14D. BOTTOM COMPANY BANNER & FORMAL TITLE BLOCK TABLE
      const tableBottom = sideBottom;
      const bannerY = tableBottom - 370;
      const bannerH = 52;

      ctx.fillStyle = '#000000';
      ctx.fillRect(sideX, bannerY, sideW, bannerH);
      ctx.fillStyle = '#ffffff';
      drawFittedText(ctx, 'ASSUR CHILE', sideX + 16, bannerY + 8, sideW - 32, bannerH - 16,
        { size: 27, minSize: 22, maxLines: 1, align: 'center', middle: true });

      let cellY = bannerY + bannerH;

      const drawTitleCell = (
        label: string,
        valLines: string[],
        xPos: number,
        yPos: number,
        wCell: number,
        hCell: number
      ) => {
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(xPos, yPos, wCell, hCell);

        ctx.save();
        ctx.fillStyle = subInkColor;
        drawFittedText(ctx, label, xPos + 12, yPos + 8, wCell - 24, 12,
          { size: 9.5, minSize: 9, weight: '600', maxLines: 1 });
        ctx.fillStyle = inkColor;
        drawFittedText(ctx, valLines.join(' '), xPos + 12, yPos + 25, wCell - 24, hCell - 31,
          { size: 13.5, minSize: 10.5, maxLines: 3 });
        ctx.restore();
      };

      drawTitleCell('PROYECTO', [(metadata.projectName || '').toUpperCase()], sideX, cellY, sideW, 76);
      cellY += 76;
      drawTitleCell('CLIENTE', [(metadata.clientName || '').toUpperCase()], sideX, cellY, sideW, 68);
      cellY += 68;
      drawTitleCell('CONTENIDO', [(metadata.location || 'PLANTA GENERAL · CCTV Y AUDIO').toUpperCase()], sideX, cellY, sideW, 76);
      cellY += 76;

      const halfW = sideW / 2;
      drawTitleCell('ESCALA', [metadata.scale || 'S/E'], sideX, cellY, halfW, 48);
      drawTitleCell('FECHA', [metadata.date || '16-10-2026'], sideX + halfW, cellY, halfW, 48);
      cellY += 48;

      const remH = tableBottom - cellY;
      drawTitleCell('LÁMINA', [metadata.sheetNumber || 'L-01'], sideX, cellY, halfW, remH);
      drawTitleCell('REV.', [metadata.revision || 'D'], sideX + halfW, cellY, halfW, remH);

      if (sigImageRef.current) {
        ctx.drawImage(sigImageRef.current, sideX + sideW - 115, bannerY - 52, 100, 46);
      }
      return fittedNotes.remainder;
    },
    [
      theme,
      zoom,
      layers,
      locks,
      showGrid,
      showFov,
      snapToGrid,
      gridSize,
      isDraggingItem,
      draggingVertex,
      structures,
      annotations,
      fences,
      wiring,
      antennas,
      audioAlarms,
      cameras,
      cameraPreset,
      selectedId,
      currentPoints,
      cursorPos,
      measurePoints,
      activeTool,
      metadata,
      bgImgLoaded
    ]
  );

  // Main Screen Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (container) {
      if (
        canvas.width !== container.clientWidth ||
        canvas.height !== container.clientHeight
      ) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    }

    const w = canvas.width;
    const h = canvas.height;

    // Soft Warm Architectural Drafting Table Background (No harsh deep navy blue!)
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SHEET_W, SHEET_H);
    ctx.shadowColor = 'transparent';

    renderCadSheet(ctx, false);

    ctx.restore();
  }, [pan, zoom, renderCadSheet]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
    const newZoom = Math.max(0.2, Math.min(4.5, zoom * zoomFactor));

    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  function distToSegment(p: FencePoint, v: FencePoint, w: FencePoint) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // Hit-test devices, callout labels, and editable CAD structures
  const findItemAt = (worldPt: FencePoint) => {
    if (!locks.cameras && layers.labels) {
      for (const cam of cameras) {
        const isNueva = cam.status === 'nueva';
        if (isNueva && !layers.camerasNew) continue;
        if (!isNueva && !layers.camerasExisting) continue;
        const rad = (cam.rotation * Math.PI) / 180;
        const offX = cam.labelOffsetX ?? Math.round(-Math.cos(rad) * 44);
        const offY = cam.labelOffsetY ?? Math.round(-Math.sin(rad) * 44 - 12);
        const lx = cam.x + offX;
        const ly = cam.y + offY;
        if (Math.abs(worldPt.x - lx) <= 28 && Math.abs(worldPt.y - ly) <= 13) {
          return { type: 'camera-label', id: cam.id, lx, ly };
        }
      }
    }

    if (!locks.cameras) {
      for (const cam of cameras) {
        const isNueva = cam.status === 'nueva';
        if (isNueva && !layers.camerasNew) continue;
        if (!isNueva && !layers.camerasExisting) continue;
        if (Math.hypot(cam.x - worldPt.x, cam.y - worldPt.y) <= 22) {
          return { type: 'camera', id: cam.id };
        }
      }
    }

    if (layers.audioAlarms && !locks.audioAlarms) {
      for (const dev of audioAlarms) {
        const offX = dev.labelOffsetX ?? 38;
        const offY = dev.labelOffsetY ?? -30;
        const lx = dev.x + offX;
        const ly = dev.y + offY;
        if (layers.labels && Math.abs(worldPt.x - lx) <= 28 && Math.abs(worldPt.y - ly) <= 13) {
          return { type: 'audio-label', id: dev.id, lx, ly };
        }
        if (Math.hypot(dev.x - worldPt.x, dev.y - worldPt.y) <= 22) {
          return { type: 'audio', id: dev.id };
        }
      }
    }

    if (layers.antennas && !locks.antennas) {
      for (const ant of antennas) {
        if (Math.hypot(ant.x - worldPt.x, ant.y - worldPt.y) <= 22) {
          return { type: 'antenna', id: ant.id };
        }
      }
    }

    if (layers.labels) {
      for (const ann of annotations) {
        if (Math.hypot(ann.x - worldPt.x, ann.y - worldPt.y) <= 35) {
          return { type: 'annotation', id: ann.id };
        }
      }
    }

    if (layers.electricFences && !locks.electricFences && layers.labels) {
      const labelCtx=canvasRef.current?.getContext('2d');
      if(labelCtx)for(const fence of fences) {
        const box=fenceLabelLayout(labelCtx,fence);
        if(box&&Math.abs(worldPt.x-box.x)<=box.width/2+4&&Math.abs(worldPt.y-box.y)<=box.height/2+4)
          return {type:'fence-label',id:fence.id,lx:box.x,ly:box.y};
      }
    }
    if (layers.electricFences && !locks.electricFences) {
      for (const fence of fences) {
        for (let i = 0; i < fence.points.length - 1; i++) {
          if (distToSegment(worldPt, fence.points[i], fence.points[i + 1]) <= 10) {
            return { type: 'fence', id: fence.id };
          }
        }
      }
    }

    if (layers.wiring && !locks.wiring) {
      for (const wire of wiring) {
        for (let i = 0; i < wire.points.length - 1; i++) {
          if (distToSegment(worldPt, wire.points[i], wire.points[i + 1]) <= 10) {
            return { type: 'wiring', id: wire.id };
          }
        }
      }
    }

    if (layers.structures !== false && !locks.structures) {
      for (let sIdx = structures.length - 1; sIdx >= 0; sIdx--) {
        const st = structures[sIdx];
        const numPts = st.points.length;
        if (numPts < 2) continue;

        if (st.label && numPts >= 3) {
          let cx = 0,
            cy = 0;
          st.points.forEach(p => {
            cx += p.x;
            cy += p.y;
          });
          cx /= numPts;
          cy /= numPts;
          if (st.type === 'perimeter') {
            cx = (st.points[0].x + st.points[1].x) / 2;
            cy = (st.points[0].y + st.points[1].y) / 2 - 16;
          }
          if (Math.abs(worldPt.x - cx) <= 65 && Math.abs(worldPt.y - cy) <= 14) {
            return { type: 'structure', id: st.id };
          }
        }

        const segCount = st.closed ? numPts : numPts - 1;
        for (let i = 0; i < segCount; i++) {
          const p1 = st.points[i];
          const p2 = st.points[(i + 1) % numPts];
          if (distToSegment(worldPt, p1, p2) <= 10) {
            return { type: 'structure', id: st.id };
          }
        }
      }
    }

    return null;
  };

  const finishCurrentPolyline = () => {
    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'draw-building' || activeTool === 'draw-perimeter') {
      const isPerim = activeTool === 'draw-perimeter';
      const nextNum =
        structures.filter(s => s.type === (isPerim ? 'perimeter' : 'building')).length + 1;
      const newStruct: CadStructure = {
        id: `struct-${Date.now()}`,
        type: isPerim ? 'perimeter' : 'building',
        label: isPerim ? `PERÍMETRO 0${nextNum}` : `ESTRUCTURA / NAVE 0${nextNum}`,
        points: currentPoints.map(p => ({ ...p })),
        closed: currentPoints.length >= 3,
        strokeColor: '#0f172a',
        strokeWidth: isPerim ? 2.8 : 2.5,
        lineStyle: isPerim ? 'dash-dot' : 'solid',
        fillOpacity: isPerim ? 0.04 : 0.26,
        hatchPattern: isPerim ? 'none' : 'roof-lines',
        showDimensions: true
      };
      setStructures(prev => [...prev, newStruct]);
      setSelectedId(newStruct.id);
    } else if (isElectricFenceTool(activeTool)) {
      const nextNum = fences.length + 1;
      const mountingType = fenceTypeForTool(activeTool);
      const profile = fenceProfile(mountingType);
      const newFence: ElectricFence = {
        mountingType,
        id: `fence-${Date.now()}`,
        points: [...currentPoints],
        label: nextLabel('CERCO', fences),
        status: 'nueva',
        color: profile.color,
        linesCount: 6,
        energizerVoltage: 'Por definir',
        warningSignsInterval: 50
      };
      setFences(prev => [...prev, newFence]);
      setSelectedId(newFence.id);
    } else if (activeTool === 'wiring-conduit') {
      const nextNum = wiring.length + 1;
      const newWire: WiringRoute = {
        id: `wire-${Date.now()}`,
        points: [...currentPoints],
        wireType: 'conduit-emt',
        label: nextLabel('RUTA', wiring),
        color: '#059669'
      };
      setWiring(prev => [...prev, newWire]);
      setSelectedId(newWire.id);
    }

    setCurrentPoints([]);
    setActiveTool('select');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const rawWorldPt = screenToWorld(screenX, screenY);
    const snappedPt = snapPoint(rawWorldPt);

    if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setStartPan({ x: screenX - pan.x, y: screenY - pan.y });
      return;
    }

    if (e.button === 0) {
      if (activeTool === 'measure') {
        if (measurePoints.length !== 1) {
          setMeasurePoints([snappedPt]);
        } else {
          setMeasurePoints([measurePoints[0], snappedPt]);
        }
        return;
      }

      if (
        isElectricFenceTool(activeTool) ||
        activeTool === 'wiring-conduit' ||
        activeTool === 'draw-building' ||
        activeTool === 'draw-perimeter'
      ) {
        if (
          currentPoints.length >= 3 &&
          Math.hypot(rawWorldPt.x - currentPoints[0].x, rawWorldPt.y - currentPoints[0].y) <= 18
        ) {
          finishCurrentPolyline();
          return;
        }
        setCurrentPoints(prev => [...prev, snappedPt]);
        return;
      }

      if (activeTool === 'text-annotation' && setAnnotations) {
        const newAnn: PlanAnnotation = {
          id: `ann-${Date.now()}`,
          x: snappedPt.x,
          y: snappedPt.y,
          text: 'TECHUMBRE',
          vertical: false,
          fontSize: 14
        };
        setAnnotations(prev => [...prev, newAnn]);
        setSelectedId(newAnn.id);
        setActiveTool('select');
        return;
      }

      // Placing Cameras One-by-One with Active Color & Criterion Preset + Snap-to-Grid!
      if (activeTool.startsWith('camera-')) {
        const isPtz = activeTool === 'camera-ptz';
        const camType: DeviceType =
          activeTool === 'camera-bullet-new' || activeTool === 'camera-bullet-existing'
            ? 'camera-bullet'
            : (activeTool as DeviceType);

        const prefix = isPtz ? 'PTZ' : cameraPreset.prefix || 'CN';
        const code = nextLabel(prefix, cameras);

        const newCam: CameraDevice = {
          id: `cam-${Date.now()}`,
          type: camType,
          x: snappedPt.x,
          y: snappedPt.y,
          rotation: 30,
          fovAngle: isPtz ? 360 : 52,
          range: isPtz ? 78 : 88,
          label: code,
          labelOffsetX: -46,
          labelOffsetY: -28,
          status: cameraPreset.status,
          categoryLabel: cameraPreset.categoryLabel,
          color: cameraPreset.color,
          resolution: '4MP UltraHD',
          heightMeters: 4.5
        };
        setCameras(prev => [...prev, newCam]);
        setSelectedId(newCam.id);
        return;
      }

      if (activeTool === 'antenna-ptp' || activeTool === 'antenna-omni') {
        const nextNum = antennas.length + 1;
        const newAnt: NetworkAntenna = {
          id: `ant-${Date.now()}`,
          type: activeTool,
          x: snappedPt.x,
          y: snappedPt.y,
          rotation: 0,
          beamWidth: activeTool === 'antenna-ptp' ? 45 : 360,
          range: 110,
          label: nextLabel('ANT', antennas),
          status: 'nueva',
          color: '#2563eb',
          frequency: '5.8 GHz PTP'
        };
        setAntennas(prev => [...prev, newAnt]);
        setSelectedId(newAnt.id);
        return;
      }

      if (
        activeTool === 'speaker-horn' ||
        activeTool === 'siren-strobe' ||
        activeTool === 'rack-cabinet'
      ) {
        const nextNum =
          audioAlarms.filter(a => a.type === activeTool).length + 1;
        const numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
        const newDev: AudioAlarmDevice = {
          id: `aud-${Date.now()}`,
          type: activeTool,
          x: snappedPt.x,
          y: snappedPt.y,
          rotation: 20,
          label:
            activeTool === 'speaker-horn'
              ? nextLabel('BO', audioAlarms)
              : activeTool === 'siren-strobe'
              ? nextLabel('SIR', audioAlarms)
              : nextLabel('RACK', audioAlarms),
          labelOffsetX: 44,
          labelOffsetY: -28,
          status: 'nueva',
          color:
            activeTool === 'speaker-horn'
              ? '#eab308'
              : activeTool === 'siren-strobe'
              ? '#dc2626'
              : '#0284c7'
        };
        setAudioAlarms(prev => [...prev, newDev]);
        setSelectedId(newDev.id);
        return;
      }

      if (activeTool === 'select') {
        // Hit-test para rotación interactiva de la Rosa de los Vientos / Flecha del Norte
        const innerM = 52;
        const sideX = 1808;
        const sideW = SHEET_W - innerM - sideX;
        const sideTop = innerM;
        const northCenterX = sideX + sideW / 2;
        const northCenterY = sideTop + 118;
        const distToNorth = Math.hypot(rawWorldPt.x - northCenterX, rawWorldPt.y - northCenterY);

        if (distToNorth <= 62) {
          setIsRotatingNorth(true);
          onInteractionStart?.();
          const angle = Math.atan2(rawWorldPt.y - northCenterY, rawWorldPt.x - northCenterX) * (180 / Math.PI) + 90;
          const norm = (Math.round(angle) + 360) % 360;
          const finalAngle = snapToGrid ? (Math.round(norm / 15) * 15) % 360 : norm;
          setMetadata?.(prev => ({ ...prev, northAngle: finalAngle }));
          return;
        }

        const selectedStruct = structures.find(s => s.id === selectedId);
        if (selectedStruct && !locks.structures && layers.structures !== false) {
          for (let i = 0; i < selectedStruct.points.length; i++) {
            const pt = selectedStruct.points[i];
            if (Math.hypot(rawWorldPt.x - pt.x, rawWorldPt.y - pt.y) <= 13) {
              onInteractionStart?.();
              setDraggingVertex({ kind: 'structure', id: selectedStruct.id, index: i });
              return;
            }
          }
          const numPts = selectedStruct.points.length;
          const segCount = selectedStruct.closed ? numPts : numPts - 1;
          for (let i = 0; i < segCount; i++) {
            const p1 = selectedStruct.points[i];
            const p2 = selectedStruct.points[(i + 1) % numPts];
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            if (Math.hypot(rawWorldPt.x - mx, rawWorldPt.y - my) <= 11) {
              const newPt = snapPoint({ x: mx, y: my });
              const newPoints = [...selectedStruct.points];
              newPoints.splice(i + 1, 0, newPt);
              setStructures(prev =>
                prev.map(s => (s.id === selectedStruct.id ? { ...s, points: newPoints } : s))
              );
              onInteractionStart?.();
              setDraggingVertex({ kind: 'structure', id: selectedStruct.id, index: i + 1 });
              return;
            }
          }
        }

        const selectedFence = fences.find(f => f.id === selectedId);
        if (selectedFence && !locks.electricFences) {
          for (let i = 0; i < selectedFence.points.length; i++) {
            const pt = selectedFence.points[i];
            if (Math.hypot(rawWorldPt.x - pt.x, rawWorldPt.y - pt.y) <= 12) {
              onInteractionStart?.();
              setDraggingVertex({ kind: 'fence', id: selectedFence.id, index: i });
              return;
            }
          }
        }
        const selectedWire = wiring.find(w => w.id === selectedId);
        if (selectedWire && !locks.wiring) {
          for (let i = 0; i < selectedWire.points.length; i++) {
            const pt = selectedWire.points[i];
            if (Math.hypot(rawWorldPt.x - pt.x, rawWorldPt.y - pt.y) <= 12) {
              onInteractionStart?.();
              setDraggingVertex({ kind: 'wiring', id: selectedWire.id, index: i });
              return;
            }
          }
        }

        const selectedCam = cameras.find(c => c.id === selectedId);
        if (selectedCam) {
          const rad = (selectedCam.rotation * Math.PI) / 180;
          const hx = selectedCam.x + Math.cos(rad) * 52;
          const hy = selectedCam.y + Math.sin(rad) * 52;
          if (Math.hypot(rawWorldPt.x - hx, rawWorldPt.y - hy) <= 13) {
            onInteractionStart?.();
            setIsRotatingItem(true);
            return;
          }
        }

        const found = findItemAt(rawWorldPt);
        if (found) {
          setSelectedId(found.id);
          if (found.type === 'camera-label' || found.type === 'audio-label' || found.type === 'fence-label') {
            onInteractionStart?.();
            setIsDraggingLabel(true);
            setDragOffset({ x: rawWorldPt.x - (found.lx || 0), y: rawWorldPt.y - (found.ly || 0) });
          } else if (found.type === 'structure') {
            const st = structures.find(s => s.id === found.id);
            if (st) {
              onInteractionStart?.();
              setDraggingStructureBody({
                id: st.id,
                startWorld: rawWorldPt,
                initialPoints: st.points.map(p => ({ ...p }))
              });
            }
          } else {
            onInteractionStart?.();
            setIsDraggingItem(true);
            if (found.type === 'camera') {
              const item = cameras.find(c => c.id === found.id);
              if (item) setDragOffset({ x: rawWorldPt.x - item.x, y: rawWorldPt.y - item.y });
            } else if (found.type === 'antenna') {
              const item = antennas.find(a => a.id === found.id);
              if (item) setDragOffset({ x: rawWorldPt.x - item.x, y: rawWorldPt.y - item.y });
            } else if (found.type === 'audio') {
              const item = audioAlarms.find(a => a.id === found.id);
              if (item) setDragOffset({ x: rawWorldPt.x - item.x, y: rawWorldPt.y - item.y });
            } else if (found.type === 'annotation') {
              const item = annotations.find(a => a.id === found.id);
              if (item) setDragOffset({ x: rawWorldPt.x - item.x, y: rawWorldPt.y - item.y });
            }
          }
        } else {
          setSelectedId(null);
          setIsPanning(true);
          setStartPan({ x: screenX - pan.x, y: screenY - pan.y });
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const rawWorldPt = screenToWorld(screenX, screenY);
    const snappedCursor = snapPoint(rawWorldPt);
    setCursorPos(snappedCursor);

    if (isPanning) {
      setPan({ x: screenX - startPan.x, y: screenY - startPan.y });
      return;
    }

    if (isRotatingNorth) {
      const innerM = 52;
      const sideX = 1808;
      const sideW = SHEET_W - innerM - sideX;
      const sideTop = innerM;
      const northCenterX = sideX + sideW / 2;
      const northCenterY = sideTop + 118;
      const angle = Math.atan2(rawWorldPt.y - northCenterY, rawWorldPt.x - northCenterX) * (180 / Math.PI) + 90;
      const norm = (Math.round(angle) + 360) % 360;
      const finalAngle = snapToGrid ? (Math.round(norm / 15) * 15) % 360 : norm;
      setMetadata?.(prev => ({ ...prev, northAngle: finalAngle }));
      return;
    }

    if (draggingVertex) {
      const nx = snappedCursor.x;
      const ny = snappedCursor.y;
      if (draggingVertex.kind === 'structure') {
        setStructures(prev =>
          prev.map(s => {
            if (s.id !== draggingVertex.id) return s;
            const nextPts = s.points.map((pt, idx) =>
              idx === draggingVertex.index ? { x: nx, y: ny } : pt
            );
            return { ...s, points: nextPts };
          })
        );
      } else if (draggingVertex.kind === 'fence') {
        setFences(prev =>
          prev.map(f => {
            if (f.id !== draggingVertex.id) return f;
            const nextPts = f.points.map((pt, idx) =>
              idx === draggingVertex.index ? { x: nx, y: ny } : pt
            );
            return { ...f, points: nextPts };
          })
        );
      } else if (draggingVertex.kind === 'wiring') {
        setWiring(prev =>
          prev.map(w => {
            if (w.id !== draggingVertex.id) return w;
            const nextPts = w.points.map((pt, idx) =>
              idx === draggingVertex.index ? { x: nx, y: ny } : pt
            );
            return { ...w, points: nextPts };
          })
        );
      }
      return;
    }

    if (draggingStructureBody) {
      const rawDx = rawWorldPt.x - draggingStructureBody.startWorld.x;
      const rawDy = rawWorldPt.y - draggingStructureBody.startWorld.y;
      const {x:dx,y:dy}=placePlanPoint({x:rawDx,y:rawDy},snapToGrid,gridSize);
      setStructures(prev =>
        prev.map(s =>
          s.id === draggingStructureBody.id
            ? {
                ...s,
                points: draggingStructureBody.initialPoints.map(p => ({
                  x: p.x + dx,
                  y: p.y + dy
                }))
              }
            : s
        )
      );
      return;
    }

    if (isRotatingItem && selectedId) {
      const cam = cameras.find(c => c.id === selectedId);
      if (cam) {
        let deg = Math.round((Math.atan2(rawWorldPt.y - cam.y, rawWorldPt.x - cam.x) * 180) / Math.PI);
        if (deg < 0) deg += 360;
        if (snapToGrid && !e.shiftKey) {
          deg = (Math.round(deg / 15) * 15) % 360;
        }
        setCameras(prev => prev.map(c => (c.id === selectedId ? { ...c, rotation: deg } : c)));
      }
      return;
    }

    if (isDraggingLabel && selectedId) {
      const targetLX = rawWorldPt.x - dragOffset.x;
      const targetLY = rawWorldPt.y - dragOffset.y;
      setFences(prev=>prev.map(f=> {
        if(f.id!==selectedId)return f;
        const anchor=fenceLabelAnchor(f.points);if(!anchor)return f;
        return {...f,labelOffsetX:Math.round(targetLX-anchor.x),labelOffsetY:Math.round(targetLY-anchor.y)};
      }));
      setCameras(prev =>
        prev.map(c =>
          c.id === selectedId
            ? {
                ...c,
                labelOffsetX: Math.round(targetLX - c.x),
                labelOffsetY: Math.round(targetLY - c.y)
              }
            : c
        )
      );
      setAudioAlarms(prev =>
        prev.map(a =>
          a.id === selectedId
            ? {
                ...a,
                labelOffsetX: Math.round(targetLX - a.x),
                labelOffsetY: Math.round(targetLY - a.y)
              }
            : a
        )
      );
      return;
    }

    if (isDraggingItem && selectedId) {
      const unsnappedTarget = {
        x: rawWorldPt.x - dragOffset.x,
        y: rawWorldPt.y - dragOffset.y
      };
      const snappedTarget = snapPoint(unsnappedTarget);
      const targetX = snappedTarget.x;
      const targetY = snappedTarget.y;
      setCursorPos(snappedTarget);

      setCameras(prev => prev.map(c => (c.id === selectedId ? { ...c, x: targetX, y: targetY } : c)));
      setAntennas(prev => prev.map(a => (a.id === selectedId ? { ...a, x: targetX, y: targetY } : a)));
      setAudioAlarms(prev =>
        prev.map(a => (a.id === selectedId ? { ...a, x: targetX, y: targetY } : a))
      );
      if (setAnnotations) {
        setAnnotations(prev =>
          prev.map(a => (a.id === selectedId ? { ...a, x: targetX, y: targetY } : a))
        );
      }
    }
  };

  const handleMouseUp = () => {
    const hadInteraction =
      isDraggingItem ||
      isDraggingLabel ||
      isRotatingItem ||
      isRotatingNorth ||
      Boolean(draggingVertex) ||
      Boolean(draggingStructureBody);

    setIsPanning(false);
    setIsDraggingItem(false);
    setIsDraggingLabel(false);
    setIsRotatingItem(false);
    setIsRotatingNorth(false);
    setDraggingVertex(null);
    setDraggingStructureBody(null);

    if (hadInteraction) {
      onInteractionEnd?.();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const activeEl = document.activeElement?.tagName.toLowerCase();
      const isTyping = activeEl === 'input' || activeEl === 'textarea' || activeEl === 'select';

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !isTyping) {
          setStructures(prev => prev.filter(s => s.id !== selectedId));
          setCameras(prev => prev.filter(c => c.id !== selectedId));
          setAntennas(prev => prev.filter(a => a.id !== selectedId));
          setAudioAlarms(prev => prev.filter(a => a.id !== selectedId));
          setFences(prev => prev.filter(f => f.id !== selectedId));
          setWiring(prev => prev.filter(w => w.id !== selectedId));
          if (setAnnotations) {
            setAnnotations(prev => prev.filter(a => a.id !== selectedId));
          }
          setSelectedId(null);
        }
      } else if (e.key === 'Enter') {
        if (currentPoints.length >= 2) {
          finishCurrentPolyline();
        }
      } else if (e.key === 'Escape') {
        setCurrentPoints([]);
        setMeasurePoints([]);
        setActiveTool('select');
      } else if ((e.key === 'l' || e.key === 'L') && !isTyping) {
        onToggleLayerManager?.();
      } else if ((e.key === 's' || e.key === 'S' || e.key === 'F9') && !isTyping) {
        e.preventDefault();
        setSnapToGrid?.(!snapToGrid);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, currentPoints, activeTool, onToggleLayerManager, snapToGrid, setSnapToGrid, onUndo, onRedo]);

  useEffect(() => {
    const canvas = canvasRef.current as any;
    if (canvas) {
      canvas.renderFullResolutionSheet = (): HTMLCanvasElement => {
        const offscreen = document.createElement('canvas');
        offscreen.width = SHEET_W;
        offscreen.height = SHEET_H;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          (offscreen as HTMLCanvasElement & { notesContinuation?: ReturnType<typeof getNoteRuns> }).notesContinuation = renderCadSheet(offCtx, true);
        }
        return offscreen;
      };
    }
  }, [renderCadSheet]);

  const isPlacingDevices =
    activeTool.startsWith('camera-') ||
    activeTool === 'speaker-horn' ||
    activeTool === 'antenna-ptp' ||
    activeTool === 'siren-strobe' ||
    activeTool === 'rack-cabinet';

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 min-h-0 w-full h-full flex-1 overflow-hidden select-none cursor-crosshair bg-stone-200"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={e => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.name.endsWith('.cadmap') || file.name.endsWith('.json')) {
          onCadmapDropped?.(file);
        } else if (file.type.startsWith('image/')) {
          onImageDropped?.(file);
        }
      }}
      onContextMenu={e => {
        e.preventDefault();
        if (currentPoints.length >= 2) {
          finishCurrentPolyline();
        } else {
          setCurrentPoints([]);
          setActiveTool('select');
        }
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Primary Welcoming Empty State when no plan is attached yet */}
      {!cadBackgroundImageUrl && structures.length === 0 && cameras.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20">
          <div className="bg-white/95 border border-stone-200 rounded-2xl p-7 shadow-xl max-w-md text-center space-y-4 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                Adjunta tu Plano o Captura para Comenzar
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                El encuadre y las estructuras se adaptarán exactamente a las dimensiones de tu imagen. Podrás ubicar cámaras una a una. Guarda en Mis planos para conservar el proyecto entre computadores.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenConvertModal}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Adjuntar Captura de Google Maps o Plano</span>
              </button>
              {onLoadProjectJson && (
                <button
                  type="button"
                  onClick={onLoadProjectJson}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-amber-600" />
                  <span>Cargar Proyecto Guardado (.cadmap)</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              O arrastra y suelta tu archivo de imagen o .cadmap aquí
            </p>
          </div>
        </div>
      )}

      {/* Guided Banner when placing cameras/devices one by one */}
      {isPlacingDevices && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 bg-white/95 border border-stone-300 rounded-xl px-4 py-2 shadow-lg backdrop-blur-md text-slate-800">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span
              className="w-3.5 h-3.5 rounded-sm border border-black/20 shrink-0"
              style={{
                backgroundColor: activeTool.startsWith('camera-')
                  ? cameraPreset.color
                  : '#eab308'
              }}
            />
            <span>
              Haz clic en el plano para ir ubicando{' '}
              <strong className="text-slate-900">
                {activeTool.startsWith('camera-')
                  ? `Cámaras (${cameraPreset.categoryLabel})`
                  : 'Equipos'}
              </strong>{' '}
              una a una
            </span>
          </div>
          <button
            onClick={() => setActiveTool('select')}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <MousePointer className="w-3 h-3" />
            <span>Listo (Esc)</span>
          </button>
        </div>
      )}

      {/* Subtle Empty State Helper when 0 cameras are placed and user is in Select mode */}
      {cameras.length === 0 && !isPlacingDevices && currentPoints.length === 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 bg-white/95 border border-stone-200 rounded-xl px-4 py-2 shadow-md text-xs text-slate-700">
          <Video className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Plano limpio sin cámaras precargadas. Elige color/criterio arriba y haz clic en{' '}
            <strong className="text-slate-900">+ Ubicar Cámara</strong> para situarlas una a una.
          </span>
          <button
            type="button"
            onClick={() => setActiveTool('camera-bullet-new')}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            + Empezar a Ubicar
          </button>
        </div>
      )}

      {currentPoints.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-3 bg-white/95 border border-sky-400 rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-md text-slate-800">
          <div className="flex items-center gap-2 text-sky-700 font-mono text-xs font-semibold">
            <span>
              Trazando{' '}
              {activeTool === 'draw-building'
                ? 'Estructura / Nave'
                : activeTool === 'draw-perimeter'
                ? 'Perímetro Predial'
                : isElectricFenceTool(activeTool)
                ? `Cerco ${fenceProfile(fenceTypeForTool(activeTool)).label.toLowerCase()}`
                : 'Ruta'}
              : {currentPoints.length} vértices
            </span>
          </div>
          <button
            onClick={finishCurrentPolyline}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Finalizar (Enter)</span>
          </button>
        </div>
      )}

      {/* Floating Canvas View Controls (Friendly Light Studio Style) */}
      <div className="absolute bottom-5 right-3 z-20 flex items-center gap-1 max-w-[calc(100%-24px)] overflow-x-auto whitespace-nowrap [&>button]:shrink-0 bg-white/95 border border-stone-200/90 rounded-xl p-1.5 shadow-lg backdrop-blur-md text-slate-700">
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.2, 4.5))}
          title="Acercar (Zoom +)"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.2))}
          title="Alejar (Zoom -)"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-stone-200 mx-0.5" />
        <button
          onClick={fitSheetToScreen}
          title="Encuadrar Lámina Completa"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer font-semibold"
        >
          <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
          <span>Encuadrar Lámina</span>
        </button>
        <div className="h-4 w-px bg-stone-200 mx-0.5" />
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Volver atrás / Deshacer último cambio (Ctrl+Z)"
          className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors font-semibold ${
            canUndo
              ? 'text-slate-700 hover:text-slate-900 hover:bg-stone-100 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed opacity-40 select-none'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5 text-sky-700" />
          <span className="hidden md:inline">Deshacer</span>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Volver adelante / Rehacer cambio (Ctrl+Y o Ctrl+Shift+Z)"
          className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors font-semibold ${
            canRedo
              ? 'text-slate-700 hover:text-slate-900 hover:bg-stone-100 cursor-pointer'
              : 'text-slate-300 cursor-not-allowed opacity-40 select-none'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5 text-sky-700" />
          <span className="hidden md:inline">Rehacer</span>
        </button>
        <div className="h-4 w-px bg-stone-200 mx-0.5" />
        <button
          onClick={() => setSnapToGrid?.(!snapToGrid)}
          title="Alternar posición libre y ajuste a la cuadrícula (S)"
          aria-pressed={snapToGrid}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer font-semibold ${
            snapToGrid
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
          }`}
        >
          <Magnet className={`w-3.5 h-3.5 ${snapToGrid ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{snapToGrid ? `Ajuste: ${gridSize} u` : 'Posición libre'}</span>
        </button>
        {snapToGrid && <select aria-label="Paso de ajuste a la cuadrícula" className="bg-white border border-stone-300 rounded px-1 py-1 text-xs" value={gridSize} onChange={e=>setGridSize?.(Number(e.target.value))}>
          {GRID_STEPS.map(n=><option key={n} value={n}>{n} u</option>)}
        </select>}
        <div className="h-4 w-px bg-stone-200 mx-0.5" />
        <button
          onClick={() => {
            const nextAngle = ((metadata.northAngle || 0) + 45) % 360;
            setMetadata?.(prev => ({ ...prev, northAngle: nextAngle }));
          }}
          title={`Girar Flecha del Norte del Plano: ${Math.round(metadata.northAngle || 0)}° (Clic para rotar +45°)`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-purple-700 bg-purple-50/70 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer font-semibold border border-purple-200 shadow-2xs"
        >
          <Compass
            className="w-3.5 h-3.5 text-purple-700 transition-transform duration-200"
            style={{ transform: `rotate(${metadata.northAngle || 0}deg)` }}
          />
          <span>Norte {Math.round(metadata.northAngle || 0)}°</span>
        </button>
        <div className="h-4 w-px bg-stone-200 mx-0.5" />
        <button
          onClick={onToggleLayerManager}
          title="Gestor de Capas CAD (Tecla L)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer font-semibold"
        >
          <Layers className="w-4 h-4 text-sky-600" />
          <span>Capas</span>
        </button>
        <span className="text-[11px] font-mono text-slate-500 px-2 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Live CAD Coordinate & Snap Status HUD */}
      {activeTool === 'measure' && <div className="absolute top-3 left-3 z-20 max-w-[calc(100%-24px)] bg-white rounded-lg border border-stone-300 p-3 shadow-md text-sm" onMouseDown={e => e.stopPropagation()} onMouseMove={e => e.stopPropagation()}>
        <p className="font-semibold">Medir y calibrar distancia</p>
        <p className="text-xs text-slate-600 mt-1">Marca dos puntos de distancia conocida. Un tercer clic inicia otra medición.</p>
        {measurePoints.length === 2 && <form className="flex flex-wrap gap-2 items-end mt-2" onSubmit={e => {
          e.preventDefault();
          const meters = Number(knownDistance.replace(',', '.'));
          const units = Math.hypot(measurePoints[1].x-measurePoints[0].x, measurePoints[1].y-measurePoints[0].y);
          if (!Number.isFinite(meters) || meters <= 0 || units < 1 || meters > 1e7) { setCalibrationError('Ingresa una distancia positiva y marca dos puntos diferentes.'); return; }
          setMetadata?.(prev => ({ ...prev, metersPerUnit: meters / units, scale: 'S/E' }));
          setCalibrationError('Distancia calibrada. La escala de impresión sigue siendo S/E.');
        }}>
          <label className="text-xs">Distancia real (m)<input aria-label="Distancia real en metros" className="form-control max-w-36" inputMode="decimal" value={knownDistance} onChange={e=>setKnownDistance(e.target.value)}/></label>
          <button className="action-button" type="submit">Calibrar</button>
        </form>}
        {calibrationError && <p role="status" className="text-xs mt-2">{calibrationError}</p>}
        <button className="underline text-xs mt-2" onClick={() => {setActiveTool('select');setMeasurePoints([]);}}>Terminar medición</button>
      </div>}
      <div className="absolute bottom-5 left-5 z-10 pointer-events-none hidden lg:flex items-center gap-3 text-[11px] font-medium text-slate-600 bg-white/95 px-3.5 py-1.5 rounded-lg border border-stone-200 shadow-xs backdrop-blur-xs">
        <span className="font-mono font-semibold text-slate-800 tabular-nums">
          X: {Math.round(cursorPos.x)} · Y: {Math.round(cursorPos.y)}
        </span>
        {snapToGrid && (
          <>
            <span>·</span>
            <span className="text-emerald-700 font-mono font-bold">
              AJUSTE A CUADRÍCULA ({gridSize} u)
            </span>
          </>
        )}
        <span>·</span>
        <span>{snapToGrid ? 'S: posición libre' : 'POSICIÓN LIBRE · S: ajustar a cuadrícula'}</span>
        <span>·</span>
        <span>Rueda: Zoom</span>
      </div>
    </div>
  );
};
