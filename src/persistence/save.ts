import { isMove, isValidCube, SOLVED, type CubeState, type Move } from '../engine/cube';
import type { Content, GameState } from '../engine/types';

/**
 * Guardado local versionado. Cuatro ranuras independientes: preferencias,
 * perfil (progreso), campaña y práctica. No hay formatos anteriores que migrar:
 * una versión distinta se considera incompatible y se ofrece recuperación segura.
 */
export const SAVE_VERSION = 1;
export const KEYS = {
  prefs: 'tdg.prefs',
  profile: 'tdg.profile',
  campaign: 'tdg.campaign',
  practice: 'tdg.practice',
} as const;
export type Slot = keyof typeof KEYS;

export interface Prefs {
  sound: boolean;
  volume: number;
  ambient: boolean;
  ambientVolume: number;
  /** Volumen de los murmullos de voz en las conversaciones (0 = sin voces). */
  voiceVolume: number;
  typewriter: boolean;
  motion: 'system' | 'reduced' | 'full';
  textSize: 'normal' | 'large';
}

export const DEFAULT_PREFS: Prefs = {
  sound: true,
  volume: 0.6,
  ambient: false,
  ambientVolume: 0.3,
  voiceVolume: 0.5,
  typewriter: true,
  motion: 'system',
  textSize: 'normal',
};

export interface Profile {
  tutorialDone: boolean;
  secondMonitor: boolean;
  nightsCompleted: number;
  /** Apuntes del cuaderno aprendidos al cerrar casos (ids de caso). */
  learned: string[];
  cube: { state: CubeState; history: Move[]; moves: number };
}

export const DEFAULT_PROFILE: Profile = {
  tutorialDone: false,
  secondMonitor: false,
  nightsCompleted: 0,
  learned: [],
  cube: { state: SOLVED, history: [], moves: 0 },
};

export interface PracticeSave {
  game: GameState;
  /** Al terminar la práctica: volver al menú o entrar a la guardia. */
  returnTo: 'menu' | 'campaign';
}

interface Envelope<T> {
  schema: 'turno-de-guardia';
  slot: Slot;
  version: number;
  savedAt: string;
  data: T;
}

