import { describe, expect, it } from 'vitest';
import { CONTENT, QA_SEEDS } from '../src/content';
import { hasProbableCause, readHypothesis } from '../src/engine/board';
import { createGame, HOLD_PATIENCE, step } from '../src/engine/game';
import { PAUSES } from '../src/engine/needs';
import { caseReport, nightSummary } from '../src/engine/report';
import type { Action, GameEvent, GameState } from '../src/engine/types';

function newNight(seed: number) {
  return createGame(CONTENT, { mode: 'campaign', nightId: 'n1', seed });
}

/** Aplica acciones y falla si alguna queda bloqueada. */
function run(state: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] } {
  let events: GameEvent[] = [];
  for (const a of actions) {
    const r = step(CONTENT, state, a);
    const blocked = r.events.find((e) => e.type === 'blocked');
    if (blocked) throw new Error(`Bloqueado ${JSON.stringify(a)}: ${(blocked as { reason: string }).reason}`);
    state = r.state;
    events = events.concat(r.events);
  }
  return { state, events };
}

const probe = (caseId: string, probeId: string): Action => ({ type: 'probe', caseId, probeId });
const p1 = (id: string) => probe('c001', id);

function answered(seed: number) {
  return run(newNight(seed), { type: 'answerCall' }).state;
}

describe('expediente 001: variantes deterministas', () => {
  it('las semillas de QA producen las tres causas', () => {
    expect(newNight(QA_SEEDS.driver).cases.c001!.variantId).toBe('driver');
    expect(newNight(QA_SEEDS.job).cases.c001!.variantId).toBe('job');
    expect(newNight(QA_SEEDS.dns).cases.c001!.variantId).toBe('dns');
  });

  it('la misma semilla produce el mismo estado', () => {
    expect(newNight(12345)).toEqual(newNight(12345));
  });

  it('la llamada de Elena suena a las 23:00 y su nombre no se conoce antes de atender', () => {
    const s = newNight(QA_SEEDS.driver);
    expect(s.incoming?.caseId).toBe('c001');
    expect(s.cases.c001!.contactKnown).toBe(false);
    const a = answered(QA_SEEDS.driver);
    expect(a.cases.c001!.contactKnown).toBe(true);
    expect(a.cases.c001!.status).toBe('active');
    expect(a.call?.lines[0]?.text).toContain('habla Nicolás');
  });

  it('driver: reiniciar el servicio no corrige; revertir el controlador sí', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, p1('t-service'), p1('i-restart-service')).state;
    expect(CONTENT.cases.c001!.isFixed(s.cases.c001!.world)).toBe(false);
    s = run(s, p1('i-rollback'), p1('v-retry')).state;
    expect(s.cases.c001!.confirmed).toBe(true);
    const r = run(s, { type: 'close', caseId: 'c001' }).state;
    expect(r.cases.c001!.outcome).toBe('verified');
  });

  it('job: cancelar el trabajo 412 corrige; revertir el controlador es una consecuencia', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('t-queue'), p1('i-cancel-job'), p1('i-notify-resend'), p1('v-retry'), {
      type: 'close',
      caseId: 'c001',
    }).state;
    expect(s.cases.c001!.outcome).toBe('verified');
    const report = caseReport(CONTENT, s, 'c001')!;
    expect(report.checklist).toEqual([{ text: expect.any(String), done: true }]);

    let w = answered(QA_SEEDS.job);
    w = run(w, p1('i-rollback')).state;
    expect(w.cases.c001!.consequences.length).toBe(1);
    w = run(w, p1('t-queue'), p1('i-cancel-job'), p1('v-retry'), { type: 'close', caseId: 'c001' }).state;
    expect(w.cases.c001!.outcome).toBe('costly');
  });

  it('dns: corregir el registro no basta hasta renovar la caché de la PC', () => {
    let s = answered(QA_SEEDS.dns);
    s = run(s, p1('t-ping-name'), p1('t-ping-ip'), p1('i-fix-dns'), p1('v-retry')).state;
    expect(s.cases.c001!.confirmed).toBe(false);
    s = run(s, p1('i-flush'), p1('v-retry'), { type: 'close', caseId: 'c001' }).state;
    expect(s.cases.c001!.outcome).toBe('verified');
  });

  it('dns: la caché expira sola 60 minutos después de corregir el registro (evento programado)', () => {
    let s = answered(QA_SEEDS.dns);
    s = run(s, p1('i-fix-dns')).state;
    const t0 = s.minute;
    s = run(
      s,
      { type: 'hangUp' },
      { type: 'pause', kind: 'eat' },
      { type: 'pause', kind: 'eat' },
      { type: 'pause', kind: 'eat' },
    ).state;
    expect(s.minute).toBeGreaterThanOrEqual(t0 + 60);
    expect(s.cases.c001!.world.pcCache).toBe('10.20.0.15');
  });

  it('pruebas coherentes antes y después de una intervención', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('t-queue')).state;
    const before = s.cases.c001!.runs.at(-1)!.summary;
    s = run(s, p1('i-cancel-job'), p1('t-queue')).state;
    const after = s.cases.c001!.runs.at(-1)!.summary;
    expect(before).toContain('#412');
    expect(after).not.toContain('#412');
  });

  it('repetir una prueba sin cambios es relectura gratis y no crea notas', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, p1('t-service')).state;
    const minute = s.minute;
    const notes = s.cases.c001!.notes.length;
    const r = step(CONTENT, s, p1('t-service'));
    expect(r.events).toEqual([{ type: 'result', caseId: 'c001', probeId: 't-service', reread: true }]);
    expect(r.state.minute).toBe(minute);
    expect(r.state.cases.c001!.notes.length).toBe(notes);
  });

  it('no se puede cerrar sin verificación, aunque el problema esté corregido', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('t-queue'), p1('i-cancel-job')).state;
    const r = step(CONTENT, s, { type: 'close', caseId: 'c001' });
    expect(r.events[0]).toMatchObject({ type: 'blocked' });
  });

  it('«¿podés probar de nuevo?» exige una intervención previa', () => {
    const s = answered(QA_SEEDS.driver);
    expect(step(CONTENT, s, p1('v-retry')).events[0]).toMatchObject({ type: 'blocked' });
  });
});

