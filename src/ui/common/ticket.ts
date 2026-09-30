import type { CaseDef, CaseState } from '../../engine/types';

/** Datos del ticket compartidos por la hoja impresa y el Centro de tickets (sin contradicciones). */
export function priority(def: CaseDef): 'Alta' | 'Media' {
  return def.deadline !== null && def.deadline - def.arrival <= 120 ? 'Alta' : 'Media';
}

export const CHANNEL: Record<CaseDef['channel'], string> = {
  phone: '☎ Teléfono',
  email: '✉ Correo',
  auto: '⚠ Automático',
};

/**
 * El equipo afectado se conoce cuando aparece en la solicitud original o en algo que Nico
 * ya consultó (notas o pruebas ejecutadas). Nunca se completa por adelantado.
 */
export function deviceKnown(def: CaseDef, cs: CaseState): boolean {
  const dev = def.contact.device;
  if (!dev) return false;
  const seen = [
    def.channel === 'phone' ? '' : def.summary,
    ...cs.notes.map((n) => n.text),
    ...cs.runs.map((r) => `${def.probes.find((p) => p.id === r.probeId)?.label ?? ''} ${r.summary}`),
  ];
  return seen.some((t) => t.includes(dev));
}
