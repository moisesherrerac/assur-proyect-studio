import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import type { ProjectMetadata, ProjectNoteRun } from '../types/cad';
import { getNoteRuns, notesText } from '../utils/notes';

function readEditor(root: HTMLElement): ProjectNoteRun[] {
  const runs: ProjectNoteRun[] = [];
  const push = (text: string, style: Omit<ProjectNoteRun, 'text'> = {}) => {
    if (text) runs.push({ text, ...style });
  };
  const visit = (node: Node, style: Omit<ProjectNoteRun, 'text'> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) { push(node.textContent || '', style); return; }
    if (!(node instanceof HTMLElement) || ['SCRIPT', 'STYLE', 'IMG'].includes(node.tagName)) return;
    if (node.tagName === 'BR') { push('\n'); return; }
    const block = ['DIV', 'P', 'LI'].includes(node.tagName);
    if (block && runs.length && !notesText(runs).endsWith('\n')) push('\n');
    const computed = getComputedStyle(node);
    const next = {
      bold: Number.parseInt(computed.fontWeight) >= 600 || computed.fontWeight === 'bold',
      italic: computed.fontStyle === 'italic',
      underline: computed.textDecorationLine.includes('underline') || !!style.underline,
    };
    node.childNodes.forEach(child => visit(child, next));
    if (block && node.nextSibling && !notesText(runs).endsWith('\n')) push('\n');
  };
  root.childNodes.forEach(node => visit(node));
  return runs;
}

export function NotesEditor({ metadata, onSave }: { metadata: ProjectMetadata; onSave: (runs: ProjectNoteRun[]) => void }) {
  const [editing, setEditing] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState([false, false, false]);
  const runs = getNoteRuns(metadata);
  useEffect(() => {
    if (!editing || !editor.current) return;
    const root = editor.current;
    root.replaceChildren(...getNoteRuns(metadata).map(run => {
      const span = document.createElement('span');
      span.textContent = run.text;
      span.style.fontWeight = run.bold ? '700' : '400';
      span.style.fontStyle = run.italic ? 'italic' : 'normal';
      span.style.textDecoration = run.underline ? 'underline' : 'none';
      return span;
    }));
    root.focus();
    const update = () => {
      const selection = document.getSelection();
      if (selection?.anchorNode && root.contains(selection.anchorNode)) setMarks(['bold', 'italic', 'underline'].map(command => document.queryCommandState(command)));
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
    // The editable DOM owns the draft until Guardar; external renders must not reset selection.
  }, [editing]);
  const format = (command: string) => {
    editor.current?.focus();
    document.execCommand(command);
    setMarks(['bold', 'italic', 'underline'].map(mark => document.queryCommandState(mark)));
  };
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <span className="font-bold text-slate-700 uppercase text-[11px]">Notas del cajetín</span>
      {!editing ? <button className="text-sky-700 text-xs font-semibold cursor-pointer" onClick={() => setEditing(true)}>Editar</button>
        : <div className="flex gap-3 text-xs"><button className="text-slate-600 cursor-pointer" onClick={() => setEditing(false)}>Cancelar</button><button className="font-semibold text-emerald-700 cursor-pointer" onClick={() => { if (editor.current) onSave(readEditor(editor.current)); setEditing(false); }}>Guardar</button></div>}
    </div>
    {editing ? <div className="rounded-lg border border-sky-400 overflow-hidden">
      <div role="toolbar" aria-label="Formato de notas" className="flex gap-1 border-b border-stone-200 bg-stone-50 p-1">
        {([{ label: 'Negrita', command: 'bold', Icon: Bold }, { label: 'Cursiva', command: 'italic', Icon: Italic }, { label: 'Subrayado', command: 'underline', Icon: Underline }]).map(({ label, command, Icon }, i) => <button key={command} type="button" title={label} aria-label={label} aria-pressed={marks[i]} onMouseDown={e => e.preventDefault()} onClick={() => format(command)} className={`w-9 h-9 flex items-center justify-center rounded cursor-pointer ${marks[i] ? 'bg-sky-100 text-sky-800' : 'text-slate-700 hover:bg-stone-200'}`}><Icon size={16} /></button>)}
      </div>
      <div ref={editor} role="textbox" aria-label="Notas del cajetín" aria-multiline="true" contentEditable suppressContentEditableWarning className="min-h-64 max-h-[55vh] overflow-y-auto p-3 text-xs text-slate-900 leading-relaxed whitespace-pre-wrap break-words outline-none font-sans"
        onKeyDown={event => event.stopPropagation()}
        onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); }}
        onDrop={event => event.preventDefault()} />
    </div> : <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs leading-relaxed whitespace-pre-wrap break-words text-slate-700">{runs.map((run, i) => <span key={i} style={{ fontWeight: run.bold ? 700 : 400, fontStyle: run.italic ? 'italic' : 'normal', textDecoration: run.underline ? 'underline' : 'none' }}>{run.text}</span>)}{!notesText(runs) && <span className="text-slate-500">Sin notas.</span>}</div>}
    <p className="text-[11px] leading-relaxed text-slate-500">Las notas que excedan el cajetín continuarán en una hoja del mismo PDF.</p>
  </div>;
}