describe('reloj compartido y eventos', () => {
  it('una acción avanza el reloj una sola vez y afecta los plazos de ambos casos', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }, { type: 'pause', kind: 'eat' }).state; // 23:20 → llega 002
    expect(s.minute).toBe(20);
    s = run(s, { type: 'take', caseId: 'c002' }).state;
    expect(s.activeIds).toEqual(['c001', 'c002']);
    const r = run(s, probe('c002', 't-events'));
    expect(r.state.minute).toBe(23);
    expect(r.events.filter((e) => e.type === 'time')).toEqual([{ type: 'time', from: 20, to: 23 }]);
    // Saltar hasta después del plazo de 001 (00:30) con pausas: 001 marca plazo vencido.
    let t = r.state;
    while (t.minute < 95) t = run(t, { type: 'pause', kind: 'eat' }).state;
    expect(t.cases.c001!.deadlinePassed).toBe(true);
    expect(t.cases.c002!.deadlinePassed).toBe(false);
  });

  it('un salto largo procesa en orden llegadas y plazos sin perder ni duplicar', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }).state;
    const r = run(s, { type: 'endShift' });
    const arrivals = r.events
      .filter((e) => e.type === 'arrival')
      .map((e) => (e as { caseId: string }).caseId);
    expect(arrivals).toEqual(['c002', 'c003']);
    const deadlines = r.events
      .filter((e) => e.type === 'deadline')
      .map((e) => (e as { caseId: string }).caseId);
    expect(deadlines).toEqual(['c001', 'c002', 'c003']);
    expect(r.state.ended).toBe(true);
    expect(r.state.minute).toBe(480);
    // Ningún evento queda sin procesar ni se procesa dos veces al reintentar.
    expect(r.state.events.every((e) => e.done)).toBe(true);
    expect(step(CONTENT, r.state, { type: 'wait' }).events[0]).toMatchObject({ type: 'blocked' });
  });

  it('restaurar un guardado a mitad de turno no repite eventos ni costos', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, p1('t-service'), { type: 'hangUp' }, { type: 'pause', kind: 'eat' }).state;
    const restored = JSON.parse(JSON.stringify(s)) as GameState;
    const a = run(restored, { type: 'wait' });
    const b = run(s, { type: 'wait' });
    expect(a.state).toEqual(b.state);
    expect(restored.cases.c002!.messages.length).toBe(1);
  });

  it('esperar salta los seguimientos y plazos de casos ya resueltos', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('t-queue'), p1('i-cancel-job'), p1('v-retry'), { type: 'close', caseId: 'c001' }).state;
    s = run(s, { type: 'wait' }).state; // 23:20: llega 002
    s = run(s, { type: 'take', caseId: 'c002' }).state;
    s = run(s, { type: 'escalate', caseId: 'c002' }).state;
    s = run(s, { type: 'wait' }).state;
    expect(s.minute).toBe(120); // 01:00, sin frenar en 23:40, 00:15, 00:30 ni 02:00
  });

  it('una llamada no atendida en 10 minutos queda perdida con contestador', () => {
    const s = newNight(QA_SEEDS.driver);
    const r = run(s, { type: 'pause', kind: 'air' });
    expect(r.state.incoming).toBeNull();
    expect(r.state.cases.c001!.flags).toContain('voicemail');
    expect(r.events.some((e) => e.type === 'missed')).toBe(true);
    const back = run(r.state, { type: 'callContact', caseId: 'c001' }).state;
    expect(back.cases.c001!.status).toBe('active');
  });

  it('sólo dos expedientes activos a la vez', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }).state;
    while (s.minute < 121) s = run(s, { type: 'pause', kind: 'eat' }).state;
    s = run(s, { type: 'take', caseId: 'c002' }).state;
    expect(step(CONTENT, s, { type: 'take', caseId: 'c003' }).events[0]).toMatchObject({ type: 'blocked' });
  });
});

