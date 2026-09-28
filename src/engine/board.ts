import type { CaseDef, CaseState, HypothesisDef, Note, Relation } from './types';

/**
 * Lectura de la pizarra. Sólo usa notas conocidas y sus relaciones observadas;
 * nunca la variante oculta del caso.
 */
export function relationOf(note: Note, hypId: string): Relation {
  return note.relations[hypId] ?? 'neutral';
}

const weight = (n: Note) => (n.kind === 'said' ? 1 : 2);

export interface HypothesisReading {
  hyp: HypothesisDef;
  score: number;
  supports: Note[];
  contradicts: Note[];
  neutral: Note[];
  level: 'sin respaldo' | 'débil' | 'moderado' | 'fuerte' | 'contradicha';
  missing: string[];
  /** Notas conocidas (no necesariamente conectadas) que la contradicen con una comprobación. */
  openContradictions: Note[];
}

export function readHypothesis(def: CaseDef, cs: CaseState, hypId: string): HypothesisReading {
  const hyp = def.hypotheses.find((h) => h.id === hypId);
  if (!hyp) throw new Error(`Hipótesis desconocida: ${hypId}`);
  const linked = cs.links
    .filter((l) => l.hypId === hypId)
    .map((l) => cs.notes.find((n) => n.id === l.noteId))
    .filter((n): n is Note => Boolean(n));
  const supports = linked.filter((n) => relationOf(n, hypId) === 'supports');
  const contradicts = linked.filter((n) => relationOf(n, hypId) === 'contradicts');
  const neutral = linked.filter((n) => relationOf(n, hypId) === 'neutral');
  const score = supports.reduce((s, n) => s + weight(n), 0) - contradicts.reduce((s, n) => s + weight(n), 0);
  const firmContra = contradicts.some((n) => n.kind !== 'said');
  let level: HypothesisReading['level'] = 'sin respaldo';
  if (firmContra && score <= 0) level = 'contradicha';
  else if (score >= 5) level = 'fuerte';
  else if (score >= 3) level = 'moderado';
  else if (score >= 1) level = 'débil';
  const ran = new Set(cs.runs.map((r) => r.probeId));
  const missing = hyp.pertinent.filter((p) => !ran.has(p.probe)).map((p) => p.what);
  const openContradictions = cs.notes.filter(
    (n) => n.kind !== 'said' && relationOf(n, hypId) === 'contradicts' && !contradicts.includes(n),
  );
  return { hyp, score, supports, contradicts, neutral, level, missing, openContradictions };
}

/** Umbral para decir «encontré una causa probable». */
export function hasProbableCause(def: CaseDef, cs: CaseState): boolean {
  if (!cs.workingHyp) return false;
  const r = readHypothesis(def, cs, cs.workingHyp);
  return r.score >= 3 && r.contradicts.length === 0;
}

export function briefReading(def: CaseDef, cs: CaseState, hypId: string): string {
  const r = readHypothesis(def, cs, hypId);
  const parts: string[] = [];
  if (!r.supports.length && !r.contradicts.length && !r.neutral.length) {
    parts.push('Todavía no conectaste notas a esta hipótesis.');
  } else {
    const firm = r.supports.filter((n) => n.kind !== 'said').length;
    const said = r.supports.length - firm;
    if (r.supports.length)
      parts.push(
        `La apoyan ${r.supports.length} nota${r.supports.length > 1 ? 's' : ''}` +
          (said ? ` (${said} sólo por lo que dijo la persona)` : '') +
          '.',
      );
    if (r.contradicts.length)
      parts.push(`La contradicen ${r.contradicts.length} nota${r.contradicts.length > 1 ? 's' : ''}.`);
    if (r.neutral.length)
      parts.push(`${r.neutral.length} conectada${r.neutral.length > 1 ? 's' : ''} no distingue.`);
  }
  if (r.openContradictions.length)
    parts.push('Hay una comprobación en la pizarra que no encaja con ella: revisala.');
  if (r.missing.length) parts.push(`Falta comprobar: ${r.missing.join('; ')}.`);
  else parts.push('Las comprobaciones pertinentes ya están hechas.');
  return parts.join(' ');
}
