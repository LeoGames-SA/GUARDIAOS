import { readHypothesis } from './board';
import { caseView, getCaseDef, outcomeLabel } from './game';
import { mood } from './needs';
import { PAUSES } from './needs';
import type { Content, GameState, Minute, Outcome } from './types';

export interface CaseReport {
  caseId: string;
  number: string;
  title: string;
  outcome: Outcome;
  outcomeText: string;
  /** Causa real: sólo existe en informes de expedientes cerrados. */
  cause: string;
  explanation: string;
  playerHypothesis: string;
  hypothesisMatches: boolean | null;
  /** Si el razonamiento quedó documentado (hipótesis de trabajo con notas conectadas). */
  documented: boolean;
  notesCount: number;
  channel: 'phone' | 'email' | 'auto';
  found: string[];
  missing: string[];
  interventions: string[];
  consequences: string[];
  timeUsed: Minute;
  confirmed: boolean;
  trust: number;
  escalation: string | null;
  checklist: { text: string; done: boolean }[];
}

/** Hipótesis que corresponde a cada variante (por convención: `variant.world.hyp`). */
export function caseReport(content: Content, state: GameState, caseId: string): CaseReport | null {
  const cs = state.cases[caseId];
  if (!cs || cs.status !== 'closed' || !cs.outcome) return null;
  const def = getCaseDef(content, caseId);
  const variant = def.variants.find((v) => v.id === cs.variantId)!;
  const probesById = new Map(def.probes.map((p) => [p.id, p]));
  const ran = new Set(cs.runs.map((r) => r.probeId));
  const trueHyp = typeof variant.world.hyp === 'string' ? variant.world.hyp : null;
  const hyp = cs.workingHyp ? def.hypotheses.find((h) => h.id === cs.workingHyp) : null;
  let playerHypothesis = 'No registraste una hipótesis de trabajo en la pizarra.';
  if (hyp) {
    const r = readHypothesis(def, cs, hyp.id);
    playerHypothesis = `${hyp.label} (respaldo ${r.level})`;
  }
  const view = caseView(cs);
  return {
    caseId,
    number: def.number,
    title: def.title,
    outcome: cs.outcome,
    outcomeText: outcomeLabel(cs.outcome),
    cause: variant.cause,
    explanation: variant.explanation,
    playerHypothesis,
    hypothesisMatches: hyp && trueHyp ? hyp.id === trueHyp : null,
    documented: Boolean(hyp) && cs.links.some((l) => l.hypId === hyp?.id),
    notesCount: cs.notes.length,
    channel: def.channel,
    found: variant.keyProbes.filter((p) => ran.has(p)).map((p) => probesById.get(p)?.label ?? p),
    missing: variant.keyProbes.filter((p) => !ran.has(p)).map((p) => probesById.get(p)?.label ?? p),
    interventions: cs.notes.filter((n) => n.kind === 'tried').map((n) => n.text),
    consequences: [...cs.consequences],
    timeUsed: (cs.closedAt ?? state.minute) - (cs.takenAt ?? cs.arrivedAt ?? 0),
    confirmed: cs.confirmed,
    trust: cs.trust,
    escalation:
      cs.outcome === 'escalated'
        ? `${cs.escalationAppropriate ? 'Escalamiento apropiado' : 'Escalamiento evitable'}: ${def.escalation.explain(view)}`
        : null,
    checklist: (def.checklist ?? [])
      .filter((c) => !c.variants || c.variants.includes(cs.variantId))
      .map((c) => ({ text: c.text, done: ran.has(c.probe) })),
  };
}

export interface NightSummary {
  reports: CaseReport[];
  resolved: number;
  deadlinesMissed: number;
  pauses: { label: string; count: number; minutes: Minute }[];
  mood: string;
  needs: GameState['needs'];
  unlockSecondMonitor: boolean;
  selfCare: string;
}

/** Condición de mejora: al menos dos expedientes resueltos y confirmados en la noche. */
export const UNLOCK_RULE =
  'Resolver y verificar al menos dos expedientes de la noche habilita un segundo monitor.';

export function nightSummary(content: Content, state: GameState): NightSummary {
  const reports = Object.keys(state.cases)
    .map((id) => caseReport(content, state, id))
    .filter((r): r is CaseReport => r !== null);
  const resolved = reports.filter((r) => r.outcome === 'verified' || r.outcome === 'costly').length;
  const byKind = new Map<string, { label: string; count: number; minutes: Minute }>();
  for (const p of state.pauses) {
    const entry = byKind.get(p.kind) ?? { label: PAUSES[p.kind].label, count: 0, minutes: 0 };
    entry.count += 1;
    entry.minutes += p.minutes;
    byKind.set(p.kind, entry);
  }
  const pauses = [...byKind.values()];
  const rest = pauses.filter((p) => p.label !== PAUSES.ball.label).reduce((s, p) => s + p.minutes, 0);
  const selfCare =
    pauses.length === 0
      ? 'Nico no se tomó ninguna pausa en toda la noche.'
      : rest >= 25
        ? `Nico se tomó ${rest} minutos de pausa entre urgencias.`
        : `Nico apenas paró ${rest} minutos.`;
  return {
    reports,
    resolved,
    deadlinesMissed: Object.values(state.cases).filter((c) => c.deadlinePassed).length,
    pauses,
    mood: mood(state.needs),
    needs: state.needs,
    unlockSecondMonitor: resolved >= 2,
    selfCare,
  };
}
