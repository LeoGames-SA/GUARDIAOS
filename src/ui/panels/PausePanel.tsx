import { useState } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { PAUSES } from '../../engine/needs';
import { clock } from '../../engine/time';
import type { GameEvent, GameState, PauseKind } from '../../engine/types';
import { Panel } from '../common/Panel';

const ORDER: PauseKind[] = ['coffee', 'eat', 'bathroom', 'air', 'smoke'];

function describe(e: GameEvent): string | null {
  const def = 'caseId' in e && e.caseId ? CONTENT.cases[e.caseId] : undefined;
  switch (e.type) {
    case 'arrival':
      return `Llegó el expediente ${def?.number}: ${def?.title}.`;
    case 'incoming':
      return 'Sonó el teléfono.';
    case 'missed':
      return `Llamada perdida: ${def?.contact.short} dejó un mensaje.`;
    case 'deadline':
      return `Venció el plazo de ${def?.number}.`;
    case 'world':
      return e.text;
    default:
      return null;
  }
}

/** Pausas con costo y efecto visibles. Al volver, se muestran las novedades del turno. */
export function PausePanel({
  game,
  preset,
  onClose,
}: {
  game: GameState;
  preset?: PauseKind;
  onClose: () => void;
}) {
  const store = useStore();
  const [result, setResult] = useState<{ text: string; news: string[]; from: number; to: number } | null>(
    null,
  );
  if (game.mode === 'practice')
    return (
      <Panel title="Pausa" onClose={onClose} style={{ width: 'min(460px,100%)' }}>
        <div className="panel-body">
          <p>
            En la práctica el reloj no corre, así que no hay pausas. En la guardia, café, comida, baño y patio
            consumen minutos.
          </p>
        </div>
      </Panel>
    );
  const take = (kind: PauseKind) => {
    const from = game.minute;
    const events = store.dispatch({ type: 'pause', kind });
    const blocked = events.find((e) => e.type === 'blocked');
    if (blocked) return;
    const pause = events.find((e) => e.type === 'pause');
    setResult({
      text: pause && pause.type === 'pause' ? pause.text : '',
      news: events.map(describe).filter((x): x is string => Boolean(x)),
      from,
      to: store.game?.minute ?? from,
    });
  };
  return (
    <Panel title="Pausa" onClose={onClose} className="pause-panel">
      <div className="panel-body">
        {result ? (
          <div className="pause-result">
            <p className="lead">{result.text}</p>
            <p className="small muted">
              {clock(result.from)} → {clock(result.to)}
            </p>
            <h4>Mientras tanto</h4>
            {result.news.length ? (
              <ul>
                {result.news.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nada nuevo.</p>
            )}
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
                Volver al puesto
              </button>
              <button type="button" className="btn" onClick={() => setResult(null)}>
                Otra pausa
              </button>
            </div>
          </div>
        ) : (
          <>
            {game.call && <p className="probe-blocked">Terminá la llamada antes de tomarte una pausa.</p>}
            <p className="small muted">
              Las pausas consumen minutos del turno: los plazos de todos los expedientes siguen corriendo.
            </p>
            <ul className="pauses">
              {ORDER.map((k) => {
                const p = PAUSES[k];
                return (
                  <li key={k} className={preset === k ? 'preset' : ''}>
                    <div>
                      <b>{p.label}</b>
                      <small>{p.effect}</small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={Boolean(game.call)}
                      onClick={() => take(k)}
                      data-autofocus={preset === k ? true : undefined}
                    >
                      Tomar <span className="cost">· {p.minutes} min</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}
