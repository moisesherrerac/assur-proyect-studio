import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AssurLogo } from './AssurLogo';
import { GitHubPlanLibrary, CREATE_ACCESS_KEY_URL } from '../utils/githubPlans';
const Editor = lazy(() => import('../App'));
import { PRIVATE_DRAFT_KEY } from '../utils/privateSession';

export function PrivateAccess() {
  const [library, setLibrary] = useState<GitHubPlanLibrary | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = (reason: string, eraseDraft = false) => {
    library?.dispose(); setLibrary(null); setKey(''); setMessage(reason);
    if (eraseDraft) { try { sessionStorage.removeItem(PRIVATE_DRAFT_KEY); } catch {} }
  };
  useEffect(() => {
    if (!library) return;
    let lastActivity = Date.now();
    const activity = () => { lastActivity = Date.now(); };
    const check = setInterval(() => {
      if (Date.now() - lastActivity > 30 * 60 * 1000) lock('Sesión bloqueada por inactividad. Ingresa la clave para continuar con tu borrador.');
    }, 30000);
    window.addEventListener('pointerdown', activity, { passive: true });
    window.addEventListener('keydown', activity);
    return () => { clearInterval(check); window.removeEventListener('pointerdown', activity); window.removeEventListener('keydown', activity); };
  }, [library]);
  if (library) return <Suspense fallback={<p className="p-8 text-slate-600" role="status">Abriendo tus planos…</p>}>
    <Editor library={library} onSignOut={() => lock('Sesión cerrada. La clave se eliminó de esta pestaña.', true)} onAccessLost={() => lock('GitHub no autorizó el acceso. Ingresa una clave vigente para continuar.')} />
  </Suspense>;
  return <main className="min-h-dvh bg-stone-100 px-5 py-10 flex items-center justify-center text-slate-800">
    <section className="w-full max-w-md bg-white rounded-xl p-7 sm:p-9 shadow-lg">
      <div className="flex items-center gap-3 mb-8"><AssurLogo className="w-8 h-8"/><span className="text-sm font-bold tracking-wide">ASSUR CHILE</span></div>
      <h1 className="text-2xl font-bold tracking-tight">Acceso a tus planos</h1>
      <p className="text-sm text-slate-600 mt-3 mb-6 leading-relaxed">Ingresa tu clave de acceso de GitHub para abrir la biblioteca privada. Puedes usarla desde otro computador.</p>
      <form onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        const credential = key.trim();
        if (!/^github_pat_[a-zA-Z0-9_]{20,}$/.test(credential)) { setMessage('Usa una clave de acceso detallada (fine-grained) de GitHub; no tu contraseña personal.'); return; }
        setBusy(true); setMessage(''); setKey('');
        const store = new GitHubPlanLibrary(credential);
        try { await store.connect(); await store.list(); setLibrary(store); }
        catch (err) { store.dispose(); setMessage(err instanceof Error ? err.message : 'No se pudo verificar el acceso.'); }
        finally { setBusy(false); }
      }}>
        <label className="block text-sm font-semibold" htmlFor="access-key">Clave de acceso de GitHub</label>
        <input id="access-key" name="access-key" type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" className="form-control mt-2" value={key} onChange={e => setKey(e.target.value)} disabled={busy} required aria-describedby="key-help" />
        <p id="key-help" className="text-xs text-slate-600 mt-2">La clave se mantiene solo en memoria. Al recargar o abrir otra pestaña deberás ingresarla otra vez.</p>
        {message && <p role="alert" className="mt-4 text-sm text-red-800 leading-relaxed">{message}</p>}
        <button type="submit" className="action-button primary w-full mt-5" disabled={busy}>{busy ? 'Verificando acceso…' : 'Entrar'}</button>
      </form>
      <details className="mt-7 text-sm border-t border-stone-200 pt-5">
        <summary className="cursor-pointer font-semibold text-purple-800">Crear mi clave de acceso</summary>
        <ol className="list-decimal pl-5 mt-3 space-y-3 text-slate-600 leading-relaxed">
          <li>Abre <a href={CREATE_ACCESS_KEY_URL} target="_blank" rel="noopener noreferrer" className="underline text-purple-800">la configuración de GitHub</a>.</li>
          <li>En <strong>Repository access</strong>, elige <strong>Only select repositories</strong> y selecciona solo <strong>assur-planos-privados</strong>.</li>
          <li>Comprueba <strong>Contents: Read and write</strong>, define su vencimiento y genera la clave.</li>
          <li>Guárdala en tu gestor de contraseñas y pégala aquí. No la compartas por el chat.</li>
        </ol>
      </details>
    </section>
  </main>;
}
