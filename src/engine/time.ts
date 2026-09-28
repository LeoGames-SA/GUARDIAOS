import type { Minute } from './types';

export const SHIFT_START_HOUR = 23;
export const SHIFT_END: Minute = 480;

/** 0 → «23:00», 75 → «00:15», 480 → «07:00». */
export function clock(minute: Minute): string {
  const total = (SHIFT_START_HOUR * 60 + Math.round(minute)) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function duration(minutes: Minute): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
