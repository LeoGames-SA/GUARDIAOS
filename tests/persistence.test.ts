import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/content';
import { applyMove, SOLVED } from '../src/engine/cube';
import { createGame, step } from '../src/engine/game';
import {
  DEFAULT_PROFILE,
  KEYS,
  loadGame,
  loadPrefs,
  loadProfile,
  quarantine,
  write,
  type StorageLike,
} from '../src/persistence/save';

function memory(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('guardado', () => {
  it('restaura una partida a mitad de turno sin cambios', () => {
    const st = memory();
    let g = createGame(CONTENT, { mode: 'campaign', nightId: 'n1', seed: 7 });
    g = step(CONTENT, g, { type: 'answerCall' }).state;
    g = step(CONTENT, g, { type: 'probe', caseId: 'c001', probeId: 't-service' }).state;
    write(st, 'campaign', g);
    const r = loadGame(st, CONTENT);
    expect(r).toEqual({ status: 'ok', data: g });
  });

  it('detecta un guardado corrupto', () => {
    const st = memory();
    st.setItem(KEYS.campaign, '{no es json');
    expect(loadGame(st, CONTENT).status).toBe('corrupt');
  });

  it('detecta una versión incompatible', () => {
    const st = memory();
    st.setItem(
      KEYS.campaign,
      JSON.stringify({ schema: 'turno-de-guardia', slot: 'campaign', version: 99, data: {} }),
    );
    expect(loadGame(st, CONTENT).status).toBe('incompatible');
  });

  it('rechaza estados incoherentes con el contenido', () => {
    const st = memory();
    const g = createGame(CONTENT, { mode: 'campaign', nightId: 'n1', seed: 1 });
    write(st, 'campaign', {
      ...g,
      cases: { ...g.cases, c001: { ...g.cases.c001!, variantId: 'inventada' } },
    });
    expect(loadGame(st, CONTENT)).toMatchObject({ status: 'corrupt' });
    write(st, 'campaign', { ...g, minute: 9999 });
    expect(loadGame(st, CONTENT)).toMatchObject({ status: 'corrupt' });
  });

  it('cuarentena conserva una copia del guardado dañado', () => {
    const st = memory();
    st.setItem(KEYS.campaign, 'basura');
    quarantine(st, 'campaign');
    expect(st.getItem(KEYS.campaign)).toBeNull();
    expect(st.getItem(`${KEYS.campaign}.dañado`)).toBe('basura');
  });

  it('el perfil conserva el progreso del cubo y descarta cubos inválidos', () => {
    const st = memory();
    const cube = { state: applyMove(SOLVED, 'R'), history: ['R'], moves: 1 };
    write(st, 'profile', { ...DEFAULT_PROFILE, cube });
    expect(loadProfile(st)).toMatchObject({ status: 'ok', data: { cube } });
    write(st, 'profile', { ...DEFAULT_PROFILE, cube: { state: 'x'.repeat(54), history: [] } });
    expect(loadProfile(st)).toMatchObject({ status: 'ok', data: { cube: { state: SOLVED } } });
  });

  it('las preferencias inválidas vuelven a valores seguros', () => {
    const st = memory();
    write(st, 'prefs', { sound: 'sí', volume: 7, motion: 'raro' });
    expect(loadPrefs(st)).toMatchObject({ sound: true, volume: 1, motion: 'system' });
  });
});
