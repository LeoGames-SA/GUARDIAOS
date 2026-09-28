import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState, useStore } from '../application/context';
import { sound } from '../application/audio';
import { CONTENT } from '../content';
import { allSettled, upcoming } from '../engine/game';
import { mood } from '../engine/needs';
import { clock } from '../engine/time';
import type { GameEvent, GameState, PauseKind } from '../engine/types';
import { CallPanel, IncomingCall, markCallStart, PhonePanel } from './panels/CallPanel';
import { BoardPanel } from './panels/BoardPanel';
import { NotebookPanel, ManualPanel } from './panels/NotebookPanel';
import { PausePanel } from './panels/PausePanel';
import { NicoPanel } from './panels/NicoPanel';
import { CubePanel } from './panels/CubePanel';
import { BallPanel } from './panels/BallPanel';
import { DocPanel } from './panels/DocPanel';
import { ReportPanel } from './panels/ReportPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { TutorialHint, tutorialFocus } from './panels/Tutorial';
import { GuardiaOS } from './os/GuardiaOS';
import { SecondScreen } from './os/SecondScreen';
import { Scene, type SceneTarget } from './scene/Scene';
import { artInfo, type ArtId } from '../content/station';
import { Panel } from './common/Panel';

export type PanelState =
  | { kind: 'os' }
  | { kind: 'second' }
  | { kind: 'board' }
  | { kind: 'notebook' }
  | { kind: 'manual' }
  | { kind: 'pause'; preset?: PauseKind }
  | { kind: 'nico' }
  | { kind: 'cube' }
  | { kind: 'ball' }
  | { kind: 'doc'; doc: 'ticket' | 'memo' }
  | { kind: 'settings' }
  | { kind: 'phone' };

interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'warn' | 'bad' | 'good';
}

function describe(e: GameEvent, g: GameState): Toast['text'] | null {
  const def = 'caseId' in e && e.caseId ? CONTENT.cases[e.caseId] : undefined;
  const who = def && g.cases[def.id]?.contactKnown ? def.contact.short : 'Alguien';
  switch (e.type) {
    case 'arrival':
      return def?.channel === 'phone' ? null : `Llegó el expediente ${def?.number}: ${def?.title}.`;
    case 'incoming':
      return e.reason === 'new'
        ? 'Suena el teléfono: llamada entrante.'
        : `Suena el teléfono: ${who} vuelve a llamar.`;
    case 'missed':
      return `Llamada perdida de ${def?.contact.short ?? 'alguien'}: dejó un mensaje.`;
    case 'deadline':
      return `Venció el plazo de ${def?.number}. ${e.text}`;
    case 'world':
      return e.text;
    case 'note':
      return 'Nota nueva en la pizarra.';
    case 'blocked':
      return e.reason;
    case 'closed':
      return `Expediente ${def?.number} cerrado.`;
    case 'info':
      return e.text;
    case 'ended':
      return 'Son las 07:00: fin del turno.';
    default:
      return null;
  }
}

const tone = (e: GameEvent): Toast['tone'] =>
  e.type === 'blocked' || e.type === 'deadline' || e.type === 'missed'
    ? 'bad'
    : e.type === 'closed'
      ? 'good'
      : e.type === 'incoming' || e.type === 'arrival'
        ? 'warn'
        : 'info';

