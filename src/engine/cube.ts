/**
 * Cubo 3×3 real: 54 pegatinas (6 caras × 9) y giros de cara que rotan
 * pegatinas en 3D, por lo que las caras adyacentes se actualizan de verdad.
 */
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type Face = (typeof FACES)[number];
/** Capas del medio (notación estándar): M sigue a L, E sigue a D, S sigue a F. */
export const SLICES = ['M', 'E', 'S'] as const;
export type Slice = (typeof SLICES)[number];
export type Move = `${Face | Slice}` | `${Face | Slice}'`;
export type CubeState = string; // 54 caracteres, uno por pegatina

type V = [number, number, number];

const FRAME: Record<Face, { n: V; right: V; down: V }> = {
  U: { n: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  R: { n: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  F: { n: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  D: { n: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  L: { n: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
  B: { n: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
};

const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const key = (p: V, n: V) => `${p.join(',')}|${n.join(',')}`;

const stickers: { p: V; n: V }[] = [];
const indexOf = new Map<string, number>();
for (const f of FACES) {
  const { n, right, down } = FRAME[f];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const p = add(add(n, right, c - 1), down, r - 1);
      indexOf.set(key(p, n), stickers.length);
      stickers.push({ p, n });
    }
}

/** Rotación horaria vista desde fuera de la cara: v' = −(n×v) + n(n·v). */
function rotate(v: V, axis: V, clockwise: boolean): V {
  const c = cross(axis, v);
  const k = dot(axis, v);
  const s = clockwise ? -1 : 1;
  return [s * c[0] + axis[0] * k, s * c[1] + axis[1] * k, s * c[2] + axis[2] * k];
}

const SLICE_AXIS: Record<Slice, V> = { M: FRAME.L.n, E: FRAME.D.n, S: FRAME.F.n };

const permutations = new Map<Move, number[]>();
for (const name of [...FACES, ...SLICES]) {
  const slice = (SLICES as readonly string[]).includes(name);
  const axis = slice ? SLICE_AXIS[name as Slice] : FRAME[name as Face].n;
  for (const clockwise of [true, false]) {
    const perm = stickers.map((_, i) => i); // perm[destino] = origen
    stickers.forEach((s, i) => {
      if (dot(s.p, axis) !== (slice ? 0 : 1)) return;
      const j = indexOf.get(key(rotate(s.p, axis, clockwise), rotate(s.n, axis, clockwise)));
      if (j === undefined) throw new Error('cubo: rotación inválida');
      perm[j] = i;
    });
    permutations.set((clockwise ? name : `${name}'`) as Move, perm);
  }
}

/** Posición (cubito) y normal de cada pegatina, para dibujar el cubo en 3D. */
export function stickerGeometry(i: number): { p: V; n: V } {
  const s = stickers[i]!;
  return { p: [...s.p], n: [...s.n] };
}

/**
 * Giro de una capa expresado como rotación de +90° (o −90°) alrededor de un eje positivo
 * x, y o z, tal como lo produce un gesto sobre el cubo 3D. `layer` es −1, 0 o 1.
 * Convención: un giro horario de una cara con normal n es −90° alrededor de n.
 */
export function layerMove(axis: 0 | 1 | 2, layer: -1 | 0 | 1, sign: 1 | -1): Move {
  const pos: Face[] = ['R', 'U', 'F'];
  const neg: Face[] = ['L', 'D', 'B'];
  // Las capas del medio siguen a L (−x), D (−y) y F (+z).
  const sliceSign: Record<number, 1 | -1> = { 0: 1, 1: 1, 2: -1 };
  let name: string;
  let clockwise: boolean;
  if (layer === 1) {
    name = pos[axis]!;
    clockwise = sign === -1;
  } else if (layer === -1) {
    name = neg[axis]!;
    clockwise = sign === 1;
  } else {
    name = SLICES[axis]!;
    clockwise = sign === sliceSign[axis];
  }
  return (clockwise ? name : `${name}'`) as Move;
}

/** Inversa de layerMove: eje, capa y sentido (+1 = +90° sobre el eje positivo). */
export function moveLayer(move: Move): { axis: 0 | 1 | 2; layer: -1 | 0 | 1; sign: 1 | -1 } {
  for (const axis of [0, 1, 2] as const)
    for (const layer of [-1, 0, 1] as const)
      for (const sign of [1, -1] as const)
        if (layerMove(axis, layer, sign) === move) return { axis, layer, sign };
  throw new Error(`Movimiento desconocido: ${move}`);
}

export const SOLVED: CubeState = FACES.map((f) => f.repeat(9)).join('');

export function applyMove(state: CubeState, move: Move): CubeState {
  const perm = permutations.get(move);
  if (!perm) throw new Error(`Movimiento desconocido: ${move}`);
  let out = '';
  for (let j = 0; j < 54; j++) out += state[perm[j]!];
  return out;
}

export function inverse(move: Move): Move {
  return (move.endsWith("'") ? move.slice(0, 1) : `${move}'`) as Move;
}

export function isMove(m: unknown): m is Move {
  return typeof m === 'string' && permutations.has(m as Move);
}

export function isSolved(state: CubeState): boolean {
  for (let f = 0; f < 6; f++) {
    const face = state.slice(f * 9, f * 9 + 9);
    if (face !== face[4]!.repeat(9)) return false;
  }
  return true;
}

export function isValidCube(state: unknown): state is CubeState {
  if (typeof state !== 'string' || state.length !== 54) return false;
  return FACES.every((f) => state.split(f).length - 1 === 9);
}

export const ALL_MOVES: Move[] = FACES.flatMap((f) => [f, `${f}'`] as Move[]);

/** Mezcla con movimientos legales (sin deshacer el anterior inmediatamente). */
export function scramble(rand: () => number, count = 20): Move[] {
  const moves: Move[] = [];
  while (moves.length < count) {
    const m = ALL_MOVES[Math.floor(rand() * ALL_MOVES.length)]!;
    const prev = moves[moves.length - 1];
    if (prev && prev[0] === m[0]) continue;
    moves.push(m);
  }
  return moves;
}

export function faceOf(state: CubeState, face: Face): string[] {
  const i = FACES.indexOf(face);
  return state.slice(i * 9, i * 9 + 9).split('');
}