describe('pizarra: separación por expediente y respaldo', () => {
  it('no se puede conectar una nota de otro expediente', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(
      s,
      p1('t-service'),
      { type: 'hangUp' },
      { type: 'pause', kind: 'eat' },
      { type: 'take', caseId: 'c002' },
    ).state;
    const note001 = s.cases.c001!.notes[0]!;
    const r = step(CONTENT, s, { type: 'link', caseId: 'c002', noteId: note001.id, hypId: 'perm' });
    expect(r.events[0]).toMatchObject({ type: 'blocked' });
    s = run(s, probe('c002', 't-groups')).state;
    expect(s.cases.c002!.notes.every((n) => n.caseId === 'c002')).toBe(true);
    expect(s.cases.c001!.notes.every((n) => n.caseId === 'c001')).toBe(true);
  });

  it('el respaldo depende de las notas conectadas y su relación observada', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, p1('t-service'), p1('t-events-srv'), p1('q-message')).state;
    const cs = s.cases.c001!;
    for (const n of cs.notes) s = run(s, { type: 'link', caseId: 'c001', noteId: n.id, hypId: 'drv' }).state;
    s = run(s, { type: 'setWorking', caseId: 'c001', hypId: 'drv' }).state;
    const reading = readHypothesis(CONTENT.cases.c001!, s.cases.c001!, 'drv');
    expect(reading.score).toBe(5);
    expect(reading.level).toBe('fuerte');
    expect(hasProbableCause(CONTENT.cases.c001!, s.cases.c001!)).toBe(true);
  });

  it('una afirmación de la persona sola no contradice ni descarta', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('q-restart')).state;
    const note = s.cases.c001!.notes[0]!;
    s = run(s, { type: 'link', caseId: 'c001', noteId: note.id, hypId: 'hw' }).state;
    expect(readHypothesis(CONTENT.cases.c001!, s.cases.c001!, 'hw').level).not.toBe('contradicha');
  });

  it('tranquilizar da como máximo una mejora de confianza por llamada', () => {
    let s = answered(QA_SEEDS.driver);
    const t0 = s.cases.c001!.trust;
    s = run(s, { type: 'reassure', kind: 'urgency' }, { type: 'reassure', kind: 'urgency' }).state;
    expect(s.cases.c001!.trust).toBe(t0 + 1);
  });
});

