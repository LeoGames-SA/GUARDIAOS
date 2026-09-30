import { expect, test, type Page } from '@playwright/test';
import { fresh, openApp, openMonitor, runProbe, startGuard } from './helpers';

const stats = (page: Page) =>
  page.evaluate(() => ({
    ...(window as unknown as { __tdgSound: { stats: Record<string, number> } }).__tdgSound.stats,
  }));

test('voces: murmullos breves durante la escritura, se detienen al completar o poner en espera', async ({
  page,
}) => {
  await fresh(page, { typewriter: true });
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('tdg.prefs')!);
    raw.data.sound = true;
    localStorage.setItem('tdg.prefs', JSON.stringify(raw));
  });
  await startGuard(page, 1);
  const s0 = await stats(page);
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  await page.waitForTimeout(1200);
  const s1 = await stats(page);
  expect(s1.played).toBeGreaterThan(s0.played); // hubo murmullos mientras se escribía
  // Completar todas las frases con Enter: los murmullos paran.
  for (let i = 0; i < 8; i++) await page.keyboard.press('Enter');
  await expect(page.locator('aside.call .opt-title')).toBeVisible();
  const s2 = await stats(page);
  await page.waitForTimeout(600);
  const s3 = await stats(page);
  expect(s3.requested).toBe(s2.requested);
  expect(s3.stops).toBeGreaterThan(s0.stops);
  // Nunca una sílaba por letra: el total queda muy por debajo de los caracteres escritos.
  const chars = await page
    .locator('aside.call .said')
    .evaluateAll((els) => els.reduce((n, e) => n + (e.textContent?.length ?? 0), 0));
  expect(s3.played).toBeLessThan(chars / 3);
  // En espera no se reproducen voces.
  await page.locator('aside.call').getByRole('button', { name: 'Poner en espera' }).click();
  await page.waitForTimeout(2500);
  const s4 = await stats(page);
  await page.waitForTimeout(800);
  expect((await stats(page)).requested).toBe(s4.requested);
});

test('espera, investigación, recarga, retomar, verificación, despedida y luego informe', async ({ page }) => {
  await fresh(page);
  await startGuard(page, 1);
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  const call = page.locator('aside.call');
  await call.getByRole('button', { name: 'Poner en espera' }).click();
  // Primero se ven la frase de Nico y la respuesta; después se contrae a una tarjeta compacta.
  await expect(call).toContainText('te pongo un momento en espera');
  await expect(call).toContainText('Dale, espero');
  const mini = page.locator('aside.call-mini');
  await expect(mini).toContainText('en espera', { timeout: 6000 });
  await expect(mini.getByRole('button', { name: 'Retomar' })).toBeVisible();
  // La explicación de la paciencia se consulta con «?», no se repite siempre.
  await mini.getByRole('button', { name: 'Ayuda sobre la espera' }).click();
  await expect(mini).toContainText('impacientan');
  // Investigar en GuardiaOS (desde la mesa) con la llamada en espera.
  await openMonitor(page);
  const pr = await openApp(page, 'Impresoras');
  await runProbe(pr, 'Consultar la cola de IMP-ADM-02');
  await runProbe(pr, 'Cancelar el trabajo que encabeza la cola');
  await page.keyboard.press('Escape');
  // Recargar: la llamada sigue en espera, sin repetir el diálogo.
  const lineCount = () =>
    page.evaluate(
      () =>
        (window as unknown as { __tdg: { game: { call: { lines: unknown[] } } } }).__tdg.game.call.lines
          .length,
    );
  const lines = await lineCount();
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  await expect(mini).toContainText('en espera', { timeout: 6000 });
  expect(await lineCount()).toBe(lines);
  // Ver la conversación no retoma la llamada.
  await mini.getByRole('button', { name: 'Ver conversación' }).click();
  await expect(call).toContainText('En espera');
  await call.getByRole('button', { name: /Historial/ }).click();
  await expect(call).toContainText('Mesa de ayuda');
  await page.waitForTimeout(2800);
  await expect(call).toContainText('En espera'); // no vuelve a contraerse sola ni se retoma
  await call.getByRole('button', { name: 'Retomar la llamada' }).click();
  await expect(call).toContainText('Gracias por esperar');
  await expect(call.getByRole('button', { name: /Qué mensaje/ })).toBeVisible(); // retoma donde estaba
  await call.getByRole('button', { name: '¿Podés probar de nuevo y decirme qué pasa?' }).click();
  await expect(call).toContainText('salió');
  // Con la confirmación, la opción principal es despedirse; el informe llega al colgar.
  await call.getByRole('button', { name: 'Despedirse y cerrar el ticket' }).click();
  await expect(call).toContainText('Llego justo con el cierre');
  await expect(call).toContainText('Finalizada');
  await expect(page.getByRole('dialog', { name: 'Informe del expediente' })).toHaveCount(0);
  await call.getByRole('button', { name: 'Colgar' }).click();
  const report = page.getByRole('dialog', { name: 'Informe del expediente' });
  await expect(report).toContainText('Resolución técnica');
  await expect(report).toContainText('Razonamiento documentado');
  await expect(report).toContainText('No registraste una hipótesis de trabajo');
  await report.getByRole('button', { name: /Cerrar/ }).click();
  // Recargar no repite el cierre ni el informe; se puede volver a ver desde el historial.
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: 'Informe del expediente' })).toHaveCount(0);
  await openMonitor(page);
  const hist = await openApp(page, 'Historial');
  await expect(hist.getByRole('button', { name: 'Ver informe' })).toHaveCount(1);
  await hist.getByRole('button', { name: 'Ver informe' }).click();
  await expect(page.getByRole('dialog', { name: 'Informe del expediente' })).toContainText('#001');
});

test('la tarjeta del sándwich queda dentro de la pantalla, también con la llamada en espera', async ({
  page,
}) => {
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 3440, height: 1440 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await fresh(page);
    await startGuard(page, 1);
    const mobile = size.width < 700;
    await (
      mobile
        ? page.locator('.mobile-nav').getByRole('button', { name: 'Atender' })
        : page.getByRole('button', { name: /Teléfono: está sonando/ })
    ).click();
    await page.locator('aside.call').getByRole('button', { name: 'Poner en espera' }).click();
    await expect(page.locator('aside.call-mini')).toBeVisible({ timeout: 6000 });
    await (
      mobile
        ? page.locator('.mobile-nav').getByRole('button', { name: 'Sándwich' })
        : page.getByRole('button', { name: /Sándwich/ })
    ).click();
    const card = page.getByRole('dialog', { name: 'Comer el sándwich' });
    await expect(card).toContainText('Terminá la llamada');
    const b = (await card.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(size.width);
    expect(b.y + b.height).toBeLessThanOrEqual(size.height);
  }
});
