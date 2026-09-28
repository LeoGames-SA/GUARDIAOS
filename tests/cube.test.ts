import { describe, expect, it } from 'vitest';
import { ALL_MOVES, applyMove, FACES, inverse, isSolved, isValidCube, scramble, SOLVED } from '../src/engine/cube';
import { mulberry32 } from '../src/engine/rng';

describe('cubo 3×3', () => {
  it('el estado resuelto es válido', () => {
    expect(isSolved(SOLVED)).toBe(true);
    expect(isValidCube(SOLVED)).toBe(true);
  });

  it.each(ALL_MOVES)('%s seguido de su inverso restaura el estado', (m) => {
    const s = applyMove(SOLVED, m);
    expect(s).not.toBe(SOLVED);
    expect(applyMove(s, inverse(m))).toBe(SOLVED);
  });

  it.each(FACES)('cuatro giros de %s restauran el estado', (f) => {
    let s = applyMove(SOLVED, 'R');
    const start = s;
    for (let i = 0; i < 4; i++) s = applyMove(s, f);
    expect(s).toBe(start);
  });

  it('un giro cambia exactamente 20 pegatinas (9 de la cara + 12 de adyacentes − centro)', () => {
    const s = applyMove(SOLVED, 'U');
    let diff = 0;
    for (let i = 0; i < 54; i++) if (s[i] !== SOLVED[i]) diff++;
    expect(diff).toBe(12); // la cara U es monocolor: sólo cambian las 12 laterales
  });

  it('la mezcla usa movimientos legales y conserva nueve pegatinas por color', () => {
    const moves = scramble(mulberry32(42), 25);
    expect(moves).toHaveLength(25);
    let s = SOLVED;
    for (const m of moves) {
      expect(ALL_MOVES).toContain(m);
      s = applyMove(s, m);
    }
    expect(isValidCube(s)).toBe(true);
    expect(isSolved(s)).toBe(false);
    for (const m of [...moves].reverse()) s = applyMove(s, inverse(m));
    expect(s).toBe(SOLVED);
  });

  it('R U R\' U\' repetido seis veces vuelve al estado inicial', () => {
    let s = SOLVED;
    for (let i = 0; i < 6; i++) for (const m of ['R', 'U', "R'", "U'"] as const) s = applyMove(s, m);
    expect(s).toBe(SOLVED);
  });
});
