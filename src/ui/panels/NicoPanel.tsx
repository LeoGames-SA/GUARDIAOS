import { costPenalty, mood } from '../../engine/needs';
import type { GameState } from '../../engine/types';
import { Panel } from '../common/Panel';

const METERS = [
  {
    key: 'energy',
    label: 'Energía',
    help: 'Baja con los minutos. El café la sube un rato; comer, más.',
    low: true,
  },
  {
    key: 'stress',
    label: 'Estrés',
    help: 'Sube con plazos vencidos y errores. Baja con aire, pelota y pausas.',
    low: false,
  },
  { key: 'bladder', label: 'Baño', help: 'Sube con el tiempo y más rápido con mucho café.', low: false },
  {
    key: 'caffeine',
    label: 'Cafeína',
    help: 'Se consume sola. Con mucha, el café rinde menos y sube el estrés.',
    low: false,
  },
] as const;

export function NicoPanel({
  game,
  onClose,
  onPause,
}: {
  game: GameState;
  onClose: () => void;
  onPause: () => void;
}) {
  const n = game.needs;
  const pen = costPenalty(n);
  return (
    <Panel title={`Nico: ${mood(n)}`} onClose={onClose} style={{ width: 'min(520px, 100%)' }}>
      <div className="panel-body">
        <ul className="meters">
          {METERS.map((m) => {
            const v = Math.round(n[m.key]);
            const warn = m.low ? v < 25 : v > 75;
            return (
              <li key={m.key}>
                <div className="meter-head">
                  <b>{m.label}</b>
                  <span className={warn ? 'bad' : ''}>
                    {v} / 100 {warn ? '· atención' : ''}
                  </span>
                </div>
                <div
                  className="meter"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={v}
                  aria-label={m.label}
                >
                  <span style={{ width: `${v}%` }} className={warn ? 'warn' : ''} />
                </div>
                <small>{m.help}</small>
              </li>
            );
          })}
        </ul>
        <p className="small">
          {pen.reasons.length
            ? `Ahora las pruebas e intervenciones cuestan 25 % más por ${pen.reasons.join(' y ')}.`
            : 'Por ahora nada encarece el trabajo técnico. Con energía menor a 25 o baño mayor a 85, las acciones cuestan 25 % más.'}
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={onPause}>
          Ver pausas
        </button>
      </div>
    </Panel>
  );
}
