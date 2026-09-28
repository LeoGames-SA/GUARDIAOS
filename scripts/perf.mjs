/**
 * Mide respuesta a interacciones en un recorrido real con la API Event Timing
 * (duración desde la entrada hasta el siguiente cuadro pintado) y tareas largas.
 * Uso: npm run build && npx vite preview --port 4173 &  node scripts/perf.mjs [url]
 * Resultado: tabla por interacción. No reemplaza una medición en tu equipo.
 */
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript(() => {
  window.__perf = { events: [], long: [] };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__perf.events.push({ name: e.name, dur: e.duration, t: e.startTime });
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__perf.long.push({ dur: e.duration, t: e.startTime });
  }).observe({ type: 'longtask', buffered: true });
});
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForLoadState('networkidle');
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  return {
    domContentLoaded: Math.round(n.domContentLoadedEventEnd),
    load: Math.round(n.loadEventEnd),
    bytes: res.reduce((s, r) => s + (r.transferSize || 0), 0) + (n.transferSize || 0),
  };
});

const steps = [];
async function step(label, fn) {
  const before = await page.evaluate(() => window.__perf.events.length);
  const t0 = Date.now();
  await fn();
  await page.waitForTimeout(250);
  const evs = await page.evaluate((b) => window.__perf.events.slice(b), before);
  steps.push({
    label,
    maxEventMs: Math.round(Math.max(0, ...evs.map((e) => e.dur))),
    wallMs: Date.now() - t0 - 250,
  });
}

await step('Nueva guardia', async () => {
  await page.getByRole('button', { name: 'Nueva guardia' }).click();
  await page.getByRole('button', { name: 'Ir directo a la guardia' }).click();
  await page.locator('.hud-clock').waitFor();
});
await page.waitForTimeout(1500);
await step('Atender teléfono', () => page.getByRole('button', { name: /Teléfono: está sonando/ }).click());
await step('Abrir monitor', () => page.getByRole('button', { name: /Monitor: abrir GuardiaOS/ }).click());
await step('Abrir app Servicios', () =>
  page.locator('.os-icons').getByRole('button', { name: 'Servicios', exact: true }).click(),
);
await step('Ejecutar prueba', () =>
  page
    .locator('section.win')
    .getByRole('button', { name: /Ejecutar/ })
    .first()
    .click(),
);
await step('Mover ventana (arrastre)', async () => {
  const t = page.locator('section.win.active .win-title');
  const b = await t.boundingBox();
  await page.mouse.move(b.x + 60, b.y + 10);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(b.x + 60 + i * 8, b.y + 10 + i * 4);
  await page.mouse.up();
});
await step('Cerrar monitor', () => page.keyboard.press('Escape'));
await step('Abrir pizarra', () =>
  page.locator('aside.call').getByRole('button', { name: 'Pizarra', exact: true }).click(),
);
await step('Conectar nota', () => page.locator('.note').first().click());
await step('Cerrar pizarra', () => page.keyboard.press('Escape'));
await step('Contraer llamada', () => page.getByRole('button', { name: 'Contraer la llamada' }).click());
await step('Expandir llamada', () => page.getByRole('button', { name: 'Ver conversación' }).click());
await step('Poner en espera', () => page.getByRole('button', { name: 'Poner en espera' }).click());
await step('Retomar llamada', () => page.getByRole('button', { name: 'Retomar la llamada' }).click());
await step('Cortar llamada', () =>
  page.locator('aside.call').getByRole('button', { name: 'Cortar', exact: true }).click(),
);
await step('Café desde la taza', () => page.getByRole('button', { name: /Taza/ }).click());
await step('Saltar el sorbo', () => page.getByRole('button', { name: 'Saltar ›' }).click());
await step('Levantar cubo (carga 3D)', async () => {
  await page.getByRole('button', { name: 'Cubo 3×3' }).click();
  await page.getByText('Levantando el cubo…').waitFor({ state: 'detached' });
});
await page.waitForTimeout(500);
const c = await page.locator('.cube-canvas').boundingBox();
const drag = async (x0, y0, x1, y1) => {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / 20, y0 + ((y1 - y0) * i) / 20);
  await page.mouse.up();
};
await step('Cubo: girar el objeto', () => drag(c.x + 12, c.y + 12, c.x + 200, c.y + 120));
await step('Cubo: girar una capa', () =>
  drag(c.x + c.width / 2, c.y + c.height * 0.62, c.x + c.width * 0.8, c.y + c.height * 0.62),
);
await step('Cubo: devolver', () => page.getByRole('button', { name: 'Devolver a la mesa' }).click());
await page.waitForTimeout(500);
await step('Levantar pelota', () => page.getByRole('button', { name: 'Pelota antiestrés' }).click());
await page.waitForTimeout(500);
await step('Apretar y soltar pelota', async () => {
  const b = await page.getByRole('button', { name: 'Apretar la pelota' }).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
});
await step('Pelota: devolver', () => page.getByRole('button', { name: /Devolver a la mesa/ }).click());

const long = await page.evaluate(() => window.__perf.long);
console.log(
  `Carga: DOMContentLoaded ${nav.domContentLoaded} ms · load ${nav.load} ms · transferido ${(nav.bytes / 1024).toFixed(0)} KiB`,
);
console.log('Interacción'.padEnd(28), 'máx. evento→pintado (ms)', ' reloj de pared (ms)');
for (const s of steps)
  console.log(s.label.padEnd(28), String(s.maxEventMs).padStart(10), String(s.wallMs).padStart(20));
console.log(
  `Tareas largas (>50 ms): ${long.length}${long.length ? ` · máx ${Math.round(Math.max(...long.map((l) => l.dur)))} ms` : ''}`,
);
console.log('Nota: 0 significa que ningún evento superó el umbral de 16 ms.');
await browser.close();
