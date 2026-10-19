import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const ConfirmContext = createContext(null);

// Sustituye a window.confirm: `if (await confirm({ title, text })) ...`.
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setDialog(options);
      }),
    [],
  );

  const close = useCallback((result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ title, text, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false, onClose }) {
  // En captura y cortando la propagación: Escape cierra solo este popup, no el <Modal> que haya debajo.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm animate-pop rounded-2xl border border-border bg-surface p-5 text-center"
      >
        <div className={`mx-auto mb-3 grid size-12 place-items-center rounded-full text-2xl ${danger ? 'bg-red-500/15 text-red-400' : 'bg-accent/15 text-accent'}`}>
          <Icon name={danger ? 'triangle-alert' : 'circle-check'} />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
        <div className="mt-5 flex gap-2">
          <button autoFocus onClick={() => onClose(false)} className="flex-1 rounded-xl bg-bg py-2.5 font-medium">
            {cancelLabel}
          </button>
          <button
            onClick={() => onClose(true)}
            className={`flex-1 rounded-xl py-2.5 font-semibold ${danger ? 'bg-red-500 text-white' : 'bg-accent text-bg'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
