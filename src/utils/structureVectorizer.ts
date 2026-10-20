import { CadStructure } from '../types/cad';
import { MAP_X, MAP_Y, MAP_W, MAP_H, computePlanFramingBounds } from './framing';

/**
 * Returns a clean set of editable architectural structures scaled and positioned
 * to perfectly match the framing of the attached plan image.
 */
export function generateFittedStructuresForPlan(
  imgWidth: number,
  imgHeight: number
): CadStructure[] {
  const bounds = computePlanFramingBounds(imgWidth, imgHeight);

  // 1. Property Perimeter: exactly framed inside the attached plan with a 4% margin
  const padX = Math.round(bounds.w * 0.04);
  const padY = Math.round(bounds.h * 0.04);
  const pX1 = bounds.x + padX;
  const pY1 = bounds.y + padY;
  const pX2 = bounds.x + bounds.w - padX;
  const pY2 = bounds.y + bounds.h - padY;

  // 2. Main Building: centered inside the attached plan (62% width, 56% height)
  const bW = Math.round(bounds.w * 0.62);
  const bH = Math.round(bounds.h * 0.54);
  const bX1 = Math.round(bounds.x + (bounds.w - bW) / 2);
  const bY1 = Math.round(bounds.y + (bounds.h - bH) / 2 + bounds.h * 0.04);
  const bX2 = bX1 + bW;
  const bY2 = bY1 + bH;

  const ridgeY = Math.round((bY1 + bY2) / 2);
  const wallDivX = Math.round(bX1 + bW * 0.45);

  return [
    {
      id: `struct-perim-${Date.now()}-1`,
      type: 'perimeter',
      label: 'PERÍMETRO PREDIAL / DESLINDE',
      closed: true,
      strokeColor: '#0f172a',
      strokeWidth: 2.8,
      lineStyle: 'dash-dot',
      fillOpacity: 0.03,
      hatchPattern: 'none',
      showDimensions: true,
      points: [
        { x: pX1, y: pY1 },
        { x: pX2, y: pY1 },
        { x: pX2, y: pY2 },
        { x: pX1, y: pY2 }
      ]
    },
    {
      id: `struct-bldg-${Date.now()}-1`,
      type: 'building',
      label: 'NAVE PRINCIPAL / CONSTRUCCIÓN',
      closed: true,
      strokeColor: '#0f172a',
      strokeWidth: 2.6,
      lineStyle: 'solid',
      fillOpacity: 0.26,
      hatchPattern: 'roof-lines',
      showDimensions: true,
      points: [
        { x: bX1, y: bY1 },
        { x: bX2, y: bY1 },
        { x: bX2, y: bY2 },
        { x: bX1, y: bY2 }
      ]
    },
    {
      id: `struct-wall-${Date.now()}-1`,
      type: 'wall',
      label: 'MURO DIVISORIO / CORTAFUEGO',
      closed: false,
      strokeColor: '#1e293b',
      strokeWidth: 1.8,
      lineStyle: 'solid',
      fillOpacity: 0,
      hatchPattern: 'none',
      points: [
        { x: wallDivX, y: bY1 },
        { x: wallDivX, y: bY2 }
      ]
    },
    {
      id: `struct-ridge-${Date.now()}-1`,
      type: 'wall',
      label: 'CUMBRERA / EJE ESTRUCTURAL',
      closed: false,
      strokeColor: '#334155',
      strokeWidth: 1.5,
      lineStyle: 'dashed',
      fillOpacity: 0,
      hatchPattern: 'none',
      points: [
        { x: bX1, y: ridgeY },
        { x: bX2, y: ridgeY }
      ]
    }
  ];
}

/**
 * Returns default sample structures for testing if needed.
 */
export function getInitialIndustrialStructures(): CadStructure[] {
  return generateFittedStructuresForPlan(1600, 1100);
}

/**
 * Automatically detects building structures and perimeter boundaries from an uploaded
 * Google Maps screenshot, adjusting coordinates directly to the exact framing bounds
 * of the attached plan image.
 */