export function Desk() {
  const app = useAppState();
  const store = useStore();
  const game = app.mode === 'practice' ? (app.practice?.game ?? null) : app.campaign;
  const [panel, setPanel] = useState<PanelState | null>(null);
  // La llamada es una capa propia: contraerla no mueve la escena ni cierra la conversación.
  const [callCollapsed, setCallCollapsed] = useState(false);
  const mobile = useMobile();
  const reportReady = Boolean(
    app.justClosed &&
    game?.cases[app.justClosed]?.status === 'closed' &&
    game.call?.caseId !== app.justClosed,
  );
  useEffect(() => {
    // Un solo cuadro a la vez: el informe no se apila sobre GuardiaOS u otro panel.
    if (reportReady) setPanel(null);
  }, [reportReady]);
  useEffect(() => {
    // En móvil, abrir una herramienta contrae la llamada a una barra; cerrar la vuelve a mostrar.
    if (mobile) setCallCollapsed(Boolean(panel));
  }, [panel, mobile]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState('');
  const [pose, setPose] = useState<'coffee' | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const toastId = useRef(0);

  const open = useCallback((p: PanelState, el?: HTMLElement | null) => {
    opener.current = el ?? (document.activeElement as HTMLElement | null);
    sound.play('click');
    setPanel(p);
  }, []);
  const close = useCallback(() => {
    setPanel(null);
    const el = opener.current;
    if (el && document.contains(el)) el.focus();
  }, []);

  // Eventos del motor → avisos, sonido y región aria-live (una vez por evento, nunca por cuadro).
  useEffect(
    () =>
      store.onEvents((events) => {
        const g = store.game;
        if (!g) return;
        const fresh: Toast[] = [];
        for (const e of events) {
          const text = describe(e, g);
          if (text) fresh.push({ id: ++toastId.current, text, tone: tone(e) });
          if (e.type === 'incoming') sound.play('ring');
          else if (e.type === 'arrival' || e.type === 'note') sound.play('notify');
          else if (e.type === 'blocked') sound.play('error');
          else if (e.type === 'closed') sound.play('confirm');
          else if (e.type === 'pause' && e.kind === 'coffee') setPose('coffee');
        }
        if (!fresh.length) return;
        setLive(fresh.map((t) => t.text).join(' '));
        // Avisos iguales se agrupan en uno con contador, en vez de apilarse.
        setToasts((prev) => {
          const next = [...prev];
          for (const t of fresh) {
            const same = next.find((x) => x.text === t.text || x.text.startsWith(`${t.text} (×`));
            if (same) {
              const n = (Number(/\(×(\d+)\)$/.exec(same.text)?.[1]) || 1) + 1;
              Object.assign(same, { id: t.id, text: `${t.text} (×${n})` });
            } else next.push(t);
          }
          return next.slice(-4);
        });
        for (const t of fresh)
          setTimeout(
            () => setToasts((all) => all.filter((x) => x.id !== t.id)),
            t.tone === 'bad' ? 6500 : 4200,
          );
      }),
    [store],
  );

  useEffect(() => {
    if (!pose) return;
    const t = setTimeout(() => setPose(null), 1600);
    return () => clearTimeout(t);
  }, [pose]);

  const answer = useCallback(() => {
    sound.play('click');
    store.dispatch({ type: 'answerCall' });
    if (store.game?.call) markCallStart(store.game.call.eventKey);
    setCallCollapsed(false);
  }, [store]);

  const onScene = useCallback(
    (t: SceneTarget, el: HTMLElement) => {
      const g = store.game;
      switch (t) {
        case 'monitor':
          return open({ kind: 'os' }, el);
        case 'monitor2':
          return open({ kind: 'second' }, el);
        case 'phone':
          if (g?.incoming && !g.call) {
            sound.play('click');
            answer();
          } else if (g?.call) setCallCollapsed(false);
          else open({ kind: 'phone' }, el);
          return;
        case 'board':
          return open({ kind: 'board' }, el);
        case 'notebook':
          return open({ kind: 'notebook' }, el);
        case 'manual':
          return open({ kind: 'manual' }, el);
        case 'mug':
          return open({ kind: 'pause', preset: 'coffee' }, el);
        case 'snack':
          return open({ kind: 'pause', preset: 'eat' }, el);
        case 'cube':
          return open({ kind: 'cube' }, el);
        case 'ball':
          return open({ kind: 'ball' }, el);
        case 'ticket':
          return open({ kind: 'doc', doc: 'ticket' }, el);
        case 'memo':
          return open({ kind: 'doc', doc: 'memo' }, el);
        default:
          return;
      }
    },
    [open, store, answer],
  );

  // Escape cierra el panel abierto (los diálogos internos lo detienen antes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel && !e.defaultPrevented) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, close]);

  if (!game) return null;
  const practice = game.mode === 'practice';
  const dual = app.profile.secondMonitor && !practice;
  const n = mood(game.needs);
  const inCall = Boolean(game.call);
  const next = upcoming(CONTENT, game);
  const settled = allSettled(game);
  const highlight = practice ? tutorialFocus(game, panel) : game.incoming ? 'phone' : null;

  return (
    <div className={`desk ${inCall ? 'in-call' : ''}`} data-practice={practice || undefined}>
      <div className="stage-wrap">
        <div className="ambient" style={{ backgroundImage: 'url(./assets/background.webp)' }} />
        <div className="stage">
          <Scene
            game={game}
            dual={dual}
            pose={pose}
            onOpen={onScene}
            highlight={highlight}
            inert={Boolean(panel)}
          />
        </div>
      </div>

      <header className="hud" aria-label="Estado del turno">
        <div className="hud-title">
          TURNO DE GUARDIA
          <small>{practice ? 'PRÁCTICA · SIN RELOJ' : 'SOPORTE · MUTUAL SUR'}</small>
        </div>
        <div className="hud-sep" />
        <div
          className="hud-clock"
          aria-label={practice ? 'Práctica sin reloj' : `Hora ${clock(game.minute)}`}
        >
          {practice ? '22:40' : clock(game.minute)}
          <small>{practice ? 'antes del turno' : 'Guardia hasta 07:00'}</small>
        </div>
        <div className="hud-sep" />
        <nav className="hud-cases" aria-label="Expedientes activos">
          {game.activeIds.map((id) => {
            const def = CONTENT.cases[id]!;
            const cs = game.cases[id]!;
            const late = cs.deadlinePassed;
            return (
              <button
                key={id}
                type="button"
                className="case-chip"
                aria-pressed={game.focusId === id}
                onClick={() => store.dispatch({ type: 'focus', caseId: id })}
                title={def.title}
              >
                <b>{def.number}</b>
                <span className="chip-title">{def.title}</span>
                {def.deadline !== null && !practice && (
                  <span className={`due ${late ? 'late' : ''}`}>
                    {late ? 'plazo vencido' : `plazo ${clock(def.deadline)}`}
                  </span>
                )}
              </button>
            );
          })}
          {game.activeIds.length === 0 && <span className="muted small">Sin expedientes activos</span>}
        </nav>
        <div className="hud-spacer" />
        {!practice && (
          <>
            {settled ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => store.dispatch({ type: 'endShift' })}
              >
                Cerrar la guardia
              </button>
            ) : (
              next &&
              !inCall && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => store.dispatch({ type: 'wait' })}
                  title="Esperar es una decisión: el reloj avanza hasta el próximo evento programado."
                >
                  Esperar <span className="cost">→ {clock(next.at)}</span>
                </button>
              )
            )}
            <button
              type="button"
              className="btn btn-sm nico-btn"
              onClick={(e) => open({ kind: 'nico' }, e.currentTarget)}
            >
              <span className={`nico-dot ${n.split(' ')[0]}`} aria-hidden="true" />
              <span className="nico-label">Nico: {n}</span>
              <span className="sr-only nico-sr">Nico: {n}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm hud-pause"
              onClick={(e) => open({ kind: 'pause' }, e.currentTarget)}
            >
              Pausa
            </button>
          </>
        )}
        {practice && (
          <button type="button" className="btn btn-sm" onClick={() => store.finishPractice(false)}>
            Omitir práctica
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={(e) => open({ kind: 'settings' }, e.currentTarget)}
          aria-label="Menú y opciones"
        >
          ☰
        </button>
      </header>

      {inCall && (
        <CallPanel
          game={game}
          collapsed={callCollapsed}
          onToggle={() => {
            if (callCollapsed && mobile) setPanel(null);
            setCallCollapsed((c) => !c);
          }}
          onTool={(tool, el) => open({ kind: tool }, el)}
        />
      )}
      {!inCall && game.incoming && <IncomingCall game={game} onAnswer={answer} />}

      {panel && <div className="scrim" onClick={close} />}
      {panel && (
        <div
          className={`overlay ${inCall && !callCollapsed ? 'with-call' : ''} ${(inCall && callCollapsed) || (!inCall && game.incoming) ? 'with-pill' : ''}`}
        >
          {panel.kind === 'os' && <GuardiaOS game={game} onClose={close} dual={dual} />}
          {panel.kind === 'second' && <SecondScreen game={game} onClose={close} />}
          {panel.kind === 'board' && <BoardPanel game={game} onClose={close} />}
          {panel.kind === 'notebook' && <NotebookPanel game={game} onClose={close} />}
          {panel.kind === 'manual' && <ManualPanel onClose={close} />}
          {panel.kind === 'pause' && <PausePanel game={game} preset={panel.preset} onClose={close} />}
          {panel.kind === 'nico' && (
            <NicoPanel game={game} onClose={close} onPause={() => setPanel({ kind: 'pause' })} />
          )}
          {panel.kind === 'cube' && <CubePanel onClose={close} />}
          {panel.kind === 'ball' && <BallPanel game={game} onClose={close} />}
          {panel.kind === 'doc' && <DocPanel game={game} doc={panel.doc} onClose={close} />}
          {panel.kind === 'settings' && <SettingsPanel onClose={close} inGame />}
          {panel.kind === 'phone' && <PhonePanel game={game} onClose={close} />}
        </div>
      )}

      {app.justClosed &&
        game.cases[app.justClosed]?.status === 'closed' &&
        game.call?.caseId !== app.justClosed && (
          <Panel title="Informe del expediente" onClose={() => store.dismissReport()} modal wide>
            <ReportPanel game={game} caseId={app.justClosed} />
          </Panel>
        )}

      {practice && <TutorialHint game={game} panel={panel} />}

      <nav className="mobile-nav" aria-label="Objetos del puesto">
        {MOBILE_ITEMS.filter(
          (it) => (it.target !== 'monitor2' || dual) && (!it.campaignOnly || !practice),
        ).map((it) => {
          const label =
            it.target === 'phone'
              ? game.incoming && !inCall
                ? 'Atender'
                : inCall
                  ? 'En llamada'
                  : 'Teléfono'
              : it.label;
          return (
            <button
              key={it.target}
              type="button"
              className={it.target === 'phone' && game.incoming && !inCall ? 'ringing' : ''}
              onClick={(e) =>
                it.target === 'pauses'
                  ? open({ kind: 'pause' }, e.currentTarget)
                  : onScene(it.target, e.currentTarget)
              }
            >
              {it.art ? (
                <img src={artInfo(it.art).file} alt="" />
              ) : (
                <span className="mn-icon" aria-hidden="true">
                  ⏸
                </span>
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Composición móvil propia: cada objeto con su ilustración y un área táctil amplia. */
const MOBILE_ITEMS: { target: SceneTarget | 'pauses'; label: string; art?: ArtId; campaignOnly?: boolean }[] =
  [
    { target: 'phone', label: 'Teléfono', art: 'telephone-base' },
    { target: 'monitor', label: 'Monitor', art: 'monitor' },
    { target: 'monitor2', label: 'Correo e historial', art: 'monitor' },
    { target: 'board', label: 'Pizarra', art: 'corkboard' },
    { target: 'notebook', label: 'Cuaderno', art: 'notebook' },
    { target: 'ticket', label: 'Ticket', art: 'ticket-paper' },
    { target: 'memo', label: 'Avisos', art: 'memo-paper' },
    { target: 'mug', label: 'Café', art: 'coffee-mug', campaignOnly: true },
    { target: 'snack', label: 'Comer', art: 'snack', campaignOnly: true },
    { target: 'cube', label: 'Cubo', art: 'rubik-cube' },
    { target: 'ball', label: 'Pelota', art: 'stress-ball' },
    { target: 'manual', label: 'Manual', art: 'manual' },
    { target: 'pauses', label: 'Otras pausas', campaignOnly: true },
  ];

/** Composición móvil: mismo criterio que la hoja de estilos. */
function useMobile(): boolean {
  const q = '(max-width: 760px), (max-height: 520px) and (max-width: 1000px)';
  const [m, setM] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}
