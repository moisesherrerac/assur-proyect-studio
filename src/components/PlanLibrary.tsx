import React, { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { PlanAccessError, type PlanLibrary as Library, type SavedPlan } from '../utils/githubPlans';

export function PlanLibrary({ library, current, getDocument, onSaved, onOpen, onClose, onAccessLost, onRecoverLegacy }: {
  library: Library; current?: SavedPlan; getDocument: () => any;
  onSaved: (entry: SavedPlan) => void; onOpen: (document: any, entry: SavedPlan) => boolean;
  onClose: () => void; onAccessLost: () => void; onRecoverLegacy: () => void;
}) {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [busy, setBusy] = useState(true), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [name, setName] = useState(current?.name || getDocument().metadata.projectName || 'Nuevo plano');
  const [folder, setFolder] = useState(current?.folder || 'General');
  const [query, setQuery] = useState(''), [folderFilter, setFolderFilter] = useState(''), [archived, setArchived] = useState(false);
  const handleError = (err: unknown) => {
    if (err instanceof PlanAccessError) { onAccessLost(); return; }
    setError(err instanceof Error ? err.message : 'No se pudo completar la operación. Tu plano se conserva.');
  };
  useEffect(() => {
    let active = true;
    library.list().then(data => { if (active) setPlans(data); }).catch(err => { if (active) handleError(err); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [library]);
  const save = async (copy: boolean) => {
    if (busy) return; setBusy(true); setError(''); setMessage('');
    try {
      const entry = await library.save(getDocument(), name, folder, copy ? undefined : current);
      setPlans(old => old.filter(p => p.id !== entry.id).concat(entry)); onSaved(entry);
      setMessage('Plano guardado en GitHub privado. Ya puedes abrirlo desde otro computador.');
    } catch (err) { handleError(err); } finally { setBusy(false); }
  };
  const visible = plans.filter(p => p.archived === archived && (!folderFilter || p.folder === folderFilter) && `${p.name} ${p.client} ${p.folder}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const folders = [...new Set(plans.filter(p => p.archived === archived).map(p => p.folder))].sort((a,b)=>a.localeCompare(b,'es'));
  return <Dialog title="Mis planos" onClose={onClose} wide>
    <p className="text-sm text-slate-600 mb-5">Biblioteca privada en GitHub. Los cambios se sincronizan al pulsar Guardar; la copia de trabajo del navegador es temporal.</p>
    <form className="flex flex-wrap gap-3 items-end pb-5 border-b border-stone-200" onSubmit={e=>{e.preventDefault();void save(false);}}>
      <label className="text-sm font-medium flex-1 min-w-52">Nombre del plano<input className="form-control" value={name} maxLength={160} required onChange={e=>setName(e.target.value)} disabled={busy}/></label>
      <label className="text-sm font-medium w-52">Guardar en carpeta<input className="form-control" list="plan-folders" value={folder} maxLength={80} onChange={e=>setFolder(e.target.value)} disabled={busy}/><datalist id="plan-folders">{folders.map(f=><option key={f} value={f}/>)}</datalist></label>
      <button className="action-button primary" disabled={busy} type="submit">{busy ? 'Conectando…' : current ? 'Guardar cambios' : 'Guardar nuevo plano'}</button>
      {current && <button type="button" className="action-button" disabled={busy} onClick={()=>save(true)}>Guardar como copia</button>}
    </form>
    <div aria-live="polite">{message && <p className="text-sm text-emerald-800 py-3">{message}</p>}{error && <p role="alert" className="text-sm text-red-800 py-3">{error}</p>}</div>
    <div className="flex flex-wrap gap-3 my-5 items-end">
      <label className="text-sm flex-1 min-w-44">Buscar plano<input className="form-control" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, cliente o carpeta"/></label>
      <label className="text-sm">Filtrar por carpeta<select className="form-control min-w-36" value={folderFilter} onChange={e=>setFolderFilter(e.target.value)}><option value="">Todas</option>{folders.map(f=><option key={f}>{f}</option>)}</select></label>
      <label className="text-sm py-2 flex gap-2 items-center"><input type="checkbox" checked={archived} onChange={e=>{setArchived(e.target.checked);setFolderFilter('');}}/>Ver archivados</label>
      <button className="action-button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{setPlans(await library.list());}catch(e){handleError(e);}finally{setBusy(false);}}}>Actualizar lista</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm text-left border-collapse">
        <thead className="bg-stone-100"><tr>{['Plano', 'Carpeta', 'Último guardado', 'Acciones'].map(h=><th scope="col" className="p-3 font-semibold" key={h}>{h}</th>)}</tr></thead>
        <tbody>{visible.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(plan=><tr key={plan.id} className="border-b border-stone-200 align-top">
          <td className="p-3 max-w-sm break-words"><strong>{plan.name}</strong>{current?.id===plan.id&&<span className="text-purple-800 ml-2 text-xs">Abierto</span>}<p className="text-xs text-slate-600 mt-1">{plan.client}</p></td>
          <td className="p-3 max-w-40 break-words">{plan.folder}</td>
          <td className="p-3 whitespace-nowrap">{new Date(plan.updatedAt).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'})}<p className="text-xs text-slate-600">{(plan.bytes/1024/1024).toLocaleString('es-CL',{maximumFractionDigits:1})} MB</p></td>
          <td className="p-3"><div className="flex gap-2">
            <button className="action-button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const loaded=await library.open(plan);if(onOpen(loaded.document,loaded.entry))onClose();}catch(e){handleError(e);}finally{setBusy(false);}}}>Abrir</button>
            <button className="action-button" disabled={busy} onClick={async()=>{
              if(!window.confirm(plan.archived?'¿Restaurar este plano en la biblioteca?':'¿Archivar este plano? Podrás recuperarlo en Ver archivados.'))return;
              setBusy(true);setError('');try{const updated=await library.archive(plan,!plan.archived);setPlans(old=>old.map(p=>p.id===updated.id?updated:p));if(current?.id===updated.id)onSaved(updated);}catch(e){handleError(e);}finally{setBusy(false);}
            }}>{plan.archived?'Restaurar':'Archivar'}</button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {!visible.length&&!busy&&<p className="text-center py-10 text-sm text-slate-600">{plans.length?'No hay planos que coincidan con estos filtros.':'Todavía no hay planos guardados. Guarda el plano actual para comenzar.'}</p>}
    </div>
    <div className="mt-5 pt-4 border-t border-stone-200 text-xs text-slate-600 flex flex-wrap gap-4">
      <span>Archivar conserva los archivos y su historial. Tamaño máximo por plano: 20 MB.</span>
      <button className="text-purple-800 underline" onClick={()=>{onRecoverLegacy();onClose();}}>Recuperar respaldo local de la versión anterior</button>
    </div>
  </Dialog>;
}