export type LoadResult<T> =
  | { status: 'empty' }
  | { status: 'ok'; data: T }
  | { status: 'corrupt'; reason: string }
  | { status: 'incompatible'; reason: string };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function write<T>(storage: StorageLike, slot: Slot, data: T): boolean {
  const env: Envelope<T> = {
    schema: 'turno-de-guardia',
    slot,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    storage.setItem(KEYS[slot], JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

export function remove(storage: StorageLike, slot: Slot) {
  try {
    storage.removeItem(KEYS[slot]);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Conserva una copia del guardado dañado para no perderlo al empezar de nuevo. */
export function quarantine(storage: StorageLike, slot: Slot) {
  try {
    const raw = storage.getItem(KEYS[slot]);
    if (raw !== null) storage.setItem(`${KEYS[slot]}.dañado`, raw);
    storage.removeItem(KEYS[slot]);
  } catch {
    /* sin acceso */
  }
}

function readEnvelope(storage: StorageLike, slot: Slot): LoadResult<unknown> {
  let raw: string | null;
  try {
    raw = storage.getItem(KEYS[slot]);
  } catch {
    return { status: 'empty' };
  }
  if (raw === null) return { status: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', reason: 'El archivo de guardado no se puede leer.' };
  }
  if (!isObj(parsed) || parsed.schema !== 'turno-de-guardia' || parsed.slot !== slot)
    return { status: 'corrupt', reason: 'El guardado no tiene el formato esperado.' };
  if (parsed.version !== SAVE_VERSION)
    return {
      status: 'incompatible',
      reason: `Guardado de una versión distinta (${String(parsed.version)}).`,
    };
  return { status: 'ok', data: parsed.data };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

export function loadPrefs(storage: StorageLike): Prefs {
  const r = readEnvelope(storage, 'prefs');
  if (r.status !== 'ok' || !isObj(r.data)) return { ...DEFAULT_PREFS };
  const d = r.data;
  const clamp01 = (v: unknown, def: number) => (isNum(v) ? Math.min(1, Math.max(0, v)) : def);
  return {
    sound: isBool(d.sound) ? d.sound : DEFAULT_PREFS.sound,
    volume: clamp01(d.volume, DEFAULT_PREFS.volume),
    ambient: isBool(d.ambient) ? d.ambient : DEFAULT_PREFS.ambient,
    ambientVolume: clamp01(d.ambientVolume, DEFAULT_PREFS.ambientVolume),
    voiceVolume: clamp01(d.voiceVolume, DEFAULT_PREFS.voiceVolume),
    typewriter: isBool(d.typewriter) ? d.typewriter : DEFAULT_PREFS.typewriter,
    motion: d.motion === 'reduced' || d.motion === 'full' ? d.motion : 'system',
    textSize: d.textSize === 'large' ? 'large' : 'normal',
  };
}

export function loadProfile(storage: StorageLike): LoadResult<Profile> {
  const r = readEnvelope(storage, 'profile');
  if (r.status !== 'ok') return r;
  const d = r.data;
  if (!isObj(d) || !isBool(d.tutorialDone) || !isBool(d.secondMonitor) || !isNum(d.nightsCompleted))
    return { status: 'corrupt', reason: 'El perfil está incompleto.' };
  const cube = isObj(d.cube) && isValidCube(d.cube.state) && Array.isArray(d.cube.history) ? d.cube : null;
  return {
    status: 'ok',
    data: {
      tutorialDone: d.tutorialDone,
      secondMonitor: d.secondMonitor,
      nightsCompleted: d.nightsCompleted,
      learned: Array.isArray(d.learned) ? d.learned.filter((x): x is string => typeof x === 'string') : [],
      cube: cube
        ? {
            state: cube.state as CubeState,
            history: (cube.history as unknown[]).filter(isMove).slice(-200),
            moves: isNum(cube.moves) ? cube.moves : 0,
          }
        : { ...DEFAULT_PROFILE.cube },
    },
  };
}

/** Valida estructura y coherencia con el contenido cargado. */
export function validateGame(content: Content, g: unknown): string | null {
  if (!isObj(g)) return 'Estado vacío.';
  if (g.schema !== 'turno-de-guardia/game' || g.version !== 1) return 'Formato de partida desconocido.';
  if (g.mode !== 'campaign' && g.mode !== 'practice') return 'Modo inválido.';
  const night = typeof g.nightId === 'string' ? content.nights[g.nightId] : undefined;
  if (!night) return 'La noche guardada no existe en esta versión.';
  if (!isNum(g.minute) || g.minute < 0 || g.minute > night.end) return 'Hora fuera del turno.';
  if (!isNum(g.seq) || !isNum(g.seed)) return 'Faltan contadores.';
  if (!isObj(g.cases)) return 'Faltan expedientes.';
  for (const id of night.cases) {
    const cs = g.cases[id];
    const def = content.cases[id];
    if (!isObj(cs) || !def) return `Falta el expediente ${id}.`;
    if (!def.variants.some((v) => v.id === cs.variantId)) return `Variante inválida en ${id}.`;
    if (!isObj(cs.world) || !Array.isArray(cs.notes) || !Array.isArray(cs.runs) || !Array.isArray(cs.links))
      return `Datos incompletos en ${id}.`;
    for (const n of cs.notes) if (!isObj(n) || n.caseId !== id) return `Nota ajena en ${id}.`;
  }
  if (!Array.isArray(g.activeIds) || g.activeIds.length > 2) return 'Expedientes activos inválidos.';
  if (!Array.isArray(g.events) || !Array.isArray(g.history) || !Array.isArray(g.pauses))
    return 'Faltan registros.';
  const n = g.needs;
  if (!isObj(n) || ![n.energy, n.stress, n.bladder, n.caffeine].every((v) => isNum(v) && v >= 0 && v <= 100))
    return 'Estado de Nico inválido.';
  return null;
}

export function loadGame(storage: StorageLike, content: Content): LoadResult<GameState> {
  const r = readEnvelope(storage, 'campaign');
  if (r.status !== 'ok') return r;
  const reason = validateGame(content, r.data);
  return reason ? { status: 'corrupt', reason } : { status: 'ok', data: r.data as GameState };
}

/**
 * Migración de la práctica de audio anterior a la asistencia remota: la salida se elegía con
 * «i-headset» y el volumen con «i-volume» sin valor. Se convierten a las acciones con parámetro
 * y se completan los datos nuevos del mundo (silencio y sesión). Idempotente.
 */
export function migrateGame(g: unknown): void {
  if (!isObj(g) || !isObj(g.cases)) return;
  const cs = g.cases.p001;
  if (!isObj(cs) || !isObj(cs.world) || !Array.isArray(cs.runs)) return;
  if (cs.world.muted === undefined) cs.world.muted = false;
  if (cs.world.session === undefined) cs.world.session = 'off';
  for (const r of cs.runs) {
    if (!isObj(r)) continue;
    if (r.probeId === 'i-headset') {
      r.probeId = 'i-output';
      r.arg = 'headset';
    } else if (r.probeId === 'i-volume' && r.arg === undefined) r.arg = '100';
  }
}

export function loadPractice(storage: StorageLike, content: Content): LoadResult<PracticeSave> {
  const r = readEnvelope(storage, 'practice');
  if (r.status !== 'ok') return r;
  if (!isObj(r.data)) return { status: 'corrupt', reason: 'Práctica ilegible.' };
  migrateGame(r.data.game);
  const reason = validateGame(content, r.data.game);
  if (reason) return { status: 'corrupt', reason };
  return {
    status: 'ok',
    data: { game: r.data.game as GameState, returnTo: r.data.returnTo === 'campaign' ? 'campaign' : 'menu' },
  };
}
