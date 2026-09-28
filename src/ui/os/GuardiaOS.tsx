import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { DEVICES } from '../../content/devices';
import { APP_LABELS } from '../../engine/game';
import { clock } from '../../engine/time';
import type { AppId, GameState } from '../../engine/types';
import { Panel } from '../common/Panel';
import { ContextMenu, isContextKey, type MenuItem } from './ContextMenu';
import { AppView, AppIcon } from './apps';
import { SecondPane } from './SecondScreen';
import { useWm, wm, type Win } from './windows';

export const OS_APPS: AppId[] = [
  'tickets',
  'mail',
  'network',
  'accounts',
  'printers',
  'services',
  'events',
  'files',
  'browser',
  'remote',
  'history',
  'procedures',
  'console',
];

interface Ctx {
  x: number;
  y: number;
  items: MenuItem[];
}

export function GuardiaOS({ game, onClose, dual }: { game: GameState; onClose: () => void; dual: boolean }) {
  const scope = game.mode;
  const state = useWm(scope);
  const deskRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  /** Área útil para abrir ventanas: a la derecha de la columna de íconos. */
  const usable = useCallback(() => {
    const desk = deskRef.current;
    if (!desk) return undefined;
    const icons = desk.querySelector<HTMLElement>('.os-icons');
    // En móvil los íconos van arriba (ancho completo): no restan ancho.
    const iw = icons && icons.offsetWidth < desk.clientWidth / 2 ? icons.offsetWidth : 0;
    return { x: iw + 4, y: 0, w: Math.max(320, desk.clientWidth - iw - 4), h: desk.clientHeight };
  }, []);
  const [start, setStart] = useState(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const store = useStore();

  useLayoutEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const open = useCallback(
    (app: AppId, target?: string) => {
      setStart(false);
      wm.open(scope, app, target, usable());
    },
    [scope, usable],
  );

  // Primera apertura: Centro de tickets a mano.
  useEffect(() => {
    if (state.wins.length === 0) wm.open(scope, 'tickets', undefined, usable());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuAt = (el: HTMLElement, items: MenuItem[], e?: { clientX: number; clientY: number }) => {
    const desk = deskRef.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = (e?.clientX ?? r.left + 12) - desk.left;
    const y = (e?.clientY ?? r.bottom - 4) - desk.top;
    setCtx({ x: Math.min(x, size.w - 200), y: Math.min(y, size.h - 40 * items.length), items });
  };

  const focus = game.focusId ? CONTENT.cases[game.focusId] : null;
  const pending = Object.values(game.cases).filter((c) => c.status === 'pending').length;

  return (
    <Panel
      title={
        <>
          GuardiaOS <span className="muted small">· PC-SOP-01 · tu equipo</span>
        </>
      }
      onClose={onClose}
      className={`os-panel ${dual ? 'os-dual' : ''}`}
    >
      <div className="os-wrap">
        <div className="os">
          <div
            className="os-desktop"
            ref={deskRef}
            onContextMenu={(e) => {
              if (e.target !== e.currentTarget) return;
              e.preventDefault();
              menuAt(
                e.currentTarget,
                [
                  { label: 'Abrir Centro de tickets', action: () => open('tickets') },
                  { label: 'Abrir Consola', action: () => open('console') },
                  { label: 'Cerrar todas las ventanas', action: () => wm.reset(scope) },
                ],
                e,
              );
            }}
          >
            <ul className="os-icons" aria-label="Aplicaciones del escritorio">
              {OS_APPS.map((app) => (
                <li key={app}>
                  <button
                    type="button"
                    className="os-icon"
                    onDoubleClick={() => open(app)}
                    onClick={(e) => {
                      // Un clic basta en táctil y teclado; doble clic también funciona.
                      if (e.detail <= 1) open(app);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      menuAt(e.currentTarget, iconMenu(app), e);
                    }}
                    onKeyDown={(e) => {
                      if (isContextKey(e)) {
                        e.preventDefault();
                        menuAt(e.currentTarget, iconMenu(app));
                      }
                    }}
                  >
                    <AppIcon app={app} />
                    <span>{APP_LABELS[app]}</span>
                  </button>
                </li>
              ))}
            </ul>
            {state.wins
              .filter((w) => !w.min)
              .map((w) => (
                <Window
                  key={w.id}
                  win={w}
                  scope={scope}
                  bounds={size}
                  active={state.active === w.id}
                  onMenu={(el, e) => menuAt(el, winMenu(w), e)}
                >
                  <AppView app={w.app} target={w.target} game={game} open={open} />
                </Window>
              ))}
            {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={() => setCtx(null)} />}
            {start && (
              <div className="os-start" role="menu" aria-label="Menú de aplicaciones">
                {OS_APPS.map((app) => (
                  <button key={app} type="button" role="menuitem" onClick={() => open(app)}>
                    <AppIcon app={app} /> {APP_LABELS[app]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="os-taskbar">
            <button
              type="button"
              className="os-start-btn"
              aria-expanded={start}
              onClick={() => setStart((s) => !s)}
            >
              ▦ Inicio
            </button>
            <div className="os-tasks" role="toolbar" aria-label="Ventanas abiertas">
              {state.wins.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`os-task ${state.active === w.id && !w.min ? 'on' : ''} ${w.min ? 'min' : ''}`}
                  onClick={() =>
                    w.min || state.active !== w.id ? wm.focus(scope, w.id) : wm.minimize(scope, w.id)
                  }
                  aria-label={`${winTitle(w)}${w.min ? ' (minimizada)' : ''}`}
                >
                  <AppIcon app={w.app} /> <span>{winTitle(w)}</span>
                </button>
              ))}
            </div>
            <div className="os-tray">
              <button
                type="button"
                className="os-tray-case"
                onClick={() => open('tickets')}
                title="Expediente activo"
              >
                {focus ? `${focus.number} · ${focus.title}` : 'Sin expediente activo'}
                {pending > 0 && <span className="badge">{pending}</span>}
              </button>
              <span className="os-clock">{game.mode === 'practice' ? 'práctica' : clock(game.minute)}</span>
            </div>
          </div>
        </div>
        {dual && <SecondPane game={game} />}
      </div>
    </Panel>
  );

  function iconMenu(app: AppId): MenuItem[] {
    return [
      { label: 'Abrir', action: () => open(app) },
      {
        label: 'Propiedades',
        action: () => store.dispatch({ type: 'focus', caseId: game.focusId ?? '' }),
        disabled: true,
      },
    ];
  }
  function winMenu(w: Win): MenuItem[] {
    return [
      { label: 'Traer al frente', action: () => wm.focus(scope, w.id) },
      { label: 'Minimizar', action: () => wm.minimize(scope, w.id) },
      { label: 'Volver a la posición inicial', action: () => wm.move(scope, w.id, 150, 16) },
      { label: 'Cerrar', action: () => wm.close(scope, w.id) },
    ];
  }
}

export function winTitle(w: Win): string {
  if (w.app === 'remote' && w.target) return `Remoto · ${DEVICES[w.target]?.id ?? w.target}`;
  return APP_LABELS[w.app] ?? w.app;
}

function Window({
  win,
  scope,
  bounds,
  active,
  onMenu,
  children,
}: {
  win: Win;
  scope: string;
  bounds: { w: number; h: number };
  active: boolean;
  onMenu: (el: HTMLElement, e?: { clientX: number; clientY: number }) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ dx: number; dy: number; x: number; y: number } | null>(null);
  // Mantener dentro del área útil: la barra de título siempre alcanzable.
  const w = Math.min(win.w, bounds.w - 8);
  const h = Math.min(win.h, bounds.h - 8);
  const clampX = (x: number) => Math.max(0, Math.min(x, bounds.w - w));
  const clampY = (y: number) => Math.max(0, Math.min(y, bounds.h - 40));
  const x = clampX(win.x);
  const y = clampY(win.y);
  const remote = win.app === 'remote' && win.target;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    wm.focus(scope, win.id);
    drag.current = { dx: e.clientX - x, dy: e.clientY - y, x, y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !ref.current) return;
    d.x = clampX(e.clientX - d.dx);
    d.y = clampY(e.clientY - d.dy);
    // Sin render por movimiento: se mueve el elemento y se confirma al soltar.
    ref.current.style.transform = `translate(${d.x - x}px, ${d.y - y}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !ref.current) return;
    ref.current.style.transform = '';
    if (d.x !== x || d.y !== y) wm.move(scope, win.id, d.x, d.y);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (isContextKey(e)) {
      e.preventDefault();
      onMenu(e.currentTarget as HTMLElement);
      return;
    }
    const step = e.shiftKey ? 64 : 16;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    wm.move(scope, win.id, clampX(x + m[0]), clampY(y + m[1]));
  };

  return (
    <section
      ref={ref}
      className={`win ${active ? 'active' : ''} ${remote ? 'win-remote' : ''}`}
      style={{ left: x, top: y, width: w, height: h, zIndex: win.z }}
      aria-label={winTitle(win)}
      onPointerDown={() => !active && wm.focus(scope, win.id)}
    >
      <header
        className="win-title"
        tabIndex={0}
        title="Arrastrá para mover. Con el teclado: flechas (Shift = más rápido)."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => {
          e.preventDefault();
          onMenu(e.currentTarget, e);
        }}
      >
        <AppIcon app={win.app} />
        <span className="win-name">{winTitle(win)}</span>
        <button
          type="button"
          className="win-btn"
          aria-label="Más opciones"
          onClick={(e) => onMenu(e.currentTarget)}
        >
          ⋯
        </button>
        <button
          type="button"
          className="win-btn"
          aria-label="Minimizar"
          onClick={() => wm.minimize(scope, win.id)}
        >
          ▁
        </button>
        <button
          type="button"
          className="win-btn win-close"
          aria-label="Cerrar ventana"
          onClick={() => wm.close(scope, win.id)}
        >
          ✕
        </button>
      </header>
      <div className="win-body">{children}</div>
    </section>
  );
}
