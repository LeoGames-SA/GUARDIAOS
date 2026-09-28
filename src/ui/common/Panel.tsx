import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Modal: atrapa el foco y cierra con Escape por sí mismo. */
  modal?: boolean;
  wide?: boolean;
  className?: string;
  actions?: ReactNode;
  style?: React.CSSProperties;
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Panel plano y legible. Enfoca su contenido al abrir; el que lo abre restaura el foco al cerrar. */
export function Panel({ title, onClose, children, modal, wide, className, actions, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first =
      el.querySelector<HTMLElement>('[data-autofocus]') ??
      el.querySelector<HTMLElement>('.panel-body ' + FOCUSABLE);
    (first ?? el).focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [modal, onClose]);

  const body = (
    <div
      ref={ref}
      className={`panel ${wide ? 'panel-wide' : ''} ${className ?? ''}`}
      role="dialog"
      aria-modal={modal ? 'true' : undefined}
      aria-labelledby={id}
      tabIndex={-1}
      style={style}
    >
      <div className="panel-head">
        <h2 id={id}>{title}</h2>
        {actions}
        <button type="button" className="close-x" onClick={onClose} aria-label="Cerrar (Esc)">
          ✕
        </button>
      </div>
      {children}
    </div>
  );
  if (!modal) return body;
  return (
    <>
      <div className="scrim scrim-modal" onClick={onClose} />
      <div className="overlay overlay-modal">{body}</div>
    </>
  );
}
