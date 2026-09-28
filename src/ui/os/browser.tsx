import { useState } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { PROCEDURES } from '../../content/knowledge';
import { artInfo } from '../../content/station';
import { probeCost } from '../../engine/game';
import { clock } from '../../engine/time';
import type { GameState } from '../../engine/types';

/**
 * Navegador de GuardiaOS: sólo sitios internos simulados de Mutual Sur.
 * El estado del portal sale del motor (expediente 003 y hora del turno); abrirlo mientras
 * se investiga ese expediente registra la misma comprobación que en el resto del juego.
 */
const HOME = 'portal.mutualsur.local';
const BOOKMARKS: [string, string][] = [
  ['Portal', HOME],
  ['Estado de servicios', 'estado.mutualsur.local'],
  ['Base de conocimiento', 'kb.mutualsur.local'],
  ['gatitos.local', 'gatitos.local'],
];

type PortalState = 'ok' | 'maintenance' | 'down';

/** Estado real del portal: mantenimiento 00:30–00:36; después, caído hasta que se inicie la aplicación. */
export function portalState(game: GameState): PortalState {
  const c = game.cases.c003;
  if (!c || game.mode === 'practice') return 'ok';
  if (c.world.appRunning === true) return 'ok';
  if (game.minute >= 90 && game.minute < 96) return 'maintenance';
  return game.minute >= 96 ? 'down' : 'ok';
}