export async function autoVectorizeStructuresFromImage(
  imageSrc: string
): Promise<CadStructure[]> {
  const img = new Image();
  img.src = imageSrc;
  await img.decode();

  // Compute exact framing bounds where the image will be drawn in the CAD viewport
  const bounds = computePlanFramingBounds(img.width, img.height);

  // Analyze on a downsampled grid (84 x 60 cells)
  const gridW = 84;
  const gridH = 60;
  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return generateFittedStructuresForPlan(img.width, img.height);
  }

  // Draw full image scaled to analyze grid
  ctx.drawImage(img, 0, 0, gridW, gridH);

  const imgData = ctx.getImageData(0, 0, gridW, gridH).data;
  const lum = new Float32Array(gridW * gridH);
  let meanLum = 0;

  for (let i = 0; i < gridW * gridH; i++) {
    const r = imgData[i * 4];
    const g = imgData[i * 4 + 1];
    const b = imgData[i * 4 + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = l;
    meanLum += l;
  }
  meanLum /= gridW * gridH;

  const visited = new Uint8Array(gridW * gridH);
  const detectedStructures: CadStructure[] = [];

  // 1. Always create the outer property perimeter polygon adapted to the exact attached plan image
  const padX = Math.round(bounds.w * 0.04);
  const padY = Math.round(bounds.h * 0.04);
  detectedStructures.push({
    id: `struct-perim-${Date.now()}`,
    type: 'perimeter',
    label: 'PERÍMETRO PREDIAL / DESLINDE',
    closed: true,
    strokeColor: '#0f172a',
    strokeWidth: 2.8,
    lineStyle: 'dash-dot',
    fillOpacity: 0.03,
    hatchPattern: 'none',
    showDimensions: true,
    points: [
      { x: bounds.x + padX, y: bounds.y + padY },
      { x: bounds.x + bounds.w - padX, y: bounds.y + padY },
      { x: bounds.x + bounds.w - padX, y: bounds.y + bounds.h - padY },
      { x: bounds.x + padX, y: bounds.y + bounds.h - padY }
    ]
  });

  // 2. Connected components for distinct roof/construction structures
  const threshold = Math.min(220, meanLum + 22);
  let buildingCounter = 1;

  for (let y = 3; y < gridH - 3; y++) {
    for (let x = 3; x < gridW - 3; x++) {
      const idx = y * gridW + x;
      if (visited[idx] || lum[idx] < threshold) continue;

      const queue: number[] = [idx];
      visited[idx] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      while (queue.length > 0) {
        const cur = queue.pop()!;
        const cx = cur % gridW;
        const cy = Math.floor(cur / gridW);
        count++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [cur - 1, cur + 1, cur - gridW, cur + gridW];
        for (const n of neighbors) {
          const nx = n % gridW;
          const ny = Math.floor(n / gridW);
          if (
            nx >= 2 &&
            nx < gridW - 2 &&
            ny >= 2 &&
            ny < gridH - 2 &&
            !visited[n] &&
            lum[n] >= threshold - 10
          ) {
            visited[n] = 1;
            queue.push(n);
          }
        }
      }

      const bw = maxX - minX;
      const bh = maxY - minY;
      // Meaningful construction structure size filter
      if (count >= 16 && bw >= 4 && bh >= 4 && bw < gridW * 0.85 && bh < gridH * 0.85) {
        const scaleX = bounds.w / gridW;
        const scaleY = bounds.h / gridH;
        const x1 = Math.round(bounds.x + minX * scaleX);
        const y1 = Math.round(bounds.y + minY * scaleY);
        const x2 = Math.round(bounds.x + (maxX + 1) * scaleX);
        const y2 = Math.round(bounds.y + (maxY + 1) * scaleY);

        detectedStructures.push({
          id: `struct-bldg-${Date.now()}-${buildingCounter}`,
          type: 'building',
          label: `ESTRUCTURA / NAVE 0${buildingCounter}`,
          closed: true,
          strokeColor: '#0f172a',
          strokeWidth: 2.5,
          lineStyle: 'solid',
          fillOpacity: 0.25,
          hatchPattern: buildingCounter === 1 ? 'roof-lines' : 'diagonal',
          showDimensions: true,
          points: [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x2, y: y2 },
            { x: x1, y: y2 }
          ]
        });

        // Ridge line for large buildings
        if (bw >= 12 || bh >= 12) {
          const midY = Math.round((y1 + y2) / 2);
          detectedStructures.push({
            id: `struct-ridge-${Date.now()}-${buildingCounter}`,
            type: 'wall',
            label: `CUMBRERA NAVE 0${buildingCounter}`,
            closed: false,
            strokeColor: '#334155',
            strokeWidth: 1.5,
            lineStyle: 'dashed',
            fillOpacity: 0,
            hatchPattern: 'none',
            points: [
              { x: x1, y: midY },
              { x: x2, y: midY }
            ]
          });
        }

        buildingCounter++;
        if (buildingCounter > 8) break;
      }
    }
    if (buildingCounter > 8) break;
  }

  // If no distinct roof structures were found via luminance, provide a tailored architectural framing
  if (detectedStructures.length <= 1) {
    return generateFittedStructuresForPlan(img.width, img.height);
  }

  return detectedStructures;
}

/**
 * Re-fits existing structures proportionally to a new plan image framing bounds.
 */
export function reframeStructuresToPlan(
  structures: CadStructure[],
  imgWidth: number,
  imgHeight: number
): CadStructure[] {
  if (structures.length === 0) {
    return generateFittedStructuresForPlan(imgWidth, imgHeight);
  }

  // Find bounding box of current structures
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  structures.forEach(st => {
    st.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
  });

  const curW = maxX - minX || 1;
  const curH = maxY - minY || 1;

  const targetBounds = computePlanFramingBounds(imgWidth, imgHeight);
  const padX = Math.round(targetBounds.w * 0.04);
  const padY = Math.round(targetBounds.h * 0.04);
  const tX = targetBounds.x + padX;
  const tY = targetBounds.y + padY;
  const tW = targetBounds.w - padX * 2;
  const tH = targetBounds.h - padY * 2;

  return structures.map(st => ({
    ...st,
    points: st.points.map(p => ({
      x: Math.round(tX + ((p.x - minX) / curW) * tW),
      y: Math.round(tY + ((p.y - minY) / curH) * tH)
    }))
  }));
}
