import { PAUSES } from '../../engine/needs';
import { clock } from '../../engine/time';
import type { GameState, PauseKind } from '../../engine/types';
import { Panel } from '../common/Panel';

const ORDER: PauseKind[] = ['coffee', 'eat', 'bathroom', 'air', 'smoke'];

/**
 * Elegir una pausa con su costo y efecto a la vista. El resultado no es otro cuadro: el
 * panel se cierra y la mesa muestra un resumen compacto (ver PauseCard).
 */
export function PausePanel({
  game,
  preset,
  onClose,
  onTake,
}: {
  game: GameState;
  preset?: PauseKind;
  onClose: () => void;
  onTake: (kind: PauseKind) => void;
}) {
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
  return (
    <Panel title="Pausa" onClose={onClose} className="pause-panel">
      <div className="panel-body">
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
                  onClick={() => onTake(k)}
                  data-autofocus={preset === k ? true : undefined}
                >
                  Tomar{' '}
                  <span className="cost">
                    · {p.minutes} min (hasta {clock(Math.min(480, game.minute + p.minutes))})
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
