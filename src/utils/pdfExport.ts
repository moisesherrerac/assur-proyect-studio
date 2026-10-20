
import { safeFilename } from './project';
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

export async function exportCadBlueprintToPdf(options: ExportPdfOptions): Promise<void> {
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

  const cleanFilename = (metadata.projectName || 'Plano_Planta_General_CCTV')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  doc.save(`${safeFilename(metadata.projectName)}_${safeFilename(metadata.sheetNumber || 'L-01')}_rev_${safeFilename(metadata.revision)}.pdf`);
}
