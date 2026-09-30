import art from './art-manifest.json';

/**
 * Configuración del puesto: posiciones en coordenadas del fondo (1672 × 941),
 * medidas sobre los derivados recortados. `x`, `y` = esquina superior izquierda;
 * `w` = ancho. El alto sale de la proporción real de cada imagen.
 */
export const SCENE_W = 1672;
export const SCENE_H = 941;

export type ArtId = keyof typeof art;

export interface Placement {
  art: ArtId;
  x: number;
  y: number;
  w: number;
  z: number;
  rotate?: number;
}

export function artInfo(id: ArtId) {
  return art[id] as {
    file: string;
    width: number;
    height: number;
    screen?: { x: number; y: number; w: number; h: number };
  };
}

/**
 * Vidrio del monitor medido a ojo sobre el derivado (grilla al 5 %). El manifiesto
 * del paquete registra sólo la zona semitransparente central, que es más chica.
 */
export const MONITOR_GLASS = { x: 0.103, y: 0.097, w: 0.795, h: 0.597 };

export function heightOf(p: Placement): number {
  const a = artInfo(p.art);
  return (p.w * a.height) / a.width;
}

/** Objetos interactivos y decorado. Slots: `monitor2` sólo aparece con la mejora. */
export type SlotId =
  | 'corkboard'
  | 'lamp'
  | 'plant'
  | 'monitor'
  | 'monitor2'
  | 'keyboard'
  | 'mouse'
  | 'phoneBase'
  | 'handset'
  | 'mug'
  | 'cube'
  | 'ball'
  | 'penHolder'
  | 'notebook'
  | 'manual'
  | 'ticket'
  | 'memo'
  | 'snack';

/**
 * Mesa con profundidad: la superficie va de y≈512 (pared) a y≈885 (borde frontal).
 * Ningún objeto baja de FRONT_LIMIT, así queda una franja de madera visible delante.
 * Fila del fondo (taza, cubo, pelota, portalápices, avisos) hasta y≈650; fila delantera
 * (teléfono, cuaderno, ticket, teclado, mouse, plato) hasta FRONT_LIMIT. El auricular
 * conserva la calibración sobre las horquillas escalada con la base.
 */
export const DESK_FRONT = 885;
export const FRONT_LIMIT = 836;
const BASE = { x: 70, y: 556, w: 320 };
const HANDSET_CAL = { dx: 50 / 400, dy: 12 / 400, w: 115 / 400 }; // relativo al ancho de la base

const common: Record<Exclude<SlotId, 'monitor' | 'monitor2' | 'plant' | 'keyboard' | 'mouse'>, Placement> = {
  corkboard: { art: 'corkboard', x: 112, y: 40, w: 604, z: 10 },
  lamp: { art: 'desk-lamp', x: -14, y: 330, w: 240, z: 22 },
  phoneBase: { art: 'telephone-base', ...BASE, z: 40 },
  handset: {
    art: 'telephone-handset',
    x: Math.round(BASE.x + HANDSET_CAL.dx * BASE.w),
    y: Math.round(BASE.y + HANDSET_CAL.dy * BASE.w),
    w: Math.round(HANDSET_CAL.w * BASE.w),
    z: 41,
  },
  mug: { art: 'coffee-mug', x: 446, y: 546, w: 108, z: 42 },
  cube: { art: 'rubik-cube', x: 580, y: 574, w: 72, z: 43 },
  ball: { art: 'stress-ball', x: 668, y: 590, w: 60, z: 44 },
  penHolder: { art: 'pen-holder', x: 744, y: 488, w: 64, z: 30 },
  notebook: { art: 'notebook', x: 424, y: 640, w: 360, z: 50 },
  manual: { art: 'manual', x: 1510, y: 590, w: 140, z: 28 },
  ticket: { art: 'ticket-paper', x: 814, y: 758, w: 122, z: 51, rotate: -7 },
  memo: { art: 'memo-paper', x: 838, y: 548, w: 76, z: 45, rotate: 8 },
  snack: { art: 'snack', x: 1490, y: 732, w: 158, z: 45 },
};

export const LAYOUTS: Record<'single' | 'dual', Partial<Record<SlotId, Placement>>> = {
  single: {
    ...common,
    plant: { art: 'plant', x: 1530, y: 400, w: 146, z: 20 },
    monitor: { art: 'monitor', x: 930, y: 172, w: 580, z: 32 },
    keyboard: { art: 'keyboard', x: 986, y: 652, w: 400, z: 46 },
    mouse: { art: 'mouse', x: 1404, y: 700, w: 78, z: 47 },
  },
  dual: {
    ...common,
    monitor: { art: 'monitor', x: 868, y: 182, w: 530, z: 32 },
    monitor2: { art: 'monitor', x: 1404, y: 316, w: 250, z: 31 },
    keyboard: { art: 'keyboard', x: 950, y: 660, w: 380, z: 46 },
    mouse: { art: 'mouse', x: 1350, y: 704, w: 78, z: 47 },
  },
};

/**
 * Sombras de contacto: elipse bajo la base de cada objeto apoyado (fracción del ancho y
 * aplanado). Los objetos planos (papeles, cuaderno, teclado) la tienen casi pegada.
 */
export const CONTACT: Partial<Record<SlotId, { w: number; h: number; dy?: number }>> = {
  phoneBase: { w: 0.92, h: 0.1, dy: -0.05 },
  mug: { w: 0.78, h: 0.14, dy: -0.07 },
  cube: { w: 0.9, h: 0.16, dy: -0.08 },
  ball: { w: 0.78, h: 0.16, dy: -0.08 },
  penHolder: { w: 0.9, h: 0.16, dy: -0.08 },
  notebook: { w: 0.98, h: 0.06, dy: -0.03 },
  keyboard: { w: 0.96, h: 0.07, dy: -0.04 },
  mouse: { w: 0.8, h: 0.14, dy: -0.07 },
  manual: { w: 0.95, h: 0.08, dy: -0.04 },
  snack: { w: 0.9, h: 0.1, dy: -0.06 },
  monitor: { w: 0.5, h: 0.05, dy: -0.025 },
  monitor2: { w: 0.5, h: 0.05, dy: -0.025 },
  plant: { w: 0.5, h: 0.08, dy: -0.04 },
  lamp: { w: 0.4, h: 0.06, dy: -0.03 },
};

/**
 * Pantalla LCD de la base, medida sobre el dibujo (fracciones de la base):
 * esquina superior izquierda, superior derecha e inferior izquierda.
 * Se usa como transformación afín para que el texto siga la perspectiva.
 */
/** Aviso de llamada anclado sobre la base del teléfono. */
export const PHONE_BADGE = { x: BASE.x + 64, y: BASE.y - 40 };

export const PHONE_LCD = { tl: [0.481, 0.124], tr: [0.831, 0.164], bl: [0.465, 0.268] } as const;

/** Poses de mano: decoración ligada a acciones, nunca cursor. Ocultan su duplicado. */
/**
 * Escala medida: entre cápsulas del auricular en la mano hay 1,03× el ancho de la pose; el
 * auricular apoyado mide ~1,3× su propio ancho. Cerca de cámara se agranda ~30 %. El brazo está
 * cortado en el lienzo, por eso las poses se anclan al borde inferior de la escena.
 */
export const POSES = {
  phone: { art: 'hand-phone' as ArtId, x: -10, y: 700, w: 160, z: 70, hides: 'handset' as SlotId },
  coffee: { art: 'hand-coffee' as ArtId, x: 372, y: 748, w: 236, z: 70, hides: 'mug' as SlotId },
};
