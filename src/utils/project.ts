import type { ProjectMetadata } from '../types/cad';

export const nextLabel = (prefix: string, items: { label: string }[]) => {
  const used = new Set(items.map(i => i.label.trim().toUpperCase()));
  let n = 1;
  while (used.has(`${prefix}-${String(n).padStart(2, '0')}`.toUpperCase())) n++;
  return `${prefix}-${String(n).padStart(2, '0')}`;
};

export const distanceLabel = (units: number, factor?: number) => factor && factor > 0
  ? `${(units * factor).toLocaleString('es-CL', { maximumFractionDigits: 1 })} m`
  : `${Math.round(units)} u · sin calibrar`;

export function validateProject(value: unknown): any {
  const d = value as any;
  const fail = () => { throw new Error('El archivo no es un proyecto Assur válido. Abre un archivo .cadmap descargado desde la aplicación.'); };
  if (!d || typeof d !== 'object' || Array.isArray(d) || !d.metadata || typeof d.metadata !== 'object') fail();
  if (!['cameras', 'structures', 'antennas', 'wiring', 'fences', 'audioAlarms'].some(k => Array.isArray(d[k]))) fail();
  if (d.version && !/^2\./.test(String(d.version))) throw new Error('Esta versión de proyecto no es compatible. Conserva el archivo original.');
  const finite = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e8;
  const point = (p: any) => p && finite(p.x) && finite(p.y);
  const lists = ['structures', 'cameras', 'antennas', 'audioAlarms', 'fences', 'wiring', 'annotations'];
  const ids = new Set<string>();
  for (const key of lists) {
    const list = d[key] ?? [];
    if (!Array.isArray(list) || list.length > 10000) fail();
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || ids.has(item.id)) fail();
      ids.add(item.id);
      if (['structures', 'fences', 'wiring'].includes(key)) {
        if (!Array.isArray(item.points) || item.points.length > 10000 || !item.points.every(point)) fail();
      } else if (!point(item)) fail();
      if (key !== 'annotations' && typeof item.label !== 'string') fail();
      if (key === 'annotations' && typeof item.text !== 'string') fail();
      const allowed: Record<string, string[]> = {
        cameras: ['camera-dome','camera-bullet','camera-ptz','camera-fisheye','camera-lpr'],
        antennas: ['antenna-ptp','antenna-omni'],
        audioAlarms: ['speaker-horn','siren-strobe','rack-cabinet','pir-sensor','access-control'],
        structures: ['building','perimeter','wall','road']
      };
      if (allowed[key] && !allowed[key].includes(item.type)) fail();
      if (key === 'wiring' && !['conduit-emt','conduit-pvc','utp-cat6','fibra-optica','energia-ac'].includes(item.wireType)) fail();
      if (item.status !== undefined && !['nueva','existente','reubicar','baja'].includes(item.status)) fail();
      for (const k of ['rotation', 'range', 'fovAngle', 'beamWidth', 'strokeWidth', 'fillOpacity', 'fontSize', 'labelOffsetX', 'labelOffsetY']) {
        if (item[k] !== undefined && !finite(item[k])) fail();
      }
      for (const k of ['glosa', 'notes', 'color', 'frequency', 'resolution', 'model', 'categoryLabel']) {
        if (item[k] !== undefined && typeof item[k] !== 'string') fail();
      }
      if (item.glosa?.length > 1200) fail();
    }
  }
  const m = d.metadata;
  for (const key of ['layers','locks','filterSettings','cameraPreset']) {
    if (d[key] !== undefined && (!d[key] || typeof d[key] !== 'object' || Array.isArray(d[key]))) fail();
  }
  for (const key of ['layers','locks']) {
    if (d[key] && !Object.values(d[key]).every(v => typeof v === 'boolean')) fail();
  }
  if (d.filterSettings && !Object.entries(d.filterSettings).every(([k,v]) => k === 'theme' ? typeof v === 'string' : k === 'invert' ? typeof v === 'boolean' : finite(v))) fail();
  if (d.cameraPreset && !Object.values(d.cameraPreset).every(v => typeof v === 'string')) fail();
  if (m.northAngle !== undefined && !finite(m.northAngle)) fail();
  if (m.projectNotes !== undefined && (!Array.isArray(m.projectNotes) || !m.projectNotes.every((n: unknown) => typeof n === 'string'))) fail();
  if (m.metersPerUnit != null && (!finite(m.metersPerUnit) || m.metersPerUnit <= 0)) fail();
  for (const [key, v] of Object.entries(m)) {
    if (!['northAngle', 'metersPerUnit', 'projectNotes'].includes(key) && typeof v !== 'string' && v != null) fail();
  }
  for (const key of ['rawImageSrc', 'cadBackgroundImageUrl']) {
    if (d[key] != null && (typeof d[key] !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/i.test(d[key]))) fail();
  }
  return d;
}

// Remove only the exact sample identity shipped by the original template.
export function cleanSampleIdentity(metadata: ProjectMetadata): ProjectMetadata {
  return metadata.engineerName === 'Ing. Carlos Mendoza Rivera' && metadata.engineerLicense === 'Reg. Prof. N° 148921'
    ? { ...metadata, engineerName: '', engineerLicense: '', engineerTitle: '' } : metadata;
}

export function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeFilename = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'proyecto';
