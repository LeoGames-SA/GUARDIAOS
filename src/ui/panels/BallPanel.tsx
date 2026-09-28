import { useEffect, useRef, useState } from 'react';
import { artInfo } from '../../content/station';
import type { GameState } from '../../engine/types';
import { Held } from './Held';

/**
 * Pelota antiestrés en la mano: mantener apretado la comprime, soltar la devuelve con
 * rebote. Funciona con mouse, toque y teclado (Espacio o Enter sostenidos). El efecto sobre
 * Nico no depende de cuánto se apriete: se aplica una sola vez, por el motor, al devolverla.
 */
export function BallPanel({
  game,
  onClose,
  from,
  onApply,
}: {
  game: GameState;
  onClose: () => void;
  from?: DOMRect | null;
  onApply: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const [squeezes, setSqueezes] = useState(0);
  const pointer = useRef<number | null>(null);
  const fresh = game.lastBallAt === null || game.minute - game.lastBallAt >= 30;
  const counts = game.mode === 'campaign' && (!game.call || game.call.held);

  const press = () => {
    setPressed(true);
    setSqueezes((s) => s + 1);
  };
  const release = () => {
    pointer.current = null;
    setPressed(false);
  };
  // Nunca queda apretada: soltar fuera de la ventana o perder el foco también suelta.
  useEffect(() => {
    if (!pressed) return;
    const up = () => release();
    window.addEventListener('blur', up);
    return () => window.removeEventListener('blur', up);
  }, [pressed]);

  const finish = (back: () => void) => {
    if (squeezes > 0 && counts) onApply();
    back();
  };

  return (
    <Held label="Pelota antiestrés en la mano" from={from} onClose={onClose} className="held-ball">
      {(back) => (
        <>
          <button
            type="button"
            className={`ball-3d ${pressed ? 'pressed' : ''}`}
            aria-label="Apretar la pelota"
            aria-pressed={pressed}
            data-autofocus
            onPointerDown={(e) => {
              if (pointer.current !== null) return;
              pointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              press();
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
            onBlur={release}
            onKeyDown={(e) => {
              if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                e.preventDefault();
                press();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') release();
            }}
            onClick={(e) => e.preventDefault()}
          >
            <span className="ball-shadow" aria-hidden="true" />
            <span className="ball-body" aria-hidden="true">
              <img src={artInfo('stress-ball').file} alt="" draggable={false} />
            </span>
          </button>
          <div className="held-bar">
            <p className="held-status" aria-live="polite">
              {squeezes === 0
                ? 'Mantené apretado para comprimirla'
                : `${squeezes} ${squeezes === 1 ? 'apretón' : 'apretones'}`}
            </p>
            <div className="row">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => finish(back)}>
                Devolver a la mesa
                {counts && squeezes > 0 && (
                  <span className="cost">
                    {' '}
                    · 2 min · estrés {fresh ? '−6' : '−1 (hace poco que la usaste)'}
                  </span>
                )}
              </button>
            </div>
            <p className="held-hint small muted">
              {game.mode === 'practice'
                ? 'En la práctica es sólo para apretar.'
                : counts
                  ? 'El efecto se cuenta una vez, al devolverla, sin importar cuántas veces aprietes.'
                  : 'Con la llamada activa no cuenta como pausa (sí con la llamada en espera).'}
            </p>
          </div>
        </>
      )}
    </Held>
  );
}
