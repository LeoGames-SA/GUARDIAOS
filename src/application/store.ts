import { CONTENT } from '../content';
import { applyMove, inverse, scramble, SOLVED, type Move } from '../engine/cube';
import { createGame, step } from '../engine/game';
import { nightSummary } from '../engine/report';
import { mulberry32, normalizeSeed } from '../engine/rng';
import type { Action, GameEvent, GameState } from '../engine/types';
import {
  DEFAULT_PROFILE,
  loadGame,
  loadPractice,
  loadPrefs,
  loadProfile,
  quarantine,
  remove,
  write,
  type PracticeSave,
  type Prefs,
  type Profile,
  type StorageLike,
} from '../persistence/save';

/**
 * Coordina motor, contenido y persistencia. Es la única fuente de estado:
 * la interfaz lee instantáneas y despacha acciones tipadas.
 */
export type Screen = 'menu' | 'desk' | 'summary';

export interface AppState {
  screen: Screen;
  mode: 'campaign' | 'practice';
  campaign: GameState | null;
  practice: PracticeSave | null;
  profile: Profile;
  prefs: Prefs;
  notice: string | null;
  /** Contador de eventos para que la interfaz reaccione sin comparar arrays. */
  eventSeq: number;
  lastEvents: GameEvent[];
  /** Expediente recién cerrado cuyo informe conviene mostrar. */
  justClosed: string | null;
}

type Listener = () => void;
type EventListener = (events: GameEvent[]) => void;

