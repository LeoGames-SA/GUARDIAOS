import { memo, type CSSProperties } from 'react';
import {
  artInfo,
  heightOf,
  LAYOUTS,
  MONITOR_GLASS,
  PHONE_LCD,
  PHONE_BADGE as BADGE,
  POSES,
  SCENE_H,
  SCENE_W,
  type Placement,
  type SlotId,
} from '../../content/station';
import type { GameState, Note } from '../../engine/types';
import { clock } from '../../engine/time';
import { CONTENT } from '../../content';

export type SceneTarget =
  | 'monitor'
  | 'monitor2'
  | 'phone'
  | 'board'
  | 'notebook'
  | 'manual'
  | 'mug'
  | 'cube'
  | 'ball'
  | 'snack'
  | 'ticket'
  | 'memo'
  | 'lamp';

interface Props {
  game: GameState | null;
  dual: boolean;
  pose: 'phone' | 'coffee' | null;
  onOpen: (t: SceneTarget, el: HTMLElement) => void;
  highlight?: SceneTarget | null;
  inert?: boolean;
  /** Objetos que Nico tiene en la mano (se ocultan en la mesa para no duplicarlos). */
  holding?: SlotId[];
  /** Fase de la animación de la pose de café (sólo visual). */
  poseClass?: string;
  /** Escena de ambiente (menú): pantalla en reposo, sin datos de la partida. */
  ambient?: boolean;
}

export function pos(p: {
  x: number;
  y: number;
  w: number;
  z?: number;
  rotate?: number;
  art?: Placement['art'];
}): CSSProperties {
  const h = p.art ? heightOf(p as Placement) : undefined;
  return {
    left: `${(p.x / SCENE_W) * 100}%`,
    top: `${(p.y / SCENE_H) * 100}%`,
    width: `${(p.w / SCENE_W) * 100}%`,
    ...(h ? { height: `${(h / SCENE_H) * 100}%` } : {}),
    zIndex: p.z,
    ...(p.rotate ? { transform: `rotate(${p.rotate}deg)` } : {}),
  };
}

const src = (p: Placement) => artInfo(p.art).file;

/**
 * Texto del visor dibujado en la base: SVG con el tamaño del dibujo y una transformación afín
 * medida sobre las esquinas del LCD, para que siga su perspectiva y no flote sobre la carcasa.
 */
function PhoneLcd({ text, alert }: { text: string; alert: boolean }) {
  const { width: W, height: H } = artInfo('telephone-base');
  const { tl, tr, bl } = PHONE_LCD;
  const m = [
    ((tr[0] - tl[0]) * W) / 100,
    ((tr[1] - tl[1]) * H) / 100,
    ((bl[0] - tl[0]) * W) / 30,
    ((bl[1] - tl[1]) * H) / 30,
    tl[0] * W,
    tl[1] * H,
  ].map((v) => v.toFixed(3));
  return (
    <svg className="phone-lcd" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g transform={`matrix(${m.join(' ')})`}>
        <text x="50" y="19.5" textAnchor="middle" className={alert ? 'lcd-alert' : ''}>
          {text}
        </text>
      </g>
    </svg>
  );
}

