/**
 * Grabación breve de los movimientos (llamada con espera, café, cubo 3D y pelota).
 * Uso: npm run build && npx vite preview --port 4173 &
 *      node scripts/grabacion.mjs [url] [carpeta]
 * Deja un .webm por recorrido (Playwright + ffmpeg incluido en los navegadores).
 */
import { chromium } from '@playwright/test';
import { mkdir, rename } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'docs/grabaciones';
const only = process.argv[4]?.split(',');
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const size = { width: 1366, height: 768 };

async function record(name, fn, init = 'campaign') {
  if (only && !only.includes(name)) return;
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: out, size } });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate((mode) => {
    window.__tdg.setPrefs({ typewriter: true, sound: false });
    if (mode === 'practice') window.__tdg.startPractice('menu');
    else window.__tdg.newCampaign(7);
  }, init);
  try {
    await fn(page);
  } finally {
    const video = page.video();
    await ctx.close();
    await rename(await video.path(), `${out}/${name}.webm`);
  }
}
const pause = (p, ms) => p.waitForTimeout(ms);

await record('llamada-espera', async (p) => {
  await pause(p, 800);
  await p.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  await pause(p, 2500);
  const call = p.locator('aside.call');
  await call.getByRole('button', { name: '¿Hubo algún cambio hoy?' }).click();
  await pause(p, 2500);
  await call.getByRole('button', { name: 'Poner en espera' }).click();
  await pause(p, 1800);
  await call.getByRole('button', { name: 'GuardiaOS', exact: true }).click();
  await pause(p, 1500);
  await p.keyboard.press('Escape');
  await pause(p, 600);
  await p
    .getByRole('button', { name: /Retomar/ })
    .first()
    .click();
  await pause(p, 2200);
  await call.getByRole('button', { name: 'Pizarra', exact: true }).click();
  await pause(p, 1800);
});

await record('cafe-y-comida', async (p) => {
  await p.evaluate(() => {
    window.__tdg.dispatch({ type: 'answerCall' });
    window.__tdg.dispatch({ type: 'hangUp' });
  });
  await pause(p, 600);
  await p.getByRole('button', { name: /Taza/ }).click();
  await pause(p, 3500);
  await p.getByRole('button', { name: /Sándwich/ }).click();
  await pause(p, 1500);
  await p.getByRole('button', { name: /Comer · 20 min/ }).click();
  await pause(p, 2500);
});

await record('cubo-y-pelota', async (p) => {
  await p.evaluate(() => {
    window.__tdg.dispatch({ type: 'answerCall' });
    window.__tdg.dispatch({ type: 'hangUp' });
  });
  await pause(p, 500);
  await p.getByRole('button', { name: 'Cubo 3×3' }).click();
  await pause(p, 1200);
  const c = await p.locator('.cube-canvas').boundingBox();
  const cx = c.x + c.width / 2;
  const cy = c.y + c.height / 2;
  const drag = async (x0, y0, x1, y1) => {
    await p.mouse.move(x0, y0);
    await p.mouse.down();
    await p.mouse.move(x1, y1, { steps: 20 });
    await p.mouse.up();
    await pause(p, 500);
  };
  await drag(cx, cy + c.height * 0.12, cx + c.width * 0.3, cy + c.height * 0.12); // capa
  await drag(c.x + 12, c.y + 12, c.x + 220, c.y + 140); // objeto entero
  await drag(cx - c.width * 0.08, cy + c.height * 0.05, cx - c.width * 0.08, cy - c.height * 0.25); // otra capa
  await drag(cx, cy + c.height * 0.12, cx + c.width * 0.05, cy + c.height * 0.12); // poco: vuelve a su lugar
  await p.locator('.cube-stage').press('r');
  await pause(p, 700);
  await p.getByRole('button', { name: 'Devolver a la mesa' }).click();
  await pause(p, 900);
  await p.getByRole('button', { name: 'Pelota antiestrés' }).click();
  await pause(p, 800);
  const b = await p.getByRole('button', { name: 'Apretar la pelota' }).boundingBox();
  for (let i = 0; i < 3; i++) {
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down();
    await pause(p, 600);
    await p.mouse.up();
    await pause(p, 700);
  }
  await p.getByRole('button', { name: /Devolver a la mesa/ }).click();
  await pause(p, 2000);
});

