import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AssurLogo } from './AssurLogo';
import { GitHubPlanLibrary, PlanAccessError } from '../utils/githubPlans';
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
      if (Date.now() - lastActivity > 30 * 60 * 1000) lock('Sesión bloqueada por inactividad.');
    }, 30000);
    window.addEventListener('pointerdown', activity, { passive: true });
    window.addEventListener('keydown', activity);
    return () => { clearInterval(check); window.removeEventListener('pointerdown', activity); window.removeEventListener('keydown', activity); };
  }, [library]);
  if (library) return <Suspense fallback={<p className="p-8 text-slate-600" role="status">Abriendo tus planos…</p>}>
    <Editor library={library} onSignOut={() => lock('Sesión cerrada.', true)} onAccessLost={() => lock('Sesión vencida. Ingresa tu clave de nuevo.')} />
  </Suspense>;
  return <main className="min-h-dvh bg-stone-100 px-5 py-10 flex items-center justify-center text-slate-800">
    <section className="w-full max-w-md bg-white rounded-xl p-7 sm:p-9 shadow-lg">
      <div className="flex items-center gap-3 mb-6"><AssurLogo className="w-8 h-8"/><span className="text-sm font-bold tracking-wide">ASSUR CHILE</span></div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Iniciar sesión</h1>
      <form onSubmit={async e => {
        e.preventDefault(); if (busy) return;
        const credential = key.trim();
        if (!/^github_pat_[a-zA-Z0-9_]{20,}$/.test(credential)) { setMessage('La clave de acceso no es válida.'); return; }
        setBusy(true); setMessage(''); setKey('');
        const store = new GitHubPlanLibrary(credential);
        try { await store.connect(); await store.list(); setLibrary(store); }
        catch (err) {
          store.dispose();
          const detail = err instanceof Error ? err.message : '';
          setMessage(/permiso|lectura|Contents/.test(detail) ? 'La clave no tiene permiso para acceder a tus planos.' : err instanceof PlanAccessError ? 'Clave no válida o vencida.' : 'No se pudo conectar. Inténtalo de nuevo.');
        }
        finally { setBusy(false); }
      }}>
        <label className="block text-sm font-semibold" htmlFor="access-key">Clave de acceso</label>
        <input id="access-key" name="access-key" type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" className="form-control mt-2" value={key} onChange={e => setKey(e.target.value)} disabled={busy} required />
        {message && <p role="alert" className="mt-4 text-sm text-red-800 leading-relaxed">{message}</p>}
        <button type="submit" className="action-button primary w-full mt-5" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </section>
  </main>;
}
