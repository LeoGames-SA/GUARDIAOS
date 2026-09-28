import { CONTENT } from '../../content';
import { caseReport } from '../../engine/report';
import { duration } from '../../engine/time';
import type { GameState } from '../../engine/types';

/** Informe de un expediente cerrado. La causa real sólo existe una vez cerrado. */
export function ReportPanel({ game, caseId }: { game: GameState; caseId: string }) {
  const r = caseReport(CONTENT, game, caseId);
  if (!r) return <div className="panel-body">El informe estará disponible al cerrar el expediente.</div>;
  const practice = game.mode === 'practice';
  return (
    <div className="panel-body report">
      <p className={`outcome outcome-${r.outcome}`}>
        #{r.number} · {r.title}: <b>{r.outcomeText}</b>
      </p>
      <dl className="props">
        <dt>Causa real</dt>
        <dd>
          {r.cause}
          <small className="block">{r.explanation}</small>
        </dd>
        <dt>Tu hipótesis</dt>
        <dd>
          {r.playerHypothesis}
          {r.hypothesisMatches === true && ' — coincide.'}
          {r.hypothesisMatches === false && ' — no era la causa.'}
        </dd>
        <dt>Pruebas clave hechas</dt>
        <dd>{r.found.length ? r.found.join(' · ') : 'Ninguna de las que mejor distinguían la causa.'}</dd>
        {r.missing.length > 0 && (
          <>
            <dt>Pruebas que faltaron</dt>
            <dd>{r.missing.join(' · ')}</dd>
          </>
        )}
        <dt>Intervenciones</dt>
        <dd>{r.interventions.length ? r.interventions.join(' · ') : 'Ninguna.'}</dd>
        {r.consequences.length > 0 && (
          <>
            <dt>Consecuencias</dt>
            <dd>{r.consequences.join(' ')}</dd>
          </>
        )}
        {r.escalation && (
          <>
            <dt>Escalamiento</dt>
            <dd>{r.escalation}</dd>
          </>
        )}
        {!practice && (
          <>
            <dt>Tiempo</dt>
            <dd>{duration(r.timeUsed)}</dd>
          </>
        )}
        <dt>Confirmación</dt>
        <dd>{r.confirmed ? 'Sí, por el canal del caso.' : 'No.'}</dd>
        <dt>Confianza</dt>
        <dd>
          {'●'.repeat(r.trust)}
          {'○'.repeat(5 - r.trust)} ({r.trust}/5)
        </dd>
        {r.checklist.length > 0 && (
          <>
            <dt>Buenas prácticas</dt>
            <dd>
              <ul className="plain">
                {r.checklist.map((c) => (
                  <li key={c.text}>
                    {c.done ? '✓' : '○'} {c.text}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
