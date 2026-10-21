import {
  CameraDevice,
  AudioAlarmDevice,
  NetworkAntenna,
  ElectricFence,
  CameraInsertionPreset, WiringRoute, FenceMountType
} from '../types/cad';
import { fenceProfile } from './fences';

export interface DynamicSymbologyRow {
  id: string;
  symbolKind: 'bullet' | 'ptz' | 'dome' | 'speaker' | 'siren' | 'antenna' | 'fence' | 'structure' | 'rack' | 'wiring';
  title: string;
  subtitle: string;
  color: string;
  count: number;
  codePrefix: string;
  fenceMountingType?: FenceMountType;
}

export const CAMERA_CRITERIA_PRESETS: CameraInsertionPreset[] = [
  {
    color: '#0284c7',
    status: 'nueva',
    prefix: 'CN',
    categoryLabel: 'NUEVA (PROYECTADA)'
  },
  {
    color: '#dc2626',
    status: 'existente',
    prefix: 'CE',
    categoryLabel: 'EXISTENTE'
  },
  {
    color: '#16a34a',
    status: 'nueva',
    prefix: 'CF2',
    categoryLabel: 'PROYECTADA FASE 2'
  },
  {
    color: '#d97706',
    status: 'reubicar',
    prefix: 'CR',
    categoryLabel: 'POR REUBICAR'
  },
  {
    color: '#7c3aed',
    status: 'nueva',
    prefix: 'LPR',
    categoryLabel: 'CONTROL ACCESO / LPR'
  },
  {
    color: '#475569',
    status: 'baja',
    prefix: 'CB',
    categoryLabel: 'FUERA DE SERVICIO / BAJA'
  }
];

export function getCameraDefaultCriterion(cam: CameraDevice): string {
  if (cam.categoryLabel && cam.categoryLabel.trim().length > 0) {
    return cam.categoryLabel.trim().toUpperCase();
  }
  if (cam.status === 'existente') return 'EXISTENTE';
  if (cam.status === 'reubicar') return 'POR REUBICAR';
  if (cam.status === 'baja') return 'FUERA DE SERVICIO';
  return 'NUEVA (PROYECTADA)';
}