/** Objeto interactivo: botón real con nombre accesible; la imagen es decorativa. */
function Obj(props: {
  slot: Placement;
  label: string;
  target: SceneTarget;
  onOpen: Props['onOpen'];
  hidden?: boolean;
  lit?: boolean;
  className?: string;
  children?: React.ReactNode;
  inert?: boolean;
}) {
  const { slot, label, target, onOpen, hidden, lit, className, children, inert } = props;
  return (
    <button
      type="button"
      className={`obj ${className ?? ''} ${lit ? 'is-lit' : ''}`}
      style={{ ...pos(slot), visibility: hidden ? 'hidden' : undefined }}
      aria-label={label}
      data-target={target}
      tabIndex={inert ? -1 : 0}
      onClick={(e) => onOpen(target, e.currentTarget)}
    >
      <img src={src(slot)} alt="" draggable={false} decoding="async" />
      {children}
      <span className="obj-label" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

function Decor({ slot, className }: { slot: Placement; className?: string }) {
  return (
    <img
      className={`decor ${className ?? ''}`}
      src={src(slot)}
      alt=""
      draggable={false}
      style={pos(slot)}
      decoding="async"
    />
  );
}

/** Pantalla en reposo para el menú: nada de expedientes ni aplicaciones. */
function Screensaver() {
  return (
    <div className="mini saver" aria-hidden="true">
      <span className="saver-logo">GuardiaOS</span>
      <span className="saver-sub">Mesa de ayuda · Mutual Sur</span>
    </div>
  );
}

function MiniScreen({ game, second }: { game: GameState | null; second?: boolean }) {
  const focus = game?.focusId ? game.cases[game.focusId] : null;
  const def = focus ? CONTENT.cases[focus.id] : null;
  const pending = game ? Object.values(game.cases).filter((c) => c.status === 'pending').length : 0;
  const unreadMail = game
    ? Object.values(game.cases).filter((c) => c.status !== 'closed' && c.messages.length > 0).length
    : 0;
  return (
    <div className="mini" aria-hidden="true">
      <div className="mini-top">
        <span>GuardiaOS</span>
        <span>{game ? clock(game.minute) : '--:--'}</span>
      </div>
      {second ? (
        <div className="mini-body">
          <b>Monitor 2</b>
          <span>Correo · Historial</span>
        </div>
      ) : (
        <div className="mini-body">
          {def ? (
            <>
              <b>
                {def.number} · {def.title}
              </b>
              <span>{focus?.notes.length ?? 0} notas en la pizarra</span>
            </>
          ) : (
            <b>Sin expediente activo</b>
          )}
          <span className="mini-row">
            <i>Tickets {pending ? `(${pending} en bandeja)` : ''}</i>
            <i>Correo {unreadMail ? `· ${unreadMail}` : ''}</i>
          </span>
        </div>
      )}
      <div className="mini-bar">
        <i />
        <i />
        <i />
        <span>Abrir</span>
      </div>
    </div>
  );
}

/** Miniaturas de notas en el corcho: indican actividad; se leen ampliadas en la pizarra. */
function BoardThumbs({ notes }: { notes: Note[] }) {
  const shown = notes.slice(-9);
  return (
    <div className="board-thumbs" aria-hidden="true">
      {shown.map((n, i) => (
        <span
          key={n.id}
          className={`thumb thumb-${n.kind}`}
          style={{ '--r': `${((i * 37) % 9) - 4}deg` } as CSSProperties}
        >
          <img src={artInfo('sticky-note').file} alt="" />
          <img className="thumb-pin" src={artInfo('pushpin').file} alt="" />
        </span>
      ))}
    </div>
  );
}

export const Scene = memo(function Scene({
  game,
  dual,
  pose,
  onOpen,
  highlight,
  inert,
  holding,
  poseClass,
  ambient,
}: Props) {
  const L = LAYOUTS[dual ? 'dual' : 'single'];
  const ringing = Boolean(game?.incoming);
  const inCall = Boolean(game?.call);
  const onHold = Boolean(game?.call?.held);
  const focus = game?.focusId ? game.cases[game.focusId] : null;
  // En espera, el auricular vuelve a la base: no hay mano con teléfono.
  const activePose = inCall && !onHold ? 'phone' : pose;
  // Cada vez que Nico come, el sándwich queda con un mordisco más (máscara, sin deformar el dibujo).
  const bites = (game?.pauses ?? []).filter((p) => p.kind === 'eat').length;
  const hidden = new Set<SlotId>([...(activePose ? [POSES[activePose].hides] : []), ...(holding ?? [])]);
  const s = (id: SlotId) => L[id]!;
  const screenRect = (slot: Placement) => {
    const r = MONITOR_GLASS;
    const h = heightOf(slot);
    return pos({ x: slot.x + r.x * slot.w, y: slot.y + r.y * h, w: r.w * slot.w, z: slot.z + 1 });
  };
  const screenH = (slot: Placement) => {
    const r = MONITOR_GLASS;
    return `${((r.h * heightOf(slot)) / SCENE_H) * 100}%`;
  };
  const lit = (t: SceneTarget) => highlight === t;

  return (
    <div className="scene" data-inert={inert ? 'true' : undefined}>
      <img className="scene-bg" src="./assets/background.webp" alt="" draggable={false} />
      <div className="rain" aria-hidden="true" />
      <div className="lamp-glow" aria-hidden="true" />

      <Obj
        slot={s('corkboard')}
        label="Pizarra de pruebas"
        target="board"
        onOpen={onOpen}
        lit={lit('board')}
        inert={inert}
      >
        <BoardThumbs notes={focus?.notes ?? []} />
      </Obj>
      <Decor slot={s('lamp')} />
      {L.plant && <Decor slot={L.plant} />}
      <Decor slot={s('penHolder')} />

      <Obj
        slot={s('monitor')}
        label="Monitor: abrir GuardiaOS"
        target="monitor"
        onOpen={onOpen}
        lit={lit('monitor')}
        className="obj-monitor"
        inert={inert}
      />
      <div
        className="screen"
        style={{ ...screenRect(s('monitor')), height: screenH(s('monitor')) }}
        aria-hidden="true"
      >
        {ambient ? <Screensaver /> : <MiniScreen game={game} />}
      </div>
      {dual && L.monitor2 && (
        <>
          <Obj
            slot={L.monitor2}
            label="Segundo monitor: correo e historial"
            target="monitor2"
            onOpen={onOpen}
            className="obj-monitor"
            inert={inert}
          />
          <div
            className="screen"
            style={{ ...screenRect(L.monitor2), height: screenH(L.monitor2) }}
            aria-hidden="true"
          >
            {ambient ? <Screensaver /> : <MiniScreen game={game} second />}
          </div>
        </>
      )}
      <Decor slot={s('keyboard')} />
      <Decor slot={s('mouse')} />

      <Obj
        slot={s('phoneBase')}
        label={
          ringing ? 'Teléfono: está sonando, atender' : inCall ? 'Teléfono: llamada en curso' : 'Teléfono'
        }
        target="phone"
        onOpen={onOpen}
        lit={lit('phone') || ringing}
        className={ringing ? 'is-ringing' : ''}
        inert={inert}
      >
        <span className={`phone-led ${ringing ? 'on' : inCall ? (onHold ? 'led-hold' : 'led-call') : ''}`} />
        <PhoneLcd
          text={
            ringing
              ? 'LLAMADA'
              : inCall
                ? onHold
                  ? 'EN ESPERA'
                  : 'EN LÍNEA'
                : game
                  ? clock(game.minute)
                  : ambient
                    ? 'SOPORTE'
                    : ''
          }
          alert={ringing}
        />
      </Obj>
      <img
        className={`decor handset ${ringing ? 'wiggle' : ''}`}
        src={src(s('handset'))}
        alt=""
        style={{ ...pos(s('handset')), visibility: hidden.has('handset') ? 'hidden' : undefined }}
      />
      {ringing && (
        <span className="ring-badge" style={pos({ x: BADGE.x, y: BADGE.y, w: 200, z: 60 })}>
          Suena el teléfono
        </span>
      )}

      <Obj
        slot={s('mug')}
        label="Taza: tomar café · 5 min"
        target="mug"
        onOpen={onOpen}
        hidden={hidden.has('mug')}
        inert={inert}
      >
        {!hidden.has('mug') && (
          <svg className="steam" viewBox="0 0 40 50" aria-hidden="true">
            <path d="M12 48c-6-8 6-12 0-22s4-14 2-24" />
            <path d="M24 48c-6-8 6-12 0-22s4-14 2-24" />
          </svg>
        )}
      </Obj>
      <Obj slot={s('cube')} label="Cubo 3×3" target="cube" onOpen={onOpen} inert={inert} />
      <Obj slot={s('ball')} label="Pelota antiestrés" target="ball" onOpen={onOpen} inert={inert} />
      <Obj
        slot={s('snack')}
        label="Sándwich: comer algo · 20 min"
        target="snack"
        onOpen={onOpen}
        inert={inert}
        className={bites ? `bitten-${Math.min(bites, 2)}` : ''}
      />
      <Obj
        slot={s('notebook')}
        label="Cuaderno del técnico"
        target="notebook"
        onOpen={onOpen}
        lit={lit('notebook')}
        inert={inert}
      />
      <Obj
        slot={s('ticket')}
        label="Ticket del expediente activo"
        target="ticket"
        onOpen={onOpen}
        inert={inert}
      />
      <Obj slot={s('memo')} label="Avisos y documentos" target="memo" onOpen={onOpen} inert={inert} />
      <Obj slot={s('manual')} label="Manual de referencia" target="manual" onOpen={onOpen} inert={inert} />

      {activePose && (
        <img
          className={`decor pose pose-${activePose} ${activePose === 'coffee' ? (poseClass ?? '') : ''}`}
          src={artInfo(POSES[activePose].art).file}
          alt=""
          style={pos(POSES[activePose])}
        />
      )}
    </div>
  );
});
