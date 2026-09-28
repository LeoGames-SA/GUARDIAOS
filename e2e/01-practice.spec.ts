import { expect, test } from '@playwright/test';
import { closePanel, fresh, openApp, openMonitor, runProbe, watchConsole } from './helpers';

test('primera partida: práctica jugable completa y transición a Elena', async ({ page }) => {
  const errors = watchConsole(page);
  await fresh(page);
  await page.getByRole('button', { name: 'Nueva guardia' }).click();
  await page.getByRole('button', { name: /Hacer la práctica breve/ }).click();

  // 1. Suena el teléfono: el nombre todavía no se conoce.
  await expect(page.locator('.tutorial')).toContainText('Suena el teléfono');
  await expect(page.getByText('Marta')).toHaveCount(0);
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  const call = page.locator('aside.call');
  await expect(call).toContainText('Soy Marta Quiroga');

  // 2. Pregunta breve.
  await call.getByRole('button', { name: /¿No se escucha sólo el video/ }).click();
  await expect(call).toContainText('Nada de nada');

  // 3. Monitor → acceso remoto → dispositivo de salida.
  await openMonitor(page);
  const remote = await openApp(page, 'Acceso remoto');
  await remote.getByRole('button', { name: /PC-REC-01/ }).click();
  const session = page.locator('section.win-remote');
  await expect(session).toContainText('SESIÓN REMOTA');
  await runProbe(session, 'Revisar el dispositivo de salida');
  await expect(session).toContainText('Monitor HDMI');
  await closePanel(page);

  // 4. Pizarra: conectar la comprobación con una hipótesis y tomarla.
  await page.getByRole('button', { name: 'Pizarra de pruebas' }).click();
  await page.getByRole('button', { name: /sale por un dispositivo sin parlantes/ }).click();
  await page.getByRole('button', { name: /Comprobé: La salida de sonido/ }).click();
  await expect(page.locator('.note.on')).toHaveCount(1);
  await expect(page.locator('.thread')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tomar como hipótesis de trabajo' }).click();
  await closePanel(page);

  // 5. Un intento equivocado orienta sin castigar.
  await openMonitor(page);
  const session2 = page.locator('section.win-remote');
  await runProbe(session2, 'Subir el volumen al máximo');
  await runProbe(session2, 'Elegir «Auriculares USB» como salida');
  await runProbe(session2, 'Reproducir sonido de prueba');
  await closePanel(page);

  // 6. Verificar por teléfono (la llamada sigue abierta).
  await call.getByRole('button', { name: '¿Ahora lo escuchás?' }).click();
  await expect(call).toContainText('Ahora se escucha perfecto');

  // 7. Cerrar el ticket.
  await openMonitor(page);
  const tickets = await openApp(page, 'Centro de tickets');
  await tickets.getByRole('button', { name: 'Cerrar como resuelto' }).click();
  await expect(page.getByRole('dialog', { name: 'Informe del expediente' })).toContainText(
    'Resuelto y verificado',
  );
  await page
    .getByRole('dialog', { name: 'Informe del expediente' })
    .getByRole('button', { name: /Cerrar/ })
    .click();
  await closePanel(page);

  // 8. Entrar a la noche 1: suena Elena, la práctica no consumió reloj.
  await page.getByRole('button', { name: 'Entrar a la guardia' }).click();
  await expect(page.locator('.hud-clock')).toContainText('23:00');
  await expect(page.getByRole('button', { name: /Teléfono: está sonando/ })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tdg.profile')!).data.tutorialDone)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
