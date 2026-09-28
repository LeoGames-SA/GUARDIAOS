import { CONTENT } from '../../content';
import { artInfo } from '../../content/station';
import { clock } from '../../engine/time';
import type { GameState } from '../../engine/types';
import { Panel } from '../common/Panel';
import { ProbeCard } from '../common/ProbeCard';

/** Papeles de la mesa: el ticket impreso del expediente activo y los avisos. Contenido real en DOM. */
export function DocPanel({
  game,
  doc,
  onClose,
}: {
  game: GameState;
  doc: 'ticket' | 'memo';
  onClose: () => void;
}) {
  const cs = game.focusId ? game.cases[game.focusId] : null;
  const def = cs ? CONTENT.cases[cs.id]! : null;
  if (doc === 'ticket') {
    return (
      <Panel title="Ticket impreso" onClose={onClose} style={{ width: 'min(560px,100%)' }}>
        <div className="panel-body">
          <div
            className="paper-doc ticket-doc"
            style={{ backgroundImage: `url(${artInfo('ticket-paper').file})` }}
          >
            {def && cs ? (
              <>
                <h3>TICKET #{def.number}</h3>
                <p>
                  <b>{def.title}</b>
                </p>
                <p>{cs.contactKnown || def.channel !== 'phone' ? def.summary : def.teaser}</p>
                <p className="small">
                  Solicitante:{' '}
                  {cs.contactKnown ? `${def.contact.name} (${def.contact.role})` : 'sin identificar'} ·
                  Llegada {game.mode === 'practice' ? '—' : clock(cs.arrivedAt ?? 0)}
                  {def.deadline !== null && game.mode === 'campaign' ? ` · Plazo ${clock(def.deadline)}` : ''}
                </p>
              </>
            ) : (
              <p>No hay un expediente activo. El ticket del próximo caso se imprime al tomarlo.</p>
            )}
          </div>
        </div>
      </Panel>
    );
  }
  const docs = def ? def.probes.filter((p) => p.kind === 'document') : [];
  return (
    <Panel title="Avisos y documentos" onClose={onClose} style={{ width: 'min(620px,100%)' }}>
      <div className="panel-body">
        {docs.length > 0 && cs ? (
          docs.map((p) => <ProbeCard key={p.id} game={game} caseId={cs.id} probe={p} />)
        ) : (
          <div className="paper-doc memo-doc">
            <h3>Aviso de guardia</h3>
            <p>
              Recordá: registrar cada acción en el ticket, verificar con la persona y dejar el traspaso a las
              07:00.
            </p>
            <p className="small">
              {def ? `No hay documentos vinculados al expediente ${def.number}.` : 'Sin expediente activo.'}
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
