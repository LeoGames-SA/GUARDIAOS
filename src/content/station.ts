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

const common: Record<Exclude<SlotId, 'monitor' | 'monitor2' | 'plant' | 'keyboard' | 'mouse'>, Placement> = {
  corkboard: { art: 'corkboard', x: 78, y: 34, w: 690, z: 10 },
  lamp: { art: 'desk-lamp', x: -26, y: 318, w: 300, z: 22 },
  phoneBase: { art: 'telephone-base', x: 60, y: 522, w: 400, z: 40 },
  // Encastre calibrado sobre las dos horquillas de la base (ver docs/ARTE.md).
  handset: { art: 'telephone-handset', x: 110, y: 534, w: 115, z: 41 },
  mug: { art: 'coffee-mug', x: 478, y: 566, w: 142, z: 42 },
  cube: { art: 'rubik-cube', x: 640, y: 612, w: 92, z: 43 },
  ball: { art: 'stress-ball', x: 744, y: 650, w: 78, z: 44 },
  penHolder: { art: 'pen-holder', x: 770, y: 470, w: 84, z: 30 },
  notebook: { art: 'notebook', x: 388, y: 712, w: 540, z: 50 },
  manual: { art: 'manual', x: 1488, y: 826, w: 190, z: 48 },
  ticket: { art: 'ticket-paper', x: 214, y: 820, w: 176, z: 51, rotate: -6 },
  memo: { art: 'memo-paper', x: 842, y: 586, w: 96, z: 45, rotate: 8 },
  snack: { art: 'snack', x: 6, y: 780, w: 196, z: 45 },
};

export const LAYOUTS: Record<'single' | 'dual', Partial<Record<SlotId, Placement>>> = {
  single: {
    ...common,
    plant: { art: 'plant', x: 1512, y: 384, w: 176, z: 20 },
    monitor: { art: 'monitor', x: 880, y: 168, w: 720, z: 32 },
    keyboard: { art: 'keyboard', x: 976, y: 690, w: 520, z: 46 },
    mouse: { art: 'mouse', x: 1512, y: 712, w: 100, z: 47 },
  },
  dual: {
    ...common,
    monitor: { art: 'monitor', x: 830, y: 176, w: 660, z: 32 },
    monitor2: { art: 'monitor', x: 1410, y: 262, w: 330, z: 31 },
    keyboard: { art: 'keyboard', x: 930, y: 690, w: 500, z: 46 },
    mouse: { art: 'mouse', x: 1450, y: 716, w: 100, z: 47 },
  },
};

/** Poses de mano: decoración ligada a acciones, nunca cursor. Ocultan su duplicado. */
export const POSES = {
  phone: { art: 'hand-phone' as ArtId, x: 36, y: 520, w: 250, z: 70, hides: 'handset' as SlotId },
  coffee: { art: 'hand-coffee' as ArtId, x: 440, y: 520, w: 250, z: 70, hides: 'mug' as SlotId },
};
