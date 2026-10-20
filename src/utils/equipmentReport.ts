import type { CameraDevice, NetworkAntenna, AudioAlarmDevice, ElectricFence, WiringRoute, ProjectMetadata } from '../types/cad';
import { safeFilename, downloadText } from './project';

export type EquipmentKind = 'cameras' | 'antennas' | 'audioAlarms' | 'fences' | 'wiring';
export interface ReportProject {
  metadata: ProjectMetadata;
  cameras: CameraDevice[]; antennas: NetworkAntenna[]; audioAlarms: AudioAlarmDevice[];
  fences: ElectricFence[]; wiring: WiringRoute[];
}
export interface EquipmentRow {
  id: string; kind: EquipmentKind; code: string; type: string; status: string;
  quantity: number; unit: string; glosa: string; notes: string;
}
const types: Record<string, string> = {
  'camera-dome': 'Cámara domo', 'camera-bullet': 'Cámara bullet', 'camera-ptz': 'Cámara PTZ',
  'camera-fisheye': 'Cámara 360°', 'camera-lpr': 'Cámara LPR', 'antenna-ptp': 'Antena PTP',
  'antenna-omni': 'Antena omnidireccional', 'speaker-horn': 'Bocina IP', 'siren-strobe': 'Sirena con estrobo',
  'rack-cabinet': 'Gabinete / rack', 'pir-sensor': 'Sensor PIR', 'access-control': 'Control de acceso',
  'conduit-emt': 'Canalización EMT', 'conduit-pvc': 'Canalización PVC', 'utp-cat6': 'Cable UTP Cat 6',
  'fibra-optica': 'Fibra óptica', 'energia-ac': 'Cable de energía'
};
const statuses: Record<string, string> = { nueva: 'Nuevo', existente: 'Existente', reubicar: 'Reubicar', baja: 'Retirar' };

