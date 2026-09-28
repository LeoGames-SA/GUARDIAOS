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

  const activeCases = camp ? camp.activeIds.length : 0;
  const continueDetail = camp
    ? camp.ended
      ? 'Noche 1 terminada · ver resumen'
      : `Noche 1 · ${clock(camp.minute)} · ${activeCases ? `${activeCases} expediente${activeCases > 1 ? 's' : ''} en curso` : 'sin expedientes activos'}`
    : '';
  const newGuard = () => (active ? setDialog('confirm-new') : startNew());

  return (
    <main className="menu">
      <div
        className="menu-backdrop"
        style={{ backgroundImage: 'url(./assets/background.webp)' }}
        aria-hidden="true"
      />
      <div className="menu-scene" aria-hidden="true" inert>
        <div className="stage">
          <Scene
            game={null}
            dual={app.profile.secondMonitor}
            pose={null}
            onOpen={() => undefined}
            inert
            ambient
          />
        </div>
      </div>
      <div className="menu-shade" aria-hidden="true" />
      <section className="menu-panel" aria-labelledby="menu-title">
        <p className="menu-kicker">Mutual Sur · Guardia nocturna</p>
        <h1 id="menu-title">
          <span className="t1">Turno de</span> <span>Guardia</span>
        </h1>
        <p className="menu-lead">
          Sos Nico, de soporte técnico. Atendé llamadas y correos, investigá con GuardiaOS y resolvé la noche
          con pruebas, de 23:00 a 07:00.
        </p>
        {app.notice && (
          <div className="notice" role="alert">
            <p>{app.notice}</p>
            <button type="button" className="btn btn-sm" onClick={store.clearNotice}>
              Entendido
            </button>
          </div>
        )}
        <nav className="menu-actions" aria-label="Menú principal">
          {camp ? (
            <>
              <button type="button" className="btn btn-primary menu-main" onClick={store.continueCampaign}>
                <span>Continuar</span>
                <small>{continueDetail}</small>
              </button>
              <button type="button" className="btn menu-second" onClick={newGuard}>
                Nueva guardia
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary menu-main" onClick={newGuard}>
              <span>Nueva guardia</span>
              <small>
                {app.profile.tutorialDone ? 'Noche 1 · empieza a las 23:00' : 'Con práctica breve opcional'}
              </small>
            </button>
          )}
          {practiceOpen && (
            <button
              type="button"
              className="btn menu-second"
              onClick={() => store.startPractice(app.practice!.returnTo, false)}
            >
              Continuar la práctica
            </button>
          )}
        </nav>
        <nav className="menu-links" aria-label="Más opciones">
          <button type="button" onClick={() => store.startPractice('menu')}>
            Cómo se juega
          </button>
          <button type="button" onClick={() => setDialog('settings')}>
            Opciones
          </button>
          <button type="button" onClick={() => setDialog('credits')}>
            Créditos
          </button>
        </nav>
        <footer className="menu-foot small">
          {app.profile.secondMonitor && <p>Mejora del puesto: segundo monitor habilitado.</p>}
          <p>
            Una idea de Wilson / WillTech. Todo es simulado: no se conecta a ninguna red ni ejecuta comandos
            en tu equipo.
          </p>
        </footer>
      </section>

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
