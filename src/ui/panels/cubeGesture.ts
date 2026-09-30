/**
 * Gesto sobre una cara del cubo → capa y ángulo. Puro (sin DOM ni three.js) para poder
 * probarlo desde cualquier orientación. Coordenadas del cubo: cubitos en −1..1, caras en ±1,5.
 */
export type V3 = [number, number, number];
export type Px = [number, number];

export interface Gesture {
  axis: 0 | 1 | 2;
  layer: -1 | 0 | 1;
  /** Dirección en pantalla (unitaria) en la que avanza el punto tocado con un giro positivo. */
  dir: Px;
}

/** Umbral para distinguir un clic de un arrastre. */
export const DRAG_THRESHOLD = 8;

const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Elige, entre los dos ejes perpendiculares a la cara tocada, el que mueve el punto tocado en
 * pantalla en la dirección más parecida al arrastre. La capa es la del cubito tocado sobre ese
 * eje. Se decide una vez (al superar el umbral) y queda fija hasta soltar.
 */
export function resolveGesture(
  point: V3,
  normal: V3,
  cubie: V3,
  drag: Px,
  project: (p: V3) => Px,
): Gesture | null {
  const len = Math.hypot(drag[0], drag[1]);
  if (len < DRAG_THRESHOLD) return null;
  const d: Px = [drag[0] / len, drag[1] / len];
  const s0 = project(point);
  const eps = 0.05;
  let best: { axis: 0 | 1 | 2; v: Px; speed: number; score: number } | null = null;
  for (const axis of [0, 1, 2] as const) {
    if (Math.abs(normal[axis]) > 0.5) continue;
    const e: V3 = [0, 0, 0];
    e[axis] = 1;
    const w = cross(e, point); // velocidad del punto al girar +θ alrededor de +e
    const s1 = project([point[0] + w[0] * eps, point[1] + w[1] * eps, point[2] + w[2] * eps]);
    const v: Px = [(s1[0] - s0[0]) / eps, (s1[1] - s0[1]) / eps];
    const speed = Math.hypot(v[0], v[1]);
    if (speed < 1e-3) continue;
    const score = Math.abs((v[0] * d[0] + v[1] * d[1]) / speed);
    if (!best || score > best.score) best = { axis, v, speed, score };
  }
  if (!best) return null;
  const layer = Math.round(cubie[best.axis]) as -1 | 0 | 1;
  return {
    axis: best.axis,
    layer,
    dir: [best.v[0] / best.speed, best.v[1] / best.speed],
  };
}

/** Punto girado alrededor de un eje positivo (regla de la mano derecha). */
export function rotateAbout(p: V3, axis: 0 | 1 | 2, angle: number): V3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [x, y, z] = p;
  if (axis === 0) return [x, y * c - z * s, y * s + z * c];
  if (axis === 1) return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

/**
 * Ángulo (rad, alrededor del eje positivo) que deja el punto tocado lo más cerca posible del
 * dedo: la capa acompaña al gesto aunque la cara se vea de costado. Tope algo mayor a 90°.
 */
export function gestureAngle(g: Gesture, drag: Px, point: V3, project: (p: V3) => Px): number {
  const s0 = project(point);
  const target: Px = [s0[0] + drag[0], s0[1] + drag[1]];
  const max = (Math.PI / 2) * 1.1;
  const dist = (t: number) => {
    const q = project(rotateAbout(point, g.axis, t));
    return Math.hypot(q[0] - target[0], q[1] - target[1]);
  };
  // Búsqueda gruesa desde 0 hacia afuera (se prefiere el ángulo más chico ante empates) y ajuste fino.
  let best = 0;
  let bestD = dist(0);
  const steps = 48;
  for (let i = 1; i <= steps; i++)
    for (const sgn of [1, -1]) {
      const t = (sgn * max * i) / steps;
      const d = dist(t);
      if (d < bestD - 0.01) {
        best = t;
        bestD = d;
      }
    }
  let step = max / steps;
  for (let k = 0; k < 8; k++) {
    step /= 2;
    for (const t of [best - step, best + step]) {
      if (Math.abs(t) > max) continue;
      const d = dist(t);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
  }
  return best;
}

/** Al soltar: más de ~35° completa el cuarto de vuelta en ese sentido; si no, vuelve. */
export function snapQuarter(angle: number): -1 | 0 | 1 {
  return Math.abs(angle) > 0.6 ? (Math.sign(angle) as -1 | 1) : 0;
}
