
import { safeFilename } from './project';
import { wrapNotes } from './notes';
import type { ProjectNoteRun } from '../types/cad';
import {
  CameraDevice,
  ElectricFence,
  NetworkAntenna,
  AudioAlarmDevice,
  WiringRoute,
  ProjectMetadata,
  CadTheme
} from '../types/cad';

interface ExportPdfOptions {
  blueprintCanvas: HTMLCanvasElement;
  cameras: CameraDevice[];
  antennas: NetworkAntenna[];
  audioAlarms: AudioAlarmDevice[];
  fences: ElectricFence[];
  wiring: WiringRoute[];
  metadata: ProjectMetadata;
  theme: CadTheme;
  format?: 'a3' | 'a4';
}

export async function createCadBlueprintPdf(options: ExportPdfOptions) {
  const { blueprintCanvas, metadata, format = 'a3' } = options;

  const isA3 = format === 'a3';
  const docWidth = isA3 ? 420 : 297;
  const docHeight = isA3 ? 297 : 210;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: isA3 ? 'a3' : 'a4'
  });

  // Render full-resolution 2200x1555 normative CAD sheet (independent of current screen zoom/pan)
  const anyCanvas = blueprintCanvas as any;
  const highResSheetCanvas: HTMLCanvasElement =
    typeof anyCanvas.renderFullResolutionSheet === 'function'
      ? anyCanvas.renderFullResolutionSheet()
      : blueprintCanvas;

  const sheetDataUrl = highResSheetCanvas.toDataURL('image/png', 1.0);

  doc.addImage(sheetDataUrl, 'PNG', 0, 0, docWidth, docHeight, undefined, 'FAST');

  const remaining = (highResSheetCanvas as HTMLCanvasElement & { notesContinuation?: ProjectNoteRun[] }).notesContinuation;
  if (remaining?.length) {
    const margin = 16, fontSize = 11, lineHeight = 5.5;
    const fontStyle = (run: ProjectNoteRun) => run.bold ? (run.italic ? 'bolditalic' : 'bold') : (run.italic ? 'italic' : 'normal');
    const lines = wrapNotes(remaining, docWidth - 2 * margin, fontSize, (text, run, size) => {
      doc.setFont('helvetica', fontStyle(run)); doc.setFontSize(size);
      return doc.getTextWidth(text);
    });
    const perPage = Math.max(1, Math.floor((docHeight - 62) / lineHeight));
    const totalPages = 1 + Math.ceil(lines.length / perPage);
    for (let start = 0; start < lines.length; start += perPage) {
      doc.addPage();
      doc.setDrawColor(90); doc.setLineWidth(0.25);
      doc.rect(margin - 4, margin - 5, docWidth - 2 * margin + 8, docHeight - 2 * margin + 7);
      doc.setTextColor(25); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('NOTAS DEL PROYECTO · CONTINUACIÓN', margin, margin + 2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      // Project names can be long; keep the reference inside the technical header.
      const reference = `${metadata.projectName || 'Proyecto'} · ${metadata.sheetNumber || 'L-01'} · Rev. ${metadata.revision || '-'} `;
      doc.text(doc.splitTextToSize(reference, docWidth - 2 * margin)[0], margin, margin + 9);
      doc.line(margin, margin + 13, docWidth - margin, margin + 13);
      let y = margin + 23;
      for (const line of lines.slice(start, start + perPage)) {
        let x = margin;
        for (const run of line.runs) {
          doc.setFont('helvetica', fontStyle(run)); doc.setFontSize(fontSize);
          doc.text(run.text, x, y);
          const width = doc.getTextWidth(run.text);
          if (run.underline) { doc.setLineWidth(0.18); doc.line(x, y + 0.7, x + width, y + 0.7); }
          x += width;
        }
        y += lineHeight;
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Anexo de la lámina ${metadata.sheetNumber || 'L-01'} · Página ${doc.getNumberOfPages()} de ${totalPages}`, margin, docHeight - margin);
    }
  }
  return doc;
}

export async function exportCadBlueprintToPdf(options: ExportPdfOptions): Promise<void> {
  const doc = await createCadBlueprintPdf(options);
  const { metadata } = options;
  doc.save(`${safeFilename(metadata.projectName)}_${safeFilename(metadata.sheetNumber || 'L-01')}_rev_${safeFilename(metadata.revision)}.pdf`);
}
