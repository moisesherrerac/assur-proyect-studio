export type DeviceType = 
  | 'camera-dome'
  | 'camera-bullet'
  | 'camera-ptz'
  | 'camera-fisheye'
  | 'camera-lpr'
  | 'antenna-ptp'
  | 'antenna-omni'
  | 'speaker-horn'
  | 'siren-strobe'
  | 'rack-cabinet'
  | 'pir-sensor'
  | 'access-control';

export type CameraStatus = 'nueva' | 'existente' | 'reubicar' | 'baja';

export interface CameraDevice {
  glosa?: string;
  id: string;
  type: DeviceType;
  x: number;
  y: number;
  rotation: number; // in degrees 0-360
  fovAngle: number; // in degrees e.g. 55°
  range: number; // in blueprint units / pixels
  label: string; // e.g. "CN-01", "CE-01", "PTZ-01"
  labelOffsetX?: number; // offset for MLEADER callout box
  labelOffsetY?: number;
  status: CameraStatus; // "nueva" | "existente" | "reubicar" | "baja"
  categoryLabel?: string; // Custom symbology legend criterion e.g. "NUEVA (PROYECTADA)", "EXISTENTE", "FASE 2", "REUBICAR"
  color: string; // Hex color for the camera icon, FOV, and dynamic Symbology Legend
  resolution?: string; // e.g. "4MP (2560x1440)"
  heightMeters?: number; // e.g. 4.5
  notes?: string;
  ipAddress?: string;
  model?: string;
}

export interface CameraInsertionPreset {
  color: string;
  status: CameraStatus;
  prefix: string; // e.g. "CN", "CE", "C2", "CR"
  categoryLabel: string; // e.g. "NUEVA (PROYECTADA)", "EXISTENTE", "FASE 2", "REUBICAR"
}

export interface NetworkAntenna {
  glosa?: string;
  id: string;
  type: 'antenna-ptp' | 'antenna-omni';
  x: number;
  y: number;
  rotation: number;
  beamWidth: number; // e.g. 45° or 360°
  range: number;
  label: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  status: 'nueva' | 'existente';
  color: string;
  frequency: string; // e.g. "5 GHz / 450 Mbps"
}

export interface AudioAlarmDevice {
  glosa?: string;
  id: string;
  type: 'speaker-horn' | 'siren-strobe' | 'rack-cabinet' | 'pir-sensor' | 'access-control';
  x: number;
  y: number;
  rotation: number;
  label: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  status: 'nueva' | 'existente';
  color: string;
  powerDb?: number;
  notes?: string;
}

export interface PlanAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  vertical?: boolean; // e.g., true for vertical "TECHUMBRE" label
  fontSize?: number;
}

export interface FencePoint {
  x: number;
  y: number;
}

export type StructureType = 'building' | 'perimeter' | 'wall' | 'road';
export type CadLineStyle = 'solid' | 'dashed' | 'dash-dot';
export type CadHatchPattern = 'none' | 'roof-lines' | 'diagonal' | 'solid-light';

export interface CadStructure {
  id: string;
  type: StructureType;
  label: string;
  points: FencePoint[];
  closed: boolean;
  strokeColor: string;
  strokeWidth: number;
  lineStyle: CadLineStyle;
  fillOpacity: number; // 0 to 0.6
  hatchPattern: CadHatchPattern;
  showDimensions?: boolean; // show length in meters along segments
}

export type FenceMountType = 'madera' | 'metal' | 'muro';

export interface ElectricFence {
  strokeWidth?: number;
  labelText?: string;
  labelFontSize?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  showLabel?: boolean;
  showWarningSigns?: boolean;
  mountingType?: FenceMountType;
  glosa?: string;
  id: string;
  points: FencePoint[];
  label: string;
  status: 'nueva' | 'existente';
  color: string;
  linesCount: number;
  energizerVoltage: string;
  warningSignsInterval: number;
  notes?: string;
}

export type WireType = 'conduit-emt' | 'conduit-pvc' | 'utp-cat6' | 'fibra-optica' | 'energia-ac';

export interface WiringRoute {
  glosa?: string;
  id: string;
  points: FencePoint[];
  wireType: WireType;
  label: string;
  color: string;
  notes?: string;
}

export type CadTheme =
  | 'technical-orthophoto' // Ortofoto Técnica Gris Claro (Estilo Lámina Oficial)
  | 'orthophoto-hybrid'    // Ortofoto + Bordes Vectoriales Finos
  | 'architectural-white'  // Vectorial Puro Blanco y Negro
  | 'autocad-dark'         // AutoCAD Model Space Oscuro
  | 'blueprint-blue';      // Blueprint Clásico Azul

export interface LayerVisibility {
  mapBackground: boolean;
  structures: boolean; // Perímetros y Estructuras de Construcción editables
  grid: boolean;
  camerasNew: boolean;
  camerasExisting: boolean;
  cameraFov: boolean;
  electricFences: boolean;
  wiring: boolean;
  antennas: boolean;
  audioAlarms: boolean;
  labels: boolean;
}

export interface LayerLocks {
  structures: boolean;
  cameras: boolean;
  electricFences: boolean;
  wiring: boolean;
  antennas: boolean;
  audioAlarms: boolean;
}

export interface ImageFilterSettings {
  contrast: number; // 50 - 200%
  edgeThreshold: number; // 10 - 150
  lineWidth: number; // 1 - 4
  invert: boolean;
  denoise: number; // 0 - 5
  satelliteOpacity: number; // 0 - 100% (washout / fade level in orthophoto mode)
  theme: CadTheme;
  brightness: number; // 50 - 150%
}

export interface ProjectNoteRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ProjectMetadata {
  metersPerUnit?: number;
  projectName: string;
  clientName: string;
  location: string;
  drawingTitle: string;
  drawingSubtitle: string;
  sheetNumber: string;
  revision: string;
  scale: string;
  date: string;
  engineerName: string;
  engineerTitle: string;
  engineerLicense: string;
  engineerCompany: string;
  engineerSignatureDataUrl?: string;
  northAngle?: number; // 0 to 360 degrees rotation for north arrow in plan
  projectNotes: string[];
  projectNotesRich?: ProjectNoteRun[];
}

export type ActiveTool = 
  | 'select'
  | 'draw-building'
  | 'draw-perimeter'
  | 'camera-bullet-new'
  | 'camera-bullet-existing'
  | 'camera-dome'
  | 'camera-bullet'
  | 'camera-ptz'
  | 'camera-fisheye'
  | 'camera-lpr'
  | 'antenna-ptp'
  | 'antenna-omni'
  | 'speaker-horn'
  | 'siren-strobe'
  | 'electric-fence'
  | 'electric-fence-madera'
  | 'electric-fence-metal'
  | 'electric-fence-muro'
  | 'wiring-conduit'
  | 'rack-cabinet'
  | 'text-annotation'
  | 'measure';
