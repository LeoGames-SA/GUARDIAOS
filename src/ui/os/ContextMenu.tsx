import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

/** Menú contextual accesible: flechas, Enter, Escape; restaura el foco al cerrar. */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const prev = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    const opener = prev.current;
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [onClose]);

  const onKey = (e: React.KeyboardEvent) => {
    const btns = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') btns[(i + 1) % btns.length]?.focus();
    else if (e.key === 'ArrowUp') btns[(i - 1 + btns.length) % btns.length]?.focus();
    else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <ul className="ctx" role="menu" ref={ref} style={{ left: x, top: y }} onKeyDown={onKey}>
      {items.map((it) => (
        <li key={it.label} role="none">
          <button
            type="button"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              onClose();
              it.action();
            }}
          >
            {it.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Abre el menú contextual también con Shift+F10 o la tecla de menú. */
export function isContextKey(e: React.KeyboardEvent): boolean {
  return (e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu';
}