describe('expedientes 002 y 003', () => {
  function at002() {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }, { type: 'pause', kind: 'eat' }, { type: 'take', caseId: 'c002' }).state;
    return s;
  }

  it('002: sin autorización no se puede aplicar el grupo; escalar es apropiado', () => {
    const s = at002();
    expect(step(CONTENT, s, probe('c002', 'i-add-editors')).events[0]).toMatchObject({ type: 'blocked' });
    const e = run(s, { type: 'escalate', caseId: 'c002' }).state;
    expect(e.cases.c002!.outcome).toBe('escalated');
    expect(e.cases.c002!.escalationAppropriate).toBe(true);
  });

  it('002: recorrido completo con autorización, alta y renovación de sesión', () => {
    let s = at002();
    s = run(
      s,
      probe('c002', 't-groups'),
      probe('c002', 't-requests'),
      probe('c002', 'i-add-editors'),
      probe('c002', 'v-try'),
    ).state;
    expect(s.cases.c002!.confirmed).toBe(false);
    s = run(s, probe('c002', 'i-renew-session'), probe('c002', 'v-try'), {
      type: 'close',
      caseId: 'c002',
    }).state;
    expect(s.cases.c002!.outcome).toBe('verified');
  });

  it('003: exige revalidación del monitor y comunicación en el ticket', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }).state;
    while (s.minute < 120) s = run(s, { type: 'wait' }).state;
    s = run(s, { type: 'take', caseId: 'c003' }).state;
    s = run(s, probe('c003', 't-services'), probe('c003', 'i-start-app'), probe('c003', 't-health')).state;
    expect(step(CONTENT, s, { type: 'close', caseId: 'c003' }).events[0]).toMatchObject({ type: 'blocked' });
    s = run(s, probe('c003', 'v-monitor')).state;
    expect(step(CONTENT, s, { type: 'close', caseId: 'c003' }).events[0]).toMatchObject({ type: 'blocked' });
    s = run(s, probe('c003', 'c-publish'), { type: 'close', caseId: 'c003' }).state;
    expect(s.cases.c003!.outcome).toBe('verified');
    expect(caseReport(CONTENT, s, 'c003')!.cause).toContain('mantenimiento');
  });

  it('el informe no existe mientras el expediente está abierto', () => {
    const s = answered(QA_SEEDS.driver);
    expect(caseReport(CONTENT, s, 'c001')).toBeNull();
  });
});

describe('Nico: necesidades acotadas', () => {
  it('los medidores quedan entre 0 y 100 aunque se repitan pausas', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }).state;
    for (let i = 0; i < 12; i++) s = run(s, { type: 'pause', kind: 'coffee' }).state;
    for (const v of Object.values(s.needs)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('la pelota no baja el estrés infinitamente sin que pase el tiempo', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }).state;
    const n0 = s.needs.stress;
    s = run(s, { type: 'pause', kind: 'ball' }).state;
    const n1 = s.needs.stress;
    s = run(s, { type: 'pause', kind: 'ball' }).state;
    expect(n0 - n1).toBeGreaterThan(5);
    expect(n1 - s.needs.stress).toBeLessThan(2);
    expect(s.minute).toBe(2 * PAUSES.ball.minutes);
  });

  it('el gato da su recompensa una sola vez por noche', () => {
    let s = answered(QA_SEEDS.driver);
    s = run(s, { type: 'hangUp' }, { type: 'pause', kind: 'cat' }).state;
    const after = s.needs.stress;
    s = run(s, { type: 'pause', kind: 'cat' }).state;
    expect(s.needs.stress).toBeGreaterThanOrEqual(after);
  });

  it('el cansancio encarece visiblemente las pruebas', () => {
    let s = answered(QA_SEEDS.driver);
    s = { ...s, needs: { ...s.needs, energy: 10 } };
    const r = run(s, p1('t-events-srv'));
    expect(r.state.minute).toBe(4); // 3 min × 1,25 → 4
  });
});

