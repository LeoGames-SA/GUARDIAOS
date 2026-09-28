import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Objeto levantado de la mesa: sale desde donde estaba el dibujo y vuelve ahí al soltarlo.
 * La mesa oculta su sprite mientras tanto (ver Scene `holding`). Esc también lo devuelve.
 */
export function Held({
  label,
  from,
  onClose,
  className,
  children,
}: {
  label: string;
  from?: DOMRect | null;
  onClose: () => void;
  className?: string;
  children: (returnToDesk: () => void) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'lifting' | 'held' | 'returning'>('lifting');
  const reduced = () => document.documentElement.dataset.motion === 'reduced';

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    (el.querySelector<HTMLElement>('[data-autofocus]') ?? el).focus({ preventScroll: true });
    if (!from || reduced()) {
      setPhase('held');
      return;
    }
    const s = Math.max(0.08, Math.min(1, from.width / Math.max(1, r.width)));
    el.style.setProperty('--fx', `${from.left + from.width / 2 - (r.left + r.width / 2)}px`);
    el.style.setProperty('--fy', `${from.top + from.height / 2 - (r.top + r.height / 2)}px`);
    el.style.setProperty('--fs', String(s));
  }, [from]);

  const returnToDesk = useCallback(() => {
    if (!from || reduced()) onClose();
    else setPhase('returning');
  }, [from, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      returnToDesk();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [returnToDesk]);

  return (
    <div
      ref={ref}
      className={`held held-${phase} ${className ?? ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (phase === 'lifting') setPhase('held');
        else if (phase === 'returning') onClose();
      }}
    >
      {children(returnToDesk)}
    </div>
  );
}
