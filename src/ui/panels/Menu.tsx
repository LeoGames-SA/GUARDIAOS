import { Scene } from '../scene/Scene';
import { useState } from 'react';
import { useAppState, useStore } from '../../application/context';
import { Panel } from '../common/Panel';
import { SettingsPanel } from './SettingsPanel';
import { clock } from '../../engine/time';

type Dialog = null | 'confirm-new' | 'practice-offer' | 'settings' | 'credits';

function seedFromUrl(): number | undefined {
  const v = new URLSearchParams(window.location.search).get('semilla');
  return v !== null && /^\d+$/.test(v) ? Number(v) : undefined;
}

export function Menu() {
  const app = useAppState();
  const store = useStore();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [seed, setSeed] = useState<string>(() => String(seedFromUrl() ?? ''));
  const camp = app.campaign;
  const active = camp && !camp.ended;
  const practiceOpen =
    app.practice && !app.practice.game.ended && app.practice.game.cases.p001?.status !== 'closed';
  const chosenSeed = seed.trim() && /^\d+$/.test(seed.trim()) ? Number(seed.trim()) : undefined;

  const startNew = () => {
    if (!app.profile.tutorialDone) setDialog('practice-offer');
    else store.newCampaign(chosenSeed);
  };

  return (
    <main className="menu">
      <div className="menu-scene" aria-hidden="true" inert>
        <div className="stage">
          <Scene game={null} dual={false} pose={null} onOpen={() => undefined} inert />
        </div>
      </div>
      <div className="menu-card">
        <h1>
          Turno de Guardia
          <small>Una noche de soporte técnico · 23:00 a 07:00</small>
        </h1>
        {app.notice && (
          <div className="notice" role="alert">
            <p>{app.notice}</p>
            <button type="button" className="btn btn-sm" onClick={store.clearNotice}>
              Entendido
            </button>
          </div>
        )}
        <nav className="menu-buttons" aria-label="Menú principal">
          <button type="button" className="btn btn-primary" disabled={!camp} onClick={store.continueCampaign}>
            Continuar
            {camp && (
              <span className="cost">{camp.ended ? 'ver resumen' : `${clock(camp.minute)} · noche 1`}</span>
            )}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => (active ? setDialog('confirm-new') : startNew())}
          >
            Nueva guardia
          </button>
          {practiceOpen ? (
            <button
              type="button"
              className="btn"
              onClick={() => store.startPractice(app.practice!.returnTo, false)}
            >
              Continuar la práctica
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => store.startPractice('menu')}>
            Cómo se juega {app.profile.tutorialDone ? '(repetir práctica)' : '(práctica)'}
          </button>
          <button type="button" className="btn" onClick={() => setDialog('settings')}>
            Opciones
          </button>
          <button type="button" className="btn" onClick={() => setDialog('credits')}>
            Créditos
          </button>
        </nav>
        {app.profile.secondMonitor && (
          <p className="small muted">Mejora del puesto: segundo monitor disponible.</p>
        )}
        <p className="small muted menu-foot">
          Todo es simulado: el juego no se conecta a ninguna red ni ejecuta comandos en tu equipo.
        </p>
      </div>

      {dialog === 'confirm-new' && (
        <Panel title="¿Empezar una guardia nueva?" onClose={() => setDialog(null)} modal>
          <div className="panel-body">
            <p>
              Hay una guardia en curso ({camp && clock(camp.minute)}). Si empezás otra, se sobrescribe. Tus
              opciones y la práctica completada se conservan.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  setDialog(null);
                  startNew();
                }}
              >
                Sí, empezar de nuevo
              </button>
              <button type="button" className="btn" onClick={() => setDialog(null)} data-autofocus>
                Cancelar
              </button>
            </div>
          </div>
        </Panel>
      )}
      {dialog === 'practice-offer' && (
        <Panel title="Antes de empezar" onClose={() => setDialog(null)} modal>
          <div className="panel-body">
            <p>
              Hay una práctica breve con una llamada fácil: enseña el teléfono, el monitor, la pizarra y el
              cuaderno. No consume tiempo de la guardia.
            </p>
            <div className="stack">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => store.startPractice('campaign')}
                data-autofocus
              >
                Hacer la práctica breve (recomendado)
              </button>
              <button type="button" className="btn" onClick={() => store.newCampaign(chosenSeed)}>
                Ir directo a la guardia
              </button>
            </div>
            <details className="small">
              <summary>Avanzado: semilla</summary>
              <label className="field">
                Semilla de la guardia (vacío = al azar)
                <input value={seed} onChange={(e) => setSeed(e.target.value)} inputMode="numeric" />
              </label>
            </details>
          </div>
        </Panel>
      )}
      {dialog === 'settings' && (
        <SettingsPanel onClose={() => setDialog(null)} seed={seed} onSeed={setSeed} />
      )}
      {dialog === 'credits' && (
        <Panel title="Créditos" onClose={() => setDialog(null)} modal>
          <div className="panel-body">
            <p>
              <b>Turno de Guardia</b> — una idea de <b>Wilson / WillTech</b>.
            </p>
            <p>Protagonista: Nicolás Bentancor, «Nico», técnico de soporte de guardia.</p>
            <p className="small muted">
              Ilustraciones del paquete de arte v1 del proyecto. Sonidos sintetizados en el navegador.
              Personas, organizaciones y equipos son ficticios.
            </p>
          </div>
        </Panel>
      )}
    </main>
  );
}
