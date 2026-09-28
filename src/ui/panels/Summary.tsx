import { Scene } from '../scene/Scene';
import { useAppState, useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { nightSummary, UNLOCK_RULE } from '../../engine/report';
import { ReportPanel } from './ReportPanel';

export function Summary() {
  const app = useAppState();
  const store = useStore();
  const game = app.campaign;
  if (!game) return null;
  const s = nightSummary(CONTENT, game);
  return (
    <main className="summary">
      <div className="menu-scene" aria-hidden="true" inert>
        <div className="stage">
          <Scene game={null} dual={false} pose={null} onOpen={() => undefined} inert />
        </div>
      </div>
      <div className="summary-card">
        <h1>Fin del turno · 07:00</h1>
        <p className="lead">
          {s.resolved} de {s.reports.length} expedientes resueltos y verificados.{' '}
          {s.deadlinesMissed ? `${s.deadlinesMissed} plazo(s) vencido(s).` : 'Ningún plazo vencido.'}
        </p>
        <section>
          <h2>Nico</h2>
          <p>
            Termina {s.mood}. Energía {Math.round(s.needs.energy)}, estrés {Math.round(s.needs.stress)}.{' '}
            {s.selfCare}
          </p>
          {s.pauses.length > 0 && (
            <p className="small muted">Pausas: {s.pauses.map((p) => `${p.label} ×${p.count}`).join(' · ')}</p>
          )}
        </section>
        <section>
          <h2>Mejora del puesto</h2>
          <p>
            {s.unlockSecondMonitor || app.profile.secondMonitor
              ? '🖥️🖥️ Segundo monitor habilitado: correo e historial a la vista junto a la aplicación principal. Ya está en tu puesto al rejugar.'
              : `Todavía no. ${UNLOCK_RULE}`}
          </p>
        </section>
        <section>
          <h2>Expedientes</h2>
          {s.reports.map((r) => (
            <details key={r.caseId} className="summary-case">
              <summary>
                #{r.number} · {r.title} — <b>{r.outcomeText}</b>
              </summary>
              <ReportPanel game={game} caseId={r.caseId} />
            </details>
          ))}
        </section>
        <div className="row wrap">
          <button type="button" className="btn btn-primary" onClick={() => store.newCampaign()}>
            Rejugar la noche con otra semilla
          </button>
          <button type="button" className="btn" onClick={store.toMenu}>
            Volver al menú
          </button>
        </div>
      </div>
    </main>
  );
}
