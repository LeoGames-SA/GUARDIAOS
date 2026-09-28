import { useState } from 'react';
import { useAppState, useStore } from '../../application/context';
import { Panel } from '../common/Panel';

export function SettingsPanel({
  onClose,
  inGame,
  seed,
  onSeed,
}: {
  onClose: () => void;
  inGame?: boolean;
  seed?: string;
  onSeed?: (s: string) => void;
}) {
  const { prefs, profile } = useAppState();
  const store = useStore();
  const [reset, setReset] = useState(false);
  const [keepTutorial, setKeepTutorial] = useState(true);
  return (
    <Panel
      title={inGame ? 'Menú y opciones' : 'Opciones'}
      onClose={onClose}
      modal={!inGame}
      style={{ width: 'min(520px, 100%)' }}
    >
      <div className="panel-body settings">
        {inGame && (
          <div className="row wrap">
            <button type="button" className="btn" onClick={store.toMenu}>
              Volver al menú principal
            </button>
            <span className="small muted">La guardia queda guardada.</span>
          </div>
        )}
        <fieldset>
          <legend>Sonido</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.sound}
              onChange={(e) => store.setPrefs({ sound: e.target.checked })}
            />{' '}
            Sonidos activados
          </label>
          <label className="field">
            Volumen general
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.volume}
              onChange={(e) => store.setPrefs({ volume: Number(e.target.value) })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.ambient}
              onChange={(e) => store.setPrefs({ ambient: e.target.checked })}
            />{' '}
            Ambiente de lluvia
          </label>
          <label className="field">
            Volumen del ambiente
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.ambientVolume}
              onChange={(e) => store.setPrefs({ ambientVolume: Number(e.target.value) })}
            />
          </label>
          <p className="small muted">
            Los avisos importantes también se muestran en pantalla: el sonido nunca es imprescindible.
          </p>
        </fieldset>
        <fieldset>
          <legend>Lectura y movimiento</legend>
          <label className="check">
            <input
              type="checkbox"
              checked={prefs.typewriter}
              onChange={(e) => store.setPrefs({ typewriter: e.target.checked })}
            />{' '}
            Texto progresivo en conversaciones
          </label>
          <label className="field">
            Movimiento
            <select
              value={prefs.motion}
              onChange={(e) => store.setPrefs({ motion: e.target.value as typeof prefs.motion })}
            >
              <option value="system">Según el sistema</option>
              <option value="reduced">Reducido</option>
              <option value="full">Completo</option>
            </select>
          </label>
          <label className="field">
            Tamaño de texto
            <select
              value={prefs.textSize}
              onChange={(e) => store.setPrefs({ textSize: e.target.value as typeof prefs.textSize })}
            >
              <option value="normal">Normal</option>
              <option value="large">Grande</option>
            </select>
          </label>
        </fieldset>
        {!inGame && onSeed && (
          <fieldset>
            <legend>Pruebas</legend>
            <label className="field">
              Semilla de la próxima guardia (7, 1 y 2 muestran las tres causas del 001)
              <input value={seed} onChange={(e) => onSeed(e.target.value)} inputMode="numeric" />
            </label>
          </fieldset>
        )}
        {!inGame && (
          <fieldset>
            <legend>Progreso</legend>
            <p className="small">
              Noches completadas: {profile.nightsCompleted} · Práctica:{' '}
              {profile.tutorialDone ? 'hecha' : 'pendiente'} · Segundo monitor:{' '}
              {profile.secondMonitor ? 'sí' : 'no'}
            </p>
            {reset ? (
              <div className="confirm">
                <p>Se borra la guardia guardada y el progreso. Las opciones se conservan.</p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={keepTutorial}
                    onChange={(e) => setKeepTutorial(e.target.checked)}
                  />{' '}
                  Conservar la práctica como completada
                </label>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      store.resetProgress(keepTutorial);
                      setReset(false);
                    }}
                  >
                    Reiniciar progreso
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setReset(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setReset(true)}>
                Reiniciar progreso…
              </button>
            )}
          </fieldset>
        )}
      </div>
    </Panel>
  );
}
