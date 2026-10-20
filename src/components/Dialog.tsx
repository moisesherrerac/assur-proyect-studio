import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.focus();
    const keydown = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key === 'Tab') {
        const elements = [...root!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]')].filter(e => e.getClientRects().length > 0);
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && (document.activeElement === last || document.activeElement === root)) { e.preventDefault(); first.focus(); }
      }
    };
    root?.addEventListener('keydown', keydown);
    return () => { root?.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 sm:p-6 flex items-center justify-center">
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-6xl' : 'max-w-2xl'} max-h-[92vh] flex flex-col overflow-hidden text-slate-800 outline-none`}>
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-stone-200">
        <h2 className="text-base font-bold">{title}</h2>
        <button onClick={onClose} aria-label="Cerrar ventana" className="p-2 rounded-md hover:bg-stone-100"><X size={20} /></button>
      </div>
      <div className="overflow-auto overscroll-contain p-5">{children}</div>
    </div>
  </div>;
}
