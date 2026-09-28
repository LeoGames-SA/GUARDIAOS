import { useEffect, useMemo } from 'react';
import { StoreContext, useAppState } from '../application/context';
import { GameStore } from '../application/store';
import { sound } from '../application/audio';
import { Desk } from './Desk';
import { Menu } from './panels/Menu';
import { Summary } from './panels/Summary';

function Root() {
  const app = useAppState();
  const { prefs } = app;

  useEffect(() => {
    const root = document.documentElement;
    const reduce =
      prefs.motion === 'reduced' ||
      (prefs.motion === 'system' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    root.dataset.motion = reduce ? 'reduced' : 'full';
    root.dataset.text = prefs.textSize;
    sound.configure({
      enabled: prefs.sound,
      volume: prefs.volume,
      ambient: prefs.ambient,
      ambientVolume: prefs.ambientVolume,
      voiceVolume: prefs.voiceVolume,
    });
  }, [prefs]);

  useEffect(() => {
    const unlock = () => sound.unlock();
    const vis = () => {
      const hidden = document.hidden;
      if (hidden) document.body.dataset.hiddenTab = 'true';
      else delete document.body.dataset.hiddenTab;
      sound.setHidden(hidden);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  if (app.screen === 'desk') return <Desk />;
  if (app.screen === 'summary') return <Summary />;
  return <Menu />;
}

export function App() {
  const store = useMemo(() => new GameStore(), []);
  useEffect(() => {
    (window as unknown as { __tdg: GameStore }).__tdg = store;
  }, [store]);
  return (
    <StoreContext.Provider value={store}>
      <Root />
    </StoreContext.Provider>
  );
}
