/** Keep title-block text inside its cell, including long words and narrow half-cells. */
export function drawFittedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number,
  options: { size?: number; minSize?: number; weight?: string; maxLines?: number; align?: CanvasTextAlign; middle?: boolean } = {}) {
  const { size = 13.5, minSize = 10.5, weight = 'bold', maxLines = 3, align = 'left', middle = false } = options;
  const family = '"Chakra Petch", Arial, sans-serif';
  const wrap = () => {
    const lines: string[] = [];
    let line = '';
    for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  let fontSize = size, lines: string[] = [];
  while (true) {
    ctx.font = `${weight} ${fontSize}px ${family}`;
    lines = wrap();
    if ((lines.length <= maxLines && lines.length * fontSize * 1.2 <= height) || fontSize <= minSize) break;
    fontSize = Math.max(minSize, fontSize - 0.5);
  }
  const allowed = Math.max(1, Math.min(maxLines, Math.floor(height / (fontSize * 1.2))));
  if (lines.length > allowed) {
    lines = lines.slice(0, allowed);
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  ctx.textAlign = align; ctx.textBaseline = 'top';
  const anchorX = align === 'center' ? x + width / 2 : align === 'right' ? x + width : x;
  const top = middle ? y + Math.max(0, (height - lines.length * fontSize * 1.2) / 2) : y;
  lines.forEach((line, i) => ctx.fillText(line, anchorX, top + i * fontSize * 1.2));
  ctx.restore();
}
