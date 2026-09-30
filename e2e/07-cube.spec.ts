import { expect, test, type Page } from '@playwright/test';
import { fresh, startGuard } from './helpers';

type Dbg = { q: number[]; stickers: { i: number; x: number; y: number; facing: number }[] };
const dbg = (page: Page) =>
  page.evaluate(() => (window as unknown as { __tdgCube: { debug: () => Dbg } }).__tdgCube.debug());
const cube = (page: Page) =>
  page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('tdg.profile') ?? 'null')?.data.cube as
        { state: string; moves: number; history: string[] } | undefined) ?? {
        state: '',
        moves: 0,
        history: [],
      },
  );
const valid = (s: string) => s.length === 54 && [...'URFDLB'].every((f) => s.split(f).length - 1 === 9);

async function drag(page: Page, x: number, y: number, dx: number, dy: number) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(350); // encaje
}

async function lift(page: Page) {
  await fresh(page);
  await startGuard(page, 7);
  await page.evaluate(() => {
    const t = (window as unknown as { __tdg: { dispatch: (a: unknown) => void } }).__tdg;
    t.dispatch({ type: 'answerCall' });
    t.dispatch({ type: 'hangUp' });
  });
  await page.getByRole('button', { name: 'Cubo 3×3' }).click();
  await expect(page.getByText('Levantando el cubo…')).toHaveCount(0);
  await page.waitForTimeout(600);
  return (await page.locator('.cube-canvas').boundingBox())!;
}

test('cubo: desde varios ángulos, arrastrar una pegatina gira una capa y el espacio libre gira el objeto', async ({
  page,
}) => {
  const c = await lift(page);
  let expected = 0;
  // Tres orientaciones distintas, alcanzadas arrastrando en el espacio libre.
  for (const [dx, dy] of [
    [0, 0],
    [170, 40],
    [-60, 160],
  ]) {
    const before = await dbg(page);
    if (dx || dy) {
      await drag(page, c.x + 8, c.y + 8, dx, dy);
      const after = await dbg(page);
      expect(after.q).not.toEqual(before.q); // el objeto giró
      expect((await cube(page)).moves).toBe(expected); // sin tocar las capas
    }
    const d = await dbg(page);
    // Una pegatina bien visible, lejos del borde de su cara.
    const s = d.stickers.filter((x) => x.facing > 0.55).sort((a, b) => b.facing - a.facing)[0]!;
    // Clic: no gira nada.
    await page.mouse.click(s.x, s.y);
    await page.waitForTimeout(200);
    expect((await cube(page)).moves).toBe(expected);
    // Gesto corto: vuelve a su lugar.
    await drag(page, s.x, s.y, 12, 4);
    expect((await cube(page)).moves).toBe(expected);
    // Gesto real hacia un costado y luego hacia abajo: una capa cada vez, sin mover la cámara.
    for (const [gx, gy] of [
      [c.width * 0.32, 0],
      [0, c.height * 0.32],
    ]) {
      const q0 = (await dbg(page)).q;
      await drag(page, s.x, s.y, gx, gy);
      expected += 1;
      const now = await cube(page);
      expect(now.moves).toBe(expected);
      expect(valid(now.state)).toBe(true);
      expect((await dbg(page)).q).toEqual(q0);
    }
  }
});

test('mezclar: giros visibles uno por uno, sin gestos a mitad; cerrar o recargar deja un estado válido', async ({
  page,
}) => {
  const c = await lift(page);
  const start = (await cube(page)).state;
  await page.getByRole('button', { name: 'Mezclar' }).click();
  await expect(page.getByText(/Mezclando… \d+\/20/)).toBeVisible();
  // Los estados intermedios se guardan de a un giro (no se teletransporta el final).
  const mid1 = (await cube(page)).state;
  await page.waitForTimeout(400);
  const mid2 = (await cube(page)).state;
  expect(mid2).not.toBe(mid1);
  // Un gesto durante la mezcla no se acepta.
  const s = (await dbg(page)).stickers.sort((a, b) => b.facing - a.facing)[0]!;
  await drag(page, s.x, s.y, c.width * 0.3, 0);
  await expect(page.getByText(/Sin resolver · 0 movimientos/)).toBeVisible({ timeout: 8000 });
  const done = await cube(page);
  expect(done.history).toEqual([]);
  expect(valid(done.state)).toBe(true);
  expect(done.state).not.toBe(start);

  // Cerrar a mitad de otra mezcla: queda el último giro completo y no sigue cambiando.
  await page.getByRole('button', { name: 'Mezclar' }).click();
  await page.waitForTimeout(450);
  await page.getByRole('button', { name: 'Devolver a la mesa' }).click();
  await expect(page.getByRole('button', { name: 'Cubo 3×3' })).toBeVisible();
  const closed = (await cube(page)).state;
  expect(valid(closed)).toBe(true);
  await page.waitForTimeout(1500);
  expect((await cube(page)).state).toBe(closed);
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  expect((await cube(page)).state).toBe(closed);
});
