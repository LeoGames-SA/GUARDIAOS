import { hasProbableCause } from './board';
import { adjustedCost, clamp, drift, INITIAL_NEEDS, PAUSES } from './needs';
import { SHIFT_END } from './time';
import type {
  Action,
  CaseDef,
  CaseState,
  CaseView,
  Content,
  GameEvent,
  GameState,
  Minute,
  NoteKind,
  ProbeDef,
  ScheduledEvent,
  StepResult,
  World,
} from './types';

export const MAX_ACTIVE = 2;
export const MISSED_CALL_AFTER = 10;
/** Minutos simulados de espera tolerados antes de que la persona se impaciente. */
export const HOLD_PATIENCE = 15;
const TRUST_START = 3;
const TRUST_MAX = 5;

export interface NewGameOptions {
  mode: 'campaign' | 'practice';
  nightId: string;
  seed: number;
}

export function caseView(cs: CaseState): CaseView {
  return {
    world: cs.world,
    flags: cs.flags,
    done: (id) => cs.runs.some((r) => r.probeId === id),
    trust: cs.trust,
  };
}

export function getCaseDef(content: Content, id: string): CaseDef {
  const def = content.cases[id];
  if (!def) throw new Error(`Caso desconocido: ${id}`);
  return def;
}

export function createGame(content: Content, opts: NewGameOptions): GameState {
  const night = content.nights[opts.nightId];
  if (!night) throw new Error(`Noche desconocida: ${opts.nightId}`);
  const state: GameState = {
    schema: 'turno-de-guardia/game',
    version: 1,
    mode: opts.mode,
    nightId: night.id,
    seed: opts.seed,
    minute: 0,
    seq: 0,
    cases: {},
    activeIds: [],
    focusId: null,
    events: [],
    needs: { ...INITIAL_NEEDS },
    pauses: [],
    lastBallAt: null,
    catClaimed: false,
    call: null,
    incoming: null,
    history: [],
    learned: [],
    ended: false,
  };
  for (const id of night.cases) {
    const def = getCaseDef(content, id);
    const variantId = def.pickVariant(opts.seed);
    const variant = def.variants.find((v) => v.id === variantId);
    if (!variant) throw new Error(`Variante inválida ${variantId} en ${id}`);
    state.cases[id] = {
      id,
      variantId,
      status: 'scheduled',
      arrivedAt: null,
      takenAt: null,
      closedAt: null,
      world: { ...variant.world },
      version: 0,
      notes: [],
      runs: [],
      links: [],
      workingHyp: null,
      trust: TRUST_START,
      flags: [],
      consequences: [],
      wrong: 0,
      deadlinePassed: false,
      confirmed: false,
      contactKnown: def.knownAtStart,
      missedCalls: 0,
      messages: [],
      outcome: null,
      escalationAppropriate: null,
      reassured: [],
    };
    schedule(state, { at: def.arrival, kind: 'arrival', caseId: id });
    if (def.deadline !== null && opts.mode === 'campaign')
      schedule(state, { at: def.deadline, kind: 'deadline', caseId: id });
    if (opts.mode === 'campaign')
      for (const cb of def.callbacks ?? [])
        schedule(state, { at: cb.at, kind: 'callback', caseId: id, lines: cb.lines });
  }
  if (opts.mode === 'campaign') schedule(state, { at: night.end, kind: 'end', caseId: null });
  const events: GameEvent[] = [];
  processDue(content, state, events);
  return state;
}

function nextId(state: GameState, prefix: string): string {
  state.seq += 1;
  return `${prefix}${state.seq}`;
}

function schedule(state: GameState, ev: Omit<ScheduledEvent, 'id' | 'done'>) {
  state.events.push({ ...ev, id: nextId(state, 'ev'), done: false });
}

function history(
  state: GameState,
  caseId: string | null,
  origin: string,
  device: string,
  action: string,
  result: string,
  cost: Minute,
) {
  state.history.push({
    id: nextId(state, 'h'),
    at: state.minute,
    caseId,
    origin,
    device,
    action,
    result,
    cost,
  });
}

/** Ejecuta en orden los eventos con hora ≤ minuto actual. */
function processDue(content: Content, state: GameState, events: GameEvent[]) {
  for (;;) {
    const due = state.events
      .filter((e) => !e.done && e.at <= state.minute)
      .sort((a, b) => a.at - b.at || Number(a.id.slice(2)) - Number(b.id.slice(2)))[0];
    if (!due) return;
    due.done = true;
    fire(content, state, due, events);
  }
}

