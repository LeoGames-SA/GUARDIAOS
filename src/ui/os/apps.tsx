import { useRef, useState } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { DEVICES, type DeviceDef } from '../../content/devices';
import { PROCEDURES, GLOSSARY } from '../../content/knowledge';
import { probeBlockReason, probeCost, outcomeLabel } from '../../engine/game';
import { clock } from '../../engine/time';
import type { AppId, CaseDef, CaseState, GameState, ProbeDef } from '../../engine/types';
import { ProbeCard } from '../common/ProbeCard';
import { CHANNEL, priority } from '../common/ticket';
import { MailApp } from './mail';
import { BrowserApp } from './browser';
import { RemoteAssist } from './remote';
import { wm } from './windows';

type Open = (app: AppId, target?: string) => void;
interface AppProps {
  game: GameState;
  open: Open;
  target?: string;
}

const ICONS: Record<string, string> = {
  tickets: '🎫',
  mail: '✉️',
  network: '🖧',
  accounts: '👥',
  printers: '🖨️',
  services: '⚙️',
  events: '📜',
  files: '📁',
  browser: '🌐',
  history: '🕘',
  procedures: '📘',
  console: '⌨️',
  remote: '🖥️',
  phone: '☎️',
};

export function AppIcon({ app }: { app: AppId }) {
  return (
    <span className="app-icon" aria-hidden="true">
      {ICONS[app]}
    </span>
  );
}

export function AppView({ app, game, open, target }: AppProps & { app: AppId }) {
  switch (app) {
    case 'tickets':
      return <TicketsApp game={game} open={open} />;
    case 'mail':
      return <MailApp game={game} open={open} />;
    case 'network':
      return (
        <DeviceApp
          game={game}
          open={open}
          app="network"
          kinds={['pc', 'server', 'printer']}
          intro="Elegí un equipo para ver sus propiedades y probar alcance, IP y nombre."
        />
      );
    case 'printers':
      return (
        <DeviceApp
          game={game}
          open={open}
          app="printers"
          kinds={['printer']}
          intro="Impresoras publicadas en el servidor de impresión."
        />
      );
    case 'services':
      return (
        <DeviceApp
          game={game}
          open={open}
          app="services"
          kinds={['server']}
          intro="Servicios de los servidores vinculados al expediente."
        />
      );
    case 'events':
      return <EventsApp game={game} open={open} />;
    case 'accounts':
      return <AccountsApp game={game} open={open} />;
    case 'files':
      return <FilesApp game={game} open={open} />;
    case 'browser':
      return <BrowserApp game={game} open={open} />;
    case 'history':
      return <HistoryApp game={game} open={open} />;
    case 'procedures':
      return <ProceduresApp game={game} open={open} />;
    case 'console':
      return <ConsoleApp game={game} open={open} />;
    case 'remote':
      return target ? (
        <RemoteSession game={game} open={open} target={target} />
      ) : (
        <RemotePicker game={game} open={open} />
      );
    default:
      return null;
  }
}

// ------------------------------------------------------------------ utilidades

function useFocus(game: GameState): { cs: CaseState | null; def: CaseDef | null } {
  const cs = game.focusId ? (game.cases[game.focusId] ?? null) : null;
  return { cs, def: cs ? CONTENT.cases[cs.id]! : null };
}

/** Franja que identifica el expediente sobre el que actúan las herramientas. */
function CaseBanner({ game }: { game: GameState }) {
  const store = useStore();
  const { def } = useFocus(game);
  return (
    <div className="case-banner">
      {def ? (
        <span>
          Expediente activo: <b>{def.number}</b> · {def.title}
        </span>
      ) : (
        <span className="muted">Sin expediente activo: tomá uno en el Centro de tickets.</span>
      )}
      {game.activeIds.length > 1 && (
        <span className="row">
          {game.activeIds
            .filter((id) => id !== game.focusId)
            .map((id) => (
              <button
                key={id}
                type="button"
                className="btn btn-sm"
                onClick={() => store.dispatch({ type: 'focus', caseId: id })}
              >
                Cambiar a {CONTENT.cases[id]!.number}
              </button>
            ))}
        </span>
      )}
    </div>
  );
}

