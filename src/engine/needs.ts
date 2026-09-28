import type { Minute, Needs, PauseKind } from './types';

/** Reglas de Nico. Todo depende de minutos narrativos, nunca del tiempo real. */
export const INITIAL_NEEDS: Needs = { energy: 78, stress: 18, bladder: 12, caffeine: 10 };

export const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Deriva por minuto transcurrido. */
export function drift(needs: Needs, minutes: Minute): Needs {
  const caffeineBoost = needs.caffeine > 30 ? 0.5 : 1;
  return {
    energy: round1(clamp(needs.energy - 0.12 * caffeineBoost * minutes)),
    stress: round1(clamp(needs.stress + 0.01 * minutes)),
    bladder: round1(clamp(needs.bladder + 0.14 * minutes + (needs.caffeine > 40 ? 0.04 * minutes : 0))),
    caffeine: round1(clamp(needs.caffeine - 0.18 * minutes)),
  };
}

export interface PauseDef {
  kind: PauseKind;
  label: string;
  minutes: Minute;
  effect: string;
  apply: (
    n: Needs,
    ctx: { lastBallAt: Minute | null; minute: Minute; catClaimed: boolean },
  ) => {
    needs: Needs;
    text: string;
  };
}

export const PAUSES: Record<PauseKind, PauseDef> = {
  coffee: {
    kind: 'coffee',
    label: 'Café',
    minutes: 5,
    effect: 'Energía +18 (menos si ya tomaste mucho). Cafeína +30 y algo más de ganas de ir al baño.',
    apply: (n) => {
      const strong = n.caffeine < 55;
      const needs = {
        energy: clamp(n.energy + (strong ? 18 : 7)),
        caffeine: clamp(n.caffeine + 30),
        bladder: clamp(n.bladder + 10),
        stress: clamp(n.stress + (n.caffeine > 60 ? 6 : 0)),
      };
      const text = strong
        ? 'Café recién hecho. Nico se despabila.'
        : 'Otro café más… Ya no despierta tanto y el pulso se acelera un poco.';
      return { needs, text };
    },
  },
  eat: {
    kind: 'eat',
    label: 'Comer algo',
    minutes: 20,
    effect: 'Energía +25, estrés −5.',
    apply: (n) => ({
      needs: {
        ...n,
        energy: clamp(n.energy + 25),
        stress: clamp(n.stress - 5),
        bladder: clamp(n.bladder + 5),
      },
      text: 'Un sándwich tostado en la cocina del piso. Llena más de lo que parece.',
    }),
  },
  bathroom: {
    kind: 'bathroom',
    label: 'Baño',
    minutes: 5,
    effect: 'Necesidad de baño a 0, estrés −3.',
    apply: (n) => ({
      needs: { ...n, bladder: 0, stress: clamp(n.stress - 3) },
      text: 'Pasillo en penumbra, luz de emergencia verde. Vuelta al puesto.',
    }),
  },
  air: {
    kind: 'air',
    label: 'Salir al patio',
    minutes: 10,
    effect: 'Estrés −18, energía +4.',
    apply: (n) => ({
      needs: { ...n, stress: clamp(n.stress - 18), energy: clamp(n.energy + 4) },
      text: 'Llovizna en el patio interno. El guardia de seguridad saluda desde la garita.',
    }),
  },
  smoke: {
    kind: 'smoke',
    label: 'Fumar en el patio',
    minutes: 10,
    effect: 'Estrés −18. Igual que tomar aire, sin ventaja extra.',
    apply: (n) => ({
      needs: { ...n, stress: clamp(n.stress - 18) },
      text: 'Un cigarrillo bajo el alero. El olor a lluvia tapa el humo. Nada que no hubiera hecho el aire.',
    }),
  },
  ball: {
    kind: 'ball',
    label: 'Pelota antiestrés',
    minutes: 2,
    effect: 'Estrés −6 si pasaron 30 min desde la última vez; si no, −1.',
    apply: (n, ctx) => {
      const fresh = ctx.lastBallAt === null || ctx.minute - ctx.lastBallAt >= 30;
      return {
        needs: { ...n, stress: clamp(n.stress - (fresh ? 6 : 1)) },
        text: fresh
          ? 'Apretar, soltar. La cara sonriente no juzga.'
          : 'La pelota ya no hace mucho efecto tan seguido.',
      };
    },
  },
  cat: {
    kind: 'cat',
    label: 'Mirar al gato',
    minutes: 1,
    effect: 'Una vez por noche: estrés −5.',
    apply: (n, ctx) => ({
      needs: { ...n, stress: clamp(n.stress - (ctx.catClaimed ? 0 : 5)) },
      text: ctx.catClaimed
        ? 'El gato sigue durmiendo.'
        : 'Un gatito durmiendo. Nico sonríe sin darse cuenta.',
    }),
  },
};

/** Multiplicador de costo visible: cansancio o baño urgente encarecen el trabajo técnico. */
export function costPenalty(n: Needs): { extra: number; reasons: string[] } {
  const reasons: string[] = [];
  if (n.energy < 25) reasons.push('cansancio');
  if (n.bladder > 85) reasons.push('necesita ir al baño');
  return { extra: reasons.length * 0.25, reasons };
}

export function adjustedCost(base: Minute, n: Needs): Minute {
  if (base <= 0) return 0;
  return Math.ceil(base * (1 + costPenalty(n).extra));
}

export type Mood = 'tranquilo' | 'cansado' | 'tenso' | 'necesita una pausa';

export function mood(n: Needs): Mood {
  const flags = [n.energy < 30, n.stress > 65, n.bladder > 80].filter(Boolean).length;
  if (flags >= 2 || n.energy < 15 || n.stress > 85 || n.bladder > 92) return 'necesita una pausa';
  if (n.energy < 30) return 'cansado';
  if (n.stress > 55) return 'tenso';
  return 'tranquilo';
}
