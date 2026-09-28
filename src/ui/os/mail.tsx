import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { probeBlockReason, probeCost } from '../../engine/game';
import { clock } from '../../engine/time';
import type { CaseDef, CaseState, GameState, MailMessage, ProbeDef } from '../../engine/types';

/** Estado leído/no leído: interfaz, no partida. Se recuerda por partida (modo + semilla). */
function readKey(game: GameState) {
  return `tdg.correo.leidos.${game.mode}.${game.seed}`;
}
function loadRead(game: GameState): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(readKey(game)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

type Folder = 'in' | 'out' | 'drafts';
interface Item {
  msg: MailMessage;
  caseId: string;
}

export function MailApp({ game }: { game: GameState; open?: unknown }) {
  const store = useStore();
  const [folder, setFolder] = useState<Folder>('in');
  const [sel, setSel] = useState<string | null>(null);
  const [read, setRead] = useState<Set<string>>(() => loadRead(game));
  const [viewer, setViewer] = useState<{ name: string; description: string } | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLElement | null>(null);

  const all = useMemo(() => {
    const out: Item[] = [];
    for (const cs of Object.values(game.cases))
      for (const m of cs.messages) out.push({ msg: m, caseId: cs.id });
    return out.sort((a, b) => b.msg.at - a.msg.at || b.msg.id.localeCompare(a.msg.id));
  }, [game.cases]);
  const inbox = all.filter((i) => !i.msg.outgoing);
  const sent = all.filter((i) => i.msg.outgoing);
  const draftCases = Object.values(game.cases).filter(
    (c) => c.status !== 'closed' && c.status !== 'scheduled' && CONTENT.cases[c.id]!.channel === 'email',
  );
  const drafts = draftCases.flatMap((cs) =>
    CONTENT.cases[cs.id]!.probes.filter((p) => p.app === 'mail' && !probeCost(game, cs, p).reread).map(
      (p) => ({ cs, p }),
    ),
  );
  const list = folder === 'in' ? inbox : folder === 'out' ? sent : [];
  const current = all.find((i) => i.msg.id === sel) ?? (folder === 'drafts' ? null : (list[0] ?? null));
  const unread = inbox.filter((i) => !read.has(i.msg.id)).length;

  // Marcar como leído sólo al abrirlo (la vista previa automática no cuenta).
  useEffect(() => {
    if (!current || sel !== current.msg.id || read.has(current.msg.id)) return;
    const next = new Set(read).add(current.msg.id);
    setRead(next);
    try {
      localStorage.setItem(readKey(game), JSON.stringify([...next]));
    } catch {
      /* sin almacenamiento */
    }
  }, [current, read, game, sel]);

  // Al abrir un mensaje, el panel empieza en su encabezado (no al final ni a mitad de otro).
  useLayoutEffect(() => {
    const pane = paneRef.current;
    const el = selRef.current;
    if (!pane || !el) return;
    const head = pane.querySelector<HTMLElement>('.thread-head');
    // El encabezado de la conversación queda fijo arriba; el mensaje empieza justo debajo.
    pane.scrollTop = Math.max(0, el.offsetTop - (head?.offsetHeight ?? 0) - 8);
  }, [current?.msg.id]);

  const thread = current
    ? all
        .filter((i) => i.caseId === current.caseId)
        .slice()
        .reverse()
    : [];
  const cs = current ? game.cases[current.caseId]! : null;
  const def = cs ? CONTENT.cases[cs.id]! : null;

  const afterSend = () => {
    const g = store.game;
    if (!g || !cs) return;
    const latest = g.cases[cs.id]!.messages.filter((m) => !m.outgoing).at(-1);
    setFolder('in');
    setSel(latest?.id ?? null);
  };

  return (
    <div className={`app mail-app ${sel ? 'has-sel' : ''}`}>
      <div className="mail-side">
        <div className="mail-folders" role="tablist" aria-label="Carpetas">
          {(
            [
              ['in', `Recibidos${unread ? ` (${unread})` : ''}`],
              ['out', `Enviados (${sent.length})`],
              ['drafts', `Borradores (${drafts.length})`],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={folder === f}
              onClick={() => {
                setFolder(f);
                setSel(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="list mail-list" role="listbox" aria-label="Mensajes">
          {folder !== 'drafts' && list.length === 0 && <li className="muted small pad">No hay mensajes.</li>}
          {folder !== 'drafts' &&
            list.map(({ msg, caseId }) => {
              const isUnread = !msg.outgoing && !read.has(msg.id);
              return (
                <li key={msg.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={current?.msg.id === msg.id}
                    className={`list-row mail-row ${isUnread ? 'unread' : ''}`}
                    onClick={() => setSel(msg.id)}
                  >
                    <span className="mail-row-top">
                      {isUnread && <span className="dot" aria-label="no leído" />}
                      <b>{msg.outgoing ? `Para: ${msg.to}` : msg.from.replace(/<.*>/, '').trim()}</b>
                      <span className="mail-time">{clock(msg.at)}</span>
                    </span>
                    <span className="mail-subj">{msg.subject}</span>
                    <small>Expediente {CONTENT.cases[caseId]!.number}</small>
                  </button>
                </li>
              );
            })}
          {folder === 'drafts' && drafts.length === 0 && (
            <li className="muted small pad">
              No hay borradores: las respuestas aparecen al tomar un expediente de correo.
            </li>
          )}
          {folder === 'drafts' &&
            drafts.map(({ cs: c, p }) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="list-row mail-row draft"
                  onClick={() => {
                    const first = c.messages.find((m) => !m.outgoing);
                    setFolder('in');
                    setSel(first?.id ?? null);
                  }}
                >
                  <span className="mail-row-top">
                    <b>Borrador · {CONTENT.cases[c.id]!.contact.short}</b>
                  </span>
                  <span className="mail-subj">{p.label}</span>
                  <small>Expediente {CONTENT.cases[c.id]!.number}</small>
                </button>
              </li>
            ))}
        </ul>
      </div>

      <div className="mail-pane" ref={paneRef}>
        {!current || !cs || !def ? (
          <p className="muted pad">
            {folder === 'drafts' ? 'Elegí un borrador para abrir su conversación.' : 'Seleccioná un mensaje.'}
          </p>
        ) : (
          <>
            <header className="thread-head">
              <button type="button" className="btn btn-sm mail-back" onClick={() => setSel(null)}>
                ← Mensajes
              </button>
              <div>
                <h3>{def.message?.subject ?? def.title}</h3>
                <small>
                  Conversación del expediente {def.number} · {thread.length} mensaje
                  {thread.length > 1 ? 's' : ''}
                </small>
              </div>
              {cs.status === 'pending' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => store.dispatch({ type: 'take', caseId: cs.id })}
                >
                  Tomar expediente {def.number}
                </button>
              )}
              {cs.status === 'closed' && <span className="tag">cerrado</span>}
            </header>
            {thread.map(({ msg }) => (
              <article
                key={msg.id}
                className={`mail-msg ${msg.outgoing ? 'sent' : 'recv'} ${current.msg.id === msg.id ? 'current' : ''}`}
                ref={current.msg.id === msg.id ? (el) => void (selRef.current = el) : undefined}
                aria-label={`${msg.outgoing ? 'Enviado a' : 'Recibido de'} ${msg.outgoing ? msg.to : msg.from}, ${clock(msg.at)}`}
              >
                <header className="mail-msg-head">
                  <span className={`tag ${msg.outgoing ? 'sent-tag' : 'recv-tag'}`}>
                    {msg.outgoing ? 'Enviado' : 'Recibido'}
                  </span>
                  <b>{msg.outgoing ? 'Nicolás Bentancor' : msg.from}</b>
                  {!msg.outgoing && msg.from.includes('mutualsur.local') && (
                    <span className="tag known">remitente interno</span>
                  )}
                  <span className="mail-time">{clock(msg.at)}</span>
                </header>
                <p className="mail-meta small">
                  Para: {msg.to} · Asunto: {msg.subject}
                </p>
                {msg.body.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
                {msg.attachments?.map((a) => (
                  <button key={a.name} type="button" className="attach-chip" onClick={() => setViewer(a)}>
                    📎 {a.name} <span className="small">· abrir</span>
                  </button>
                ))}
              </article>
            ))}
            {def.channel === 'email' && cs.status !== 'closed' && (
              <section className="replies" aria-label="Borradores de respuesta">
                <h4>Responder</h4>
                {cs.status === 'pending' && (
                  <p className="small muted">Tomá el expediente para poder responder.</p>
                )}
                {def.probes
                  .filter((p) => p.app === 'mail')
                  .map((p) => (
                    <MailDraft key={p.id} game={game} cs={cs} def={def} probe={p} onSent={afterSend} />
                  ))}
              </section>
            )}
          </>
        )}
      </div>
      {viewer && <AttachmentViewer att={viewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

function MailDraft({
  game,
  cs,
  def,
  probe,
  onSent,
}: {
  game: GameState;
  cs: CaseState;
  def: CaseDef;
  probe: ProbeDef;
  onSent: () => void;
}) {
  const store = useStore();
  const blocked = probeBlockReason(game, def, cs, probe);
  const { cost, reread } = probeCost(game, cs, probe);
  if (reread) return null;
  return (
    <div className="reply">
      <p className="reply-label small">Borrador · {probe.label}</p>
      <p className="reply-text">{probe.line}</p>
      {blocked ? (
        <p className="small muted">🔒 {blocked}</p>
      ) : (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            store.dispatch({ type: 'probe', caseId: cs.id, probeId: probe.id });
            onSent();
          }}
        >
          Enviar{' '}
          <span className="cost">
            · {game.mode === 'practice' ? 'sin reloj' : `${cost} min (incluye esperar la respuesta)`}
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Visor de adjuntos. Una captura de error se muestra como una ventana simulada legible,
 * con un texto equivalente accesible.
 */
function AttachmentViewer({
  att,
  onClose,
}: {
  att: { name: string; description: string };
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const isShot = /\.(png|jpe?g)$/i.test(att.name);
  const quoted = /«([^»]+)»/.exec(att.description)?.[1] ?? att.description;
  const [title, ...rest] = quoted.split(/(?<=accesible\.)\s+|(?<=\.)\s+(?=No tiene)/);
  return (
    <div
      className="attach-viewer"
      role="dialog"
      aria-label={`Adjunto ${att.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="attach-bar">
        <b>📎 {att.name}</b>
        <button ref={closeRef} type="button" className="btn btn-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
      {isShot ? (
        <div className="shot" role="img" aria-label={att.description}>
          <div className="shot-win">
            <div className="shot-title">Explorador de archivos</div>
            <div className="shot-body">
              <span className="shot-icon" aria-hidden="true">
                ⛔
              </span>
              <div>
                <p>
                  <b>{title}</b>
                </p>
                {rest.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            </div>
            <div className="shot-foot">
              <span className="shot-btn">Aceptar</span>
            </div>
          </div>
          <p className="small shot-caption">Captura adjunta por el remitente (simulada).</p>
        </div>
      ) : (
        <pre className="doc">{att.description}</pre>
      )}
    </div>
  );
}
