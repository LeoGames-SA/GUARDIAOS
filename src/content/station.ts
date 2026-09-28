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
 * Encuadre abierto: objetos a ~80 % del tamaño anterior, separados entre sí y
 * completos dentro del fondo (borde frontal de la mesa ≈ y 880). El auricular
 * conserva la calibración sobre las horquillas escalada con la base.
 */
const BASE = { x: 64, y: 566, w: 330 };
const HANDSET_CAL = { dx: 50 / 400, dy: 12 / 400, w: 115 / 400 }; // relativo al ancho de la base

const common: Record<Exclude<SlotId, 'monitor' | 'monitor2' | 'plant' | 'keyboard' | 'mouse'>, Placement> = {
  corkboard: { art: 'corkboard', x: 112, y: 44, w: 604, z: 10 },
  lamp: { art: 'desk-lamp', x: -14, y: 336, w: 246, z: 22 },
  phoneBase: { art: 'telephone-base', ...BASE, z: 40 },
  handset: {
    art: 'telephone-handset',
    x: Math.round(BASE.x + HANDSET_CAL.dx * BASE.w),
    y: Math.round(BASE.y + HANDSET_CAL.dy * BASE.w),
    w: Math.round(HANDSET_CAL.w * BASE.w),
    z: 41,
  },
  mug: { art: 'coffee-mug', x: 432, y: 584, w: 116, z: 42 },
  cube: { art: 'rubik-cube', x: 570, y: 626, w: 76, z: 43 },
  ball: { art: 'stress-ball', x: 664, y: 652, w: 64, z: 44 },
  penHolder: { art: 'pen-holder', x: 716, y: 506, w: 68, z: 30 },
  notebook: { art: 'notebook', x: 430, y: 700, w: 400, z: 50 },
  manual: { art: 'manual', x: 1512, y: 606, w: 146, z: 28 },
  ticket: { art: 'ticket-paper', x: 858, y: 806, w: 124, z: 51, rotate: -8 },
  memo: { art: 'memo-paper', x: 770, y: 606, w: 82, z: 45, rotate: 8 },
  snack: { art: 'snack', x: 1466, y: 800, w: 172, z: 45 },
};

export const LAYOUTS: Record<'single' | 'dual', Partial<Record<SlotId, Placement>>> = {
  single: {
    ...common,
    plant: { art: 'plant', x: 1528, y: 402, w: 150, z: 20 },
    monitor: { art: 'monitor', x: 912, y: 196, w: 600, z: 32 },
    keyboard: { art: 'keyboard', x: 992, y: 690, w: 440, z: 46 },
    mouse: { art: 'mouse', x: 1452, y: 716, w: 84, z: 47 },
  },
  dual: {
    ...common,
    monitor: { art: 'monitor', x: 856, y: 206, w: 540, z: 32 },
    monitor2: { art: 'monitor', x: 1404, y: 326, w: 250, z: 31 },
    keyboard: { art: 'keyboard', x: 910, y: 690, w: 420, z: 46 },
    mouse: { art: 'mouse', x: 1356, y: 716, w: 84, z: 47 },
  },
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
  coffee: { art: 'hand-coffee' as ArtId, x: 360, y: 748, w: 236, z: 70, hides: 'mug' as SlotId },
};
