import { useSyncExternalStore } from 'react';
import type { AppId } from '../../engine/types';

/**
 * Estado de ventanas de GuardiaOS (interfaz pura, no narrativo). Se conserva
 * mientras dura la sesión al cerrar/reabrir el monitor o cambiar de expediente.
 */
export interface Win {
  id: string;
  app: AppId;
  target?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
}

interface WmState {
  wins: Win[];
  top: number;
  active: string | null;
}

const stores = new Map<string, WmState>();
const listeners = new Set<() => void>();
let version = 0;

function get(scope: string): WmState {
  let s = stores.get(scope);
  if (!s) {
    s = { wins: [], top: 1, active: null };
    stores.set(scope, s);
  }
  return s;
}
const STORAGE_KEY = 'tdg.ventanas';
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Recuerda la geometría de las ventanas (interfaz, no partida) entre recargas. */
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(stores)));
    } catch {
      /* sin almacenamiento */
    }
  }, 300);
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, WmState>;
    for (const [scope, st] of Object.entries(data)) {
      if (!st || !Array.isArray(st.wins)) continue;
      const wins = st.wins.filter(
        (w) => typeof w.id === 'string' && [w.x, w.y, w.w, w.h, w.z].every((n) => Number.isFinite(n)),
      );
      stores.set(scope, { wins, top: Math.max(1, ...wins.map((w) => w.z)), active: null });
    }
  } catch {
    /* geometría dañada: se ignora */
  }
}
restore();

function set(scope: string, next: WmState) {
  stores.set(scope, next);
  version++;
  for (const l of listeners) l();
  persist();
}

export const DEFAULT_SIZE: Partial<Record<AppId, [number, number]>> = {
  tickets: [860, 600],
  mail: [940, 620],
  history: [820, 520],
  console: [680, 440],
  browser: [960, 640],
  procedures: [720, 560],
  events: [760, 560],
  remote: [700, 560],
};

export const wm = {
  open(scope: string, app: AppId, target?: string, bounds?: { x: number; y: number; w: number; h: number }) {
    const s = get(scope);
    const id = target ? `${app}:${target}` : app;
    const existing = s.wins.find((w) => w.id === id);
    const top = s.top + 1;
    if (existing) {
      set(scope, {
        ...s,
        top,
        active: id,
        wins: s.wins.map((w) => (w.id === id ? { ...w, min: false, z: top } : w)),
      });
      return id;
    }
    const n = s.wins.filter((x) => !x.min).length;
    const area = bounds ?? { x: 150, y: 8, w: 1000, h: 640 };
    const [dw, dh] = DEFAULT_SIZE[app] ?? [640, 480];
    // Tamaño ajustado al área útil (a la derecha de los íconos, sobre la barra de tareas).
    const w = Math.min(dw, area.w - 16);
    const h = Math.min(dh, area.h - 16);
    const slackX = Math.max(0, area.w - w - 8);
    const slackY = Math.max(0, area.h - h - 8);
    const win: Win = {
      id,
      app,
      x: area.x + Math.min(slackX, 8 + ((n * 36) % Math.max(1, slackX + 1))),
      y: area.y + Math.min(slackY, 8 + ((n * 30) % Math.max(1, slackY + 1))),
      w,
      h,
      z: top,
      min: false,
      ...(target ? { target } : {}),
    };
    set(scope, { ...s, top, active: id, wins: [...s.wins, win] });
    return id;
  },
  focus(scope: string, id: string) {
    const s = get(scope);
    if (s.active === id && s.wins.find((w) => w.id === id)?.z === s.top) return;
    const top = s.top + 1;
    set(scope, {
      ...s,
      top,
      active: id,
      wins: s.wins.map((w) => (w.id === id ? { ...w, z: top, min: false } : w)),
    });
  },
  minimize(scope: string, id: string) {
    const s = get(scope);
    const rest = s.wins.filter((w) => w.id !== id && !w.min).sort((a, b) => b.z - a.z);
    set(scope, {
      ...s,
      active: rest[0]?.id ?? null,
      wins: s.wins.map((w) => (w.id === id ? { ...w, min: true } : w)),
    });
  },
  close(scope: string, id: string) {
    const s = get(scope);
    const wins = s.wins.filter((w) => w.id !== id);
    const rest = wins.filter((w) => !w.min).sort((a, b) => b.z - a.z);
    set(scope, { ...s, wins, active: s.active === id ? (rest[0]?.id ?? null) : s.active });
  },
  move(scope: string, id: string, x: number, y: number) {
    const s = get(scope);
    set(scope, { ...s, wins: s.wins.map((w) => (w.id === id ? { ...w, x, y } : w)) });
  },
  reset(scope: string) {
    set(scope, { wins: [], top: 1, active: null });
  },
};

export function useWm(scope: string): WmState {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => version,
  );
  return get(scope);
}