export function buildDynamicSymbology(
  cameras: CameraDevice[],
  audioAlarms: AudioAlarmDevice[],
  antennas: NetworkAntenna[],
  fences: ElectricFence[],
  structuresCount: number,
  activePreset?: CameraInsertionPreset,
  wiring: WiringRoute[] = []
): {
  rows: DynamicSymbologyRow[];
  codeSummaryLines: string[];
} {
  const rows: DynamicSymbologyRow[] = [];
  const codeSummaryMap = new Map<string, string>();

  // 1. Group placed cameras by (symbolKind + color + criterion)
  const camGroups = new Map<
    string,
    {
      symbolKind: 'bullet' | 'ptz' | 'dome';
      title: string;
      subtitle: string;
      color: string;
      count: number;
      codePrefix: string;
    }
  >();

  cameras.forEach(cam => {
    const isPtz = cam.type === 'camera-ptz' || cam.type === 'camera-fisheye';
    const isDome = cam.type === 'camera-dome';
    const symbolKind: 'bullet' | 'ptz' | 'dome' = isPtz ? 'ptz' : isDome ? 'dome' : 'bullet';

    const title = cam.type === 'camera-fisheye' ? 'CÁMARA 360° FISHEYE' : isPtz
      ? 'DOMO PTZ 360°'
      : isDome
      ? 'CÁMARA DOMO FIJA'
      : cam.type === 'camera-lpr'
      ? 'CÁMARA LPR'
      : 'CÁMARA BULLET';

    const subtitle = getCameraDefaultCriterion(cam);
    const color = (cam.color || '#0284c7').toLowerCase();
    const key = `${cam.type}__${color}__${subtitle}`;

    const prefixMatch = cam.label.split('-')[0] || (cam.status === 'existente' ? 'CE' : 'CN');

    const existing = camGroups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      camGroups.set(key, {
        symbolKind,
        title,
        subtitle,
        color: cam.color || '#0284c7',
        count: 1,
        codePrefix: `${prefixMatch}-##`
      });
    }

    codeSummaryMap.set(`${prefixMatch}-##`, `${title} ${subtitle}`);
  });

  if (camGroups.size > 0) {
    Array.from(camGroups.values()).forEach((grp, idx) => {
      rows.push({
        id: `sym-cam-${idx}`,
        symbolKind: grp.symbolKind,
        title: grp.title,
        subtitle: grp.subtitle,
        color: grp.color,
        count: grp.count,
        codePrefix: grp.codePrefix
      });
    });
  }

  // 2. Group Audio / Speakers by color
  const speakers = audioAlarms.filter(a => a.type === 'speaker-horn');
  if (speakers.length > 0) {
    const spkByColor = new Map<string, { color: string; count: number }>();
    speakers.forEach(s => {
      const c = (s.color || '#eab308').toLowerCase();
      const prev = spkByColor.get(c);
      if (prev) prev.count += 1;
      else spkByColor.set(c, { color: s.color || '#eab308', count: 1 });
    });
    Array.from(spkByColor.values()).forEach((grp, idx) => {
      rows.push({
        id: `sym-spk-${idx}`,
        symbolKind: 'speaker',
        title: 'BOCINA DE AUDIO IP',
        subtitle: 'ALTAVOZ DISUASIVO',
        color: grp.color,
        count: grp.count,
        codePrefix: 'BO-##'
      });
    });
    codeSummaryMap.set('BO-##', 'BOCINA DE AUDIO IP');
  }

  // 3. Optional Antennas or Electric Fences if present
  for (const type of ['antenna-ptp','antenna-omni'] as const) {
    const placed=antennas.filter(a=>a.type===type);
    if (!placed.length) continue;
    rows.push({id:`sym-${type}`,symbolKind:'antenna',title:type==='antenna-ptp'?'ANTENA PTP':'ANTENA OMNIDIRECCIONAL',
      subtitle:'ENLACE DE RED',color:placed[0].color||'#2563eb',count:placed.length,codePrefix:'ANT-##'});
    codeSummaryMap.set('ANT-##','ANTENA DE RED');
  }

  for (const kind of [undefined, 'madera', 'metal', 'muro'] as const) {
    const placed = fences.filter(f => f.mountingType === kind);
    if (!placed.length) continue;
    const profile = fenceProfile(kind);
    rows.push({id:`sym-fence-${kind || 'legacy'}`,symbolKind:'fence',title:profile.title,
      subtitle:profile.label.toUpperCase(),color:placed[0].color || profile.color,count:placed.length,
      codePrefix:'CERCO',fenceMountingType:kind});
  }
  for (const type of ['siren-strobe','rack-cabinet','pir-sensor','access-control'] as const) {
    const placed = audioAlarms.filter(d=>d.type===type);
    if (!placed.length) continue;
    const title = {'siren-strobe':'SIRENA CON ESTROBO','rack-cabinet':'GABINETE / RACK','pir-sensor':'SENSOR PIR','access-control':'CONTROL DE ACCESO'}[type];
    rows.push({id:`sym-${type}`,symbolKind:type==='siren-strobe'?'siren':'rack',title,subtitle:'EQUIPAMIENTO',color:placed[0].color,count:placed.length,codePrefix:''});
  }
  for (const type of ['conduit-emt','conduit-pvc','utp-cat6','fibra-optica','energia-ac'] as const) {
    const placed = wiring.filter(w=>w.wireType===type);
    if (!placed.length) continue;
    const title = {'conduit-emt':'CANALIZACIÓN EMT','conduit-pvc':'CANALIZACIÓN PVC','utp-cat6':'CABLE UTP CAT 6','fibra-optica':'FIBRA ÓPTICA','energia-ac':'CABLE DE ENERGÍA'}[type];
    rows.push({id:`sym-${type}`,symbolKind:'wiring',title,subtitle:'TRAZADO EN PLANTA',color:placed[0].color,count:placed.length,codePrefix:'RUTA'});
  }
  if (structuresCount > 0) rows.push({
    id:'sym-struct',symbolKind:'structure',title:'PERÍMETRO / NAVE',subtitle:'TRAZADO DE PLANTA CAD',
    color:'#0f172a',count:structuresCount,codePrefix:'PLANTA'
  });

  const codeSummaryLines = Array.from(codeSummaryMap.entries())
    .slice(0, 4)
    .map(([code, desc]) => `${code} : ${desc}`);

  return { rows, codeSummaryLines };
}
