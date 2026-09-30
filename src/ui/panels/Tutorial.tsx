import { useEffect } from 'react';
import { useStore } from '../../application/context';
import type { GameState } from '../../engine/types';
import type { PanelState } from '../Desk';
import type { SceneTarget } from '../scene/Scene';

interface Step {
  text: string;
  focus: SceneTarget | null;
  /** Control concreto a señalar (atributo data-tut), dentro de GuardiaOS o la llamada. */
  control?: string;
}

/** Indicaciones derivadas del estado real de la práctica: una o dos frases, sin cadenas de «Siguiente». */
export function tutorialStep(g: GameState, panel: PanelState | null): Step | null {
  const cs = g.cases.p001;
  if (!cs) return null;
  const done = (id: string) => cs.runs.some((r) => r.probeId === id);
  const os = panel?.kind === 'os';
  const inCall = Boolean(g.call && !g.call.held && !g.call.ended);
  const session = cs.world.session === 'on';
  if (cs.status === 'closed') return null;
  if (g.incoming)
    return {
      text: 'Suena el teléfono. Atendé haciendo clic en el teléfono (o llegá con Tab y apretá Enter).',
      focus: 'phone',
    };
  if (cs.status === 'pending') return { text: 'Devolvé la llamada: clic en el teléfono.', focus: 'phone' };
  const asked = done('q-what') || done('q-devices');
  if (!asked && g.call)
    return {
      text: 'Escuchá y hacé una pregunta breve. «¿Qué usás para escuchar?» te da contexto sobre su equipo.',
      focus: null,
      control: 'q-devices',
    };
  if (!cs.flags.includes('assist-ok'))
    return inCall
      ? {
          text: 'Para ver su PC hace falta su permiso: pedíselo con «¿Te puedo mandar una solicitud de asistencia…?».',
          focus: null,
          control: 'q-assist',
        }
      : { text: 'Llamala para pedirle permiso de asistencia remota: clic en el teléfono.', focus: 'phone' };
  if (!session && !done('t-output'))
    return os
      ? {
          text: 'Abrí «Acceso remoto» y tocá «Conectar»: su escritorio se abre en una ventana naranja, separada de tu PC.',
          focus: null,
          control: 'remote-connect',
        }
      : { text: 'Aceptó. Abrí el monitor para conectarte a su equipo.', focus: 'monitor' };
  if (!done('t-output'))
    return os
      ? {
          text: 'En su barra de tareas, tocá el ícono de sonido 🔊: muestra qué salida usa y el volumen.',
          focus: null,
          control: 'remote-sound',
        }
      : { text: 'Volvé al monitor: la sesión remota sigue abierta.', focus: 'monitor' };
  if (!done('t-devices'))
    return os
      ? {
          text: 'Abrí el selector «Salida» del panel de sonido para ver qué dispositivos tiene su PC.',
          focus: null,
          control: 'remote-output',
        }
      : {
          text: 'Volvé al monitor y revisá las salidas disponibles en su panel de sonido.',
          focus: 'monitor',
        };
  if (cs.links.length === 0)
    return panel?.kind === 'board'
      ? {
          text: 'Elegí la hipótesis que te parezca y tocá una nota para conectarla. Si dudás, el cuaderno tiene ayuda.',
          focus: null,
        }
      : {
          text: 'Tus observaciones ya están en la pizarra. Abrila: clic en el corcho o en «Pizarra», en la llamada.',
          focus: 'board',
        };
  if (!cs.workingHyp)
    return { text: 'Si las notas la apoyan, tomala como hipótesis de trabajo.', focus: 'board' };
  const changed = done('i-output') || done('i-volume') || done('i-mute');
  const lastVerify = [...cs.notes].reverse().find((n) => n.verify);
  if (!changed || lastVerify?.verify === 'no') {
    const again = lastVerify?.verify === 'no' ? 'Todavía no escucha. ' : '';
    return os && session
      ? {
          text: `${again}En el selector «Salida», elegí la que corresponda a lo que usa para escuchar. Cambiar algo no lo resuelve solo: después se prueba.`,
          focus: null,
          control: 'remote-output',
        }
      : os
        ? {
            text: `${again}Reconectate a su equipo desde «Acceso remoto».`,
            focus: null,
            control: 'remote-connect',
          }
        : { text: `${again}Revisá su panel de sonido desde el monitor.`, focus: 'monitor' };
  }
  if (!cs.runs.some((r) => r.probeId === 't-sound' && r.version === cs.version))
    return os && session
      ? {
          text: 'Tocá «▶ Probar sonido»: el medidor muestra si la señal sale por esa salida (no si la persona escucha).',
          focus: null,
          control: 'remote-test',
        }
      : { text: 'Hacé una prueba de sonido desde el panel de sonido de su equipo.', focus: 'monitor' };
  if (!cs.confirmed)
    return inCall
      ? {
          text: 'Preguntale si ahora escucha: sólo ella puede confirmarlo. «¿Ahora lo escuchás?», en la llamada.',
          focus: null,
          control: 'v-hear',
        }
      : g.call?.held
        ? { text: 'Retomá la llamada para preguntarle si ahora escucha.', focus: null }
        : { text: 'Llamala por teléfono y preguntale si ahora escucha.', focus: 'phone' };
  if (session)
    return os
      ? {
          text: 'Confirmado. Cerrá la sesión remota con «Desconectar»: no conviene dejar un equipo ajeno abierto.',
          focus: null,
          control: 'remote-disconnect',
        }
      : { text: 'Confirmado. Desconectá la sesión remota desde el monitor.', focus: 'monitor' };
  if (g.call && !g.call.ended)
    return {
      text: 'Listo. Despedite y cerrá el ticket: «Despedirse y cerrar el ticket», en la llamada.',
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
  const step = tutorialStep(game, panel);
  const control = step?.control;
  // Señalar el control concreto (aunque aparezca después, p. ej. al abrir un panel).
  useEffect(() => {
    if (!control) return;
    const mark = () => {
      document.querySelectorAll('[data-tut-on]').forEach((el) => {
        if (el.getAttribute('data-tut') !== control) el.removeAttribute('data-tut-on');
      });
      document
        .querySelectorAll(`[data-tut="${control}"]`)
        .forEach((el) => el.setAttribute('data-tut-on', ''));
    };
    mark();
    const id = window.setInterval(mark, 400);
    return () => {
      window.clearInterval(id);
      document.querySelectorAll('[data-tut-on]').forEach((el) => el.removeAttribute('data-tut-on'));
    };
  }, [control]);
  if (cs?.status === 'closed') {
    return (
      <div className="tutorial done" role="status">
        <span className="tutorial-tag">Práctica completa</span>
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
  if (!step) return null;
  return (
    <div className="tutorial" role="status" aria-live="polite">
      <span className="tutorial-text">
        <span className="tutorial-tag">Práctica</span> {step.text}
      </span>
    </div>
  );
}
