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
  await expect(call).toContainText('En espera');
  // Investigar en GuardiaOS con la llamada en espera.
  await call.getByRole('button', { name: 'GuardiaOS' }).click();
  const pr = await openApp(page, 'Impresoras');
  await runProbe(pr, 'Consultar la cola de IMP-ADM-02');
  await runProbe(pr, 'Cancelar el trabajo que encabeza la cola');
  await page.keyboard.press('Escape');
  // Recargar: la llamada sigue en espera, sin repetir el diálogo.
  const lines = await call.locator('.line').count();
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  await expect(call).toContainText('En espera');
  expect(await call.locator('.line').count()).toBe(lines);
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
