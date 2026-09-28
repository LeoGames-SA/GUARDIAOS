import { useState } from 'react';
import type { GameState } from '../../engine/types';
import { Panel } from '../common/Panel';
import { HistoryApp, MailApp } from './apps';

/** Segundo monitor: correo e historial junto a la aplicación principal. Comparte estado; no da respuestas. */
export function SecondPane({ game }: { game: GameState }) {
  const [tab, setTab] = useState<'mail' | 'history'>('mail');
  const noop = () => undefined;
  return (
    <aside className="second-pane" aria-label="Segundo monitor">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'mail'} onClick={() => setTab('mail')}>
          Correo
        </button>
        <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
          Historial
        </button>
      </div>
      <div className="second-body">
        {tab === 'mail' ? <MailApp game={game} open={noop} /> : <HistoryApp game={game} open={noop} />}
      </div>
    </aside>
  );
}

export function SecondScreen({ game, onClose }: { game: GameState; onClose: () => void }) {
  return (
    <Panel title="Monitor 2 · Correo e historial" onClose={onClose} className="second-panel">
      <SecondPane game={game} />
    </Panel>
  );
}
