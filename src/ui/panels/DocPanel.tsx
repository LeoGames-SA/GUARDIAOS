import { CONTENT } from '../../content';
import { clock } from '../../engine/time';
import type { CaseDef, CaseState, GameState } from '../../engine/types';
import { CHANNEL, deviceKnown, priority } from '../common/ticket';
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
      <Panel title="Ticket impreso" onClose={onClose} className="panel-doc">
        {def && cs ? <TicketSheet game={game} cs={cs} def={def} /> : <EmptySheet />}
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

/**
 * Hoja de solicitud impresa al recibir el pedido: sólo lo que traía la solicitud original.
 * Lo que Nico averigua después se anota a mano (equipo afectado); el estado vivo, las notas y
 * el historial se consultan en GuardiaOS › Centro de tickets.
 */
function TicketSheet({ game, cs, def }: { game: GameState; cs: CaseState; def: CaseDef }) {
  const practice = game.mode === 'practice';
  const known = cs.contactKnown || def.channel !== 'phone';
  const blank = <span className="sheet-blank" aria-label="sin completar" />;
  return (
    <article className="sheet" aria-label={`Solicitud de soporte ${def.number}`}>
      <header className="sheet-head">
        <div className="sheet-org">
          <b>Mutual Sur</b> · Mesa de ayuda
          <small>Solicitud de soporte{practice ? ' · práctica' : ''}</small>
        </div>
        <div className="sheet-num">
          <small>N.º</small>
          {def.number}
        </div>
      </header>
      <h3 className="sheet-subject">{def.title}</h3>
      <dl className="sheet-grid">
        <div>
          <dt>Estado al imprimir</dt>
          <dd>Nuevo</dd>
        </div>
        <div>
          <dt>Prioridad</dt>
          <dd>{practice ? '—' : priority(def)}</dd>
        </div>
        <div>
          <dt>Canal</dt>
          <dd>{CHANNEL[def.channel].replace(/^\S+\s/, '')}</dd>
        </div>
        <div>
          <dt>Solicitante</dt>
          <dd>{cs.contactKnown ? def.contact.name : def.channel === 'auto' ? def.contact.name : blank}</dd>
        </div>
        <div>
          <dt>Sector</dt>
          <dd>{cs.contactKnown || def.channel === 'auto' ? def.contact.role : blank}</dd>
        </div>
        <div>
          <dt>Equipo afectado</dt>
          <dd>
            {deviceKnown(def, cs) ? (
              <span className="sheet-hand" title="Anotado a mano">
                {def.contact.device}
              </span>
            ) : (
              blank
            )}
          </dd>
        </div>
        <div>
          <dt>Llegada</dt>
          <dd>{practice || cs.arrivedAt === null ? '—' : clock(cs.arrivedAt)}</dd>
        </div>
        <div>
          <dt>Plazo</dt>
          <dd>{def.deadline === null || practice ? 'Sin plazo' : clock(def.deadline)}</dd>
        </div>
      </dl>
      <section className="sheet-desc">
        <h4>Descripción del problema, como se reportó</h4>
        <p>{known ? def.summary : def.teaser}</p>
      </section>
      <footer className="sheet-foot">
        Copia impresa al recibir la solicitud. Estado actualizado, notas e historial: GuardiaOS › Centro de
        tickets.
      </footer>
    </article>
  );
}

function EmptySheet() {
  return (
    <article className="sheet sheet-empty" aria-label="Sin solicitud impresa">
      <p>No hay un expediente activo. La hoja del próximo caso se imprime al tomarlo.</p>
    </article>
  );
}
