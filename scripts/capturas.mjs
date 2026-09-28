/**
 * Genera capturas de referencia en docs/capturas (menú, mesa, GuardiaOS, llamada, pizarra).
 * Uso: npm run build && npx vite preview --port 4173 &  node scripts/capturas.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import sharp from 'sharp';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = 'docs/capturas';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function shoot(size, name, setup) {
  const page = await browser.newPage({ viewport: size });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await setup(page);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}-${size.width}x${size.height}.png` });
  await page.close();
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

for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  const mobile = size.width < 700;
  await shoot(size, 'menu', async () => {});
  await shoot(size, 'mesa', (p) => start(p));
  await shoot(size, 'llamada', async (p) => {
    await start(p);
    await p.evaluate(() => window.__tdg.dispatch({ type: 'answerCall' }));
  });
  await shoot(size, 'guardiaos', async (p) => {
    await investigate(p);
    await (
      mobile
        ? p.locator('.mobile-nav').getByRole('button', { name: 'Monitor' })
        : p.getByRole('button', { name: /Monitor: abrir/ })
    ).click();
    await p.getByRole('button', { name: /Inicio/ }).click();
    await p.getByRole('menuitem', { name: /Eventos/ }).click();
  });
  await shoot(size, 'pizarra', async (p) => {
    await investigate(p);
    await (
      mobile
        ? p.locator('.mobile-nav').getByRole('button', { name: 'Pizarra' })
        : p.getByRole('button', { name: 'Pizarra de pruebas' })
    ).click();
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
