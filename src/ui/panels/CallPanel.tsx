import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState, useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { hasProbableCause } from '../../engine/board';
import { HOLD_PATIENCE, probeBlockReason, probeCost } from '../../engine/game';
import { clock } from '../../engine/time';
import { sound } from '../../application/audio';
import type { CallLine, GameState } from '../../engine/types';
import { Panel } from '../common/Panel';

/** Líneas ya reveladas por llamada (sesión). Tras recargar, el historial se muestra completo. */
const revealed = new Map<string, number>();
/** Marca una llamada recién iniciada para animar todas sus líneas desde el principio. */
export function markCallStart(key: string) {
  revealed.set(key, 0);
}

/** Tono de voz estilizado por personaje (Hz). */
const VOICE: Record<string, number> = { nico: 135, p001: 300, c001: 245 };

/**
 * Texto progresivo reservado para conversaciones: una línea nueva por vez, ≤ 1,8 s por línea;
 * clic, Enter o Espacio la completan. `onTick` recibe cada avance (para los murmullos).
 */
function useReveal(lines: CallLine[], key: string, animate: boolean, onTick: (line: CallLine) => void) {
  if (!revealed.has(key)) revealed.set(key, lines.length);
  const [shown, setShown] = useState(() => revealed.get(key)!);
  const [chars, setChars] = useState(0);
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    setShown(revealed.get(key)!);
    setChars(0);
  }
  const current = shown < lines.length ? lines[shown] : undefined;
  const text = current?.text;
  const tick = useRef(onTick);
  useEffect(() => {
    tick.current = onTick;
  });

  useEffect(() => {
    revealed.set(key, shown);
  }, [key, shown]);

  useEffect(() => {
    if (text === undefined || !current) return;
    if (!animate) {
      setShown(lines.length);
      return;
    }
    setChars(0);
    const step = Math.max(1, Math.ceil(text.length / 60)); // 60 pasos × 30 ms ≈ 1,8 s como máximo
    let c = 0;
    const id = window.setInterval(() => {
      c += step;
      tick.current(current);
      if (c >= text.length) {
        window.clearInterval(id);
        setChars(Infinity);
      } else setChars(c);
    }, 30);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, shown, animate, lines.length]);

  useEffect(() => {
    if (text === undefined || chars !== Infinity) return;
    const t = window.setTimeout(() => {
      setShown((s) => s + 1);
      setChars(0);
    }, 260);
    return () => window.clearTimeout(t);
  }, [text, chars]);

  const complete = () => {
    if (text === undefined) return;
    if (chars !== Infinity) setChars(Infinity);
    else {
      setShown((s) => s + 1);
      setChars(0);
    }
  };
  return { shown, chars, typing: text !== undefined, complete };
}

type CallStateLabel = 'conversación' | 'en espera' | 'finalizada';

