import { useState } from 'react';
import { useAppState, useStore } from '../../application/context';
import { faceOf, FACES, isSolved, type Face, type Move } from '../../engine/cube';
import { Panel } from '../common/Panel';

const COLOR: Record<Face, { name: string; css: string; mark: string }> = {
  U: { name: 'blanco', css: '#f1efe6', mark: 'B' },
  R: { name: 'rojo', css: '#d63a2f', mark: 'R' },
  F: { name: 'verde', css: '#2fae4f', mark: 'V' },
  D: { name: 'amarillo', css: '#f4cf2c', mark: 'A' },
  L: { name: 'naranja', css: '#f08a24', mark: 'N' },
  B: { name: 'azul', css: '#2d64c8', mark: 'Z' },
};
const FACE_NAME: Record<Face, string> = {
  U: 'Arriba',
  R: 'Derecha',
  F: 'Frente',
  D: 'Abajo',
  L: 'Izquierda',
  B: 'Atrás',
};

/** Cubo 3×3 real en red 2D: giros legales, deshacer, mezclar. El progreso se guarda en el perfil. */
export function CubePanel({ onClose }: { onClose: () => void }) {
  const { profile } = useAppState();
  const store = useStore();
  const [face, setFace] = useState<Face>('F');
  const cube = profile.cube;
  const solved = isSolved(cube.state);
  const turn = (m: Move) => store.cubeMove(m);
  const grid = (f: Face) => (
    <button
      type="button"
      className={`cface cface-${f} ${face === f ? 'sel' : ''}`}
      aria-pressed={face === f}
      aria-label={`Cara ${FACE_NAME[f]}`}
      onClick={() => setFace(f)}
    >
      {faceOf(cube.state, f).map((c, i) => {
        const col = COLOR[c as Face];
        return (
          <span key={i} style={{ background: col.css }} title={col.name}>
            {col.mark}
          </span>
        );
      })}
    </button>
  );
  return (
    <Panel title="Cubo 3×3" onClose={onClose} className="cube-panel">
      <div className="panel-body cube">
        <div className="net" aria-label="Red del cubo">
          <div style={{ gridArea: 'u' }}>{grid('U')}</div>
          <div style={{ gridArea: 'l' }}>{grid('L')}</div>
          <div style={{ gridArea: 'f' }}>{grid('F')}</div>
          <div style={{ gridArea: 'r' }}>{grid('R')}</div>
          <div style={{ gridArea: 'b' }}>{grid('B')}</div>
          <div style={{ gridArea: 'd' }}>{grid('D')}</div>
        </div>
        <div className="cube-side">
          <p>
            Cara elegida: <b>{FACE_NAME[face]}</b>
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={() => turn(face)}>
              ↻ Girar horario
            </button>
            <button type="button" className="btn" onClick={() => turn(`${face}'` as Move)}>
              ↺ Antihorario
            </button>
          </div>
          <div className="cube-faces" role="group" aria-label="Elegir cara">
            {FACES.map((f) => (
              <button
                key={f}
                type="button"
                className="btn btn-sm"
                aria-pressed={face === f}
                onClick={() => setFace(f)}
              >
                {FACE_NAME[f]}
              </button>
            ))}
          </div>
          <div className="row wrap">
            <button
              type="button"
              className="btn btn-sm"
              onClick={store.cubeUndo}
              disabled={!cube.history.length}
            >
              Deshacer
            </button>
            <button type="button" className="btn btn-sm" onClick={store.cubeScramble}>
              Mezclar
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={store.cubeReset}>
              Ordenar de fábrica
            </button>
          </div>
          <p className="small muted" aria-live="polite">
            {solved ? '¡Resuelto!' : 'Sin resolver.'} Movimientos: {cube.moves}. Jugar al cubo no consume
            minutos ni cambia a Nico; se guarda al salir.
          </p>
        </div>
      </div>
    </Panel>
  );
}