function isSettled(def: CaseDef, cs: CaseState): boolean {
  return cs.status === 'closed' || (cs.confirmed && def.isFixed(cs.world));
}

function fire(content: Content, state: GameState, ev: ScheduledEvent, events: GameEvent[]) {
  const cs = ev.caseId ? state.cases[ev.caseId] : undefined;
  const def = ev.caseId ? getCaseDef(content, ev.caseId) : undefined;
  switch (ev.kind) {
    case 'arrival': {
      if (!cs || !def) return;
      cs.arrivedAt = state.minute;
      events.push({ type: 'arrival', caseId: cs.id });
      if (def.channel === 'phone') {
        cs.status = 'pending';
        ring(
          state,
          { caseId: cs.id, reason: 'new', since: state.minute, eventKey: ev.id, lines: [] },
          events,
        );
      } else {
        cs.status = 'pending';
        if (def.message) cs.messages.push({ ...def.message, at: state.minute });
        history(
          state,
          cs.id,
          def.channel === 'email' ? 'Correo' : 'Monitor',
          def.contact.device,
          'Llegó ' + def.title,
          'En bandeja de pendientes',
          0,
        );
      }
      return;
    }
    case 'callback': {
      if (!cs || !def || isSettled(def, cs) || cs.arrivedAt === null) return;
      if (state.call || state.incoming) {
        history(
          state,
          cs.id,
          'Teléfono',
          def.contact.device,
          `${def.contact.short} intentó llamar`,
          'La línea estaba ocupada',
          0,
        );
        return;
      }
      ring(
        state,
        { caseId: cs.id, reason: 'callback', since: state.minute, eventKey: ev.id, lines: ev.lines ?? [] },
        events,
      );
      return;
    }
    case 'deadline': {
      if (!cs || !def || isSettled(def, cs) || cs.outcome) return;
      cs.deadlinePassed = true;
      cs.consequences.push(def.deadlineText);
      state.needs = { ...state.needs, stress: clamp(state.needs.stress + 8) };
      history(
        state,
        cs.id,
        'Turno',
        def.contact.device,
        `Venció el plazo de ${def.number}`,
        def.deadlineText,
        0,
      );
      events.push({ type: 'deadline', caseId: cs.id, text: def.deadlineText });
      return;
    }
    case 'world': {
      if (!cs || !ev.world) return;
      if (applyWorld(cs, ev.world)) {
        history(state, cs.id, 'Sistema', def?.contact.device ?? '', 'Cambio en el entorno', ev.text ?? '', 0);
        events.push({ type: 'world', caseId: cs.id, text: ev.text ?? '' });
      }
      return;
    }
    case 'end': {
      endShift(content, state, events);
      return;
    }
  }
}

function ring(state: GameState, incoming: NonNullable<GameState['incoming']>, events: GameEvent[]) {
  state.incoming = incoming;
  events.push({ type: 'incoming', caseId: incoming.caseId, reason: incoming.reason });
}

function endShift(content: Content, state: GameState, events: GameEvent[]) {
  if (state.ended) return;
  state.ended = true;
  state.call = null;
  state.incoming = null;
  for (const cs of Object.values(state.cases)) {
    if (cs.status === 'closed' || cs.status === 'scheduled') continue;
    cs.outcome = 'unresolved';
    cs.status = 'closed';
    cs.closedAt = state.minute;
    const def = getCaseDef(content, cs.id);
    history(
      state,
      cs.id,
      'Turno',
      def.contact.device,
      `Traspaso de ${def.number}`,
      'Queda pendiente para el turno mañana',
      0,
    );
  }
  state.activeIds = [];
  state.focusId = null;
  events.push({ type: 'ended' });
}

function applyWorld(cs: CaseState, patch: World): boolean {
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (cs.world[k] !== v) {
      cs.world[k] = v;
      changed = true;
    }
  }
  if (changed) cs.version += 1;
  return changed;
}

