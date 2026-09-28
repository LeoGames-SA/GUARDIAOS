/**
 * Tipos del motor. Sin React, DOM ni almacenamiento: sólo datos y reglas.
 * Los minutos narrativos se cuentan desde las 23:00 (0) hasta las 07:00 (480).
 */

export type Minute = number;

export type AppId =
  | 'tickets'
  | 'mail'
  | 'network'
  | 'accounts'
  | 'printers'
  | 'services'
  | 'events'
  | 'files'
  | 'browser'
  | 'history'
  | 'procedures'
  | 'console'
  | 'remote'
  | 'phone';

export type Channel = 'phone' | 'email' | 'auto';
export type NoteKind = 'said' | 'checked' | 'tried';
export type Relation = 'supports' | 'contradicts' | 'neutral';
export type WorldValue = boolean | number | string;
export type World = Record<string, WorldValue>;

export type ProbeKind = 'question' | 'test' | 'document' | 'intervention' | 'verify' | 'communicate';

/** Lo que la definición de un caso puede consultar para decidir disponibilidad o resultados. */
export interface CaseView {
  world: World;
  flags: readonly string[];
  /** ¿Se ejecutó alguna vez esta acción en este expediente? */
  done: (probeId: string) => boolean;
  trust: number;
}

export interface ProbeResult {
  /** Resultado legible que muestra la aplicación. */
  summary: string;
  /** Filas de detalle (tabla o registro) para la aplicación. */
  detail?: string[];
  /** Texto de la nota para la pizarra. Sin nota = no aporta prueba nueva. */
  note?: string;
  /** Relación observada con cada hipótesis (por id). Omitidas = «no distingue». */
  relations?: Record<string, Relation>;
  /** Cambios en el mundo simulado del expediente. */
  world?: World;
  /** Cambios diferidos (p. ej. caché que expira). */
  schedule?: { after: Minute; world: World; text: string }[];
  /** Consecuencia negativa registrada en el informe. */
  consequence?: string;
  /** Intervención innecesaria o equivocada. */
  wrong?: boolean;
  /** Confirma la resolución por el canal del caso. */
  confirms?: boolean;
  /** Variación de confianza de la persona. */
  trust?: number;
  stress?: number;
  flags?: string[];
  /** Respuesta de la persona (teléfono o correo). */
  reply?: string;
}

export interface ProbeDef {
  id: string;
  kind: ProbeKind;
  app: AppId;
  /** Equipo o recurso sobre el que actúa (id de dispositivo del contenido). */
  target?: string;
  label: string;
  /** Pregunta concreta que responde la prueba. */
  asks?: string;
  /** Lo que dice Nico (preguntas por teléfono o correos). */
  line?: string;
  cost: Minute;
  /** Riesgo explicado antes de confirmar una intervención (sin revelar la causa). */
  risk?: string;
  /** Comandos de consola equivalentes. */
  console?: string[];
  /** Devuelve un motivo si todavía no está disponible. */
  requires?: (c: CaseView) => string | null;
  run: (w: World, c: CaseView) => ProbeResult;
}

export interface HypothesisDef {
  id: string;
  label: string;
  detail: string;
  /** Pruebas pertinentes para esta hipótesis (comunes a todas las variantes). */
  pertinent: { probe: string; what: string }[];
}

export interface VariantDef {
  id: string;
  /** Causa real, se muestra sólo en el informe al cerrar. */
  cause: string;
  explanation: string;
  world: World;
  /** Pruebas que mejor distinguen esta causa (para «pruebas faltantes» del informe). */
  keyProbes: string[];
}

export interface MailMessage {
  id: string;
  at: Minute;
  from: string;
  to: string;
  subject: string;
  body: string[];
  attachments?: { name: string; description: string }[];
  outgoing?: boolean;
}

export interface CaseDef {
  id: string;
  number: string;
  title: string;
  channel: Channel;
  contact: { name: string; short: string; role: string; device: string };
  /** Si el canal ya identifica a la persona (correo) o sólo al presentarse (teléfono). */
  knownAtStart: boolean;
  /** Descripción antes de tomar el caso. */
  teaser: string;
  summary: string;
  arrival: Minute;
  deadline: Minute | null;
  variants: VariantDef[];
  pickVariant: (seed: number) => string;
  hypotheses: HypothesisDef[];
  probes: ProbeDef[];
  isFixed: (w: World) => boolean;
  /** Líneas al atender la primera llamada (la primera la dice Nico). */
  opening?: { nico: string; contact: string[] };
  /** Mensaje inicial para correo o alerta automática. */
  message?: MailMessage;
  callbacks?: { at: Minute; lines: string[] }[];
  deadlineText: string;
  escalation: {
    label: string;
    appropriate: (c: CaseView) => boolean;
    explain: (c: CaseView) => string;
  };
  /** Requisitos de cierre además de la confirmación. */
  closeNeeds?: { flag: string; reason: string }[];
  /** Buenas prácticas que el informe marca como hechas o pendientes. */
  checklist?: { probe: string; text: string; variants?: string[] }[];
  /** Equipos que se listan en las aplicaciones para este expediente. */
  devices: string[];
  learned: string;
  practice?: boolean;
}

