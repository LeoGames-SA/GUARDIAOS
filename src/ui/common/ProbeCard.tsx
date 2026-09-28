import { useState } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { costPenalty } from '../../engine/needs';
import { probeBlockReason, probeCost } from '../../engine/game';
import type { GameState, ProbeDef } from '../../engine/types';

const KIND_LABEL: Record<ProbeDef['kind'], string> = {
  question: 'Pregunta',
  test: 'Prueba',
  document: 'Documento',
  intervention: 'Intervención',
  verify: 'Verificación',
  communicate: 'Comunicación',
};

/**
 * Una acción técnica del expediente: muestra la pregunta que responde, el costo
 * antes de ejecutar y el último resultado guardado (releer es gratis).
 * Las intervenciones piden confirmación con costo y riesgo.
 */
export function ProbeCard({
  game,
  caseId,
  probe,
  compact,
}: {
  game: GameState;
  caseId: string;
  probe: ProbeDef;
  compact?: boolean;
}) {
  const store = useStore();
  const [confirming, setConfirming] = useState(false);
  const cs = game.cases[caseId]!;
  const def = CONTENT.cases[caseId]!;
  const blocked = probeBlockReason(game, def, cs, probe);
  const { cost, reread } = probeCost(game, cs, probe);
  const runs = cs.runs.filter((r) => r.probeId === probe.id);
  const last = runs[runs.length - 1];
  const penalty = costPenalty(game.needs);
  const isIntervention = probe.kind === 'intervention';
  const stale = last && last.version !== cs.version;

  const exec = () => {
    setConfirming(false);
    store.dispatch({ type: 'probe', caseId, probeId: probe.id });
  };

  const costText =
    game.mode === 'practice'
      ? 'sin reloj'
      : reread
        ? 'gratis'
        : `${cost} min${cost > probe.cost ? ` (+${cost - probe.cost} por ${penalty.reasons.join(' y ')})` : ''}`;

  return (
    <article className={`probe probe-${probe.kind} ${last ? 'has-result' : ''} ${compact ? 'compact' : ''}`}>
      <header className="probe-head">
        <span className={`probe-kind k-${probe.kind}`}>{KIND_LABEL[probe.kind]}</span>
        <h4>{probe.label}</h4>
      </header>
      {probe.asks && !compact && <p className="probe-asks">{probe.asks}</p>}
      {last && (
        <div className="probe-result" aria-live="off">
          <p>
            <span className="res-time">{stale ? 'Resultado anterior:' : 'Resultado:'}</span> {last.summary}
          </p>
          {last.detail.length > 0 && (
            <ul className="log">
              {last.detail.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          {last.noteId && <p className="small muted">↳ Anotado en la pizarra.</p>}
        </div>
      )}
      {blocked ? (
        <p className="probe-blocked">
          <span aria-hidden="true">🔒</span> {blocked}
        </p>
      ) : confirming ? (
        <div className="confirm" role="group" aria-label="Confirmar intervención">
          <p>
            <b>Costo: {costText}.</b> {probe.risk}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary btn-sm" onClick={exec} data-autofocus>
              Aplicar
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {reread ? (
            <span className="small muted">
              {isIntervention
                ? 'Ya aplicado; nada cambió desde entonces.'
                : 'Resultado vigente: releer es gratis.'}
            </span>
          ) : (
            <button
              type="button"
              className={`btn btn-sm ${isIntervention ? 'btn-danger' : ''}`}
              onClick={() => (isIntervention ? setConfirming(true) : exec())}
            >
              {isIntervention
                ? 'Aplicar…'
                : probe.kind === 'document'
                  ? 'Leer'
                  : last
                    ? 'Repetir'
                    : 'Ejecutar'}{' '}
              <span className="cost">· {costText}</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}
