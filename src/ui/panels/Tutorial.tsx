import { useStore } from '../../application/context';
import type { GameState } from '../../engine/types';
import type { PanelState } from '../Desk';
import type { SceneTarget } from '../scene/Scene';

interface Step {
  text: string;
  focus: SceneTarget | null;
}

/** Indicaciones derivadas del estado real de la práctica: una o dos frases, sin cadenas de «Siguiente». */
export function tutorialStep(g: GameState, panel: PanelState | null): Step | null {
  const cs = g.cases.p001;
  if (!cs) return null;
  const done = (id: string) => cs.runs.some((r) => r.probeId === id);
  const os = panel?.kind === 'os';
  if (cs.status === 'closed') return null;
  if (g.incoming)
    return {
      text: 'Suena el teléfono. Atendé haciendo clic en el teléfono (o llegá con Tab y apretá Enter).',
      focus: 'phone',
    };
  if (cs.status === 'pending') return { text: 'Devolvé la llamada: clic en el teléfono.', focus: 'phone' };
  const asked = cs.runs.some((r) => r.probeId.startsWith('q-'));
  if (!asked && g.call)
    return { text: 'Escuchá y hacé una pregunta breve para delimitar el problema.', focus: null };
  if (!done('t-output'))
    return os
      ? {
          text: 'Abrí «Acceso remoto», conectate a PC-REC-01 y revisá el dispositivo de salida de sonido.',
          focus: null,
        }
      : { text: 'Abrí el monitor para revisar el equipo de esa persona.', focus: 'monitor' };
  if (cs.links.length === 0)
    return panel?.kind === 'board'
      ? {
          text: 'Elegí la hipótesis que te parezca y tocá la nota para conectarla. Si dudás, el cuaderno tiene ayuda (es opcional).',
          focus: null,
        }
      : {
          text: 'Esa comprobación ya está en la pizarra. Abrila: clic en el corcho o en «Pizarra», en la llamada.',
          focus: 'board',
        };
  if (!cs.workingHyp)
    return { text: 'Si la nota la apoya, tomala como hipótesis de trabajo.', focus: 'board' };
  if (!done('i-headset')) {
    const extra = done('i-volume') ? 'Subir el volumen no alcanzó: el sonido va a otro lado. ' : '';
    return {
      text: `${extra}Aplicá el cambio en su equipo: elegí la salida correcta desde Acceso remoto.`,
      focus: os ? null : 'monitor',
    };
  }
  if (!done('t-sound'))
    return { text: 'Hacé una prueba de sonido desde Acceso remoto.', focus: os ? null : 'monitor' };
  if (!cs.confirmed)
    return g.call
      ? { text: 'Preguntale si ahora lo escucha.', focus: null }
      : { text: 'Llamala por teléfono y preguntale si ahora escucha.', focus: 'phone' };
  if (g.call && !g.call.ended)
    return {
      text: 'Confirmado. Despedite y cerrá el ticket: «Despedirse y cerrar el ticket», en la llamada.',
      focus: null,
    };
  return {
    text: 'Confirmado. Cerrá el ticket desde el Centro de tickets, en el monitor.',
    focus: os ? null : 'monitor',
  };
}

export function tutorialFocus(g: GameState, panel: PanelState | null): SceneTarget | null {
  return tutorialStep(g, panel)?.focus ?? null;
}

export function TutorialHint({ game, panel }: { game: GameState; panel: PanelState | null }) {
  const store = useStore();
  const cs = game.cases.p001;
  const returnTo = store.getSnapshot().practice?.returnTo ?? 'menu';
  if (cs?.status === 'closed') {
    return (
      <div className="tutorial done" role="status">
        <b>Práctica completa.</b>
        <p>Ya sabés atender, investigar, anotar en la pizarra, intervenir y verificar.</p>
        <div className="row wrap">
          {returnTo === 'campaign' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => store.finishPractice(true)}
            >
              Entrar a la guardia
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-sm" onClick={() => store.finishPractice(true)}>
                Volver al menú
              </button>
              {(!store.getSnapshot().campaign || store.getSnapshot().campaign?.ended) && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    store.finishPractice(true);
                    store.newCampaign();
                  }}
                >
                  Empezar una guardia
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  const step = tutorialStep(game, panel);
  if (!step) return null;
  return (
    <div className="tutorial" role="status" aria-live="polite">
      <span className="tutorial-tag">Práctica</span> {step.text}
    </div>
  );
}
