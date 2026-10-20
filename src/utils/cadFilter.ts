import { ImageFilterSettings } from '../types/cad';

/**
 * Transforms a Google Maps screenshot or aerial photo into a clean, professional
 * engineering base plan (Ortofoto Técnica CAD en escala de grises clara con realce
 * estructural de techumbres y vialidades, o modos vectoriales/blueprint).
 */
export async function processImageToCad(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  settings: ImageFilterSettings,
  targetWidth?: number,
  targetHeight?: number
): Promise<string> {
  const width =
    targetWidth ||
    (sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width) ||
    1400;
  const height =
    targetHeight ||
    (sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height) ||
    900;

  const maxDim = 2200;
  let renderW = width;
  let renderH = height;
  if (renderW > maxDim || renderH > maxDim) {
    const ratio = Math.min(maxDim / renderW, maxDim / renderH);
    renderW = Math.round(renderW * ratio);
    renderH = Math.round(renderH * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = renderW;
  canvas.height = renderH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2d context');

  ctx.drawImage(sourceImage, 0, 0, renderW, renderH);

  const rawImgData = ctx.getImageData(0, 0, renderW, renderH);
  const data = rawImgData.data;
  const totalPixels = renderW * renderH;

  // 1. Compute luminance grayscale
  const gray = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 2. Separable 2-pass fast box blur for unsharp mask & noise suppression
  const radius = Math.max(1, Math.min(4, Math.round(settings.denoise || 2)));
  const tempBlur = new Float32Array(totalPixels);
  const smooth = new Float32Array(totalPixels);

  // Horizontal pass
  for (let y = 0; y < renderH; y++) {
    const rowOffset = y * renderW;
    for (let x = 0; x < renderW; x++) {
      let sum = 0;
      let count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < renderW) {
          sum += gray[rowOffset + nx];
          count++;
        }
      }
      tempBlur[rowOffset + x] = sum / count;
    }
  }

  // Vertical pass
  for (let y = 0; y < renderH; y++) {
    for (let x = 0; x < renderW; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < renderH) {
          sum += tempBlur[ny * renderW + x];
          count++;
        }
      }
      smooth[y * renderW + x] = sum / count;
    }
  }

  // 3. Sobel structural gradient magnitude
  const edgeMagnitudes = new Float32Array(totalPixels);
  for (let y = 1; y < renderH - 1; y++) {
    for (let x = 1; x < renderW - 1; x++) {
      const idx = y * renderW + x;
      const gx =
        -1 * smooth[idx - renderW - 1] + 1 * smooth[idx - renderW + 1] +
        -2 * smooth[idx - 1]           + 2 * smooth[idx + 1] +
        -1 * smooth[idx + renderW - 1] + 1 * smooth[idx + renderW + 1];

      const gy =
        -1 * smooth[idx - renderW - 1] - 2 * smooth[idx - renderW] - 1 * smooth[idx - renderW + 1] +
         1 * smooth[idx + renderW - 1] + 2 * smooth[idx + renderW] + 1 * smooth[idx + renderW + 1];

      edgeMagnitudes[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  const outputImgData = ctx.createImageData(renderW, renderH);
  const out = outputImgData.data;

  const contrastFactor = (settings.contrast || 115) / 100;
  const brightnessOffset = ((settings.brightness || 105) - 100) * 1.8;
  const threshold = settings.edgeThreshold || 45;
  // In orthophoto mode, satelliteOpacity controls how strong the base photo is (default ~70% photo + 30% white architectural wash)
  const washAmount = Math.max(0.1, Math.min(0.75, (100 - (settings.satelliteOpacity || 72)) / 100));

  for (let i = 0; i < totalPixels; i++) {
    const px = i * 4;
    const lum = gray[i];
    const blurLum = smooth[i];
    const mag = edgeMagnitudes[i];

    // Unsharp mask (claridad arquitectónica para techumbres, muros y caminos)
    const detail = lum - blurLum;
    let sharpened = lum + detail * 1.4;

    // Apply contrast around midpoint 128
    sharpened = (sharpened - 128) * contrastFactor + 128 + brightnessOffset;
    sharpened = Math.max(0, Math.min(255, sharpened));

    if (settings.theme === 'technical-orthophoto') {
      // MODO 1 (DEFAULT): ORTOFOTO TÉCNICA CAD GRIS CLARO (Idéntico a lámina profesional de referencia)
      // Aclara la imagen satelital hacia blanco técnico (#f5f7f9) para que la simbología a color y textos destaquen con nitidez total
      let val = sharpened * (1 - washAmount) + 246 * washAmount;

      // Sutil refuerzo de bordes estructurales (muros y techos) sin ensuciar la imagen
      if (mag > threshold * 1.3) {
        const edgeStrength = Math.min(0.28, (mag - threshold * 1.3) / 350);
        val = val * (1 - edgeStrength) + 55 * edgeStrength;
      }

      const finalGray = Math.max(0, Math.min(255, Math.round(val)));
      out[px] = finalGray;
      out[px + 1] = finalGray;
      out[px + 2] = finalGray;
      out[px + 3] = 255;

    } else if (settings.theme === 'orthophoto-hybrid') {
      // MODO 2: ORTOFOTO + TRAZADO DE BORDES TÉCNICOS MARCADOS
      let val = sharpened * (1 - washAmount * 1.15) + 250 * (washAmount * 1.15);
      if (mag > threshold) {
        const edgeStrength = Math.min(0.65, (mag - threshold) / 180);
        val = val * (1 - edgeStrength) + 25 * edgeStrength;
      }
      const finalGray = Math.max(0, Math.min(255, Math.round(val)));
      out[px] = finalGray;
      out[px + 1] = Math.min(255, finalGray + 2);
      out[px + 2] = Math.min(255, finalGray + 5);
      out[px + 3] = 255;

    } else if (settings.theme === 'architectural-white') {
      // MODO 3: CROQUIS VECTORIAL PAPEL BLANCO PURO
      let val = sharpened * 0.18 + 252 * 0.82;
      if (mag > threshold * 0.85) {
        const ink = Math.min(0.88, (mag - threshold * 0.85) / 140);
        val = val * (1 - ink) + 18 * ink;
      }
      const finalGray = Math.max(0, Math.min(255, Math.round(val)));
      out[px] = finalGray;
      out[px + 1] = finalGray;
      out[px + 2] = finalGray;
      out[px + 3] = 255;

    } else if (settings.theme === 'blueprint-blue') {
      // MODO 4: BLUEPRINT CIANOTIPIA AZUL TÉCNICO CON ORTOFOTO
      const baseTone = sharpened / 255;
      let r = Math.round(12 + baseTone * 38);
      let g = Math.round(34 + baseTone * 75);
      let b = Math.round(68 + baseTone * 115);

      if (mag > threshold) {
        const edgeIntensity = Math.min(0.85, (mag - threshold) / 160);
        r = Math.round(r * (1 - edgeIntensity) + 240 * edgeIntensity);
        g = Math.round(g * (1 - edgeIntensity) + 248 * edgeIntensity);
        b = Math.round(b * (1 - edgeIntensity) + 255 * edgeIntensity);
      }
      out[px] = r;
      out[px + 1] = g;
      out[px + 2] = b;
      out[px + 3] = 255;

    } else {
      // MODO 5: AUTOCAD DARK MODEL SPACE (Con ortofoto satelital oscura nítida + líneas cian)
      const baseTone = sharpened / 255;
      let r = Math.round(14 + baseTone * 55);
      let g = Math.round(20 + baseTone * 64);
      let b = Math.round(30 + baseTone * 76);

      if (mag > threshold) {
        const edgeIntensity = Math.min(0.8, (mag - threshold) / 170);
        r = Math.round(r * (1 - edgeIntensity) + 0 * edgeIntensity);
        g = Math.round(g * (1 - edgeIntensity) + 215 * edgeIntensity);
        b = Math.round(b * (1 - edgeIntensity) + 245 * edgeIntensity);
      }
      out[px] = r;
      out[px + 1] = g;
      out[px + 2] = b;
      out[px + 3] = 255;
    }
  }

  ctx.putImageData(outputImgData, 0, 0);
  return canvas.toDataURL('image/png');
}