export interface NightDef {
  id: string;
  label: string;
  end: Minute;
  cases: string[];
}

export interface Content {
  cases: Record<string, CaseDef>;
  nights: Record<string, NightDef>;
}

// ---------------------------------------------------------------- estado

export interface Note {
  id: string;
  caseId: string;
  kind: NoteKind;
  text: string;
  at: Minute;
  probeId: string;
  relations: Record<string, Relation>;
}

export interface ProbeRun {
  probeId: string;
  version: number;
  at: Minute;
  summary: string;
  detail: string[];
  noteId: string | null;
  reply?: string;
}

export interface Link {
  noteId: string;
  hypId: string;
}

export type CaseStatus = 'scheduled' | 'pending' | 'active' | 'closed';
export type Outcome = 'verified' | 'costly' | 'escalated' | 'unresolved';

export interface CaseState {
  id: string;
  variantId: string;
  status: CaseStatus;
  arrivedAt: Minute | null;
  takenAt: Minute | null;
  closedAt: Minute | null;
  world: World;
  version: number;
  notes: Note[];
  runs: ProbeRun[];
  links: Link[];
  workingHyp: string | null;
  trust: number;
  flags: string[];
  consequences: string[];
  wrong: number;
  deadlinePassed: boolean;
  confirmed: boolean;
  contactKnown: boolean;
  missedCalls: number;
  messages: MailMessage[];
  outcome: Outcome | null;
  escalationAppropriate: boolean | null;
  /** Apuntes de tranquilidad ya otorgados (una mejora por evento). */
  reassured: string[];
}

export interface Needs {
  energy: number;
  stress: number;
  bladder: number;
  caffeine: number;
}

export type PauseKind = 'coffee' | 'eat' | 'bathroom' | 'air' | 'smoke' | 'ball' | 'cat';

export interface PauseRecord {
  kind: PauseKind;
  at: Minute;
  minutes: Minute;
}

export interface CallLine {
  speaker: 'nico' | 'contact' | 'system';
  text: string;
}

export interface CallState {
  caseId: string;
  reason: 'new' | 'callback' | 'outgoing';
  lines: CallLine[];
  /** Id de callback para la regla de «una tranquilidad por evento». */
  eventKey: string;
}

export interface IncomingCall {
  caseId: string;
  reason: 'new' | 'callback';
  since: Minute;
  eventKey: string;
  lines: string[];
}

export type ScheduledKind = 'arrival' | 'callback' | 'deadline' | 'world' | 'end';

export interface ScheduledEvent {
  id: string;
  at: Minute;
  kind: ScheduledKind;
  caseId: string | null;
  world?: World;
  text?: string;
  lines?: string[];
  done: boolean;
}

export interface HistoryEntry {
  id: string;
  at: Minute;
  caseId: string | null;
  origin: string;
  device: string;
  action: string;
  result: string;
  cost: Minute;
}

export interface GameState {
  schema: 'turno-de-guardia/game';
  version: 1;
  mode: 'campaign' | 'practice';
  nightId: string;
  seed: number;
  minute: Minute;
  seq: number;
  cases: Record<string, CaseState>;
  activeIds: string[];
  focusId: string | null;
  events: ScheduledEvent[];
  needs: Needs;
  pauses: PauseRecord[];
  lastBallAt: Minute | null;
  catClaimed: boolean;
  call: CallState | null;
  incoming: IncomingCall | null;
  history: HistoryEntry[];
  learned: string[];
  ended: boolean;
}

// ---------------------------------------------------------------- acciones y eventos

export type Action =
  | { type: 'answerCall' }
  | { type: 'declineCall' }
  | { type: 'hangUp' }
  | { type: 'callContact'; caseId: string }
  | { type: 'reassure'; kind: 'urgency' | 'evidence' | 'probable'; noteId?: string }
  | { type: 'take'; caseId: string }
  | { type: 'focus'; caseId: string }
  | { type: 'probe'; caseId: string; probeId: string }
  | { type: 'link'; caseId: string; noteId: string; hypId: string }
  | { type: 'unlink'; caseId: string; noteId: string; hypId: string }
  | { type: 'setWorking'; caseId: string; hypId: string | null }
  | { type: 'close'; caseId: string }
  | { type: 'escalate'; caseId: string }
  | { type: 'pause'; kind: PauseKind }
  | { type: 'wait' }
  | { type: 'endShift' };

export type GameEvent =
  | { type: 'time'; from: Minute; to: Minute }
  | { type: 'arrival'; caseId: string }
  | { type: 'incoming'; caseId: string; reason: 'new' | 'callback' }
  | { type: 'missed'; caseId: string }
  | { type: 'deadline'; caseId: string; text: string }
  | { type: 'world'; caseId: string; text: string }
  | { type: 'note'; caseId: string; noteId: string }
  | { type: 'result'; caseId: string; probeId: string; reread: boolean }
  | { type: 'blocked'; reason: string }
  | { type: 'closed'; caseId: string; outcome: Outcome }
  | { type: 'pause'; kind: PauseKind; text: string }
  | { type: 'ended' }
  | { type: 'info'; text: string };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}
