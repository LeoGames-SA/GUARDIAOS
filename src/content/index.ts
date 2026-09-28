import type { Content } from '../engine/types';
import { case001 } from './cases/case-001-printer';
import { case002 } from './cases/case-002-share';
import { case003 } from './cases/case-003-portal';
import { tutorialAudio } from './cases/tutorial-audio';

/** Registro de contenido. Para agregar una noche: definir casos y sumarla a `nights`. */
export const CONTENT: Content = {
  cases: {
    [tutorialAudio.id]: tutorialAudio,
    [case001.id]: case001,
    [case002.id]: case002,
    [case003.id]: case003,
  },
  nights: {
    practice: { id: 'practice', label: 'Práctica', end: 480, cases: [tutorialAudio.id] },
    n1: { id: 'n1', label: 'Noche 1', end: 480, cases: [case001.id, case002.id, case003.id] },
  },
};

export { QA_SEEDS } from './cases/case-001-printer';