/** Avanza el reloj una sola vez, procesando en orden todo lo que atraviesa. */
export function advance(content: Content, state: GameState, minutes: Minute, events: GameEvent[]) {
  if (state.mode === 'practice' || minutes <= 0 || state.ended) return;
  const from = state.minute;
  const target = Math.min(SHIFT_END, state.minute + minutes);
  for (;;) {
    const next = state.events
      .filter((e) => !e.done && e.at <= target)
      .sort((a, b) => a.at - b.at || Number(a.id.slice(2)) - Number(b.id.slice(2)))[0];
    const stop = next ? Math.max(next.at, state.minute) : target;
    checkMissed(content, state, stop, events);
    state.needs = drift(state.needs, stop - state.minute);
    state.minute = stop;
    if (!next || state.ended) break;
    processDue(content, state, events);
    if (state.ended) break;
  }
  checkMissed(content, state, target, events);
  events.unshift({ type: 'time', from, to: state.minute });
}

function checkMissed(content: Content, state: GameState, until: Minute, events: GameEvent[]) {
  const inc = state.incoming;
  if (!inc || until < inc.since + MISSED_CALL_AFTER) return;
  const cs = state.cases[inc.caseId];
  if (!cs) return;
  const def = getCaseDef(content, cs.id);
  state.incoming = null;
  cs.missedCalls += 1;
  cs.trust = clamp(cs.trust - 1, 0, TRUST_MAX);
  if (!cs.flags.includes('voicemail')) cs.flags.push('voicemail');
  if (inc.reason === 'new' && def.opening) {
    // El contestador identifica a la persona: ya se le puede devolver la llamada.
    cs.contactKnown = true;
    cs.messages.push({
      id: nextId(state, 'm'),
      at: state.minute,
      from: `${def.contact.name} (contestador)`,
      to: 'Soporte',
      subject: 'Mensaje de voz',
      body: def.opening.contact,
    });
  }
  history(
    state,
    cs.id,
    'Teléfono',
    def.contact.device,
    'Llamada perdida',
    'Dejó un mensaje en el contestador',
    0,
  );
  events.push({ type: 'missed', caseId: cs.id });
}

// ---------------------------------------------------------------- acciones

