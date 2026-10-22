import type { ProjectMetadata, ProjectNoteRun } from '../types/cad';

export const notesText = (runs: ProjectNoteRun[]) => runs.map(r => r.text).join('');
export const getNoteRuns = (metadata: ProjectMetadata): ProjectNoteRun[] => {
  const plain = metadata.projectNotes.join('\n');
  return metadata.projectNotesRich && notesText(metadata.projectNotesRich) === plain
    ? metadata.projectNotesRich : [{ text: plain }];
};

export function sliceNoteRuns(runs: ProjectNoteRun[], offset: number): ProjectNoteRun[] {
  const result: ProjectNoteRun[] = [];
  for (const run of runs) {
    if (offset >= run.text.length) { offset -= run.text.length; continue; }
    result.push({ ...run, text: run.text.slice(offset) }); offset = 0;
  }
  return result;
}

export interface NoteLine { runs: ProjectNoteRun[]; endOffset: number }
export type NoteMeasure = (text: string, run: ProjectNoteRun, size: number) => number;

// Every character belongs to exactly one line, including spaces and paragraph breaks.
// Offsets allow an appendix to continue without repeating or losing text.
export function wrapNotes(runs: ProjectNoteRun[], width: number, size: number, measure: NoteMeasure): NoteLine[] {
  const units: { char: string; run: ProjectNoteRun; end: number; width: number }[] = [];
  const cache = new Map<string, number>();
  let offset = 0;
  for (const run of runs) for (const char of run.text) {
    offset += char.length;
    const key = `${!!run.bold}/${!!run.italic}/${char}`;
    if (!cache.has(key)) cache.set(key, char === '\n' ? 0 : measure(char, run, size));
    units.push({ char, run, end: offset, width: cache.get(key)! });
  }
  const lines: NoteLine[] = [];
  let start = 0;
  while (start < units.length) {
    let end = start, used = 0, lastSpace = -1;
    while (end < units.length) {
      const unit = units[end];
      if (unit.char === '\n') { end++; break; }
      if (used + unit.width > width && end > start) {
        if (lastSpace >= start) end = lastSpace + 1;
        break;
      }
      used += unit.width;
      if (/\s/.test(unit.char)) lastSpace = end;
      end++;
    }
    const segments: ProjectNoteRun[] = [];
    for (let i = start; i < end; i++) {
      const { char, run } = units[i];
      if (char === '\n') continue;
      const previous = segments.at(-1);
      if (previous && !!previous.bold === !!run.bold && !!previous.italic === !!run.italic && !!previous.underline === !!run.underline) previous.text += char;
      else segments.push({ ...run, text: char });
    }
    lines.push({ runs: segments, endOffset: units[end - 1].end });
    start = end;
  }
  return lines;
}

export function fitNotes(runs: ProjectNoteRun[], width: number, height: number, measure: NoteMeasure) {
  for (const size of [16, 15, 14]) {
    const lineHeight = size * 1.4;
    const lines = wrapNotes(runs, width, size, measure);
    if (lines.length * lineHeight <= height) return { size, lineHeight, lines, remainder: [] as ProjectNoteRun[] };
  }
  const size = 14, lineHeight = size * 1.4;
  const all = wrapNotes(runs, width, size, measure);
  const lines = all.slice(0, Math.max(0, Math.floor((height - 34) / lineHeight)));
  return { size, lineHeight, lines, remainder: sliceNoteRuns(runs, lines.at(-1)?.endOffset ?? 0) };
}
