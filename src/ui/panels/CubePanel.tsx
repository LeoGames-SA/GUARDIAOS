import { useEffect, useRef, useState } from 'react';
import { useAppState, useStore } from '../../application/context';
import { faceOf, FACES, inverse, isSolved, type Face, type Move } from '../../engine/cube';
import type { CubeView } from './cube3d';
import { Held } from './Held';

const KEYS: Record<string, string> = {
  u: 'U',
  r: 'R',
  f: 'F',
  d: 'D',
  l: 'L',
  b: 'B',
  m: 'M',
  e: 'E',
  s: 'S',
};
const CSS: Record<Face, string> = {
  U: '#f1efe6',
  R: '#d63a2f',
  F: '#2fae4f',
  D: '#f4cf2c',
  L: '#f08a24',
  B: '#2d64c8',
};

/**
 * Cubo 3×3 en la mano: se gira entero arrastrando fuera de él y por capas arrastrando una
 * pegatina. El dibujo 3D se carga al levantarlo y se libera al devolverlo. El estado vive
 * en el perfil (motor del cubo), así que cada giro confirmado queda guardado.
 */
export function CubePanel({ onClose, from }: { onClose: () => void; from?: DOMRect | null }) {
  const { profile } = useAppState();
  const store = useStore();
  const cube = profile.cube;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<CubeView | null>(null);
  const latest = useRef(cube.state);
  latest.current = cube.state;
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [gesture, setGesture] = useState<'layer' | 'object' | null>(null);
  const [help, setHelp] = useState(false);
  const [mixing, setMixing] = useState<{ done: number; total: number } | null>(null);
  const [flash, setFlash] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const solved = isSolved(cube.state);

  useEffect(() => {
    let cancelled = false;
    import('./cube3d')
      .then(({ createCubeView }) => {
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        viewRef.current = createCubeView(canvas, {
          state: latest.current,
          reduced: document.documentElement.dataset.motion === 'reduced',
          onMove: (m) => store.cubeMove(m),
          onGesture: setGesture,
        });
        (window as unknown as { __tdgCube?: CubeView }).__tdgCube = viewRef.current;
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
      viewRef.current?.dispose();
      viewRef.current = null;
      delete (window as unknown as { __tdgCube?: CubeView }).__tdgCube;
    };
  }, [store]);

  useEffect(() => viewRef.current?.setState(cube.state), [cube.state]);

  /** Mezclar: giros legales animados uno tras otro; sin gestos ni teclas mientras tanto. */
  const mix = async () => {
    const v = viewRef.current;
    if (mixing || v?.busy()) return;
    const seq = store.cubeScrambleMoves(20);
    const reduced = document.documentElement.dataset.motion === 'reduced';
    if (!v || reduced) {
      for (const m of seq) store.cubeScrambleStep(m);
      setFlash(true);
      window.setTimeout(() => alive.current && setFlash(false), 260);
      return;
    }
    setMixing({ done: 0, total: seq.length });
    for (let i = 0; i < seq.length; i++) {
      await v.turn(seq[i]!, false, 110);
      if (!alive.current || viewRef.current !== v) return; // cerrado a mitad: queda el último giro completo
      store.cubeScrambleStep(seq[i]!);
      setMixing({ done: i + 1, total: seq.length });
    }
    setMixing(null);
  };

  const turn = (m: Move) => {
    if (mixing) return;
    const v = viewRef.current;
    if (!v) return store.cubeMove(m);
    if (!v.busy()) void v.turn(m);
  };
  const undo = () => {
    if (mixing) return;
    const last = cube.history.at(-1);
    const v = viewRef.current;
    if (!last) return;
    if (!v) return store.cubeUndo();
    if (!v.busy()) void v.turn(inverse(last), false).then(() => store.cubeUndo());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      return undo();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = KEYS[e.key.toLowerCase()];
    if (k) {
      e.preventDefault();
      return turn((e.shiftKey ? `${k}'` : k) as Move);
    }
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-26, 0],
      ArrowRight: [26, 0],
      ArrowUp: [0, -26],
      ArrowDown: [0, 26],
    };
    const a = arrows[e.key];
    if (a && viewRef.current) {
      e.preventDefault();
      viewRef.current.rotateObject(a[0], a[1]);
    }
  };

  return (
    <Held label="Cubo 3×3 en la mano" from={from} onClose={onClose} className="held-cube">
      {(back) => (
        <>
          <div
            className={`cube-stage ${gesture ? `g-${gesture}` : ''} ${flash ? 'cube-flash' : ''} ${mixing ? 'mixing' : ''}`}
            aria-busy={mixing ? true : undefined}
            tabIndex={0}
            role="application"
            aria-label={`Cubo 3×3. ${solved ? 'Resuelto' : 'Sin resolver'}, ${cube.moves} movimientos. Letras U R F D L B M E S giran capas, Mayúscula al revés, flechas giran el cubo.`}
            aria-describedby="cube-keys"
            onKeyDown={onKeyDown}
            data-autofocus
          >
            <canvas ref={canvasRef} className="cube-canvas" />
            {status === 'loading' && <p className="cube-msg">Levantando el cubo…</p>}
            {status === 'failed' && (
              <div className="cube-msg">
                <p>Este navegador no puede dibujar el cubo en 3D. Se puede girar con el teclado.</p>
                <div className="net-mini" aria-hidden="true">
                  {FACES.map((f) => (
                    <div key={f} className={`nf nf-${f}`}>
                      {faceOf(cube.state, f).map((c, i) => (
                        <span key={i} style={{ background: CSS[c as Face] }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="held-bar">
            <p className="held-status" aria-live="polite">
              {mixing
                ? `Mezclando… ${mixing.done}/${mixing.total}`
                : `${solved ? '¡Resuelto!' : 'Sin resolver'} · ${cube.moves} ${cube.moves === 1 ? 'movimiento' : 'movimientos'}`}
            </p>
            <div className="row">
              <button
                type="button"
                className="btn btn-sm"
                onClick={undo}
                disabled={!cube.history.length || Boolean(mixing)}
              >
                Deshacer
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void mix()}
                disabled={Boolean(mixing)}
              >
                Mezclar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={store.cubeReset}
                disabled={Boolean(mixing)}
              >
                Ordenar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-expanded={help}
                onClick={() => setHelp((h) => !h)}
              >
                Teclas
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={back}>
                Devolver a la mesa
              </button>
            </div>
            <p id="cube-keys" className={`held-help ${help ? '' : 'sr-only'}`}>
              Arrastrá una pegatina para girar su capa; arrastrá fuera del cubo para girarlo entero. Teclado:
              U R F D L B y M E S giran capas (Mayús: al revés), flechas giran el cubo, Ctrl+Z deshace.
            </p>
            {!help && (
              <p className="held-hint small muted" aria-hidden="true">
                Arrastrá una pegatina para girar su capa · fuera del cubo para girarlo entero
              </p>
            )}
          </div>
        </>
      )}
    </Held>
  );
}
