import { useEffect, useRef, useState } from 'react';
import { useAppState, useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { hasProbableCause } from '../../engine/board';
import { probeBlockReason, probeCost } from '../../engine/game';
import type { CallLine, GameState } from '../../engine/types';
import { Panel } from '../common/Panel';

/** Líneas ya reveladas por llamada (sesión). Tras recargar, el historial se muestra completo. */
const revealed = new Map<string, number>();
/** Marca una llamada recién iniciada para animar todas sus líneas desde el principio. */
export function markCallStart(key: string) {
  revealed.set(key, 0);
}

/** Texto progresivo reservado para conversaciones: ≤ 2 s por línea, se completa con clic/Enter/Espacio. */
function useReveal(lines: CallLine[], key: string, animate: boolean) {
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

  useEffect(() => {
    revealed.set(key, shown);
  }, [key, shown]);

  useEffect(() => {
    if (text === undefined) return;
    if (!animate) {
      setShown(lines.length);
      return;
    }
    setChars(0);
    const step = Math.max(1, Math.ceil(text.length / 60)); // 60 pasos × 30 ms ≈ 1,8 s como máximo
    let c = 0;
    const id = window.setInterval(() => {
      c += step;
      if (c >= text.length) {
        window.clearInterval(id);
        setChars(Infinity);
      } else setChars(c);
    }, 30);
    return () => window.clearInterval(id);
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

export function CallPanel({ game }: { game: GameState }) {
  const store = useStore();
  const { prefs } = useAppState();
  const call = game.call!;
  const cs = game.cases[call.caseId]!;
  const def = CONTENT.cases[call.caseId]!;
  const reduced = document.documentElement.dataset.motion === 'reduced';
  const animate = prefs.typewriter && !reduced;
  const { shown, chars, typing, complete } = useReveal(call.lines, call.eventKey, animate);
  const [citing, setCiting] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const name = cs.contactKnown ? def.contact.name : 'Número interno';

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [shown, chars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!typing || (e.key !== 'Enter' && e.key !== ' ')) return;
      const a = document.activeElement;
      if (a && a !== document.body && !panelRef.current?.contains(a)) return;
      e.preventDefault();
      complete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [typing, complete]);

  const questions = def.probes.filter((p) => p.app === 'phone' && p.kind === 'question');
  const asked = new Set(cs.runs.map((r) => r.probeId));
  const pending = questions.filter((q) => !asked.has(q.id));
  const verify = def.probes.filter((p) => p.app === 'phone' && p.kind === 'verify');
  const checked = cs.notes.filter((n) => n.kind === 'checked').slice(-4);
  const probable = hasProbableCause(def, cs);
  const cost = (id: string) => {
    const p = def.probes.find((x) => x.id === id)!;
    const c = probeCost(game, cs, p).cost;
    return game.mode === 'practice' ? '' : ` · ${c} min`;
  };

  return (
    <aside
      className="call"
      ref={panelRef}
      aria-label={`Llamada con ${name}`}
      onClick={() => typing && complete()}
    >
      <header className="call-head">
        <span className="call-led" aria-hidden="true" />
        <div>
          <b>{name}</b>
          <small>
            {cs.contactKnown ? `${def.contact.role} · ` : ''}Expediente {def.number}
          </small>
        </div>
      </header>
      <ol className="call-log" ref={logRef} aria-live="polite" aria-relevant="additions">
        {call.lines.slice(0, shown + (typing ? 1 : 0)).map((l, i) => {
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
      {typing ? (
        <p className="call-skip small muted">Clic, Enter o Espacio para completar la frase.</p>
      ) : citing ? (
        <div className="call-options" role="group" aria-label="Elegí qué comprobación contar">
          <p className="small muted">¿Qué comprobación le contás?</p>
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
        <div className="call-options" role="group" aria-label="Respuestas">
          {pending.map((q) => (
            <button
              key={q.id}
              type="button"
              className="btn btn-sm opt"
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
                className="btn btn-sm opt opt-verify"
                aria-disabled={reason ? true : undefined}
                title={reason ?? undefined}
                onClick={() =>
                  reason ? undefined : store.dispatch({ type: 'probe', caseId: cs.id, probeId: v.id })
                }
              >
                {v.label}
                <span className="cost">{reason ? ' · todavía no' : cost(v.id)}</span>
              </button>
            );
          })}
          {game.mode === 'campaign' && (
            <>
              <button
                type="button"
                className="btn btn-sm opt opt-soft"
                onClick={() => store.dispatch({ type: 'reassure', kind: 'urgency' })}
              >
                «Entiendo la urgencia. Todavía estoy comprobando la causa».
              </button>
              {checked.length > 0 && (
                <button type="button" className="btn btn-sm opt opt-soft" onClick={() => setCiting(true)}>
                  «Ya comprobé que…» (citar una comprobación)
                </button>
              )}
              {probable && (
                <button
                  type="button"
                  className="btn btn-sm opt opt-soft"
                  onClick={() => store.dispatch({ type: 'reassure', kind: 'probable' })}
                >
                  «Encontré una causa probable; voy a verificar la solución».
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="btn btn-sm btn-ghost opt"
            onClick={() => store.dispatch({ type: 'hangUp' })}
          >
            Cortar la llamada
          </button>
        </div>
      )}
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
