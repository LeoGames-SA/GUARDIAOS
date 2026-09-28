/**
 * Capturas comparables de la build (mismos tamaños y estados).
 * Uso: npm run build && npx vite preview --port 4173 &
 *      node scripts/capturas.mjs [url] [carpeta] [estados separados por coma]
 * Por defecto guarda WebP en docs/capturas.
 */
import { chromium } from '@playwright/test';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'docs/capturas';
const only = process.argv[4]?.split(',');
await mkdir(out, { recursive: true });
const browser = await chromium.launch();

const SIZES = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 3440, height: 1440 },
  { width: 390, height: 844 },
];

async function shoot(size, name, setup) {
  if (only && !only.includes(name)) return;
  const page = await browser.newPage({ viewport: size });
  try {
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await setup(page, size.width < 700);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${name}-${size.width}x${size.height}.png` });
  } catch (e) {
    console.log(`No se pudo capturar ${name} ${size.width}: ${String(e).split('\n')[0]}`);
  } finally {
    await page.close();
  }
}

const start = async (page, seed = 7) => {
  await page.evaluate((s) => {
    window.__tdg.setPrefs({ typewriter: false, sound: false });
    window.__tdg.newCampaign(s);
  }, seed);
};
const investigate = async (page) => {
  await start(page);
  await page.evaluate(() => {
    const t = window.__tdg;
    t.dispatch({ type: 'answerCall' });
    for (const id of ['q-changes', 'q-message', 't-service', 't-events-srv', 't-driver'])
      t.dispatch({ type: 'probe', caseId: 'c001', probeId: id });
    for (const n of t.game.cases.c001.notes)
      t.dispatch({ type: 'link', caseId: 'c001', noteId: n.id, hypId: 'drv' });
  });
};
const tap = async (page, mobile, sceneName, navName) => {
  // En móvil la llamada ocupa la parte inferior: se contrae para ver las herramientas.
  const collapse = page.getByRole('button', { name: 'Contraer la llamada' });
  if (mobile && (await collapse.isVisible().catch(() => false))) await collapse.click();
  return (
    mobile
      ? page.locator('.mobile-nav').getByRole('button', { name: navName })
      : page.getByRole('button', { name: sceneName })
  )
    .first()
    .click();
};
const openApp = async (page, mobile, app) => {
  await tap(page, mobile, /Monitor: abrir/, 'Monitor');
  await page.getByRole('button', { name: /Inicio/ }).click();
  await page.getByRole('menuitem', { name: new RegExp(app) }).click();
};

for (const size of SIZES) {
  await shoot(size, 'menu', async () => {});
  await shoot(size, 'menu-continuar', async (p) => {
    await start(p);
    await p.evaluate(() => window.__tdg.toMenu());
  });
  await shoot(size, 'mesa', (p) => start(p));
  await shoot(size, 'llamada', async (p) => {
    await start(p);
    await p.evaluate(() => window.__tdg.dispatch({ type: 'answerCall' }));
  });
  await shoot(size, 'llamada-pizarra', async (p, m) => {
    await investigate(p);
    if (m) await tap(p, m, 'Pizarra de pruebas', 'Pizarra');
    else await p.locator('aside.call').getByRole('button', { name: 'Pizarra', exact: true }).click();
  });
  await shoot(size, 'pizarra-vacia', async (p, m) => {
    await start(p);
    await tap(p, m, 'Pizarra de pruebas', 'Pizarra');
  });
  await shoot(size, 'guardiaos', async (p, m) => {
    await investigate(p);
    await openApp(p, m, 'Eventos');
  });
  await shoot(size, 'correo', async (p, m) => {
    await start(p);
    await p.evaluate(() => {
      const t = window.__tdg;
      t.dispatch({ type: 'answerCall' });
      t.dispatch({ type: 'hangUp' });
      t.dispatch({ type: 'wait' });
    });
    await openApp(p, m, 'Correo');
  });
  await shoot(size, 'navegador', async (p, m) => {
    await start(p);
    await openApp(p, m, 'Navegador');
  });
  await shoot(size, 'cafe', async (p, m) => {
    await start(p);
    await p.evaluate(() => {
      window.__tdg.dispatch({ type: 'answerCall' });
      window.__tdg.dispatch({ type: 'hangUp' });
    });
    await tap(p, m, /Taza/, 'Café');
    await p.waitForTimeout(700); // a mitad del sorbo
  });
  await shoot(size, 'cafe-resumen', async (p, m) => {
    await start(p);
    await p.evaluate(() => {
      window.__tdg.dispatch({ type: 'answerCall' });
      window.__tdg.dispatch({ type: 'hangUp' });
    });
    await tap(p, m, /Taza/, 'Café');
    await p.getByRole('button', { name: 'Saltar ›' }).click();
  });
  await shoot(size, 'comida', async (p, m) => {
    await start(p);
    await p.evaluate(() => {
      window.__tdg.dispatch({ type: 'answerCall' });
      window.__tdg.dispatch({ type: 'hangUp' });
    });
    await tap(p, m, /Sándwich/, 'Sándwich');
    await p.getByRole('button', { name: /Comer · 20 min/ }).click();
  });
  await shoot(size, 'cubo', async (p, m) => {
    await start(p);
    await p.evaluate(() => window.__tdg.cubeScramble());
    await tap(p, m, 'Cubo 3×3', 'Cubo');
    await p.getByText('Levantando el cubo…').waitFor({ state: 'detached' });
  });
  await shoot(size, 'pelota', async (p, m) => {
    await start(p);
    await tap(p, m, 'Pelota antiestrés', 'Pelota');
    await p.waitForTimeout(500);
    const b = await p.getByRole('button', { name: 'Apretar la pelota' }).boundingBox();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down(); // se captura apretada
  });
  await shoot(size, 'informe', async (p) => {
    await start(p, 1);
    await p.evaluate(() => {
      const t = window.__tdg;
      t.dispatch({ type: 'answerCall' });
      for (const id of ['t-queue', 'i-cancel-job', 'v-retry'])
        t.dispatch({ type: 'probe', caseId: 'c001', probeId: id });
      t.dispatch({ type: 'close', caseId: 'c001' });
    });
  });
}
await browser.close();
// WebP liviano para el repositorio.
for (const f of (await readdir(out)).filter((f) => f.endsWith('.png'))) {
  await sharp(`${out}/${f}`)
    .webp({ quality: 78 })
    .toFile(`${out}/${f.replace('.png', '.webp')}`);
  await unlink(`${out}/${f}`);
}
console.log(`Capturas en ${out}`);
