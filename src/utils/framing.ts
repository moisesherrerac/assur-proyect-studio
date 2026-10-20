/**
 * Framing utility to dynamically calculate the exact position and dimensions
 * of an attached Google Maps plan / screenshot inside the CAD drawing viewport,
 * ensuring 100% of the uploaded plan is visible without clipping, and that
 * construction structures and perimeters fit the attached plan's exact aspect ratio.
 */

export const MAP_X = 95;
export const MAP_Y = 95;
export const MAP_W = 1680;
export const MAP_H = 1200;

export interface PlanFramingBounds {
  x: number;
  y: number;
  w: number;
  h: number;
  imgWidth: number;
  imgHeight: number;
  scale: number;
}

/**
 * Computes exact bounds { x, y, w, h } where the plan image will be drawn
 * centered inside the MAP viewport (MAP_X, MAP_Y, MAP_W, MAP_H).
 */
export function computePlanFramingBounds(
  imgWidth: number,
  imgHeight: number
): PlanFramingBounds {
  if (!imgWidth || !imgHeight || imgWidth <= 0 || imgHeight <= 0) {
    return {
      x: MAP_X,
      y: MAP_Y,
      w: MAP_W,
      h: MAP_H,
      imgWidth: MAP_W,
      imgHeight: MAP_H,
      scale: 1
    };
  }

  const imgRatio = imgWidth / imgHeight;
  const mapRatio = MAP_W / MAP_H;

  let drawW = MAP_W;
  let drawH = MAP_H;
  let offsetX = MAP_X;
  let offsetY = MAP_Y;
  let scale = 1;

  if (imgRatio > mapRatio) {
    // Image is wider than viewport: fit width, center vertically
    drawW = MAP_W;
    drawH = Math.round(MAP_W / imgRatio);
    offsetX = MAP_X;
    offsetY = Math.round(MAP_Y + (MAP_H - drawH) / 2);
    scale = drawW / imgWidth;
  } else {
    // Image is taller than viewport: fit height, center horizontally
    drawH = MAP_H;
    drawW = Math.round(MAP_H * imgRatio);
    offsetX = Math.round(MAP_X + (MAP_W - drawW) / 2);
    offsetY = MAP_Y;
    scale = drawH / imgHeight;
  }

  return {
    x: offsetX,
    y: offsetY,
    w: drawW,
    h: drawH,
    imgWidth,
    imgHeight,
    scale
  };
}
