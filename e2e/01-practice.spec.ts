import { expect, test } from '@playwright/test';
import { closePanel, fresh, openApp, openMonitor, watchConsole } from './helpers';

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

  // 2. Pregunta breve: la persona aporta contexto sobre qué usa para escuchar.
  await call.getByRole('button', { name: '¿Qué usás para escuchar?' }).click();
  await expect(call).toContainText('auriculares USB');

  // 3. Pedir permiso por diálogo: la indicación señala la opción concreta.
  const assist = call.getByRole('button', { name: /solicitud de asistencia/ });
  await expect(assist).toHaveAttribute('data-tut-on', '');
  await assist.click();
  await expect(call).toContainText('puse «Aceptar»');

  // 4. Conectar desde GuardiaOS: equipo de destino, estado breve y escritorio remoto propio.
  await openMonitor(page);
  const picker = await openApp(page, 'Acceso remoto');
  await picker.getByRole('button', { name: /PC-REC-01/ }).click();
  const win = page.locator('section.win-remote');
  await expect(win).toContainText('Aceptada por Marta');
  await win.getByRole('button', { name: 'Conectar a PC-REC-01' }).click();
  await expect(win).toContainText('Buscando el equipo en la red');
  const bar = win.locator('.session-bar');
  await expect(bar).toContainText('Sesión remota · PC-REC-01 · Marta Quiroga (Recepción)');

  // Recargar: no repite la conversación ni abre otra sesión.
  const lines = await call.locator('.line').count();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar la práctica' }).click();
  await openMonitor(page);
  await expect(page.locator('section.win-remote .session-bar')).toBeVisible();
  const connects = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('tdg.practice')!).data.game.cases.p001.runs as { probeId: string }[]
      ).filter((r) => r.probeId === 'r-connect').length,
  );
  expect(connects).toBe(1);
  expect(lines).toBeGreaterThan(0);

  // 5. Panel de sonido desde la barra de tareas remota: salida, volumen y salidas disponibles.
  const w2 = page.locator('section.win-remote');
  await w2.getByRole('button', { name: /Sonido del equipo remoto/ }).click();
  const flyout = w2.getByRole('region', { name: 'Sonido' });
  await expect(flyout).toContainText('Monitor DELL P2419H (HDMI)');
  await flyout.getByRole('button', { name: /Monitor DELL/ }).click();
  const options = flyout.getByRole('option');
  await expect(options).toHaveCount(3);
  // Ninguna opción se destaca como solución: sólo la actual figura seleccionada.
  await expect(flyout.getByRole('option', { selected: true })).toHaveText(/Monitor DELL/);

  // 6. Una salida equivocada: la prueba y la persona dicen que no alcanza.
  await flyout.getByRole('option', { name: /Altavoces/ }).click();
  await flyout.getByRole('button', { name: /Probar sonido/ }).click();
  await expect(flyout).toContainText('Nivel en «Altavoces');
  await page.keyboard.press('Escape');
  await call.getByRole('button', { name: '¿Ahora lo escuchás?' }).click();
  await expect(call).toContainText('Sigue sin escucharse');

  // 7. Pizarra: observaciones, intentos y confirmaciones separados; conectar y tomar hipótesis.
  await call.getByRole('button', { name: 'Pizarra', exact: true }).click();
  await page.getByRole('button', { name: /sale por un dispositivo sin parlantes/ }).click();
  await page.getByRole('button', { name: /Comprobé: La salida de sonido seleccionada .* «Monitor/ }).click();
  await expect(page.locator('.note.on')).toHaveCount(1);
  await expect(page.locator('.note-tried')).toHaveCount(1);
  await expect(page.locator('.note-verify.verify-no')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tomar como hipótesis de trabajo' }).click();
  await closePanel(page);
  await expect(page.locator('.tutorial')).toContainText('Todavía no escucha');

  // 8. Elegir la salida que usa, cambiar el volumen (simulado) y probar.
  const prefsVolume = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('tdg.prefs') ?? '{"data":{}}').data.volume as number);
  const before = await prefsVolume();
  await openMonitor(page);
  const w3 = page.locator('section.win-remote');
  await w3.getByRole('button', { name: /Sonido del equipo remoto/ }).click();
  const fly = w3.getByRole('region', { name: 'Sonido' });
  await fly.getByRole('button', { name: /Altavoces/ }).click();
  await fly.getByRole('option', { name: /Auriculares USB/ }).click();
  const slider = fly.getByRole('slider', { name: 'Volumen del equipo remoto' });
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('70');
  expect(await prefsVolume()).toBe(before); // el volumen del juego no cambia
  await fly.getByRole('button', { name: /Probar sonido/ }).click();
  await expect(fly).toContainText('Nivel en «Auriculares USB');
  await page.keyboard.press('Escape');

  // 9. Preguntar si ahora escucha: la confirmación depende del estado real.
  await call.getByRole('button', { name: '¿Ahora lo escuchás?' }).click();
  await expect(call).toContainText('Ahora se escucha perfecto');

  // 10. Desconectar (queda para retomar) y cerrar.
  await openMonitor(page);
  const w4 = page.locator('section.win-remote');
  await w4.getByRole('button', { name: 'Desconectar' }).click();
  await expect(w4.getByRole('button', { name: 'Reconectar a PC-REC-01' })).toBeVisible();
  await closePanel(page);

  // 11. Cerrar el ticket.
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

  // 12. Entrar a la noche 1: suena Elena, la práctica no consumió reloj.
  await page.getByRole('button', { name: 'Entrar a la guardia' }).click();
  await expect(page.locator('.hud-clock')).toContainText('23:00');
  await expect(page.getByRole('button', { name: /Teléfono: está sonando/ })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tdg.profile')!).data.tutorialDone)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
