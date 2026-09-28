import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../../application/context';
import { CONTENT } from '../../content';
import { artInfo } from '../../content/station';
import { briefReading, readHypothesis, relationOf } from '../../engine/board';
import { clock } from '../../engine/time';
import type { GameState, Note, NoteKind, Relation } from '../../engine/types';
import { Panel } from '../common/Panel';

const COLUMNS: { kind: NoteKind; title: string }[] = [
  { kind: 'said', title: 'Dijo la persona' },
  { kind: 'checked', title: 'Comprobé' },
  { kind: 'tried', title: 'Intenté' },
];
const REL_TEXT: Record<Relation, string> = {
  supports: 'apoya',
  contradicts: 'contradice',
  neutral: 'no distingue',
};

interface Thread {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  rel: Relation;
}

/**
 * Pizarra física: notas con chinches y conexiones a la hipótesis elegida.
 * Las relaciones vienen de lo observado en cada prueba, nunca de la causa oculta.
 */
export function BoardPanel({ game, onClose }: { game: GameState; onClose: () => void }) {
  const store = useStore();
  // Expediente a la vista: el activo por defecto; los archivados se consultan sin modificarlos.
  const [archivedView, setArchivedView] = useState<string | null>(null);
  const archived = Object.values(game.cases).filter((c) => c.status === 'closed' && c.notes.length > 0);
  const viewId = archivedView && game.cases[archivedView]?.status === 'closed' ? archivedView : game.focusId;
  const cs = viewId ? game.cases[viewId] : null;
  const def = cs ? CONTENT.cases[cs.id]! : null;
  const readOnly = cs?.status === 'closed';
  const [sel, setSel] = useState<string | null>(cs?.workingHyp ?? def?.hypotheses[0]?.id ?? null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hypPin = useRef<HTMLSpanElement>(null);
  const pins = useRef(new Map<string, HTMLSpanElement>());
  const [threads, setThreads] = useState<Thread[]>([]);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const hypId = sel && def?.hypotheses.some((h) => h.id === sel) ? sel : (def?.hypotheses[0]?.id ?? null);
  const links = cs && hypId ? cs.links.filter((l) => l.hypId === hypId) : [];
  const linkKey = links.map((l) => l.noteId).join(',');

  // Hilos entre centros de anclajes DOM, medidos en el mismo contenedor; se recalculan al cambiar tamaño o zoom.
  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root || !cs) return;
    const measure = () => {
      const base = root.getBoundingClientRect();
      const hp = hypPin.current?.getBoundingClientRect();
      const next: Thread[] = [];
      if (hp) {
        for (const l of cs.links.filter((x) => x.hypId === hypId)) {
          const el = pins.current.get(l.noteId);
          const note = cs.notes.find((n) => n.id === l.noteId);
          if (!el || !note) continue;
          const r = el.getBoundingClientRect();
          next.push({
            id: l.noteId,
            x1: r.left + r.width / 2 - base.left,
            y1: r.top + r.height * 0.28 - base.top,
            x2: hp.left + hp.width / 2 - base.left,
            y2: hp.top + hp.height * 0.28 - base.top,
            rel: relationOf(note, hypId!),
          });
        }
      }
      setBox({ w: root.scrollWidth, h: root.scrollHeight });
      setThreads(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener('resize', measure);
    // La apertura escala el panel: al terminar la animación se vuelve a medir.
    const panel = root.closest('.panel');
    panel?.addEventListener('animationend', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      panel?.removeEventListener('animationend', measure);
    };
  }, [cs, hypId, linkKey]);

  const tabs = (
    <nav className="board-tabs" aria-label="Expedientes de la pizarra">
      {game.activeIds.map((id) => (
        <button
          key={id}
          type="button"
          className="board-tab"
          aria-pressed={!archivedView && game.focusId === id}
          onClick={() => {
            setArchivedView(null);
            store.dispatch({ type: 'focus', caseId: id });
          }}
        >
          {CONTENT.cases[id]!.number} · {CONTENT.cases[id]!.title}
        </button>
      ))}
      {archived.length > 0 && (
        <span className="board-tabs-arch">
          <span className="small">Archivados:</span>
          {archived.map((c) => (
            <button
              key={c.id}
              type="button"
              className="board-tab arch"
              aria-pressed={archivedView === c.id}
              onClick={() => setArchivedView(c.id)}
            >
              {CONTENT.cases[c.id]!.number}
            </button>
          ))}
        </span>
      )}
    </nav>
  );

  if (!cs || !def) {
    return (
      <Panel title="Pizarra de pruebas" onClose={onClose} className="board-panel" actions={tabs}>
        <div className="corkframe" style={{ backgroundImage: `url(${artInfo('corkboard').file})` }}>
          <div className="board-empty">
            <div className="paper-note empty-note" style={{ '--tilt': '-2deg' } as CSSProperties}>
              <span className="pin">
                <img src={artInfo('pushpin').file} alt="" />
              </span>
              <b>Sin expediente activo</b>
              <p>
                Cuando tomes un caso, acá van a aparecer papelitos: lo que dijo la persona, lo que comprobaste
                y lo que intentaste. Después los conectás con hilo a una hipótesis.
              </p>
            </div>
            {archived.length > 0 && (
              <div className="paper-note arch-note" style={{ '--tilt': '1.5deg' } as CSSProperties}>
                <span className="pin">
                  <img src={artInfo('pushpin').file} alt="" />
                </span>
                <b>Expedientes archivados</b>
                <ul className="plain">
                  {archived.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="linkish" onClick={() => setArchivedView(c.id)}>
                        #{CONTENT.cases[c.id]!.number} · {CONTENT.cases[c.id]!.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Panel>
    );
  }

  const hyp = def.hypotheses.find((h) => h.id === hypId)!;
  const reading = readHypothesis(def, cs, hyp.id);
  const linked = new Set(links.map((l) => l.noteId));
  const toggle = (n: Note) =>
    !readOnly &&
    store.dispatch({
      type: linked.has(n.id) ? 'unlink' : 'link',
      caseId: cs.id,
      noteId: n.id,
      hypId: hyp.id,
    });

  return (
    <Panel
      title={
        <>
          Pizarra · {def.number}{' '}
          <span className="muted small">{readOnly ? 'archivado · sólo lectura' : def.title}</span>
        </>
      }
      onClose={onClose}
      className="board-panel"
      actions={tabs}
    >
      <div className="board corkframe" style={{ backgroundImage: `url(${artInfo('corkboard').file})` }}>
        <aside className="hyps paper-sheet" aria-label="Hipótesis">
          <span className="pin sheet-pin">
            <img src={artInfo('pushpin').file} alt="" />
          </span>
          <h3>1 · Elegí una hipótesis</h3>
          <ul>
            {def.hypotheses.map((h) => {
              const r = readHypothesis(def, cs, h.id);
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    className={`hyp ${hypId === h.id ? 'on' : ''}`}
                    aria-pressed={hypId === h.id}
                    onClick={() => setSel(h.id)}
                  >
                    <span className="hyp-label">
                      {cs.workingHyp === h.id && <span aria-label="hipótesis de trabajo">★ </span>}
                      {h.label}
                    </span>
                    <span className={`lvl lvl-${r.level.replace(' ', '-')}`}>Respaldo: {r.level}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="reading" aria-live="polite">
            <h4>Lectura</h4>
            <p>{briefReading(def, cs, hyp.id)}</p>
            <p className="small muted">
              Apoyan {reading.supports.length} · contradicen {reading.contradicts.length} · no distinguen{' '}
              {reading.neutral.length}
            </p>
          </div>
          {readOnly ? (
            <p className="small">Expediente cerrado: la pizarra queda como registro.</p>
          ) : cs.workingHyp === hyp.id ? (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => store.dispatch({ type: 'setWorking', caseId: cs.id, hypId: null })}
            >
              Dejar de usarla como hipótesis de trabajo
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => store.dispatch({ type: 'setWorking', caseId: cs.id, hypId: hyp.id })}
            >
              Tomar como hipótesis de trabajo
            </button>
          )}
          <p className="small muted">
            2 · Tocá las notas para conectarlas o desconectarlas de la hipótesis elegida.
          </p>
        </aside>

        <div className="cork">
          <div className="cork-content" ref={contentRef}>
            <div className="hyp-card">
              <span className="pin" ref={hypPin}>
                <img src={artInfo('pushpin').file} alt="" />
              </span>
              <b>{hyp.label}</b>
              <small>{hyp.detail}</small>
            </div>
            <div className="note-cols">
              {COLUMNS.map((col) => {
                const notes = cs.notes.filter((n) => n.kind === col.kind);
                return (
                  <section key={col.kind} className={`note-col col-${col.kind}`} aria-label={col.title}>
                    <h4>{col.title}</h4>
                    {notes.length === 0 && <p className="empty">Todavía nada.</p>}
                    {notes.map((n, i) => {
                      const on = linked.has(n.id);
                      const rel = relationOf(n, hyp.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={`note note-${n.kind} ${on ? 'on' : ''}`}
                          aria-pressed={on}
                          aria-disabled={readOnly || undefined}
                          style={{ '--tilt': `${((i * 53) % 5) - 2}deg` } as CSSProperties}
                          onClick={() => toggle(n)}
                          aria-label={`${col.title}: ${n.text}. ${on ? `Conectada: ${REL_TEXT[rel]}.` : 'Sin conectar.'}`}
                        >
                          <span
                            className="pin"
                            ref={(el) => {
                              if (el) pins.current.set(n.id, el);
                              else pins.current.delete(n.id);
                            }}
                          >
                            <img src={artInfo('pushpin').file} alt="" />
                          </span>
                          <span className="note-text">{n.text}</span>
                          <span className="note-meta">
                            {game.mode === 'practice' ? '' : clock(n.at)}
                            {on && <span className={`rel rel-${rel}`}>{REL_TEXT[rel]}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                );
              })}
            </div>
            <svg className="threads" width={box.w} height={box.h} aria-hidden="true">
              {threads.map((t) => {
                const mx = (t.x1 + t.x2) / 2;
                const my = Math.max(t.y1, t.y2) + 30;
                return (
                  <g key={t.id} className={`thread thread-${t.rel}`}>
                    <path d={`M${t.x1},${t.y1} Q${mx},${my} ${t.x2},${t.y2}`} />
                    <circle cx={t.x1} cy={t.y1} r="3" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </Panel>
  );
}