function normalize(u: string) {
  return u
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

export function BrowserApp({ game }: { game: GameState; open?: unknown }) {
  const [stack, setStack] = useState<string[]>([HOME]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState(HOME);
  const [reloads, setReloads] = useState(0);
  const url = stack[idx]!;
  const go = (u: string) => {
    const clean = normalize(u) || HOME;
    const next = [...stack.slice(0, idx + 1), clean];
    setStack(next);
    setIdx(next.length - 1);
    setInput(clean);
  };
  const move = (d: number) => {
    const i = Math.min(stack.length - 1, Math.max(0, idx + d));
    setIdx(i);
    setInput(stack[i]!);
  };
  return (
    <div className="app browser">
      <div className="browser-bar">
        <button
          type="button"
          className="nav-btn"
          aria-label="Atrás"
          disabled={idx === 0}
          onClick={() => move(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="nav-btn"
          aria-label="Adelante"
          disabled={idx >= stack.length - 1}
          onClick={() => move(1)}
        >
          →
        </button>
        <button
          type="button"
          className="nav-btn"
          aria-label="Recargar"
          onClick={() => setReloads((r) => r + 1)}
        >
          ⟳
        </button>
        <button type="button" className="nav-btn" aria-label="Inicio" onClick={() => go(HOME)}>
          ⌂
        </button>
        <form
          className="urlbar"
          onSubmit={(e) => {
            e.preventDefault();
            go(input);
          }}
        >
          <label className="sr-only" htmlFor="url">
            Dirección
          </label>
          <input id="url" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
          <button type="submit" className="btn btn-sm">
            Ir
          </button>
        </form>
      </div>
      <nav className="bookmarks" aria-label="Marcadores">
        {BOOKMARKS.map(([label, u]) => (
          <button key={u} type="button" className="bm" onClick={() => go(u)}>
            {u === 'gatitos.local' ? '🐾' : '★'} {label}
          </button>
        ))}
      </nav>
      <div className="page" key={`${url}#${reloads}`}>
        <Site url={url} game={game} go={go} />
      </div>
    </div>
  );
}

function Link({ to, go, children }: { to: string; go: (u: string) => void; children: React.ReactNode }) {
  return (
    <a
      href={`#${to}`}
      className="site-link"
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

function Site({ url, game, go }: { url: string; game: GameState; go: (u: string) => void }) {
  const [host, ...rest] = url.split('/');
  const path = rest.join('/');
  if (host === HOME) return <Portal path={path} game={game} go={go} />;
  if (host === 'estado.mutualsur.local') return <StatusPage game={game} />;
  if (host === 'kb.mutualsur.local') return <KnowledgeBase path={path} go={go} />;
  if (host === 'gatitos.local') return <CatPage game={game} />;
  if (host?.endsWith('.local'))
    return (
      <ErrorPage
        code="DNS"
        title="No se encontró el servidor"
        text={`No existe ningún equipo llamado «${host}» en la red interna. Revisá la dirección.`}
      />
    );
  return (
    <ErrorPage
      code="SIN RED"
      title="Sin conexión externa"
      text={`Esta PC sólo ve sitios internos simulados de Mutual Sur. «${url}» no está disponible desde la mesa de ayuda.`}
    />
  );
}

function ErrorPage({
  code,
  title,
  text,
  extra,
}: {
  code: string;
  title: string;
  text: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className={`site error-page err-${code.toLowerCase().replace(/\s/g, '')}`}>
      <p className="err-code">{code}</p>
      <h3>{title}</h3>
      <p>{text}</p>
      {extra}
    </div>
  );
}

// ------------------------------------------------------------------ portal

const PORTAL_NAV: [string, string][] = [
  ['', 'Inicio'],
  ['turnos', 'Turnos'],
  ['novedades', 'Novedades'],
  ['recibos', 'Recibos'],
  ['salud', 'Estado de la aplicación'],
];

function Portal({ path, game, go }: { path: string; game: GameState; go: (u: string) => void }) {
  const store = useStore();
  const state = portalState(game);
  const c = game.cases.c003;
  const def = CONTENT.cases.c003;
  const investigating = c?.status === 'active' && game.focusId === 'c003' && def;
  const probeId = path === 'salud' ? 't-health' : 't-portal';
  const probe = def?.probes.find((p) => p.id === probeId);
  const known = PORTAL_NAV.some(([p]) => p === path);

  // Mientras se investiga 003, cargar el portal es una comprobación registrada (con su costo).
  if (investigating && probe && c && known) {
    const { cost, reread } = probeCost(game, c, probe);
    if (!reread)
      return (
        <div className="site interstitial">
          <h3>Comprobación del expediente {def.number}</h3>
          <p>
            Cargar esta página registra «{probe.label}» en el expediente {def.number}.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => store.dispatch({ type: 'probe', caseId: 'c003', probeId })}
          >
            Cargar y anotar <span className="cost">· {cost} min</span>
          </button>
        </div>
      );
  }

  if (state === 'maintenance')
    return (
      <ErrorPage
        code="MANTENIMIENTO"
        title="Portal en mantenimiento"
        text="Ventana programada 00:30–00:45: parche de seguridad en SRV-APP-02. Volvé a intentar en unos minutos."
      />
    );
  if (state === 'down')
    return (
      <ErrorPage
        code="503"
        title="Servicio no disponible"
        text="El servidor web respondió, pero no pudo atender el pedido."
        extra={
          <p className="small">
            Este código indica que el servidor web está encendido y contesta. Por sí solo no dice qué falta
            detrás.
            {investigating ? ' ↳ Anotado en la pizarra.' : ''}
          </p>
        }
      />
    );
  if (!known)
    return (
      <ErrorPage code="404" title="Página no encontrada" text={`El portal no tiene la sección «/${path}».`} />
    );

  return (
    <div className="site portal">
      <header className="portal-head">
        <span className="portal-logo" aria-hidden="true">
          MS
        </span>
        <div>
          <b>Portal del Personal</b>
          <small>Mutual Sur · Intranet</small>
        </div>
      </header>
      <nav className="portal-nav" aria-label="Secciones del portal">
        {PORTAL_NAV.map(([p, label]) => (
          <Link key={p} to={p ? `${HOME}/${p}` : HOME} go={go}>
            <span aria-current={p === path ? 'page' : undefined}>{label}</span>
          </Link>
        ))}
      </nav>
      {path === '' && (
        <div className="portal-grid">
          <section className="portal-card notice-card">
            <h4>Avisos</h4>
            <ul>
              <li>Hoy 00:30 · Mantenimiento programado de SRV-APP-02 (parche mensual con reinicio).</li>
              <li>Recordatorio: el cierre operativo de Administración vence a las 00:30.</li>
              <li>Soporte de guardia: interno 2231 o soporte@mutualsur.local.</li>
            </ul>
          </section>
          <section className="portal-card">
            <h4>Accesos rápidos</h4>
            <p>
              <Link to={`${HOME}/turnos`} go={go}>
                Consultar turnos de la semana
              </Link>
            </p>
            <p>
              <Link to={`${HOME}/novedades`} go={go}>
                Cargar novedades del turno
              </Link>
            </p>
            <p>
              <Link to="kb.mutualsur.local" go={go}>
                Base de conocimiento de Soporte
              </Link>
            </p>
          </section>
          <section className="portal-card">
            <h4>Guardia de esta noche</h4>
            <p>Soporte técnico: Nicolás Bentancor · 23:00 a 07:00.</p>
            <p className="small">Sistemas (no presencial) · Seguridad: guardia en garita.</p>
          </section>
        </div>
      )}
      {path === 'turnos' && (
        <section className="portal-card">
          <h4>Turnos de la semana</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Área</th>
                <th>Noche</th>
                <th>Mañana</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Soporte</td>
                <td>N. Bentancor</td>
                <td>L. Ferreyra</td>
              </tr>
              <tr>
                <td>Administración</td>
                <td>E. Suárez (cierre)</td>
                <td>J. Pérez</td>
              </tr>
              <tr>
                <td>Compras</td>
                <td>—</td>
                <td>L. Benítez</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}
      {path === 'novedades' && (
        <section className="portal-card">
          <h4>Novedades del turno</h4>
          <p>
            El turno de la mañana carga aquí sus novedades a primera hora. Sin novedades cargadas esta noche.
          </p>
        </section>
      )}
      {path === 'recibos' && (
        <section className="portal-card">
          <h4>Recibos</h4>
          <p>Los recibos de septiembre estarán disponibles el día 1. Para consultas: rrhh@mutualsur.local.</p>
        </section>
      )}
      {path === 'salud' && (
        <section className="portal-card health">
          <h4>/salud</h4>
          <pre className="doc">{`estado: ok\naplicación: PortalPersonal en ejecución\nbase de datos: ok\nconsultado: ${game.mode === 'practice' ? '—' : clock(game.minute)}`}</pre>
          {investigating && <p className="small">↳ Anotado en la pizarra.</p>}
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ estado de servicios

function StatusPage({ game }: { game: GameState }) {
  const portal = portalState(game);
  const c = game.cases.c003;
  const alertOpen = c && c.status !== 'scheduled';
  const rows: [string, string, string][] = [
    [
      'Portal del Personal',
      portal === 'ok' ? 'Operativo' : portal === 'maintenance' ? 'Mantenimiento' : 'Caído (HTTP 503)',
      portal === 'ok' ? 'ok' : portal === 'maintenance' ? 'warn' : 'bad',
    ],
    ['Correo interno', 'Operativo', 'ok'],
    ['Servidor de archivos', 'Operativo', 'ok'],
    ['Telefonía', 'Operativo', 'ok'],
    ['Impresión', 'Sin sonda configurada', 'none'],
  ];
  return (
    <div className="site status-page">
      <h3>Estado de servicios · Mutual Sur</h3>
      <p className="small">
        Datos del monitor automático, consultados desde la red de sucursales
        {game.mode === 'practice' ? '' : ` a las ${clock(game.minute)}`}.
      </p>
      <ul className="status-list">
        {rows.map(([name, st, tone]) => (
          <li key={name} className={`st-${tone}`}>
            <span className="st-dot" aria-hidden="true" />
            <b>{name}</b>
            <span>{st}</span>
          </li>
        ))}
      </ul>
      <h4>Incidentes</h4>
      {alertOpen ? (
        <p>
          MON-5531 · portal.mutualsur.local · {c.status === 'closed' ? 'resuelto' : 'abierto'} · detectado
          00:52
        </p>
      ) : (
        <p className="muted">Sin incidentes abiertos.</p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ base de conocimiento

function KnowledgeBase({ path, go }: { path: string; go: (u: string) => void }) {
  const id = path.startsWith('articulo/') ? path.slice('articulo/'.length) : null;
  const art = id ? PROCEDURES.find((a) => a.id === id) : null;
  if (id && !art)
    return <ErrorPage code="404" title="Artículo no encontrado" text="Ese artículo no existe en la base." />;
  return (
    <div className="site kb">
      <header className="kb-head">
        <b>Base de conocimiento · Soporte</b>
        <Link to="kb.mutualsur.local" go={go}>
          Índice
        </Link>
      </header>
      {art ? (
        <article>
          <h3>{art.title}</h3>
          {art.body.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
          <p className="small muted">Etiquetas: {art.tags.join(', ')}</p>
        </article>
      ) : (
        <ul className="kb-index">
          {PROCEDURES.map((a) => (
            <li key={a.id}>
              <Link to={`kb.mutualsur.local/articulo/${a.id}`} go={go}>
                {a.title}
              </Link>
              <small>{a.body[0]}</small>
            </li>
          ))}
        </ul>
      )}
      <p className="small muted">Página interna · enlace no oficial del equipo: gatitos.local</p>
    </div>
  );
}

// ------------------------------------------------------------------ gatito

function CatPage({ game }: { game: GameState }) {
  const store = useStore();
  return (
    <div className="site cat-site">
      <h3>gatitos.local · «Michi de la guardia»</h3>
      <p className="small muted">Página no oficial del equipo. Ilustración local, sin conexión externa.</p>
      <div className="cat-frame">
        <img
          className="cat"
          src={artInfo('cat-easter-egg').file}
          alt="Un gatito naranja durmiendo hecho un ovillo"
        />
      </div>
      {game.mode === 'campaign' ? (
        <button type="button" className="btn" onClick={() => store.dispatch({ type: 'pause', kind: 'cat' })}>
          Quedarse mirándolo un minuto{' '}
          <span className="cost">· 1 min{game.catClaimed ? '' : ' · estrés −5 (una vez por noche)'}</span>
        </button>
      ) : (
        <p className="small">En la práctica el reloj no corre: mirálo todo lo que quieras.</p>
      )}
    </div>
  );
}