function safeStorage(): StorageLike {
  try {
    const s = window.localStorage;
    const k = '__tdg_test__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  }
}

export class GameStore {
  private state: AppState;
  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  readonly storage: StorageLike;

  constructor(storage: StorageLike = safeStorage()) {
    this.storage = storage;
    const notices: string[] = [];
    const prefs = loadPrefs(storage);
    const prof = loadProfile(storage);
    let profile = { ...DEFAULT_PROFILE };
    if (prof.status === 'ok') profile = prof.data;
    else if (prof.status !== 'empty') {
      quarantine(storage, 'profile');
      notices.push(`Perfil: ${prof.reason} Se empezó uno nuevo (se guardó una copia del anterior).`);
    }
    const camp = loadGame(storage, CONTENT);
    let campaign: GameState | null = null;
    if (camp.status === 'ok') campaign = camp.data;
    else if (camp.status !== 'empty') {
      quarantine(storage, 'campaign');
      notices.push(
        `Guardia guardada: ${camp.reason} No se pudo continuar; tus ajustes y la práctica se conservan.`,
      );
    }
    const prac = loadPractice(storage, CONTENT);
    let practice: PracticeSave | null = null;
    if (prac.status === 'ok') practice = prac.data;
    else if (prac.status !== 'empty') quarantine(storage, 'practice');
    this.state = {
      screen: 'menu',
      mode: 'campaign',
      campaign,
      practice,
      profile,
      prefs,
      notice: notices.length ? notices.join(' ') : null,
      eventSeq: 0,
      lastEvents: [],
      justClosed: null,
    };
  }

  // ------------------------------------------------------------- suscripción
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  };
  onEvents = (l: EventListener) => {
    this.eventListeners.add(l);
    return () => void this.eventListeners.delete(l);
  };
  getSnapshot = () => this.state;

  private set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  get game(): GameState | null {
    return this.state.mode === 'practice' ? (this.state.practice?.game ?? null) : this.state.campaign;
  }

  // ------------------------------------------------------------- juego
  dispatch = (action: Action): GameEvent[] => {
    const game = this.game;
    if (!game) return [];
    const { state, events } = step(CONTENT, game, action);
    const blocked = events.some((e) => e.type === 'blocked');
    const closed = events.find((e): e is Extract<GameEvent, { type: 'closed' }> => e.type === 'closed');
    const patch: Partial<AppState> = { eventSeq: this.state.eventSeq + 1, lastEvents: events };
    if (!blocked) {
      if (this.state.mode === 'practice' && this.state.practice) {
        patch.practice = { ...this.state.practice, game: state };
        write(this.storage, 'practice', patch.practice);
      } else {
        patch.campaign = state;
        write(this.storage, 'campaign', state);
      }
      if (closed) patch.justClosed = closed.caseId;
      if (this.state.mode === 'campaign' && state.ended && !game.ended) this.completeNight(state, patch);
      else if (closed) this.learn(closed.caseId, patch);
    }
    this.set(patch);
    for (const l of this.eventListeners) l(events);
    return events;
  };

  private learn(caseId: string, patch: Partial<AppState>) {
    const profile = patch.profile ?? this.state.profile;
    if (profile.learned.includes(caseId)) return;
    patch.profile = { ...profile, learned: [...profile.learned, caseId] };
    write(this.storage, 'profile', patch.profile);
  }

  private completeNight(state: GameState, patch: Partial<AppState>) {
    const sum = nightSummary(CONTENT, state);
    const profile = patch.profile ?? this.state.profile;
    const learned = [...new Set([...profile.learned, ...state.learned])];
    patch.profile = {
      ...profile,
      learned,
      nightsCompleted: profile.nightsCompleted + 1,
      secondMonitor: profile.secondMonitor || sum.unlockSecondMonitor,
    };
    write(this.storage, 'profile', patch.profile);
    patch.screen = 'summary';
  }

  dismissReport = () => this.set({ justClosed: null });
  showReport = (caseId: string) => this.set({ justClosed: caseId });

  // ------------------------------------------------------------- navegación
  hasContinue(): boolean {
    return Boolean(this.state.campaign);
  }

  newCampaign = (seed?: number) => {
    const s = normalizeSeed(seed ?? Math.floor(Math.random() * 1_000_000));
    const campaign = createGame(CONTENT, { mode: 'campaign', nightId: 'n1', seed: s });
    write(this.storage, 'campaign', campaign);
    this.set({
      campaign,
      mode: 'campaign',
      screen: 'desk',
      justClosed: null,
      eventSeq: this.state.eventSeq + 1,
      lastEvents: [],
    });
    for (const l of this.eventListeners) l([{ type: 'incoming', caseId: 'c001', reason: 'new' }]);
  };

  continueCampaign = () => {
    if (!this.state.campaign) return;
    this.set({ mode: 'campaign', screen: this.state.campaign.ended ? 'summary' : 'desk', justClosed: null });
  };

  startPractice = (returnTo: 'menu' | 'campaign', fresh = true) => {
    let practice = this.state.practice;
    if (fresh || !practice || practice.game.ended) {
      practice = { game: createGame(CONTENT, { mode: 'practice', nightId: 'practice', seed: 0 }), returnTo };
    } else practice = { ...practice, returnTo };
    write(this.storage, 'practice', practice);
    this.set({ practice, mode: 'practice', screen: 'desk', justClosed: null });
    for (const l of this.eventListeners) l([{ type: 'incoming', caseId: 'p001', reason: 'new' }]);
  };

  /** Termina la práctica (completa u omitida) sin tocar la campaña. */
  finishPractice = (completed: boolean) => {
    const returnTo = this.state.practice?.returnTo ?? 'menu';
    let profile = this.state.profile;
    if (completed && !profile.tutorialDone) {
      profile = { ...profile, tutorialDone: true };
      write(this.storage, 'profile', profile);
    }
    remove(this.storage, 'practice');
    this.set({ practice: null, profile, justClosed: null });
    if (returnTo === 'campaign') this.newCampaign();
    else this.set({ screen: 'menu', mode: 'campaign' });
  };

  toMenu = () => this.set({ screen: 'menu', justClosed: null });
  toDesk = () => this.set({ screen: 'desk' });
  clearNotice = () => this.set({ notice: null });

  setPrefs = (patch: Partial<Prefs>) => {
    const prefs = { ...this.state.prefs, ...patch };
    write(this.storage, 'prefs', prefs);
    this.set({ prefs });
  };

  /** Reinicia progreso de campaña conservando ajustes (y, si se pide, la práctica completada). */
  resetProgress = (keepTutorial: boolean) => {
    remove(this.storage, 'campaign');
    const profile = { ...DEFAULT_PROFILE, tutorialDone: keepTutorial && this.state.profile.tutorialDone };
    write(this.storage, 'profile', profile);
    this.set({ campaign: null, profile });
  };

  // ------------------------------------------------------------- cubo (perfil)
  cubeMove = (move: Move) =>
    this.updateCube((c) => ({
      state: applyMove(c.state, move),
      history: [...c.history, move].slice(-200),
      moves: c.moves + 1,
    }));
  cubeUndo = () =>
    this.updateCube((c) => {
      const last = c.history[c.history.length - 1];
      if (!last) return c;
      return {
        state: applyMove(c.state, inverse(last)),
        history: c.history.slice(0, -1),
        moves: c.moves + 1,
      };
    });
  cubeScramble = () =>
    this.updateCube(() => {
      const moves = scramble(mulberry32(Math.floor(Math.random() * 2 ** 31)), 20);
      return { state: moves.reduce(applyMove, SOLVED), history: [], moves: 0 };
    });
  cubeReset = () => this.updateCube(() => ({ state: SOLVED, history: [], moves: 0 }));

  private updateCube(fn: (c: Profile['cube']) => Profile['cube']) {
    const profile = { ...this.state.profile, cube: fn(this.state.profile.cube) };
    write(this.storage, 'profile', profile);
    this.set({ profile });
  }
}
