import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { buildEquipmentRows, summarizeEquipment, exportEquipmentCsv, exportEquipmentPdf, type ReportProject, type EquipmentKind } from '../utils/equipmentReport';

export function EquipmentReport({ project, onClose, onUpdateGlosa, onSelect }: {
  project: ReportProject; onClose: () => void;
  onUpdateGlosa: (kind: EquipmentKind, id: string, glosa: string) => void;
  onSelect: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rows = buildEquipmentRows(project);
  const summary = summarizeEquipment(rows);
  const codes = rows.map(r => r.code.trim().toLocaleUpperCase());
  const duplicates = codes.filter((c, i) => !c || codes.indexOf(c) !== i);
  const pdf = async () => {
    setBusy(true); setError('');
    try { await exportEquipmentPdf(project); } catch { setError('No se pudo generar el informe. Guarda una copia .cadmap e inténtalo de nuevo.'); } finally { setBusy(false); }
  };
  return <Dialog title="Informe de equipos y materiales" onClose={onClose} wide>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div className="min-w-0 max-w-2xl">
        <p className="font-semibold break-words">{project.metadata.projectName}</p>
        <p className="text-sm text-slate-600 mt-1">Lámina {project.metadata.sheetNumber} · Revisión {project.metadata.revision} · {rows.filter(r => r.unit === 'un').length} equipos</p>
        <p className="text-sm text-slate-600 mt-2">La glosa describe cada elemento y se guarda en el proyecto. Incluye equipos de todas las capas. Cercos y canalizaciones se informan por separado.</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button className="action-button" disabled={!rows.length || busy || !!duplicates.length} onClick={() => exportEquipmentCsv(project)}>Descargar CSV</button>
        <button className="action-button primary" disabled={!rows.length || busy || !!duplicates.length} onClick={pdf}>{busy ? 'Generando…' : 'Descargar informe PDF'}</button>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-700 mb-4">{error}</p>}
    {!!duplicates.length && <p role="alert" className="text-sm text-red-700 mb-4">Hay códigos vacíos o repetidos ({[...new Set(duplicates)].join(', ')}). Selecciona cada código para corregirlo antes de exportar.</p>}
    {!rows.length ? <p className="py-12 text-center text-slate-600">Agrega equipos al plano para generar el listado.</p> : <>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm py-3 border-y border-stone-200 mb-4">
        {summary.map(g => <span key={`${g.type}-${g.status}-${g.unit}`}><strong>{g.quantity.toLocaleString('es-CL', { maximumFractionDigits: 2 })} {g.unit}</strong> {g.type} · {g.status}</span>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse min-w-[680px]">
          <thead className="bg-stone-100"><tr>{['Código', 'Tipo / estado', 'Cantidad', 'Glosa editable'].map(t => <th key={t} scope="col" className="p-3 font-semibold">{t}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.id} className="border-b border-stone-200 align-top">
            <td className="p-3 w-28"><button className="text-purple-800 underline underline-offset-4 font-semibold" onClick={() => { onSelect(r.id); onClose(); }} title="Seleccionar en el plano">{r.code || 'Sin código'}</button></td>
            <td className="p-3 w-44">{r.type}<br/><span className="text-xs text-slate-600">{r.status}</span></td>
            <td className="p-3 w-28 tabular-nums">{r.quantity.toLocaleString('es-CL', { maximumFractionDigits: 2 })} {r.unit}</td>
            <td className="p-2"><textarea aria-label={`Glosa de ${r.code}`} className="w-full rounded-md border border-stone-300 p-2 min-h-20 resize-y" value={r.glosa} maxLength={1200} onChange={e => onUpdateGlosa(r.kind, r.id, e.target.value)} />{r.notes && <p className="text-xs text-slate-600 px-1 break-words">Observaciones: {r.notes}</p>}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600 mt-4">{project.metadata.metersPerUnit ? 'Longitudes según calibración del plano. No incluyen holguras, subidas ni reservas; verificar en terreno.' : 'Sin calibrar: los cercos y canalizaciones se muestran como tramos, sin metros estimados.'} El listado no agrega equipos que no estén registrados en el plano.</p>
    </>}
  </Dialog>;
}
