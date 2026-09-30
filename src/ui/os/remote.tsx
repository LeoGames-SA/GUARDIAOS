import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../application/context';
import { DEVICES } from '../../content/devices';
import { probeBlockReason } from '../../engine/game';
import { clock } from '../../engine/time';
import type { CaseDef, CaseState, GameState, RemoteDesktopDef } from '../../engine/types';

/**
 * Asistencia remota simulada: autorización por diálogo, conexión registrada y un escritorio
 * ficticio del equipo de la persona. Nada sale de la simulación: cada control despacha una
 * acción del motor sobre el mismo mundo del expediente (observaciones e intervenciones).
 * Estructura reutilizable: cada caso declara su escritorio en `CaseDef.remote`.
 */
export function RemoteAssist({
  game,
  def,
  cs,
  onDisconnected,
}: {
  game: GameState;
  def: CaseDef;
  cs: CaseState;
  onDisconnected: () => void;
}) {
  const spec = def.remote!;
  const store = useStore();
  const device = DEVICES[spec.device]!;
  const session = cs.world.session === 'on';
  const authorized = cs.flags.includes(spec.consent.flag);
  const authRun = cs.runs.find((r) => r.probeId === spec.consent.probe);
  const [connecting, setConnecting] = useState<number | null>(null);
  const reduced = document.documentElement.dataset.motion === 'reduced';

  // Estado breve de conexión (visual). La conexión se registra una sola vez, al final.
  useEffect(() => {
    if (connecting === null) return;
    if (connecting >= CONNECT_STEPS.length) {
      setConnecting(null);
      if (cs.world.session !== 'on') store.dispatch({ type: 'probe', caseId: cs.id, probeId: spec.connect });
      return;
    }
    const t = window.setTimeout(() => setConnecting((c) => (c === null ? null : c + 1)), reduced ? 0 : 450);
    return () => window.clearTimeout(t);
  }, [connecting, cs.id, cs.world.session, reduced, spec.connect, store]);

  const who = cs.contactKnown ? `${def.contact.name} (${def.contact.role})` : device.owner;

  if (!session) {
    const why = probeBlockReason(
      game,
      def,
      cs,
      def.probes.find((p) => p.id === spec.connect)!,
    );
    return (
      <div className="app remote-assist">
        <div className="assist-card">
          <h3>Asistencia remota</h3>
          <dl className="props">
            <dt>Equipo</dt>
            <dd>
              <b>{device.id}</b> · {device.name} · {device.ip}
            </dd>
            <dt>Usuario</dt>
            <dd>{who}</dd>
            <dt>Autorización</dt>
            <dd>
              {authorized ? (
                <>
                  Aceptada por {cs.contactKnown ? def.contact.short : 'la persona'}
                  {game.mode === 'campaign' && authRun ? ` a las ${clock(authRun.at)}` : ''}
                </>
              ) : (
                'Pendiente: pedile a la persona que acepte la solicitud (por teléfono).'
              )}
            </dd>
          </dl>
          {connecting !== null ? (
            <ol className="connect-steps" aria-live="polite">
              {CONNECT_STEPS.slice(0, connecting + 1).map((s, i) => (
                <li key={s} className={i === connecting ? 'now' : 'ok'}>
                  {s.replace('{ip}', device.ip)}
                </li>
              ))}
            </ol>
          ) : (
            <>
              {why && authorized ? <p className="small muted">{why}</p> : null}
              <button
                type="button"
                className="btn btn-primary"
                data-tut="remote-connect"
                disabled={!authorized || Boolean(why)}
                onClick={() => setConnecting(0)}
              >
                {cs.runs.some((r) => r.probeId === spec.connect) ? 'Reconectar' : 'Conectar'} a {device.id}
              </button>
              <p className="small muted">
                Todo ocurre dentro de la simulación: no se hace ninguna conexión real.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app remote-assist">
      <div className="session-bar" role="status">
        <span className="session-dot" aria-hidden="true" />
        <span>
          Sesión remota · <b>{device.id}</b> · {who}
          <span className="small"> · autorizada · no es tu equipo</span>
        </span>
        <button
          type="button"
          className="btn btn-sm"
          data-tut="remote-disconnect"
          onClick={() => {
            store.dispatch({ type: 'probe', caseId: cs.id, probeId: spec.disconnect });
            onDisconnected();
          }}
        >
          Desconectar
        </button>
      </div>
      <RemoteDesktop game={game} cs={cs} spec={spec} />
    </div>
  );
}

const CONNECT_STEPS = [
  'Buscando el equipo en la red ({ip})…',
  'Solicitud aceptada por la persona.',
  'Abriendo el escritorio remoto…',
];

type Panel = 'sound' | 'settings' | null;

function RemoteDesktop({ game, cs, spec }: { game: GameState; cs: CaseState; spec: RemoteDesktopDef }) {
  const [panel, setPanel] = useState<Panel>(null);
  const sound = spec.sound;
  const muted = cs.world.muted === true;
  return (
    <div className="rd" aria-label={`Escritorio remoto de ${spec.device}`}>
      <div className="rd-wall" onClick={() => setPanel(null)}>
        <span className="rd-host">{spec.device}</span>
      </div>
      {sound && panel === 'sound' && (
        <SoundFlyout cs={cs} spec={spec} openSettings={() => setPanel('settings')} />
      )}
      {sound && panel === 'settings' && <SoundSettings cs={cs} spec={spec} onClose={() => setPanel(null)} />}
      <div className="rd-taskbar">
        <span className="rd-start" aria-hidden="true">
          ▦
        </span>
        <span className="rd-spacer" />
        {sound && (
          <button
            type="button"
            className="rd-tray"
            data-tut="remote-sound"
            aria-expanded={panel === 'sound'}
            aria-label={`Sonido del equipo remoto${muted ? ' (silenciado)' : ''}`}
            onClick={() => setPanel((p) => (p === 'sound' ? null : 'sound'))}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
        <span className="rd-clock">{game.mode === 'practice' ? '22:40' : clock(game.minute)}</span>
      </div>
    </div>
  );
}

function useProbe(cs: CaseState) {
  const store = useStore();
  return (probeId: string, arg?: string) =>
    store.dispatch({ type: 'probe', caseId: cs.id, probeId, ...(arg !== undefined ? { arg } : {}) });
}

function SoundFlyout({
  cs,
  spec,
  openSettings,
}: {
  cs: CaseState;
  spec: RemoteDesktopDef;
  openSettings: () => void;
}) {
  const s = spec.sound!;
  const run = useProbe(cs);
  const [listOpen, setListOpen] = useState(false);
  const [vol, setVol] = useState(Number(cs.world.volume));
  const [meter, setMeter] = useState<'on' | 'off' | null>(null);
  const out = s.outputs.find((o) => o.id === cs.world.output);
  const muted = cs.world.muted === true;
  // Ver el panel es observar: salida elegida y volumen (releer no duplica notas ni cuesta).
  useEffect(() => {
    run(s.readOutput);
    run(s.readVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs.version]);
  useEffect(() => setVol(Number(cs.world.volume)), [cs.world.volume]);
  const meterT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(meterT.current), []);

  return (
    <section className="rd-flyout" aria-label="Sonido">
      <h4>Sonido</h4>
      <div className="rd-field">
        <span className="rd-label">Salida</span>
        <button
          type="button"
          className="rd-select"
          data-tut="remote-output"
          aria-haspopup="listbox"
          aria-expanded={listOpen}
          onClick={() => {
            if (!listOpen) run(s.readDevices);
            setListOpen((o) => !o);
          }}
        >
          {out?.label ?? '—'} <span aria-hidden="true">▾</span>
        </button>
        {listOpen && (
          <ul className="rd-options" role="listbox" aria-label="Salidas de sonido">
            {s.outputs.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.id === cs.world.output}
                  onClick={() => {
                    if (o.id !== cs.world.output) run(s.setOutput, o.id);
                    setListOpen(false);
                  }}
                >
                  <span className="rd-radio" aria-hidden="true">
                    {o.id === cs.world.output ? '●' : '○'}
                  </span>
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rd-field rd-volume">
        <button
          type="button"
          className="rd-mute"
          data-tut="remote-mute"
          aria-pressed={muted}
          aria-label={muted ? 'Activar el sonido' : 'Silenciar'}
          onClick={() => run(s.setMute, muted ? 'off' : 'on')}
        >
          {muted ? '🔇' : '🔈'}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={vol}
          aria-label="Volumen del equipo remoto"
          data-tut="remote-volume"
          onChange={(e) => setVol(Number(e.currentTarget.value))}
          // Se registra al soltar, no por cada paso del control.
          onPointerUp={() => vol !== Number(cs.world.volume) && run(s.setVolume, String(vol))}
          onKeyUp={() => vol !== Number(cs.world.volume) && run(s.setVolume, String(vol))}
        />
        <span className="rd-vol-num">{vol}</span>
      </div>
      <div className="rd-field rd-test">
        <button
          type="button"
          className="btn btn-sm"
          data-tut="remote-test"
          onClick={() => {
            run(s.test);
            const flows = cs.world.muted !== true && Number(cs.world.volume) > 0;
            setMeter(flows ? 'on' : 'off');
            window.clearTimeout(meterT.current);
            meterT.current = window.setTimeout(() => setMeter(null), 1800);
          }}
        >
          ▶ Probar sonido
        </button>
        <span className={`rd-meter ${meter === 'on' ? 'moving' : ''}`} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="small" aria-live="polite">
          {meter === 'on'
            ? `Nivel en «${out?.label ?? ''}»`
            : meter === 'off'
              ? 'Sin señal: el sonido está silenciado o en 0'
              : ''}
        </span>
      </div>
      <button type="button" className="rd-link" onClick={openSettings}>
        Configuración de sonido…
      </button>
    </section>
  );
}

function SoundSettings({
  cs,
  spec,
  onClose,
}: {
  cs: CaseState;
  spec: RemoteDesktopDef;
  onClose: () => void;
}) {
  const s = spec.sound!;
  const run = useProbe(cs);
  // Propiedades consultadas: se muestran con el resultado registrado por el motor.
  const props = (id: string) =>
    [...cs.runs].reverse().find((r) => r.probeId === s.readProperties && r.arg === id)?.summary;
  useEffect(() => {
    run(s.readDevices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className="rd-window" aria-label="Configuración de sonido">
      <header>
        <span>Configuración de sonido</span>
        <button type="button" className="rd-x" aria-label="Cerrar configuración de sonido" onClick={onClose}>
          ✕
        </button>
      </header>
      <p className="small">Dispositivos de salida</p>
      <ul className="rd-devices">
        {s.outputs.map((o) => (
          <li key={o.id}>
            <div>
              <b>{o.label}</b>
              {o.id === cs.world.output && <span className="rd-tag">en uso</span>}
              {props(o.id) && <p className="small">{props(o.id)}</p>}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              data-tut={`remote-props-${o.id}`}
              onClick={() => run(s.readProperties, o.id)}
            >
              Propiedades
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