export function step(content: Content, prev: GameState, action: Action): StepResult {
  const state: GameState = structuredClone(prev);
  const events: GameEvent[] = [];
  const blocked = (reason: string): StepResult => ({ state: prev, events: [{ type: 'blocked', reason }] });
  if (state.ended && action.type !== 'focus') return blocked('El turno ya terminó.');

  switch (action.type) {
    case 'answerCall': {
      const inc = state.incoming;
      if (!inc) return blocked('No hay ninguna llamada entrante.');
      if (state.call) return blocked('Terminá la llamada actual antes de atender otra.');
      const cs = state.cases[inc.caseId]!;
      const def = getCaseDef(content, cs.id);
      state.incoming = null;
      if (inc.reason === 'new' && def.opening) {
        cs.contactKnown = true;
        state.call = {
          caseId: cs.id,
          reason: 'new',
          eventKey: inc.eventKey,
          lines: [
            { speaker: 'nico', text: def.opening.nico },
            ...def.opening.contact.map((text) => ({ speaker: 'contact' as const, text })),
          ],
        };
        takeCase(state, cs, events);
        history(state, cs.id, 'Teléfono', def.contact.device, 'Atendí la llamada', def.teaser, 0);
      } else {
        state.call = {
          caseId: cs.id,
          reason: 'callback',
          eventKey: inc.eventKey,
          lines: inc.lines.map((text) => ({ speaker: 'contact' as const, text })),
        };
        history(
          state,
          cs.id,
          'Teléfono',
          def.contact.device,
          `Atendí a ${def.contact.short}`,
          'Llamada de seguimiento',
          0,
        );
      }
      return { state, events };
    }
    case 'declineCall': {
      const inc = state.incoming;
      if (!inc) return blocked('No hay ninguna llamada entrante.');
      checkMissed(content, state, inc.since + MISSED_CALL_AFTER, events);
      return { state, events };
    }
    case 'hangUp': {
      if (!state.call) return blocked('No hay llamada en curso.');
      state.call = null;
      return { state, events };
    }
    case 'hold': {
      const call = state.call;
      if (!call || call.ended) return blocked('No hay una conversación en curso.');
      if (call.held) return blocked('La llamada ya está en espera.');
      const def = getCaseDef(content, call.caseId);
      const cs = state.cases[call.caseId]!;
      const who = cs.contactKnown ? def.contact.short : '';
      call.lines.push({
        speaker: 'nico',
        text: `${who ? `${who}, ` : ''}te pongo un momento en espera mientras reviso algo. No cortes, ¿dale?`,
      });
      call.lines.push({ speaker: 'contact', text: 'Dale, espero.' });
      call.held = true;
      call.heldSince = state.minute;
      history(state, cs.id, 'Teléfono', def.contact.device, 'Llamada en espera', 'Auricular en la base', 0);
      return { state, events };
    }
    case 'resume': {
      const call = state.call;
      if (!call?.held) return blocked('No hay una llamada en espera.');
      const def = getCaseDef(content, call.caseId);
      const cs = state.cases[call.caseId]!;
      // La demora se mide en minutos simulados, nunca en tiempo real de lectura.
      const waited = state.minute - (call.heldSince ?? state.minute);
      call.held = false;
      delete call.heldSince;
      call.lines.push({ speaker: 'nico', text: 'Gracias por esperar. Sigo con vos.' });
      let reply = 'Sí, acá estoy.';
      if (waited > HOLD_PATIENCE) {
        reply = 'Uf, ya pensaba que se había cortado…';
        cs.trust = clamp(cs.trust - 1, 0, TRUST_MAX);
      } else if (waited >= 10) reply = 'Sí, acá sigo. ¿Pudiste ver algo?';
      call.lines.push({ speaker: 'contact', text: reply });
      history(
        state,
        cs.id,
        'Teléfono',
        def.contact.device,
        'Retomé la llamada',
        waited ? `Esperó ${waited} min${waited > HOLD_PATIENCE ? ' (se impacientó)' : ''}` : 'Sin demora',
        0,
      );
      return { state, events };
    }
    case 'callContact': {
      const cs = state.cases[action.caseId];
      if (!cs) return blocked('Expediente desconocido.');
      const def = getCaseDef(content, cs.id);
      if (def.channel !== 'phone') return blocked('Este expediente se atiende por su propio canal.');
      if (!cs.contactKnown) return blocked('Todavía no sabés a quién llamar.');
      if (cs.status === 'closed') return blocked('El expediente ya está cerrado.');
      if (state.call) return blocked('Ya estás en una llamada.');
      if (state.incoming) return blocked('Está sonando el teléfono: atendé primero.');
      const cost = state.mode === 'practice' ? 0 : 1;
      const firstContact = cs.status === 'pending';
      state.call = {
        caseId: cs.id,
        reason: 'outgoing',
        eventKey: nextId(state, 'call'),
        lines: firstContact
          ? [
              {
                speaker: 'nico',
                text: `${def.contact.short}, habla Nicolás, de soporte. Recién escucho tu mensaje.`,
              },
              ...(def.opening?.contact.slice(1) ?? []).map((text) => ({ speaker: 'contact' as const, text })),
            ]
          : [
              { speaker: 'nico', text: `${def.contact.short}, habla Nicolás, de soporte.` },
              { speaker: 'contact', text: cs.trust >= 3 ? 'Sí, decime.' : 'Sí… ¿novedades?' },
            ],
      };
      if (cs.flags.includes('voicemail') && cs.status === 'pending') takeCase(state, cs, events);
      history(state, cs.id, 'Teléfono', def.contact.device, `Llamé a ${def.contact.short}`, 'En línea', cost);
      advance(content, state, cost, events);
      return { state, events };
    }
    case 'reassure': {
      const call = state.call;
      if (!call) return blocked('No hay llamada en curso.');
      if (call.held) return blocked('La llamada está en espera: retomala para hablar.');
      if (call.ended) return blocked('La conversación ya terminó.');
      const cs = state.cases[call.caseId]!;
      const def = getCaseDef(content, cs.id);
      let nico: string;
      let key: string;
      if (action.kind === 'urgency') {
        nico = 'Entiendo la urgencia. Todavía estoy comprobando la causa.';
        key = `u:${call.eventKey}`;
      } else if (action.kind === 'evidence') {
        const note = cs.notes.find((n) => n.id === action.noteId && n.kind === 'checked');
        if (!note) return blocked('Elegí una comprobación real de este expediente.');
        nico = `Ya comprobé algo: ${lowerFirst(note.text)}`;
        key = `e:${call.eventKey}`;
      } else {
        if (!hasProbableCause(def, cs))
          return blocked('Todavía no hay respaldo suficiente en la pizarra para decir eso.');
        nico = 'Encontré una causa probable; voy a verificar la solución.';
        key = `p:${call.eventKey}`;
      }
      const fresh = !cs.reassured.includes(key) && !cs.reassured.includes(`any:${call.eventKey}`);
      if (fresh) {
        cs.reassured.push(key, `any:${call.eventKey}`);
        cs.trust = clamp(cs.trust + 1, 0, TRUST_MAX);
      }
      call.lines.push({ speaker: 'nico', text: nico });
      call.lines.push({
        speaker: 'contact',
        text: fresh
          ? action.kind === 'probable'
            ? 'Bueno, eso me tranquiliza. Avisame.'
            : 'Está bien, gracias por avisar.'
          : 'Sí, sí, ya me dijiste.',
      });
      return { state, events };
    }
    case 'take': {
      const cs = state.cases[action.caseId];
      if (!cs || cs.status !== 'pending') return blocked('Ese expediente no está en la bandeja.');
      if (state.activeIds.length >= MAX_ACTIVE)
        return blocked('Ya tenés dos expedientes activos. Cerrá o escalá uno antes de tomar otro.');
      takeCase(state, cs, events);
      state.focusId = cs.id;
      const def = getCaseDef(content, cs.id);
      history(
        state,
        cs.id,
        'Centro de tickets',
        def.contact.device,
        `Tomé el expediente ${def.number}`,
        'Asignado a Nico',
        0,
      );
      return { state, events };
    }
    case 'focus': {
      if (!state.activeIds.includes(action.caseId)) return blocked('Ese expediente no está activo.');
      state.focusId = action.caseId;
      return { state, events };
    }
    case 'probe':
      return runProbe(content, prev, state, action.caseId, action.probeId, action.arg);
    case 'link':
    case 'unlink': {
      const cs = state.cases[action.caseId];
      if (!cs) return blocked('Expediente desconocido.');
      const def = getCaseDef(content, cs.id);
      if (!cs.notes.some((n) => n.id === action.noteId))
        return blocked('Esa nota no pertenece a este expediente.');
      if (!def.hypotheses.some((h) => h.id === action.hypId)) return blocked('Hipótesis desconocida.');
      const exists = cs.links.some((l) => l.noteId === action.noteId && l.hypId === action.hypId);
      if (action.type === 'link' && !exists) cs.links.push({ noteId: action.noteId, hypId: action.hypId });
      if (action.type === 'unlink')
        cs.links = cs.links.filter((l) => !(l.noteId === action.noteId && l.hypId === action.hypId));
      return { state, events };
    }
    case 'setWorking': {
      const cs = state.cases[action.caseId];
      if (!cs) return blocked('Expediente desconocido.');
      const def = getCaseDef(content, cs.id);
      if (action.hypId && !def.hypotheses.some((h) => h.id === action.hypId))
        return blocked('Hipótesis desconocida.');
      cs.workingHyp = action.hypId;
      return { state, events };
    }
    case 'close': {
      const cs = state.cases[action.caseId];
      if (!cs || cs.status !== 'active') return blocked('Sólo se puede cerrar un expediente activo.');
      const def = getCaseDef(content, cs.id);
      if (!def.isFixed(cs.world))
        return blocked(
          'El síntoma sigue presente según lo que sabemos: todavía no se puede cerrar como resuelto.',
        );
      if (!cs.confirmed)
        return blocked(
          def.channel === 'auto'
            ? 'Falta la verificación del canal: revalidar la alerta desde el monitor.'
            : `Falta que ${def.contact.short} confirme que funciona.`,
        );
      for (const need of def.closeNeeds ?? []) if (!cs.flags.includes(need.flag)) return blocked(need.reason);
      const clean = !cs.deadlinePassed && cs.wrong === 0 && cs.consequences.length === 0;
      farewell(state, def, cs, clean);
      finishCase(content, state, cs, clean ? 'verified' : 'costly', events, true);
      return { state, events };
    }
    case 'escalate': {
      const cs = state.cases[action.caseId];
      if (!cs || (cs.status !== 'active' && cs.status !== 'pending'))
        return blocked('Sólo se puede escalar un expediente abierto.');
      const def = getCaseDef(content, cs.id);
      cs.escalationAppropriate = def.escalation.appropriate(caseView(cs));
      const cost = state.mode === 'practice' ? 0 : 3;
      finishCase(content, state, cs, 'escalated', events);
      history(
        state,
        cs.id,
        'Centro de tickets',
        def.contact.device,
        def.escalation.label,
        def.escalation.explain(caseView(cs)),
        cost,
      );
      advance(content, state, cost, events);
      return { state, events };
    }
    case 'pause': {
      if (state.mode === 'practice') return blocked('En la práctica no hay pausas: el reloj no corre.');
      // La pelota se puede usar con la llamada en espera; el resto de las pausas, no.
      if (state.call && !(action.kind === 'ball' && state.call.held))
        return blocked('Terminá la llamada antes de tomarte una pausa.');
      const def = PAUSES[action.kind];
      const res = def.apply(state.needs, {
        lastBallAt: state.lastBallAt,
        minute: state.minute,
        catClaimed: state.catClaimed,
      });
      state.needs = res.needs;
      state.pauses.push({ kind: action.kind, at: state.minute, minutes: def.minutes });
      if (action.kind === 'ball') state.lastBallAt = state.minute;
      if (action.kind === 'cat') state.catClaimed = true;
      history(state, null, 'Pausa', 'Nico', def.label, res.text, def.minutes);
      events.push({ type: 'pause', kind: action.kind, text: res.text });
      advance(content, state, def.minutes, events);
      return { state, events };
    }
    case 'wait': {
      const next = upcoming(content, state);
      if (!next) return blocked('No hay eventos programados.');
      history(state, null, 'Turno', 'Nico', 'Esperar al próximo evento', '', next.at - state.minute);
      advance(content, state, next.at - state.minute, events);
      return { state, events };
    }
    case 'endShift': {
      advance(content, state, SHIFT_END - state.minute, events);
      endShift(content, state, events);
      return { state, events };
    }
  }
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function takeCase(state: GameState, cs: CaseState, events: GameEvent[]) {
  if (cs.status === 'active' || cs.status === 'closed') return;
  if (state.activeIds.length >= MAX_ACTIVE) {
    cs.status = 'pending';
    events.push({
      type: 'info',
      text: 'Ya tenés dos expedientes activos: este quedó en la bandeja de pendientes.',
    });
    return;
  }
  cs.status = 'active';
  cs.takenAt = state.minute;
  state.activeIds.push(cs.id);
  if (!state.focusId) state.focusId = cs.id;
}

function finishCase(
  content: Content,
  state: GameState,
  cs: CaseState,
  outcome: CaseState['outcome'] & string,
  events: GameEvent[],
  keepCall = false,
) {
  const def = getCaseDef(content, cs.id);
  cs.status = 'closed';
  cs.outcome = outcome;
  cs.closedAt = state.minute;
  if (cs.takenAt === null) cs.takenAt = cs.arrivedAt ?? state.minute;
  state.activeIds = state.activeIds.filter((id) => id !== cs.id);
  if (state.focusId === cs.id) state.focusId = state.activeIds[0] ?? null;
  // Con despedida en curso la llamada sigue abierta hasta colgar; el informe se muestra después.
  if (state.call?.caseId === cs.id && !(keepCall && state.call.ended)) state.call = null;
  if (state.incoming?.caseId === cs.id) state.incoming = null;
  if (!state.learned.includes(def.id)) state.learned.push(def.id);
  if (outcome !== 'escalated')
    history(
      state,
      cs.id,
      'Centro de tickets',
      def.contact.device,
      `Cerré ${def.number}`,
      outcomeLabel(outcome),
      0,
    );
  events.push({ type: 'closed', caseId: cs.id, outcome });
}

/** Cierre humano: despedida por teléfono (si hay llamada) o correo de cierre. Sin costo de tiempo. */
function farewell(state: GameState, def: CaseDef, cs: CaseState, clean: boolean) {
  const f = def.farewell ?? {
    nico: 'Buenísimo. Quedó funcionando; dejo todo registrado en el ticket. Cualquier cosa, llamame.',
    warm: '¡Mil gracias! Me salvaste la noche. Buena guardia.',
    costly: 'Gracias… llegó un poco tarde, pero al menos ya funciona. Buenas noches.',
    cold: 'Bueno, gracias. Chau.',
  };
  const reply = !clean ? f.costly : cs.trust <= 1 ? f.cold : f.warm;
  const call = state.call;
  if (def.channel === 'phone' && call?.caseId === cs.id && !call.ended) {
    if (call.held) {
      call.held = false;
      delete call.heldSince;
    }
    call.lines.push({ speaker: 'nico', text: f.nico });
    call.lines.push({ speaker: 'contact', text: reply });
    call.ended = true;
  } else if (def.channel === 'email') {
    cs.messages.push({
      id: nextId(state, 'm'),
      at: state.minute,
      from: 'Nicolás Bentancor (Soporte)',
      to: def.contact.name,
      subject: `RE: ${def.message?.subject ?? def.title} [resuelto]`,
      body: [
        f.mail ??
          `${def.contact.short}, confirmado: quedó resuelto. Cierro el ticket; si vuelve a pasar, respondé este correo.`,
        'Saludos, Nicolás · Soporte',
      ],
      outgoing: true,
    });
  }
}

export function outcomeLabel(o: NonNullable<CaseState['outcome']>): string {
  return {
    verified: 'Resuelto y verificado',
    costly: 'Resuelto con costo',
    escalated: 'Escalado',
    unresolved: 'Sin resolver',
  }[o];
}

function noteKind(probe: ProbeDef, def: CaseDef): NoteKind | null {
  switch (probe.kind) {
    case 'question':
      return 'said';
    case 'test':
    case 'document':
      return 'checked';
    case 'intervention':
      return 'tried';
    case 'verify':
      return probe.app === 'phone' || probe.app === 'mail' || def.channel !== 'auto' ? 'said' : 'checked';
    case 'communicate':
      return null;
  }
}

/** Costo que se mostrará antes de ejecutar (considera relectura gratis y penalizaciones visibles). */
export function probeCost(
  state: GameState,
  cs: CaseState,
  probe: ProbeDef,
  arg?: string,
): { cost: Minute; reread: boolean } {
  // Releer un dato que no cambió no cuesta ni crea notas (con parámetro, por valor).
  const reread = cs.runs.some(
    (r) => r.probeId === probe.id && r.version === cs.version && (r.arg ?? '') === (arg ?? ''),
  );
  if (reread || state.mode === 'practice') return { cost: 0, reread };
  return { cost: adjustedCost(probe.cost, state.needs), reread };
}

export function probeBlockReason(
  state: GameState,
  def: CaseDef,
  cs: CaseState,
  probe: ProbeDef,
  arg?: string,
): string | null {
  if (probe.args && (arg === undefined || !probe.args.includes(arg))) return 'Opción desconocida.';
  if (!probe.args && arg !== undefined) return 'Esta acción no lleva opciones.';
  if (cs.status === 'closed') return 'El expediente está cerrado.';
  if (cs.status !== 'active') return 'Primero tomá el expediente.';
  if (probe.app === 'phone' && state.call?.caseId !== cs.id)
    return `Hace falta estar en llamada con ${cs.contactKnown ? def.contact.short : 'la persona'}.`;
  if (probe.app === 'phone' && state.call?.held) return 'La llamada está en espera: retomala para hablar.';
  if (probe.app === 'phone' && state.call?.ended) return 'La conversación ya terminó.';
  return probe.requires?.(caseView(cs), arg) ?? null;
}

function runProbe(
  content: Content,
  prev: GameState,
  state: GameState,
  caseId: string,
  probeId: string,
  arg?: string,
): StepResult {
  const events: GameEvent[] = [];
  const cs = state.cases[caseId];
  if (!cs) return { state: prev, events: [{ type: 'blocked', reason: 'Expediente desconocido.' }] };
  const def = getCaseDef(content, caseId);
  const probe = def.probes.find((p) => p.id === probeId);
  if (!probe) return { state: prev, events: [{ type: 'blocked', reason: 'Acción desconocida.' }] };
  const reason = probeBlockReason(state, def, cs, probe, arg);
  if (reason) return { state: prev, events: [{ type: 'blocked', reason }] };
  const { cost, reread } = probeCost(state, cs, probe, arg);
  if (reread) return { state: prev, events: [{ type: 'result', caseId, probeId, reread: true }] };

  const observed = cs.version;
  const res = probe.run(cs.world, caseView(cs), arg);
  if (res.world) applyWorld(cs, res.world);
  for (const f of res.flags ?? []) if (!cs.flags.includes(f)) cs.flags.push(f);
  if (res.trust) cs.trust = clamp(cs.trust + res.trust, 0, TRUST_MAX);
  if (res.stress) state.needs = { ...state.needs, stress: clamp(state.needs.stress + res.stress) };
  if (res.consequence && !cs.consequences.includes(res.consequence)) cs.consequences.push(res.consequence);
  if (res.wrong) cs.wrong += 1;
  if (res.confirms && def.isFixed(cs.world)) cs.confirmed = true;

  let noteId: string | null = null;
  const kind = noteKind(probe, def);
  if (res.note && kind) {
    const same = cs.notes.find((n) => n.text === res.note && n.kind === kind);
    if (same) noteId = same.id;
    else {
      noteId = nextId(state, 'n');
      cs.notes.push({
        id: noteId,
        caseId,
        kind,
        text: res.note,
        at: state.minute,
        probeId,
        relations: { ...(res.relations ?? {}) },
        ...(probe.kind === 'verify' ? { verify: cs.confirmed ? ('ok' as const) : ('no' as const) } : {}),
      });
      events.push({ type: 'note', caseId, noteId });
    }
  }
  const run = {
    probeId,
    ...(arg !== undefined ? { arg } : {}),
    version: observed,
    at: state.minute,
    summary: res.summary,
    detail: res.detail ?? [],
    noteId,
    ...(res.reply ? { reply: res.reply } : {}),
  };
  cs.runs.push(run);

  if (state.call?.caseId === caseId && probe.app === 'phone') {
    if (probe.line) state.call.lines.push({ speaker: 'nico', text: probe.line });
    if (res.reply) state.call.lines.push({ speaker: 'contact', text: res.reply });
  }
  if (probe.app === 'mail' && probe.line) {
    cs.messages.push({
      id: nextId(state, 'm'),
      at: state.minute,
      from: 'Nicolás Bentancor (Soporte)',
      to: def.contact.name,
      subject: `RE: ${def.message?.subject ?? def.title}`,
      body: [probe.line],
      outgoing: true,
    });
    if (res.reply)
      cs.messages.push({
        id: nextId(state, 'm'),
        at: state.minute + cost,
        from: def.contact.name,
        to: 'Soporte',
        subject: `RE: ${def.message?.subject ?? def.title}`,
        body: res.reply.split('\n'),
      });
  }

  history(
    state,
    caseId,
    appLabel(probe.app),
    probe.target ?? def.contact.device,
    probe.label,
    res.summary,
    cost,
  );
  for (const s of res.schedule ?? [])
    schedule(state, {
      at: state.minute + cost + s.after,
      kind: 'world',
      caseId,
      world: s.world,
      text: s.text,
    });
  events.push({ type: 'result', caseId, probeId, reread: false });
  advance(content, state, cost, events);
  return { state, events };
}

export const APP_LABELS: Record<string, string> = {
  tickets: 'Centro de tickets',
  mail: 'Correo',
  network: 'Equipos y red',
  accounts: 'Cuentas y permisos',
  printers: 'Impresoras',
  services: 'Servicios',
  events: 'Eventos',
  files: 'Archivos',
  browser: 'Navegador',
  history: 'Historial',
  procedures: 'Procedimientos',
  console: 'Consola',
  remote: 'Acceso remoto',
  phone: 'Teléfono',
};

function appLabel(app: string): string {
  return APP_LABELS[app] ?? app;
}

/** ¿Queda algo por llegar esta noche? */
/** Próximo evento que puede cambiar algo (se omiten seguimientos y plazos de casos ya resueltos). */
export function upcoming(content: Content, state: GameState): ScheduledEvent | undefined {
  return state.events
    .filter((e) => {
      if (e.done || e.at <= state.minute) return false;
      if (e.kind === 'arrival' || e.kind === 'end' || !e.caseId) return true;
      const cs = state.cases[e.caseId];
      if (!cs || cs.status === 'closed') return false;
      return e.kind === 'world' || !isSettled(getCaseDef(content, cs.id), cs);
    })
    .sort((a, b) => a.at - b.at)[0];
}

export function allSettled(state: GameState): boolean {
  return (
    Object.values(state.cases).every((c) => c.status === 'closed') &&
    !state.events.some((e) => !e.done && e.kind === 'arrival')
  );
}
