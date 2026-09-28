import { useState } from 'react';
import { useAppState } from '../../application/context';
import { CONTENT } from '../../content';
import { GLOSSARY, MANUAL, PROCEDURES, QUESTIONS } from '../../content/knowledge';
import type { GameState } from '../../engine/types';
import { Panel } from '../common/Panel';

/** Cuaderno del técnico: procedimientos, preguntas, glosario y apuntes aprendidos. Consultar es gratis. */
export function NotebookPanel({ game, onClose }: { game: GameState; onClose: () => void }) {
  const { profile } = useAppState();
  const [tab, setTab] = useState<'proc' | 'q' | 'terms' | 'learned'>('proc');
  const learned = [...new Set([...profile.learned, ...game.learned])]
    .map((id) => CONTENT.cases[id])
    .filter(Boolean);
  return (
    <Panel title="Cuaderno del técnico" onClose={onClose} className="notebook-panel">
      <div className="tabs" role="tablist">
        {(
          [
            ['proc', 'Procedimientos'],
            ['q', 'Preguntas útiles'],
            ['terms', 'Términos'],
            ['learned', `Apuntes (${learned.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="panel-body paper">
        {tab === 'proc' &&
          PROCEDURES.map((a) => (
            <section key={a.id}>
              <h3>{a.title}</h3>
              {a.body.map((b, i) => (
                <p key={i}>{b}</p>
              ))}
            </section>
          ))}
        {tab === 'q' && (
          <>
            <p>Preguntas cortas que casi siempre ayudan a delimitar el problema:</p>
            <ul>
              {QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="small">
              Lo que dice la persona se anota como «Dijo». Tomalo en serio, pero comprobalo.
            </p>
          </>
        )}
        {tab === 'terms' && (
          <dl className="props">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="contents">
                <dt>{g.term}</dt>
                <dd>{g.def}</dd>
              </div>
            ))}
          </dl>
        )}
        {tab === 'learned' &&
          (learned.length === 0 ? (
            <p>Al cerrar expedientes, Nico anota acá lo que aprendió.</p>
          ) : (
            learned.map((d) => (
              <section key={d!.id}>
                <h3>
                  {d!.number} · {d!.title}
                </h3>
                <p>{d!.learned}</p>
              </section>
            ))
          ))}
      </div>
    </Panel>
  );
}

/** Manual físico: referencia general del juego y del puesto (distinto del cuaderno). */
export function ManualPanel({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Manual de referencia" onClose={onClose} className="notebook-panel">
      <div className="panel-body">
        {MANUAL.map((a) => (
          <section key={a.id}>
            <h3>{a.title}</h3>
            {a.body.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
          </section>
        ))}
      </div>
    </Panel>
  );
}
