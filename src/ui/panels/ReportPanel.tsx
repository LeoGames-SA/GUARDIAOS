import { CONTENT } from '../../content';
import { caseReport } from '../../engine/report';
import { duration } from '../../engine/time';
import type { GameState } from '../../engine/types';

const CHANNEL: Record<string, string> = {
  phone: 'Confirmado por teléfono por la persona afectada.',
  email: 'Confirmado por correo por la persona afectada.',
  auto: 'Confirmado por la revalidación del monitor automático.',
};

/**
 * Informe de un expediente cerrado, en tres partes que no se mezclan:
 * resolución técnica, razonamiento documentado y buenas prácticas.
 * La causa real sólo existe una vez cerrado; nunca se inventa una hipótesis no elegida.
 */
export function ReportPanel({ game, caseId }: { game: GameState; caseId: string }) {
  const r = caseReport(CONTENT, game, caseId);
  if (!r) return <div className="panel-body">El informe estará disponible al cerrar el expediente.</div>;
  const practice = game.mode === 'practice';
  const solved = r.outcome === 'verified' || r.outcome === 'costly';
  return (
    <div className="panel-body report">
      <p className={`outcome outcome-${r.outcome}`}>
        #{r.number} · {r.title}: <b>{r.outcomeText}</b>
      </p>

      <section className="report-sec">
        <h3>Resolución técnica</h3>
        <dl className="props">
          <dt>Causa real</dt>
          <dd>
            {r.cause}
            <small className="block">{r.explanation}</small>
          </dd>
          <dt>Intervenciones</dt>
          <dd>{r.interventions.length ? r.interventions.join(' · ') : 'Ninguna.'}</dd>
          <dt>Verificación</dt>
          <dd>{r.confirmed ? CHANNEL[r.channel] : 'Sin confirmación del canal.'}</dd>
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
          {r.channel !== 'auto' && (
            <>
              <dt>Confianza</dt>
              <dd>
                <span aria-hidden="true">
                  {'●'.repeat(r.trust)}
                  {'○'.repeat(5 - r.trust)}{' '}
                </span>
                {r.trust} de 5
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="report-sec">
        <h3>Razonamiento documentado</h3>
        <dl className="props">
          <dt>Hipótesis de trabajo</dt>
          <dd>
            {r.playerHypothesis}
            {r.hypothesisMatches === true && ' Coincide con la causa real.'}
            {r.hypothesisMatches === false && ' No era la causa real.'}
            {r.hypothesisMatches === null && solved && (
              <small className="block">
                La resolución técnica cuenta igual; documentar la hipótesis ayuda a quien retome el caso.
              </small>
            )}
          </dd>
          <dt>Notas en la pizarra</dt>
          <dd>
            {r.notesCount} {r.documented ? '· con conexiones a la hipótesis' : '· sin conexiones registradas'}
          </dd>
          <dt>Pruebas clave</dt>
          <dd>
            {r.found.length
              ? `Hechas: ${r.found.join(' · ')}.`
              : 'No se hizo ninguna de las que mejor distinguían la causa.'}
            {r.missing.length > 0 && (
              <small className="block">Habrían confirmado la causa: {r.missing.join(' · ')}.</small>
            )}
          </dd>
        </dl>
      </section>

      {r.checklist.length > 0 && (
        <section className="report-sec">
          <h3>Buenas prácticas</h3>
          <ul className="plain checklist">
            {r.checklist.map((c) => (
              <li key={c.text}>
                <span aria-hidden="true">{c.done ? '✓' : '○'}</span> {c.text}
                <span className="sr-only">{c.done ? ' (hecho)' : ' (pendiente)'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