function probesFor(def: CaseDef | null, app: AppId, target?: string): ProbeDef[] {
  if (!def) return [];
  return def.probes.filter((p) => p.app === app && (target === undefined || p.target === target));
}

// ------------------------------------------------------------------ Centro de tickets

function TicketsApp({ game, open }: AppProps) {
  const [tab, setTab] = useState<'active' | 'pending' | 'closed'>(() =>
    game.activeIds.length === 0 && Object.values(game.cases).some((c) => c.status === 'pending')
      ? 'pending'
      : 'active',
  );
  const [sel, setSel] = useState<string | null>(game.focusId);
  const all = Object.values(game.cases).filter((c) => c.status !== 'scheduled');
  const lists = {
    active: all.filter((c) => c.status === 'active'),
    pending: all.filter((c) => c.status === 'pending'),
    closed: all.filter((c) => c.status === 'closed'),
  };
  // Si la pestaña quedó vacía (por ejemplo, se tomó el expediente desde el correo), mostrar los activos.
  const effTab = lists[tab].length === 0 && lists.active.length > 0 ? 'active' : tab;
  const rows = lists[effTab];
  const current = rows.find((c) => c.id === sel) ?? rows[0] ?? null;

  return (
    <div className="app app-split">
      <div className="app-col">
        <div className="tabs" role="tablist">
          {(['active', 'pending', 'closed'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {{ active: 'Activos', pending: 'Bandeja', closed: 'Cerrados' }[t]} ({lists[t].length})
            </button>
          ))}
        </div>
        <ul className="list" role="listbox" aria-label="Tickets">
          {rows.length === 0 && (
            <li className="muted small pad">{tab === 'pending' ? 'No hay pendientes.' : 'Nada por aquí.'}</li>
          )}
          {rows.map((c) => {
            const def = CONTENT.cases[c.id]!;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={current?.id === c.id}
                  className="list-row"
                  onClick={() => setSel(c.id)}
                >
                  <b>#{def.number}</b> {def.title}
                  <small>
                    {CHANNEL[def.channel]} · {c.contactKnown ? def.contact.name : 'Contacto sin identificar'}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="app-main">
        {current ? (
          <TicketDetail game={game} cs={current} open={open} />
        ) : (
          <p className="muted pad">Elegí un ticket.</p>
        )}
      </div>
    </div>
  );
}

function TicketDetail({ game, cs, open }: { game: GameState; cs: CaseState; open: Open }) {
  const store = useStore();
  const def = CONTENT.cases[cs.id]!;
  const [escalating, setEscalating] = useState(false);
  const closable =
    def.isFixed(cs.world) && cs.confirmed && (def.closeNeeds ?? []).every((n) => cs.flags.includes(n.flag));
  const closeHint =
    !def.isFixed(cs.world) || !cs.confirmed
      ? def.channel === 'auto'
        ? 'Falta que el monitor externo confirme la resolución.'
        : `Falta la confirmación de ${cs.contactKnown ? def.contact.short : 'la persona'}.`
      : (def.closeNeeds ?? []).find((n) => !cs.flags.includes(n.flag))?.reason;
  return (
    <div className="ticket">
      <h3>
        #{def.number} · {def.title}
      </h3>
      <dl className="props">
        <dt>Canal</dt>
        <dd>{CHANNEL[def.channel]}</dd>
        <dt>Solicitante</dt>
        <dd>{cs.contactKnown ? `${def.contact.name} (${def.contact.role})` : 'Sin identificar'}</dd>
        <dt>Prioridad</dt>
        <dd>{priority(def)}</dd>
        <dt>Plazo</dt>
        <dd>
          {def.deadline === null ? '—' : `${clock(def.deadline)}${cs.deadlinePassed ? ' · vencido' : ''}`}
        </dd>
        <dt>Responsable</dt>
        <dd>{cs.status === 'pending' ? 'Sin asignar' : 'Nicolás Bentancor'}</dd>
        <dt>Estado</dt>
        <dd>
          {cs.status === 'closed'
            ? outcomeLabel(cs.outcome!)
            : cs.status === 'pending'
              ? cs.flags.includes('voicemail')
                ? 'Pendiente · mensaje de voz'
                : 'Pendiente'
              : cs.confirmed
                ? 'Verificado, listo para cerrar'
                : 'En curso'}
        </dd>
      </dl>
      <p>{cs.contactKnown || def.channel !== 'phone' ? def.summary : def.teaser}</p>
      <div className="row wrap">
        {cs.status === 'pending' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => store.dispatch({ type: 'take', caseId: cs.id })}
          >
            Tomar el expediente
          </button>
        )}
        {cs.status === 'active' && game.focusId !== cs.id && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => store.dispatch({ type: 'focus', caseId: cs.id })}
          >
            Trabajar en este expediente
          </button>
        )}
        {def.channel === 'email' && (
          <button type="button" className="btn btn-sm" onClick={() => open('mail')}>
            Ver correo
          </button>
        )}
        {def.channel === 'phone' && cs.contactKnown && cs.status !== 'closed' && !game.call && (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => store.dispatch({ type: 'callContact', caseId: cs.id })}
          >
            Llamar a {def.contact.short}{' '}
            <span className="cost">· {game.mode === 'practice' ? 'sin reloj' : '1 min'}</span>
          </button>
        )}
        {cs.status === 'closed' && (
          <button type="button" className="btn btn-sm" onClick={() => store.showReport(cs.id)}>
            Ver informe
          </button>
        )}
      </div>
      {cs.status === 'active' && (
        <>
          {game.focusId === cs.id &&
            probesFor(def, 'tickets').map((p) => (
              <ProbeCard key={p.id} game={game} caseId={cs.id} probe={p} />
            ))}
          <div className="close-box">
            <button
              type="button"
              className="btn btn-primary"
              aria-disabled={!closable}
              onClick={() => store.dispatch({ type: 'close', caseId: cs.id })}
            >
              Cerrar como resuelto
            </button>
            {!closable && <p className="small muted">{closeHint}</p>}
            {escalating ? (
              <div className="confirm">
                <p>
                  <b>{def.escalation.label}.</b> El expediente pasa a otro equipo con tu informe. Costo{' '}
                  {game.mode === 'practice' ? 'sin reloj' : '3 min'}. Escalar puede ser lo correcto si falta
                  una autorización o la solución excede la guardia.
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => store.dispatch({ type: 'escalate', caseId: cs.id })}
                  >
                    Escalar
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setEscalating(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEscalating(true)}>
                Escalar…
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { MailApp } from './mail';

// ------------------------------------------------------------------ Equipos: red, impresoras, servicios

function caseDevices(game: GameState): string[] {
  const ids = new Set<string>();
  for (const id of game.activeIds) for (const d of CONTENT.cases[id]!.devices) ids.add(d);
  ids.add('PC-SOP-01');
  return [...ids];
}

function DeviceApp({
  game,
  open,
  app,
  kinds,
  intro,
}: AppProps & { app: AppId; kinds: DeviceDef['kind'][]; intro: string }) {
  const { def, cs } = useFocus(game);
  const devices = caseDevices(game)
    .map((id) => DEVICES[id]!)
    .filter((d) => kinds.includes(d.kind));
  const [sel, setSel] = useState<string | null>(null);
  const current = devices.find((d) => d.id === sel) ?? devices[0] ?? null;
  const probes = current ? probesFor(def, app, current.id) : [];
  const elsewhere = current
    ? game.activeIds.filter(
        (id) =>
          id !== game.focusId &&
          CONTENT.cases[id]!.probes.some((p) => p.app === app && p.target === current.id),
      )
    : [];

  return (
    <div className="app">
      <CaseBanner game={game} />
      <div className="app-split">
        <ul className="list app-col" role="listbox" aria-label="Equipos">
          {devices.length === 0 && (
            <li className="muted small pad">No hay equipos de este tipo en los expedientes activos.</li>
          )}
          {devices.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                role="option"
                aria-selected={current?.id === d.id}
                className="list-row"
                onClick={() => setSel(d.id)}
              >
                <b>{d.id}</b>
                <small>{d.name}</small>
              </button>
            </li>
          ))}
        </ul>
        <div className="app-main">
          <p className="small muted">{intro}</p>
          {current && (
            <>
              <DeviceProps d={current} />
              {current.remote && (
                <button type="button" className="btn btn-sm" onClick={() => open('remote', current.id)}>
                  Conectar por acceso remoto
                </button>
              )}
              {cs && probes.map((p) => <ProbeCard key={p.id} game={game} caseId={cs.id} probe={p} />)}
              {cs && probes.length === 0 && (
                <p className="small muted pad">
                  No hay acciones de esta herramienta sobre {current.id} para el expediente {def?.number}.
                </p>
              )}
              {elsewhere.length > 0 && (
                <p className="small muted">
                  También hay acciones para el expediente{' '}
                  {elsewhere.map((id) => CONTENT.cases[id]!.number).join(', ')}: cambiá de expediente para
                  verlas.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceProps({ d }: { d: DeviceDef }) {
  return (
    <dl className="props">
      <dt>Nombre</dt>
      <dd>{d.hostname}</dd>
      <dt>IP (inventario)</dt>
      <dd className="mono">{d.ip}</dd>
      <dt>Ubicación</dt>
      <dd>{d.location}</dd>
      {d.owner && (
        <>
          <dt>Usuario</dt>
          <dd>{d.owner}</dd>
        </>
      )}
      <dt>Sistema</dt>
      <dd>{d.os}</dd>
      {d.notes && (
        <>
          <dt>Notas</dt>
          <dd>{d.notes}</dd>
        </>
      )}
    </dl>
  );
}

// ------------------------------------------------------------------ Eventos

function EventsApp({ game, open }: AppProps) {
  const { def, cs } = useFocus(game);
  const probes = probesFor(def, 'events');
  const [filter, setFilter] = useState('');
  const rows = cs
    ? cs.runs
        .filter((r) => probes.some((p) => p.id === r.probeId))
        .flatMap((r) =>
          r.detail.map((d) => ({ d, device: def!.probes.find((p) => p.id === r.probeId)!.target ?? '' })),
        )
    : [];
  const shown = rows.filter((r) => `${r.device} ${r.d}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="app">
      <CaseBanner game={game} />
      <div className="app-scroll">
        {cs && probes.map((p) => <ProbeCard key={p.id} game={game} caseId={cs.id} probe={p} compact />)}
        {!cs && (
          <p className="muted">Los registros se consultan por equipo y hora dentro de un expediente.</p>
        )}
        {rows.length > 0 && (
          <section>
            <label className="field">
              Filtrar registros consultados
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="equipo, hora o texto (p. ej. «Error»)"
              />
            </label>
            <table className="table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.device}</td>
                    <td>{r.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => open('history')}>
          Ver historial de acciones
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Cuentas y permisos

function AccountsApp({ game }: AppProps) {
  const { def, cs } = useFocus(game);
  const probes = probesFor(def, 'accounts');
  const targets = [...new Set(probes.map((p) => p.target ?? ''))];
  const [sel, setSel] = useState<string | null>(null);
  const current = targets.includes(sel ?? '') ? sel : (targets[0] ?? null);
  return (
    <div className="app">
      <CaseBanner game={game} />
      {!cs || targets.length === 0 ? (
        <p className="muted pad">No hay cuentas ni recursos vinculados al expediente activo.</p>
      ) : (
        <div className="app-split">
          <ul className="list app-col" role="listbox" aria-label="Identidades y recursos">
            {targets.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  role="option"
                  aria-selected={current === t}
                  className="list-row"
                  onClick={() => setSel(t)}
                >
                  <b>{t.includes('\\') ? `\\\\${t}` : t}</b>
                  <small>{t.includes('\\') ? 'Recurso compartido' : 'Cuenta de usuario'}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="app-main">
            <p className="small muted">
              Cambiar permisos requiere una autorización registrada. Nunca des acceso de más para «probar».
            </p>
            {probes
              .filter((p) => p.target === current)
              .map((p) => (
                <ProbeCard key={p.id} game={game} caseId={cs.id} probe={p} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Archivos

interface FileItem {
  name: string;
  size: string;
  modified: string;
  kind: 'probe' | 'text';
  probe?: ProbeDef;
  text?: string[];
}

function FilesApp({ game }: AppProps) {
  const { def, cs } = useFocus(game);
  const [sel, setSel] = useState<string | null>(null);
  const [props, setProps] = useState(false);
  const files: FileItem[] = [
    ...probesFor(def, 'files').map((p) => ({
      name: `${p.label}.txt`,
      size: '4 KB',
      modified: 'hoy',
      kind: 'probe' as const,
      probe: p,
    })),
    ...game.activeIds.map((id) => {
      const d = CONTENT.cases[id]!;
      const c = game.cases[id]!;
      return {
        name: `Ticket_${d.number}.txt`,
        size: '1 KB',
        modified: clock(c.arrivedAt ?? 0),
        kind: 'text' as const,
        text: [
          `#${d.number} · ${d.title}`,
          `Canal: ${CHANNEL[d.channel]}`,
          `Solicitante: ${c.contactKnown ? d.contact.name : 'sin identificar'}`,
          c.contactKnown || d.channel !== 'phone' ? d.summary : d.teaser,
        ],
      };
    }),
    {
      name: 'Manual_de_guardia.txt',
      size: '12 KB',
      modified: '02/09',
      kind: 'text',
      text: PROCEDURES.slice(0, 3).flatMap((a) => [`— ${a.title}`, ...a.body]),
    },
  ];
  const current = files.find((f) => f.name === sel) ?? null;
  return (
    <div className="app">
      <CaseBanner game={game} />
      <div className="app-split">
        <ul className="list app-col" role="listbox" aria-label="Archivos">
          {files.map((f) => (
            <li key={f.name}>
              <button
                type="button"
                role="option"
                aria-selected={current?.name === f.name}
                className="list-row"
                onClick={() => {
                  setSel(f.name);
                  setProps(false);
                }}
              >
                <b>📄 {f.name}</b>
                <small>
                  {f.size} · {f.modified}
                </small>
              </button>
            </li>
          ))}
        </ul>
        <div className="app-main">
          {!current && <p className="muted pad">Elegí un archivo para abrirlo.</p>}
          {current && (
            <>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-pressed={props}
                  onClick={() => setProps((p) => !p)}
                >
                  Propiedades
                </button>
              </div>
              {props && (
                <dl className="props">
                  <dt>Nombre</dt>
                  <dd>{current.name}</dd>
                  <dt>Tamaño</dt>
                  <dd>{current.size}</dd>
                  <dt>Modificado</dt>
                  <dd>{current.modified}</dd>
                  <dt>Ubicación</dt>
                  <dd className="mono">\\srv-archivos\Soporte\Guardia</dd>
                </dl>
              )}
              {current.kind === 'probe' && cs && current.probe ? (
                <ProbeCard game={game} caseId={cs.id} probe={current.probe} />
              ) : (
                <pre className="doc">{current.text?.join('\n')}</pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Historial

export function HistoryApp({ game }: AppProps) {
  const store = useStore();
  const [filter, setFilter] = useState<string>('all');
  const rows = game.history
    .filter((h) => filter === 'all' || h.caseId === filter || (filter === 'none' && h.caseId === null))
    .slice()
    .reverse();
  const ids = Object.values(game.cases)
    .filter((c) => c.status !== 'scheduled')
    .map((c) => c.id);
  return (
    <div className="app">
      <div className="row pad">
        <label className="field inline">
          Mostrar
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Vista general</option>
            {ids.map((id) => (
              <option key={id} value={id}>
                Expediente {CONTENT.cases[id]!.number}
              </option>
            ))}
            <option value="none">Pausas y turno</option>
          </select>
        </label>
      </div>
      <div className="app-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Exp.</th>
              <th>Origen</th>
              <th>Equipo</th>
              <th>Acción</th>
              <th>Resultado</th>
              <th>Min</th>
              <th>
                <span className="sr-only">Informe</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id}>
                <td className="mono">{game.mode === 'practice' ? '—' : clock(h.at)}</td>
                <td>{h.caseId ? CONTENT.cases[h.caseId]!.number : '—'}</td>
                <td>{h.origin}</td>
                <td className="mono">{h.device}</td>
                <td>{h.action}</td>
                <td>{h.result}</td>
                <td className="mono">{h.cost || ''}</td>
                <td>
                  {h.caseId &&
                    game.cases[h.caseId]?.status === 'closed' &&
                    (h.action.startsWith('Cerré') || h.action.startsWith('Escalar')) && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => store.showReport(h.caseId!)}
                      >
                        Ver informe
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted pad">Todavía no hay acciones registradas.</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Procedimientos

const TAGS_BY_APP: Partial<Record<AppId, string>> = {
  printers: 'impresión',
  accounts: 'permisos',
  browser: 'web',
  remote: 'audio',
};

function ProceduresApp({ game }: AppProps) {
  const { def } = useFocus(game);
  const [q, setQ] = useState('');
  const related = new Set(def ? def.probes.map((p) => TAGS_BY_APP[p.app]).filter(Boolean) : []);
  const list = PROCEDURES.filter((a) =>
    `${a.title} ${a.body.join(' ')}`.toLowerCase().includes(q.toLowerCase()),
  ).sort((a, b) => Number(b.tags.some((t) => related.has(t))) - Number(a.tags.some((t) => related.has(t))));
  return (
    <div className="app app-scroll">
      <label className="field">
        Buscar procedimiento
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="nombre, IP, permisos, 503…" />
      </label>
      {list.map((a) => (
        <details key={a.id} open={a.tags.some((t) => related.has(t))}>
          <summary>
            {a.title} {a.tags.some((t) => related.has(t)) && <span className="tag">relacionado</span>}
          </summary>
          {a.body.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
        </details>
      ))}
      <details>
        <summary>Glosario</summary>
        <dl className="props">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="contents">
              <dt>{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}

// ------------------------------------------------------------------ Consola (lista segura y finita)

interface ConsoleLine {
  kind: 'in' | 'out' | 'err' | 'hint';
  text: string;
}

const consoleLog = new Map<string, ConsoleLine[]>();

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function ConsoleApp({ game }: AppProps) {
  const store = useStore();
  const { def, cs } = useFocus(game);
  const [, force] = useState(0);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<ProbeDef | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const log = consoleLog.get(game.mode) ?? [
    { kind: 'hint', text: 'GuardiaOS consola simulada. Escribí «ayuda».' },
  ];
  const commands = def ? def.probes.filter((p) => p.console?.length) : [];
  const match = (cmd: string) =>
    commands.find((p) => p.console!.some((c) => normalize(c) === normalize(cmd)));
  const preview = (() => {
    const n = normalize(input);
    if (!n) return '';
    if (pending) return 'Escribí «s» para confirmar o «n» para cancelar.';
    const p = match(n);
    if (!p || !cs) return ['ayuda', 'limpiar', 'expediente'].includes(n) ? 'Comando interno · gratis' : '';
    const { cost, reread } = probeCost(game, cs, p);
    return reread
      ? 'Resultado guardado · releer es gratis'
      : `${p.kind === 'intervention' ? 'Intervención (pide confirmación)' : 'Prueba nueva'} · ${game.mode === 'practice' ? 'sin reloj' : `${cost} min`}`;
  })();

  const push = (...lines: ConsoleLine[]) => {
    consoleLog.set(game.mode, [...log, ...lines].slice(-200));
    force((x) => x + 1);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }));
  };

  const execute = (p: ProbeDef) => {
    const events = store.dispatch({ type: 'probe', caseId: cs!.id, probeId: p.id });
    const blocked = events.find((e) => e.type === 'blocked');
    if (blocked && blocked.type === 'blocked') return push({ kind: 'err', text: blocked.reason });
    const g = store.game!;
    const run = g.cases[cs!.id]!.runs.filter((r) => r.probeId === p.id).at(-1);
    if (run)
      push(
        { kind: 'out', text: run.summary },
        ...run.detail.map((d) => ({ kind: 'out' as const, text: `  ${d}` })),
      );
  };

  const submit = () => {
    const raw = input;
    setInput('');
    const n = normalize(raw);
    const lines: ConsoleLine[] = [{ kind: 'in', text: `> ${raw}` }];
    if (pending) {
      const p = pending;
      setPending(null);
      if (n === 's' || n === 'si' || n === 'sí') {
        push(...lines);
        execute(p);
      } else push(...lines, { kind: 'hint', text: 'Cancelado.' });
      return;
    }
    if (!n) return;
    if (n === 'limpiar' || n === 'cls' || n === 'clear') {
      consoleLog.set(game.mode, []);
      force((x) => x + 1);
      return;
    }
    if (n === 'ayuda' || n === 'help' || n === '?') {
      push(...lines, { kind: 'hint', text: 'Comandos internos: ayuda, limpiar, expediente.' });
      if (!commands.length)
        return push({ kind: 'hint', text: 'El expediente activo no tiene comandos de consola.' });
      return push(
        {
          kind: 'hint',
          text: `Comandos disponibles para ${def!.number} (equivalen a acciones de las aplicaciones):`,
        },
        ...commands.map((p) => ({ kind: 'hint' as const, text: `  ${p.console![0]}  — ${p.label}` })),
      );
    }
    if (n === 'expediente')
      return push(...lines, {
        kind: 'out',
        text: def ? `${def.number} · ${def.title}` : 'Sin expediente activo.',
      });
    const p = match(n);
    if (!p || !cs)
      return push(...lines, {
        kind: 'err',
        text: `Comando no reconocido: «${raw.trim()}». Escribí «ayuda».`,
      });
    if (p.kind === 'intervention' && !probeCost(game, cs, p).reread) {
      const reason = probeBlockReason(game, def!, cs, p);
      if (reason) return push(...lines, { kind: 'err', text: reason });
      setPending(p);
      return push(...lines, {
        kind: 'hint',
        text: `${p.label}. Costo: ${probeCost(game, cs, p).cost} min. ${p.risk ?? ''} ¿Confirmar? (s/n)`,
      });
    }
    push(...lines);
    execute(p);
  };

  return (
    <div className="app console">
      <div className="console-out" role="log" aria-label="Salida de la consola">
        {log.map((l, i) => (
          <div key={i} className={`c-${l.kind}`}>
            {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="console-in"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="con" className="sr-only">
          Comando
        </label>
        <span aria-hidden="true">&gt;</span>
        <input
          id="con"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      <div className="console-hint small" aria-live="polite">
        {preview}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Acceso remoto

function RemotePicker({ game, open }: AppProps) {
  const devices = caseDevices(game)
    .map((id) => DEVICES[id]!)
    .filter((d) => d.remote);
  return (
    <div className="app app-scroll">
      <CaseBanner game={game} />
      <p>
        Elegí el equipo al que te querés conectar. La sesión remota se abre en su propia ventana, con el
        nombre del equipo visible.
      </p>
      {devices.length === 0 && (
        <p className="muted">No hay equipos con acceso remoto en los expedientes activos.</p>
      )}
      <div className="stack">
        {devices.map((d) => (
          <button key={d.id} type="button" className="btn" onClick={() => open('remote', d.id)}>
            🖥️ {d.id} · {d.owner}
          </button>
        ))}
      </div>
    </div>
  );
}

function RemoteSession({ game, open, target }: AppProps & { target: string }) {
  const { def, cs } = useFocus(game);
  const d = DEVICES[target]!;
  const probes = def
    ? def.probes.filter((p) => p.target === target && (p.app === 'remote' || p.app === 'network'))
    : [];
  const belongs = def?.devices.includes(target);
  if (def?.remote?.device === target && cs && belongs)
    return <RemoteAssist game={game} def={def} cs={cs} onDisconnected={() => undefined} />;
  return (
    <div className="app remote">
      <div className="remote-bar">
        <span>
          SESIÓN REMOTA · <b>{d.id}</b> · {d.owner} · {d.ip}
        </span>
        <span className="small">No es tu equipo</span>
      </div>
      <div className="remote-desk">
        {!belongs || !cs ? (
          <p className="muted">
            Este equipo no pertenece al expediente activo{def ? ` (${def.number})` : ''}. Cambiá de expediente
            para actuar sobre él.
          </p>
        ) : (
          <>
            <p className="small muted">Panel del equipo remoto: sonido, red y sistema.</p>
            {probes.map((p) => (
              <ProbeCard key={p.id} game={game} caseId={cs.id} probe={p} />
            ))}
            {probes.length === 0 && (
              <p className="muted">No hay acciones remotas pertinentes para este expediente.</p>
            )}
          </>
        )}
      </div>
      <div className="row pad">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            wm.close(game.mode, `remote:${target}`);
            open('remote');
          }}
        >
          Desconectar
        </button>
      </div>
    </div>
  );
}