export function CallPanel({
  game,
  collapsed,
  onToggle,
  onTool,
}: {
  game: GameState;
  collapsed: boolean;
  onToggle: () => void;
  /** Abrir herramientas sin soltar la llamada. */
  onTool: (tool: 'board' | 'os', el: HTMLElement) => void;
}) {
  const store = useStore();
  const { prefs } = useAppState();
  const call = game.call!;
  const cs = game.cases[call.caseId]!;
  const def = CONTENT.cases[call.caseId]!;
  const reduced = document.documentElement.dataset.motion === 'reduced';
  const animate = prefs.typewriter && !reduced;
  const held = Boolean(call.held);
  const ended = Boolean(call.ended);
  const onTick = useCallback(
    (line: CallLine) => {
      if (collapsed || held) return;
      sound.voice(line.speaker === 'nico' ? VOICE.nico! : (VOICE[call.caseId] ?? 210));
    },
    [collapsed, held, call.caseId],
  );
  const { shown, chars, typing, complete } = useReveal(call.lines, call.eventKey, animate, onTick);
  const [citing, setCiting] = useState(false);
  const [soothing, setSoothing] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const name = cs.contactKnown ? def.contact.name : 'Número interno';
  const state: CallStateLabel = ended ? 'finalizada' : held ? 'en espera' : 'conversación';

  // Al atender, el foco pasa a la conversación (Enter/Espacio completan la frase).
  useEffect(() => {
    if (!collapsed) panelRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.eventKey]);

  // Al completar, omitir, contraer o poner en espera, los murmullos se detienen.
  useEffect(() => {
    if (!typing || collapsed || held) sound.stopVoice();
  }, [typing, collapsed, held]);
  useEffect(() => () => sound.stopVoice(), []);

  // Historial: sólo se desplaza solo si el lector está al final; si no, avisa de líneas nuevas.
  const visible = shown + (typing ? 1 : 0);
  const prevVisible = useRef(visible);
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (pinned) el.scrollTop = el.scrollHeight;
    else if (visible > prevVisible.current) setUnseen((u) => u + (visible - prevVisible.current));
    prevVisible.current = visible;
  }, [visible, chars, pinned]);

  // Despedida dicha: al terminar de mostrarla, se cuelga solo (también hay botón).
  useEffect(() => {
    if (!ended || typing) return;
    const t = window.setTimeout(() => store.dispatch({ type: 'hangUp' }), 1600);
    return () => window.clearTimeout(t);
  }, [ended, typing, store]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!typing || collapsed || (e.key !== 'Enter' && e.key !== ' ')) return;
      const a = document.activeElement;
      if (a && a !== document.body && !panelRef.current?.contains(a)) return;
      e.preventDefault();
      complete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [typing, complete, collapsed]);

  const questions = def.probes.filter((p) => p.app === 'phone' && p.kind === 'question');
  const asked = new Set(cs.runs.map((r) => r.probeId));
  const pending = questions.filter((q) => !asked.has(q.id));
  const verify = def.probes.filter((p) => p.app === 'phone' && p.kind === 'verify');
  const checked = cs.notes.filter((n) => n.kind === 'checked').slice(-4);
  const probable = hasProbableCause(def, cs);
  const confirmed = cs.confirmed && def.isFixed(cs.world) && cs.status === 'active';
  const cost = (id: string) => {
    const p = def.probes.find((x) => x.id === id)!;
    const c = probeCost(game, cs, p).cost;
    return game.mode === 'practice' ? '' : `${c} min`;
  };
  const waited = held && call.heldSince !== undefined ? game.minute - call.heldSince : 0;

  if (collapsed) {
    return (
      <aside className={`call call-pill state-${state.replace(' ', '-')}`} aria-label={`Llamada con ${name}`}>
        <span className="call-led" aria-hidden="true" />
        <span className="pill-text">
          <b>{cs.contactKnown ? def.contact.short : name}</b> · {state}
          {held && game.mode === 'campaign' && ` · ${waited} min`}
        </span>
        {held && (
          <button type="button" className="btn btn-sm" onClick={() => store.dispatch({ type: 'resume' })}>
            Retomar
          </button>
        )}
        <button type="button" className="btn btn-sm call-expand" onClick={onToggle} aria-expanded="false">
          Ver conversación
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`call call-card state-${state.replace(' ', '-')}`}
      ref={panelRef}
      tabIndex={-1}
      aria-label={`Llamada con ${name}`}
    >
      <header className="call-head">
        <span className="call-led" aria-hidden="true" />
        <div className="call-who">
          <b>{name}</b>
          <small>
            {cs.contactKnown ? `${def.contact.role} · ` : ''}Expediente {def.number}
          </small>
        </div>
        <span className={`call-state tag`}>
          {state === 'conversación' ? 'En conversación' : state === 'en espera' ? 'En espera' : 'Finalizada'}
        </span>
        <button
          type="button"
          className="btn btn-sm btn-ghost call-collapse"
          onClick={onToggle}
          aria-expanded="true"
          aria-label="Contraer la llamada"
        >
          ▾
        </button>
      </header>
      <div className="call-log-wrap">
        <ol
          className="call-log"
          ref={logRef}
          aria-live="polite"
          aria-relevant="additions"
          onScroll={(e) => {
            const el = e.currentTarget;
            const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
            setPinned(atEnd);
            if (atEnd) setUnseen(0);
          }}
          onClick={() => typing && complete()}
        >
          {call.lines.slice(0, visible).map((l, i) => {
            const isCurrent = i === shown;
            const text = isCurrent && chars !== Infinity ? l.text.slice(0, chars) : l.text;
            return (
              <li
                key={i}
                className={`line line-${l.speaker}`}
                aria-hidden={isCurrent && chars !== Infinity ? true : undefined}
              >
                <span className="who">
                  {l.speaker === 'nico' ? 'Nico' : cs.contactKnown ? def.contact.short : '…'}
                </span>
                <span className="said">{text}</span>
              </li>
            );
          })}
        </ol>
        {!pinned && unseen > 0 && (
          <button
            type="button"
            className="btn btn-sm call-newlines"
            onClick={() => {
              setPinned(true);
              setUnseen(0);
            }}
          >
            ↓ {unseen} línea{unseen > 1 ? 's' : ''} nueva{unseen > 1 ? 's' : ''}
          </button>
        )}
      </div>
      <div className="call-foot">
        {typing ? (
          <p className="call-skip small muted">
            <button type="button" className="btn btn-sm btn-ghost" onClick={complete}>
              Completar frase
            </button>{' '}
            (clic, Enter o Espacio)
          </p>
        ) : ended ? (
          <div className="call-options" role="group" aria-label="Fin de la llamada">
            <p className="small muted">Llamada finalizada. El informe del expediente aparece al colgar.</p>
            <button
              type="button"
              className="btn btn-sm btn-primary opt"
              onClick={() => store.dispatch({ type: 'hangUp' })}
            >
              Colgar
            </button>
          </div>
        ) : held ? (
          <div className="call-options" role="group" aria-label="Llamada en espera">
            <p className="small">
              {cs.contactKnown ? def.contact.short : 'La persona'} espera en línea
              {game.mode === 'campaign'
                ? ` desde las ${clock(call.heldSince ?? game.minute)} (${waited} min).`
                : '.'}{' '}
              {game.mode === 'campaign' && `Más de ${HOLD_PATIENCE} min de reloj la impacientan.`} Podés
              investigar mientras tanto.
            </p>
            <div className="row call-actions">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => store.dispatch({ type: 'resume' })}
              >
                Retomar la llamada
              </button>
              <span className="row call-tools">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => onTool('board', e.currentTarget)}
                >
                  Pizarra
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => onTool('os', e.currentTarget)}
                >
                  GuardiaOS
                </button>
              </span>
            </div>
          </div>
        ) : citing ? (
          <div className="call-options" role="group" aria-label="Elegí qué comprobación contar">
            <p className="opt-title">¿Qué comprobación le contás?</p>
            {checked.map((n) => (
              <button
                key={n.id}
                type="button"
                className="btn btn-sm opt"
                onClick={() => {
                  setCiting(false);
                  store.dispatch({ type: 'reassure', kind: 'evidence', noteId: n.id });
                }}
              >
                «{n.text}»
              </button>
            ))}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCiting(false)}>
              Volver
            </button>
          </div>
        ) : (
          <div className="call-options" role="group" aria-label="Respuestas de Nico">
            <p className="opt-title">Qué le decís</p>
            {confirmed ? (
              <button
                type="button"
                className="btn btn-sm btn-primary opt"
                onClick={() => store.dispatch({ type: 'close', caseId: cs.id })}
              >
                Despedirse y cerrar el ticket
              </button>
            ) : soothing ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm opt opt-soft"
                  onClick={() => {
                    setSoothing(false);
                    store.dispatch({ type: 'reassure', kind: 'urgency' });
                  }}
                >
                  «Entiendo la urgencia. Todavía estoy comprobando la causa».
                </button>
                {checked.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm opt opt-soft"
                    onClick={() => {
                      setSoothing(false);
                      setCiting(true);
                    }}
                  >
                    «Ya comprobé que…» (citar una comprobación)
                  </button>
                )}
                {probable && (
                  <button
                    type="button"
                    className="btn btn-sm opt opt-soft"
                    onClick={() => {
                      setSoothing(false);
                      store.dispatch({ type: 'reassure', kind: 'probable' });
                    }}
                  >
                    «Encontré una causa probable; voy a verificar la solución».
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSoothing(false)}>
                  Volver
                </button>
              </>
            ) : (
              <div className="chips">
                {pending.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="btn btn-sm chip"
                    onClick={() => store.dispatch({ type: 'probe', caseId: cs.id, probeId: q.id })}
                  >
                    {q.label}
                    <span className="cost">{cost(q.id)}</span>
                  </button>
                ))}
                {verify.map((v) => {
                  const reason = probeBlockReason(game, def, cs, v);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className="btn btn-sm chip chip-verify"
                      aria-disabled={reason ? true : undefined}
                      title={reason ?? undefined}
                      onClick={() =>
                        reason ? undefined : store.dispatch({ type: 'probe', caseId: cs.id, probeId: v.id })
                      }
                    >
                      {v.label}
                      <span className="cost">{reason ? 'todavía no' : cost(v.id)}</span>
                    </button>
                  );
                })}
                {game.mode === 'campaign' && (
                  <button
                    type="button"
                    className="btn btn-sm chip chip-soft"
                    onClick={() => setSoothing(true)}
                  >
                    Tranquilizar…
                  </button>
                )}
              </div>
            )}
            <div className="row call-actions">
              {!confirmed && (
                <button type="button" className="btn btn-sm" onClick={() => store.dispatch({ type: 'hold' })}>
                  Poner en espera
                </button>
              )}
              <span className="row call-tools">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => onTool('board', e.currentTarget)}
                >
                  Pizarra
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => onTool('os', e.currentTarget)}
                >
                  GuardiaOS
                </button>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => store.dispatch({ type: 'hangUp' })}
              >
                Cortar
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Llamada entrante: estado propio, sin revelar nombres que todavía no se conocen. */
export function IncomingCall({ game, onAnswer }: { game: GameState; onAnswer: () => void }) {
  const inc = game.incoming!;
  const cs = game.cases[inc.caseId]!;
  const def = CONTENT.cases[inc.caseId]!;
  const who = inc.reason === 'callback' && cs.contactKnown ? def.contact.name : 'Número interno';
  return (
    <aside className="call call-pill state-entrante" aria-label="Llamada entrante">
      <span className="call-led ringing" aria-hidden="true" />
      <span className="pill-text">
        <b>Llamada entrante</b> · {who}
      </span>
      <button type="button" className="btn btn-sm btn-primary" onClick={onAnswer}>
        Atender
      </button>
    </aside>
  );
}

