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
function set(scope: string, next: WmState) {
  stores.set(scope, next);
  version++;
  for (const l of listeners) l();
}

export const DEFAULT_SIZE: Partial<Record<AppId, [number, number]>> = {
  tickets: [760, 520],
  mail: [780, 520],
  history: [760, 440],
  console: [640, 400],
  browser: [720, 500],
  procedures: [640, 480],
};

export const wm = {
  open(scope: string, app: AppId, target?: string) {
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
    const n = s.wins.length;
    const [w, h] = DEFAULT_SIZE[app] ?? [620, 470];
    const win: Win = {
      id,
      app,
      x: 150 + ((n * 34) % 220),
      y: 16 + ((n * 28) % 150),
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