await record('cubo-gestos', async (p) => {
  await p.evaluate(() => {
    window.__tdg.dispatch({ type: 'answerCall' });
    window.__tdg.dispatch({ type: 'hangUp' });
  });
  await pause(p, 400);
  await p.getByRole('button', { name: 'Cubo 3×3' }).click();
  await pause(p, 1200);
  const c = await p.locator('.cube-canvas').boundingBox();
  const drag = async (x0, y0, dx, dy, steps = 24) => {
    await p.mouse.move(x0, y0);
    await p.mouse.down();
    await p.mouse.move(x0 + dx, y0 + dy, { steps });
    await p.mouse.up();
    await pause(p, 450);
  };
  const best = async () =>
    (await p.evaluate(() => window.__tdgCube.debug())).stickers.sort((a, b) => b.facing - a.facing)[0];
  for (const [ox, oy] of [
    [0, 0],
    [160, 60],
    [-90, 150],
  ]) {
    if (ox || oy) await drag(c.x + 10, c.y + 10, ox, oy, 30); // girar el objeto en el espacio libre
    const s = await best();
    await drag(s.x, s.y, c.width * 0.3, 0); // capa hacia un costado
    const s2 = await best();
    await drag(s2.x, s2.y, 0, c.height * 0.3); // capa hacia abajo
    const s3 = await best();
    await drag(s3.x, s3.y, 14, 6, 8); // gesto corto: vuelve
  }
  await p.getByRole('button', { name: 'Mezclar' }).click();
  await pause(p, 1200);
  await p.getByRole('button', { name: 'Devolver a la mesa' }).click(); // cierre a mitad: estado válido
  await pause(p, 1200);
});

await record(
  'asistencia-remota',
  async (p) => {
    await pause(p, 600);
    await p.getByRole('button', { name: /Teléfono: está sonando/ }).click();
    await pause(p, 2600);
    const call = p.locator('aside.call');
    await call.getByRole('button', { name: '¿Qué usás para escuchar?' }).click();
    await pause(p, 3500);
    await call.getByRole('button', { name: /solicitud de asistencia/ }).click();
    await pause(p, 3500);
    await p.getByRole('button', { name: /Monitor: abrir GuardiaOS/ }).click();
    await pause(p, 600);
    await p.locator('.os-icons').getByRole('button', { name: 'Acceso remoto', exact: true }).click();
    await pause(p, 500);
    await p.getByRole('button', { name: /PC-REC-01/ }).click();
    await pause(p, 900);
    await p.getByRole('button', { name: 'Conectar a PC-REC-01' }).click();
    await pause(p, 2200);
    const win = p.locator('section.win-remote');
    await win.getByRole('button', { name: /Sonido del equipo remoto/ }).click();
    await pause(p, 1400);
    const fly = win.getByRole('region', { name: 'Sonido' });
    await fly.getByRole('button', { name: /Monitor DELL/ }).click();
    await pause(p, 1400);
    await fly.getByRole('option', { name: /Altavoces/ }).click(); // salida equivocada
    await pause(p, 800);
    await fly.getByRole('button', { name: /Probar sonido/ }).click();
    await pause(p, 1600);
    await p.keyboard.press('Escape');
    await pause(p, 400);
    await call.getByRole('button', { name: '¿Ahora lo escuchás?' }).click();
    await pause(p, 3500);
    await p.getByRole('button', { name: /Monitor: abrir GuardiaOS/ }).click();
    await pause(p, 600);
    const w2 = p.locator('section.win-remote');
    await w2.getByRole('button', { name: /Sonido del equipo remoto/ }).click();
    await pause(p, 800);
    const f2 = w2.getByRole('region', { name: 'Sonido' });
    await f2
      .getByRole('link', { name: /Configuración/ })
      .or(f2.getByRole('button', { name: /Configuración/ }))
      .click();
    await pause(p, 800);
    await w2
      .getByRole('region', { name: 'Configuración de sonido' })
      .getByRole('button', { name: 'Propiedades' })
      .last()
      .click();
    await pause(p, 1500);
    await w2.getByRole('button', { name: /Sonido del equipo remoto/ }).click();
    await pause(p, 600);
    const f3 = w2.getByRole('region', { name: 'Sonido' });
    await f3.getByRole('button', { name: /Altavoces/ }).click();
    await pause(p, 700);
    await f3.getByRole('option', { name: /Auriculares USB/ }).click();
    await pause(p, 700);
    await f3.getByRole('button', { name: /Probar sonido/ }).click();
    await pause(p, 1800);
    await p.keyboard.press('Escape');
    await pause(p, 400);
    await call.getByRole('button', { name: '¿Ahora lo escuchás?' }).click();
    await pause(p, 3500);
    await call.getByRole('button', { name: 'Pizarra', exact: true }).click();
    await pause(p, 2500);
    await p.keyboard.press('Escape');
    await pause(p, 400);
    await p.getByRole('button', { name: /Monitor: abrir GuardiaOS/ }).click();
    await pause(p, 600);
    await p.locator('section.win-remote').getByRole('button', { name: 'Desconectar' }).click();
    await pause(p, 1800);
  },
  'practice',
);

await browser.close();
console.log(`Grabaciones en ${out}`);