/** Teléfono sin llamada: devolver llamadas a contactos conocidos. */
export function PhonePanel({ game, onClose }: { game: GameState; onClose: () => void }) {
  const store = useStore();
  const contacts = Object.values(game.cases).filter((c) => {
    const def = CONTENT.cases[c.id]!;
    return def.channel === 'phone' && c.contactKnown && c.status !== 'closed' && c.status !== 'scheduled';
  });
  return (
    <Panel title="Teléfono" onClose={onClose} style={{ width: 'min(420px, 100%)' }}>
      <div className="panel-body">
        {contacts.length === 0 ? (
          <p className="muted">
            No hay a quién devolverle una llamada. Cuando entra una, el teléfono suena y se enciende la luz
            roja.
          </p>
        ) : (
          <div className="stack">
            {contacts.map((c) => {
              const def = CONTENT.cases[c.id]!;
              return (
                <button
                  key={c.id}
                  type="button"
                  className="btn"
                  onClick={() => {
                    store.dispatch({ type: 'callContact', caseId: c.id });
                    if (store.game?.call) markCallStart(store.game.call.eventKey);
                    onClose();
                  }}
                >
                  Llamar a {def.contact.name} ({def.contact.role}){' '}
                  <span className="cost">· {game.mode === 'practice' ? 'sin reloj' : '1 min'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
