import {
  CameraDevice,
  AudioAlarmDevice,
  NetworkAntenna,
  ElectricFence,
  CameraInsertionPreset
} from '../types/cad';

export interface DynamicSymbologyRow {
  id: string;
  symbolKind: 'bullet' | 'ptz' | 'dome' | 'speaker' | 'siren' | 'antenna' | 'fence' | 'structure';
  title: string;
  subtitle: string;
  color: string;
  count: number;
  codePrefix: string;
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
  activePreset?: CameraInsertionPreset
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

    const title = isPtz
      ? 'DOMO PTZ 360°'
      : isDome
      ? 'CÁMARA DOMO FIJA'
      : cam.type === 'camera-lpr'
      ? 'CÁMARA LPR'
      : 'CÁMARA BULLET';

    const subtitle = getCameraDefaultCriterion(cam);
    const color = (cam.color || '#0284c7').toLowerCase();
    const key = `${symbolKind}__${color}__${subtitle}`;

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
  } else {
    // When 0 cameras are on the plan yet, show the active preset color + standard reference rows with count 0
    const activeColor = activePreset?.color || '#0284c7';
    const activeCrit = (activePreset?.categoryLabel || 'NUEVA (PROYECTADA)').toUpperCase();
    const activePref = activePreset?.prefix || 'CN';

    rows.push({
      id: 'sym-cam-active-preset',
      symbolKind: 'bullet',
      title: 'CÁMARA BULLET',
      subtitle: activeCrit,
      color: activeColor,
      count: 0,
      codePrefix: `${activePref}-##`
    });
    codeSummaryMap.set(`${activePref}-##`, `CÁMARA ${activeCrit}`);

    if (activeCrit !== 'EXISTENTE') {
      rows.push({
        id: 'sym-cam-exist-default',
        symbolKind: 'bullet',
        title: 'CÁMARA BULLET',
        subtitle: 'EXISTENTE',
        color: '#dc2626',
        count: 0,
        codePrefix: 'CE-##'
      });
      codeSummaryMap.set('CE-##', 'CÁMARA EXISTENTE');
    }
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
  } else {
    rows.push({
      id: 'sym-spk-default',
      symbolKind: 'speaker',
      title: 'BOCINA DE AUDIO IP',
      subtitle: 'NUEVA (PROYECTADA)',
      color: '#eab308',
      count: 0,
      codePrefix: 'BO-##'
    });
  }

  // 3. Optional Antennas or Electric Fences if present
  if (antennas.length > 0) {
    rows.push({
      id: 'sym-ant',
      symbolKind: 'antenna',
      title: 'ANTENA ENLACE RED',
      subtitle: 'PTP / WIFI EXTERIOR',
      color: antennas[0].color || '#2563eb',
      count: antennas.length,
      codePrefix: 'ANT-##'
    });
    codeSummaryMap.set('ANT-##', 'ANTENA DE RED');
  }

  if (fences.length > 0) {
    rows.push({
      id: 'sym-fence',
      symbolKind: 'fence',
      title: 'CERCO ELÉCTRICO',
      subtitle: 'PERIMETRAL ALTA TENSIÓN',
      color: fences[0].color || '#d97706',
      count: fences.length,
      codePrefix: 'CERCO'
    });
  }

  // 4. Structures / Floor Plan Perimeters
  rows.push({
    id: 'sym-struct',
    symbolKind: 'structure',
    title: 'PERÍMETRO / NAVE',
    subtitle: 'TRAZADO DE PLANTA CAD',
    color: '#0f172a',
    count: structuresCount,
    codePrefix: 'PLANTA'
  });

  const codeSummaryLines = Array.from(codeSummaryMap.entries())
    .slice(0, 4)
    .map(([code, desc]) => `${code} : ${desc}`);

  return { rows, codeSummaryLines };
}
