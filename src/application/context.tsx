import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AppState, GameStore } from './store';

export const StoreContext = createContext<GameStore | null>(null);

export function useStore(): GameStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('Falta StoreContext');
  return s;
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