describe('práctica y resumen', () => {
  it('la práctica no consume tiempo y se resuelve con la secuencia enseñada', () => {
    let s = createGame(CONTENT, { mode: 'practice', nightId: 'practice', seed: 0 });
    const pp = (id: string) => probe('p001', id);
    s = run(
      s,
      { type: 'answerCall' },
      pp('q-what'),
      pp('t-output'),
      pp('i-headset'),
      pp('t-sound'),
      pp('v-hear'),
      {
        type: 'close',
        caseId: 'p001',
      },
    ).state;
    expect(s.minute).toBe(0);
    expect(s.cases.p001!.outcome).toBe('verified');
  });

  it('la mejora se desbloquea con dos expedientes verificados', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('t-queue'), p1('i-cancel-job'), p1('v-retry'), { type: 'close', caseId: 'c001' }).state;
    s = run(s, { type: 'hangUp' }, { type: 'pause', kind: 'eat' }, { type: 'take', caseId: 'c002' }).state;
    s = run(
      s,
      probe('c002', 't-requests'),
      probe('c002', 'i-add-editors'),
      probe('c002', 'i-renew-session'),
      probe('c002', 'v-try'),
      {
        type: 'close',
        caseId: 'c002',
      },
    ).state;
    s = run(s, { type: 'endShift' }).state;
    const sum = nightSummary(CONTENT, s);
    expect(sum.resolved).toBe(2);
    expect(sum.unlockSecondMonitor).toBe(true);
    expect(sum.reports.find((r) => r.caseId === 'c003')!.outcome).toBe('unresolved');
  });
});

describe('llamadas: espera, retomar y despedida', () => {
  it('poner en espera deja una frase, bloquea preguntas y retomar continúa el diálogo', () => {
    let s = answered(QA_SEEDS.job);
    const before = s.call!.lines.length;
    s = run(s, { type: 'hold' }).state;
    expect(s.call!.held).toBe(true);
    expect(s.call!.lines.slice(before).map((l) => l.speaker)).toEqual(['nico', 'contact']);
    expect(s.call!.lines[before]!.text).toContain('espera');
    expect(step(CONTENT, s, p1('q-since')).events[0]).toMatchObject({ type: 'blocked' });
    // Investigar en espera sí se puede.
    s = run(s, p1('t-queue')).state;
    s = run(s, { type: 'resume' }).state;
    expect(s.call!.held).toBe(false);
    expect(s.cases.c001!.status).toBe('active');
    expect(s.call!.lines.at(-1)!.text).toBe('Sí, acá estoy.');
    s = run(s, p1('q-since')).state; // la conversación sigue, no se reinicia
    expect(s.call!.lines[0]!.text).toContain('habla Nicolás');
  });

  it('una espera larga en minutos simulados impacienta (una vez) y se comunica', () => {
    let s = answered(QA_SEEDS.job);
    const trust = s.cases.c001!.trust;
    s = run(
      s,
      { type: 'hold' },
      p1('t-events-srv'),
      p1('t-events-pc'),
      p1('t-queue'),
      p1('t-testpage'),
      p1('t-ping-name'),
      p1('t-ping-ip'),
      p1('t-panel'),
    ).state;
    expect(s.minute).toBeGreaterThan(HOLD_PATIENCE);
    s = run(s, { type: 'resume' }).state;
    expect(s.cases.c001!.trust).toBe(trust - 1);
    expect(s.history.at(-1)!.result).toContain('se impacientó');
  });

  it('cerrar por teléfono: despedida en la llamada, que queda abierta hasta colgar; sin duplicar el cierre', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, p1('t-queue'), p1('i-cancel-job'), p1('v-retry'), { type: 'close', caseId: 'c001' }).state;
    expect(s.cases.c001!.status).toBe('closed');
    expect(s.call?.ended).toBe(true);
    expect(s.call!.lines.at(-2)!.speaker).toBe('nico');
    expect(s.call!.lines.at(-1)!.text).toMatch(/gracias/i);
    expect(step(CONTENT, s, { type: 'close', caseId: 'c001' }).events[0]).toMatchObject({ type: 'blocked' });
    const minute = s.minute;
    s = run(s, { type: 'hangUp' }).state;
    expect(s.call).toBeNull();
    expect(s.minute).toBe(minute);
    expect(s.history.filter((h) => h.action === 'Cerré 001')).toHaveLength(1);
  });

  it('cerrar por correo agrega un mensaje de cierre coherente con el canal', () => {
    let s = answered(QA_SEEDS.job);
    s = run(s, { type: 'hangUp' }, { type: 'wait' }, { type: 'take', caseId: 'c002' }).state;
    s = run(
      s,
      probe('c002', 't-requests'),
      probe('c002', 'i-add-editors'),
      probe('c002', 'i-renew-session'),
      probe('c002', 'v-try'),
      { type: 'close', caseId: 'c002' },
    ).state;
    const last = s.cases.c002!.messages.at(-1)!;
    expect(last.outgoing).toBe(true);
    expect(last.subject).toContain('[resuelto]');
  });
});
