import { useEffect, useRef } from 'react';
import { CONTENT } from '../../content';
import { PAUSES } from '../../engine/needs';
import { clock } from '../../engine/time';
import type { GameEvent, GameState, Needs, PauseKind } from '../../engine/types';

export interface PauseNews {
  text: string;
  /** Acción para retomar lo que pasó mientras Nico no estaba. */
  action?: 'answer' | 'tickets' | 'mail';
}

export interface PauseResult {
  id: number;
  kind: PauseKind;
  text: string;
  from: number;
  to: number;
  deltas: { label: string; value: number; good: boolean }[];
  news: PauseNews[];
}

const NEEDS: { key: keyof Needs; label: string; higherIsGood: boolean }[] = [
  { key: 'energy', label: 'Energía', higherIsGood: true },
  { key: 'caffeine', label: 'Cafeína', higherIsGood: false },
  { key: 'bladder', label: 'Baño', higherIsGood: false },
  { key: 'stress', label: 'Estrés', higherIsGood: false },
];

/** Novedades de una pausa, sólo con lo que el motor informó (nunca la causa de un caso). */
export function pauseNews(events: GameEvent[]): PauseNews[] {
  const out: PauseNews[] = [];
  for (const e of events) {
    const def = 'caseId' in e && e.caseId ? CONTENT.cases[e.caseId] : undefined;
    switch (e.type) {
      case 'arrival':
        if (def?.channel !== 'phone')
          out.push({
            text: `Llegó el expediente ${def?.number}: ${def?.title}.`,
            action: def?.channel === 'email' ? 'mail' : 'tickets',
          });
        break;
      case 'incoming':
        out.push({ text: 'Sonó el teléfono.', action: 'answer' });
        break;
      case 'missed':
        out.push({ text: `Llamada perdida: ${def?.contact.short ?? 'alguien'} dejó un mensaje.` });
        break;
      case 'deadline':
        out.push({ text: `Venció el plazo de ${def?.number}.` });
        break;
      case 'world':
        out.push({ text: e.text });
        break;
      case 'ended':
        out.push({ text: 'Son las 07:00: fin del turno.' });
        break;
    }
  }
  return out;
}

export function pauseResult(
  id: number,
  kind: PauseKind,
  before: { minute: number; needs: Needs },
  after: GameState,
  events: GameEvent[],
): PauseResult {
  const pause = events.find((e) => e.type === 'pause');
  return {
    id,
    kind,
    text: pause?.type === 'pause' ? pause.text : '',
    from: before.minute,
    to: after.minute,
    deltas: NEEDS.map(({ key, label, higherIsGood }) => {
      const value = Math.round(after.needs[key] - before.needs[key]);
      return { label, value, good: value === 0 || value > 0 === higherIsGood };
    }).filter((d) => d.value !== 0),
    news: pauseNews(events),
  };
}

const ICON: Partial<Record<PauseKind, string>> = {
  coffee: '☕',
  eat: '🥪',
  bathroom: '🚻',
  air: '🌧',
  smoke: '🌧',
  ball: '●',
};

/**
 * Resumen compacto de una pausa: tiempo, efectos y novedades. No es un modal: la mesa
 * sigue disponible y, si no pasó nada, se retira solo.
 */
export function PauseCard({
  result,
  game,
  onClose,
  onAction,
}: {
  result: PauseResult;
  game: GameState;
  onClose: () => void;
  onAction: (a: NonNullable<PauseNews['action']>, el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const hovering = useRef(false);
  useEffect(() => {
    if (result.news.length) return;
    const t = setTimeout(() => {
      if (!hovering.current && !ref.current?.contains(document.activeElement)) onClose();
    }, 7000);
    return () => clearTimeout(t);
  }, [result, onClose]);
  const minutes = result.to - result.from;
  return (
    <section
      ref={ref}
      className="pause-card"
      aria-label="Resumen de la pausa"
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => (hovering.current = false)}
    >
      <header>
        <span className="pc-icon" aria-hidden="true">
          {ICON[result.kind]}
        </span>
        <b>{PAUSES[result.kind].label}</b>
        <span className="pc-time">
          {clock(result.from)} → {clock(result.to)} · {minutes} min
        </span>
        <button
          type="button"
          className="pc-close"
          aria-label="Cerrar el resumen de la pausa"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p className="pc-text">{result.text}</p>
      {result.deltas.length > 0 && (
        <ul className="pc-deltas" aria-label="Efectos">
          {result.deltas.map((d) => (
            <li key={d.label} className={d.good ? 'good' : 'bad'}>
              {d.label} {d.value > 0 ? '+' : '−'}
              {Math.abs(d.value)}
            </li>
          ))}
        </ul>
      )}
      {result.news.length > 0 && (
        <div className="pc-news" role="status">
          <b>Mientras tanto</b>
          <ul>
            {result.news.map((n, i) => (
              <li key={i}>
                <span>{n.text}</span>
                {n.action === 'answer' && game.incoming && !game.call && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={(e) => onAction('answer', e.currentTarget)}
                  >
                    Atender
                  </button>
                )}
                {n.action === 'mail' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={(e) => onAction('mail', e.currentTarget)}
                  >
                    Abrir el correo
                  </button>
                )}
                {n.action === 'tickets' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={(e) => onAction('tickets', e.currentTarget)}
                  >
                    Ver en tickets
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Antes de una pausa larga se muestra su duración y si hay algo programado en ese lapso
 * (sólo la hora, como el botón «Esperar»). Es una tarjeta junto al plato, no un modal.
 */
export function SnackPrompt({
  game,
  nextAt,
  onEat,
  onClose,
}: {
  game: GameState;
  nextAt: number | null;
  onEat: () => void;
  onClose: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const p = PAUSES.eat;
  const end = Math.min(480, game.minute + p.minutes);
  const blocked = game.call ? 'Terminá la llamada antes de comer.' : null;
  return (
    <section className="pause-card snack-prompt" role="dialog" aria-label="Comer el sándwich">
      <header>
        <span className="pc-icon" aria-hidden="true">
          🥪
        </span>
        <b>Comer el sándwich</b>
        <span className="pc-time">
          {p.minutes} min · {clock(game.minute)} → {clock(end)}
        </span>
      </header>
      <p className="pc-text">{p.effect}</p>
      {nextAt !== null && nextAt <= end && (
        <p className="pc-warn">Hay algo programado a las {clock(nextAt)}: va a pasar mientras comés.</p>
      )}
      {blocked && <p className="probe-blocked">{blocked}</p>}
      <div className="row">
        <button
          ref={btn}
          type="button"
          className="btn btn-sm btn-primary"
          disabled={Boolean(blocked)}
          onClick={onEat}
        >
          Comer · {p.minutes} min
        </button>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Ahora no
        </button>
      </div>
    </section>
  );
}
