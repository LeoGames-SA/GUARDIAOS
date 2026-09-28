import { useState } from 'react';
import { useStore } from '../../application/context';
import { artInfo } from '../../content/station';
import type { GameState } from '../../engine/types';
import { Panel } from '../common/Panel';

/** Pelota antiestrés: compresión por mouse/teclado; el efecto sobre Nico cuesta 2 minutos y está limitado. */
export function BallPanel({ game, onClose }: { game: GameState; onClose: () => void }) {
  const store = useStore();
  const [pressed, setPressed] = useState(false);
  const [squeezes, setSqueezes] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const fresh = game.lastBallAt === null || game.minute - game.lastBallAt >= 30;
  const press = () => {
    setPressed(true);
    setSqueezes((s) => s + 1);
  };
  return (
    <Panel title="Pelota antiestrés" onClose={onClose} style={{ width: 'min(440px,100%)' }}>
      <div className="panel-body ball">
        <button
          type="button"
          className={`ball-btn ${pressed ? 'pressed' : ''}`}
          aria-label="Apretar la pelota"
          onPointerDown={press}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              press();
            }
          }}
          onKeyUp={() => setPressed(false)}
        >
          <img src={artInfo('stress-ball').file} alt="" />
        </button>
        <p className="small muted">Apretones: {squeezes}</p>
        {done ? (
          <p>{done}</p>
        ) : game.mode === 'campaign' ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={squeezes === 0 || Boolean(game.call)}
            onClick={() => {
              const ev = store.dispatch({ type: 'pause', kind: 'ball' }).find((e) => e.type === 'pause');
              setDone(ev && ev.type === 'pause' ? ev.text : 'Listo.');
            }}
          >
            Terminar la pausa{' '}
            <span className="cost">· 2 min · estrés {fresh ? '−6' : '−1 (hace poco que la usaste)'}</span>
          </button>
        ) : (
          <p className="small">En la práctica es sólo para apretar.</p>
        )}
      </div>
    </Panel>
  );
}