export function buildEquipmentRows(project: ReportProject): EquipmentRow[] {
  const rows: EquipmentRow[] = [];
  const factor = project.metadata.metersPerUnit;
  for (const kind of ['cameras', 'antennas', 'audioAlarms', 'fences', 'wiring'] as EquipmentKind[]) {
    for (const item of project[kind]) {
      const d = item as any;
      const type = kind === 'fences' ? 'Cerco eléctrico' : types[d.type || d.wireType] || 'Equipo';
      const isRoute = kind === 'fences' || kind === 'wiring';
      const length = isRoute ? d.points.slice(1).reduce((sum: number, p: any, i: number) => sum + Math.hypot(p.x - d.points[i].x, p.y - d.points[i].y), 0) : 0;
      const details = [type, d.model, kind === 'cameras' ? d.resolution : null,
        kind === 'antennas' ? d.frequency : null, kind === 'fences' ? `${d.linesCount} líneas; ${d.energizerVoltage}` : null].filter(Boolean).join(', ');
      rows.push({ id: d.id, kind, code: d.label, type,
        status: statuses[d.status] || (kind === 'wiring' ? 'Sin especificar' : 'Sin especificar'),
        quantity: isRoute && factor ? Math.round(length * factor * 100) / 100 : 1,
        unit: isRoute ? factor ? 'm' : 'tramo' : 'un',
        glosa: d.glosa !== undefined ? d.glosa : details, notes: d.notes || '' });
    }
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
}

export function summarizeEquipment(rows: EquipmentRow[]) {
  const groups = new Map<string, { type: string; status: string; quantity: number; unit: string }>();
  for (const row of rows) {
    const key = `${row.type}|${row.status}|${row.unit}`;
    const group = groups.get(key) || { type: row.type, status: row.status, quantity: 0, unit: row.unit };
    group.quantity += row.quantity; groups.set(key, group);
  }
  return [...groups.values()];
}

const csvCell = (value: unknown) => {
  let s = String(value ?? '');
  // Keep spreadsheet applications from treating user-entered descriptions as formulas.
  if (/^[\s]*[=+@-]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
export function equipmentCsv(project: ReportProject): string {
  const m = project.metadata;
  const lines: unknown[][] = [
    ['INFORME DE EQUIPOS Y MATERIALES'], ['Proyecto', m.projectName], ['Cliente', m.clientName],
    ['Ubicación', m.location], ['Lámina', m.sheetNumber, 'Revisión', m.revision], ['Fecha del plano', m.date],
    ['Medición', m.metersPerUnit ? 'Longitudes según calibración del plano; verificar en terreno.' : 'Sin calibrar: rutas y cercos expresados en tramos, sin metrados.'], [],
    ['Código', 'Tipo', 'Estado', 'Cantidad', 'Unidad', 'Glosa', 'Observaciones'],
    ...buildEquipmentRows(project).map(r => [r.code, r.type, r.status, String(r.quantity).replace('.', ','), r.unit, r.glosa, r.notes])
  ];
  return '\uFEFF' + lines.map(row => row.map(csvCell).join(';')).join('\r\n');
}
export function exportEquipmentCsv(project: ReportProject) {
  downloadText(equipmentCsv(project), `${safeFilename(project.metadata.projectName)}_${safeFilename(project.metadata.sheetNumber)}_rev_${safeFilename(project.metadata.revision)}_equipos.csv`, 'text/csv;charset=utf-8');
}

/** Text-based PDF: repeating headers, wrapped cells, and rows split across pages when needed. */
export async function createEquipmentPdf(project: ReportProject) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const m = project.metadata;
  const rows = buildEquipmentRows(project);
  const width = 182, bottom = 276;
  let y = 0;
  const text = (s: unknown) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[\u2010-\u2015]/g, '-');
  const wrapped = (s: string, w: number) => doc.splitTextToSize(text(s), w) as string[];
  const startPage = (section: string) => {
    doc.setFillColor(67, 35, 110); doc.rect(0, 0, 210, 8, 'F');
    doc.setTextColor(35, 30, 45); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('Informe de equipos y materiales', 14, 22);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const title = wrapped(m.projectName || 'Proyecto sin nombre', width);
    doc.text(title, 14, 30); y = 30 + title.length * 4.2;
    for (const label of [`Cliente: ${m.clientName || 'Por completar'}`, `Ubicación: ${m.location || 'Por completar'}`,
      `Lámina ${m.sheetNumber || 'S/N'} | Revisión ${m.revision || '-'} | Fecha del plano: ${m.date || '-'}`]) {
      const lines = wrapped(label, width); doc.text(lines, 14, y); y += lines.length * 4.2;
    }
    y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(section, 14, y); y += 6;
  };
  const newPage = (section: string) => { doc.addPage(); startPage(section); };
  const paragraph = (s: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    for (const line of wrapped(s, width)) {
      if (y > bottom - 5) newPage('Observaciones (continuación)');
      doc.text(line, 14, y); y += 4.4;
    }
    y += 3;
  };
  const table = (headers: string[], data: string[][], widths: number[], section: string) => {
    const header = () => {
      doc.setFillColor(238, 233, 245); doc.rect(14, y, width, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      let x = 14; headers.forEach((h, i) => { doc.text(h, x + 2, y + 5); x += widths[i]; });
      y += 8;
    };
    header();
    data.forEach((cells, rowIndex) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      const lines = cells.map((c, i) => wrapped(c, widths[i] - 4));
      let offset = 0; const count = Math.max(...lines.map(l => l.length));
      if (count * 4 + 5 > bottom - y && count * 4 + 5 < 160) { newPage(`${section} (continuación)`); header(); }
      while (offset < count) {
        if (bottom - y < 12) { newPage(`${section} (continuación)`); header(); }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        const take = Math.min(count - offset, Math.floor((bottom - y - 5) / 4));
        const h = take * 4 + 5;
        if (rowIndex % 2 === 0) { doc.setFillColor(249, 249, 250); doc.rect(14, y, width, h, 'F'); }
        let x = 14;
        lines.forEach((l, i) => { const segment = l.slice(offset, offset + take); if (segment.length) doc.text(segment, x + 2, y + 4.5); x += widths[i]; });
        doc.setDrawColor(222, 222, 226); doc.line(14, y + h, 196, y + h);
        y += h; offset += take;
      }
    });
    y += 6;
  };
  startPage('Resumen por tipo y estado');
  paragraph('Listado complementario del plano. Incluye todos los elementos registrados, aunque su capa esté oculta. No considera equipos que no se hayan dibujado.');
  if (!rows.length) paragraph('El proyecto no contiene equipos ni trazados.');
  else table(['Tipo', 'Estado', 'Cantidad', 'Unidad'], summarizeEquipment(rows).map(g => [g.type, g.status, g.quantity.toLocaleString('es-CL', { maximumFractionDigits: 2 }), g.unit]), [88, 46, 28, 20], 'Resumen por tipo y estado');
  paragraph(m.metersPerUnit ? 'Las longitudes corresponden al recorrido dibujado y a la calibración del proyecto. No incluyen holguras, subidas ni reservas; verificar en terreno.' : 'Plano sin calibrar: los trazados se informan como tramos. No se calculan metros de cable ni de cerco.');
  paragraph(`Responsable: ${m.engineerName || 'Por completar'}${m.engineerLicense ? ` | Registro: ${m.engineerLicense}` : ''}`);
  if (rows.length) {
    newPage('Detalle por código del plano');
    table(['Código', 'Tipo / estado', 'Cant. / un.', 'Glosa y observaciones'], rows.map(r => [r.code, `${r.type}\n${r.status}`, `${r.quantity.toLocaleString('es-CL', { maximumFractionDigits: 2 })} ${r.unit}`, `${r.glosa}${r.notes ? `\nObservaciones: ${r.notes}` : ''}`]), [27, 38, 22, 95], 'Detalle por código del plano');
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text('Assur Proyect Studio | Complemento del plano', 14, 288);
    doc.text(`${page} / ${pages}`, 196, 288, { align: 'right' });
  }
  return doc;
}
export async function exportEquipmentPdf(project: ReportProject) {
  const doc = await createEquipmentPdf(project);
  doc.save(`${safeFilename(project.metadata.projectName)}_${safeFilename(project.metadata.sheetNumber)}_rev_${safeFilename(project.metadata.revision)}_equipos.pdf`);
}
