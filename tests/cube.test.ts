import { describe, expect, it } from 'vitest';
import {
  ALL_MOVES,
  applyMove,
  FACES,
  inverse,
  isMove,
  layerMove,
  moveLayer,
  stickerGeometry,
  type Move,
  isSolved,
  isValidCube,
  scramble,
  SOLVED,
} from '../src/engine/cube';
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

  it("R U R' U' repetido seis veces vuelve al estado inicial", () => {
    let s = SOLVED;
    for (let i = 0; i < 6; i++) for (const m of ['R', 'U', "R'", "U'"] as const) s = applyMove(s, m);
    expect(s).toBe(SOLVED);
  });

  it('las capas del medio giran cuatro veces y vuelven; mueven los centros', () => {
    for (const m of ['M', 'E', 'S', "M'", "E'", "S'"] as Move[]) {
      let st = SOLVED;
      for (let i = 0; i < 4; i++) st = applyMove(st, m);
      expect(st).toBe(SOLVED);
      expect(applyMove(applyMove(SOLVED, m), inverse(m))).toBe(SOLVED);
    }
    const afterM = applyMove(SOLVED, 'M');
    expect(afterM[4 + 18]).not.toBe('F'); // el centro del frente cambió
    expect(isValidCube(afterM)).toBe(true);
    expect(isMove('M')).toBe(true);
    expect(isMove('X')).toBe(false);
  });

  it('cada gesto (eje, capa, sentido) rota las pegatinas como la geometría 3D', () => {
    // Estado con 54 marcas distintas: se sigue cada pegatina individualmente.
    const ids = Array.from({ length: 54 }, (_, i) => String.fromCharCode(48 + i)).join('');
    type V3 = [number, number, number];
    const rot = (v: V3, axis: number, sign: number): V3 => {
      const a: V3 = [0, 0, 0];
      a[axis] = 1;
      const c: V3 = [a[1] * v[2] - a[2] * v[1], a[2] * v[0] - a[0] * v[2], a[0] * v[1] - a[1] * v[0]];
      const k = v[axis]!;
      return [sign * c[0] + a[0] * k, sign * c[1] + a[1] * k, sign * c[2] + a[2] * k];
    };
    const find = (p: V3, n: V3) =>
      Array.from({ length: 54 }, (_, j) => j).find((j) => {
        const g = stickerGeometry(j);
        return g.p.join() === p.join() && g.n.join() === n.join();
      })!;
    for (const axis of [0, 1, 2] as const)
      for (const layer of [-1, 0, 1] as const)
        for (const sign of [1, -1] as const) {
          const m = layerMove(axis, layer, sign);
          expect(moveLayer(m)).toEqual({ axis, layer, sign });
          const out = applyMove(ids, m);
          for (let i = 0; i < 54; i++) {
            const g = stickerGeometry(i);
            if (g.p[axis] !== layer) continue;
            const j = find(rot(g.p as V3, axis, sign), rot(g.n as V3, axis, sign));
            expect(out[j]).toBe(ids[i]);
          }
        }
  });
});
