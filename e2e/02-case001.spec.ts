import { expect, test } from '@playwright/test';
import {
  answer,
  closeCase,
  closePanel,
  fresh,
  openApp,
  openMonitor,
  runProbe,
  selectRow,
  startGuard,
  watchConsole,
} from './helpers';

test.beforeEach(async ({ page }) => fresh(page));

async function verifyByPhone(page: import('@playwright/test').Page, reply: RegExp) {
  const call = page.locator('aside.call');
  await call.getByRole('button', { name: '¿Podés probar de nuevo y decirme qué pasa?' }).click();
  await expect(call).toContainText(reply);
}

test('001 · controlador (semilla 7): recorrido limpio', async ({ page }) => {
  const errors = watchConsole(page);
  await startGuard(page, 7);
  await answer(page);
  await page.locator('aside.call').getByRole('button', { name: '¿Hubo algún cambio hoy?' }).click();
  await openMonitor(page);
  const svc = await openApp(page, 'Servicios');
  await runProbe(svc, 'Consultar el servicio «Cola de impresión»');
  await expect(svc).toContainText('Detenido');
  const ev = await openApp(page, 'Eventos');
  await runProbe(ev, 'Filtrar eventos de SRV-IMP-01');
  await expect(ev).toContainText('uniprint6.dll');
  const pr = await openApp(page, 'Impresoras');
  await runProbe(pr, 'Ver controlador instalado');
  await runProbe(pr, 'Revertir el controlador a UniPrint 5.2');
  await closePanel(page);
  await verifyByPhone(page, /salió/);
  const report = await closeCase(page, 'Resuelto y verificado');
  expect(report).toContain('UniPrint 6.0');
  expect(errors).toEqual([]);
});

test('001 · trabajo trabado (semilla 1): recorrido limpio con aviso de reenvío', async ({ page }) => {
  await startGuard(page, 1);
  await answer(page);
  await openMonitor(page);
  const pr = await openApp(page, 'Impresoras');
  await runProbe(pr, 'Consultar la cola de IMP-ADM-02');
  await expect(pr).toContainText('#412');
  await runProbe(pr, 'Cancelar el trabajo que encabeza la cola');
  await pr
    .locator('article.probe', { hasText: 'Avisar a J. Méndez' })
    .getByRole('button', { name: /Ejecutar/ })
    .click();
  await closePanel(page);
  await verifyByPhone(page, /salió/);
  const report = await closeCase(page, 'Resuelto y verificado');
  expect(report).toContain('✓ Avisar al dueño');
});

test('001 · nombre viejo (semilla 2): nombre vs IP, DNS y caché', async ({ page }) => {
  await startGuard(page, 2);
  await answer(page);
  await openMonitor(page);
  const net = await openApp(page, 'Equipos y red');
  await selectRow(net, /SRV-IMP-01/);
  await runProbe(net, 'Probar alcance por nombre');
  await expect(net).toContainText('sin respuesta');
  await runProbe(net, 'Probar alcance por IP');
  await selectRow(net, /PC-ADM-07/);
  await runProbe(net, 'Resolver srv-impresion desde PC-ADM-07');
  await expect(net).toContainText('10.20.0.12');
  await selectRow(net, /SRV-IMP-01/);
  await runProbe(net, 'Corregir el registro DNS');
  await closePanel(page);
  await verifyByPhone(page, /Esperando conexión/);
  await openMonitor(page);
  const remote = await openApp(page, 'Acceso remoto');
  await remote.getByRole('button', { name: /PC-ADM-07/ }).click();
  await runProbe(page.locator('section.win-remote'), 'Renovar la caché de nombres');
  await closePanel(page);
  await page
    .locator('aside.call')
    .getByRole('button', { name: '¿Podés probar de nuevo y decirme qué pasa?' })
    .click();
  await expect(page.locator('aside.call')).toContainText(/salió/);
  await closeCase(page, 'Resuelto y verificado');
});

test('001 · intervención equivocada: consecuencia, recuperación y resultado con costo', async ({ page }) => {
  await startGuard(page, 2);
  await answer(page);
  await openMonitor(page);
  const svc = await openApp(page, 'Servicios');
  await runProbe(svc, 'Reiniciar el servicio «Cola de impresión»');
  await expect(svc).toContainText('Siguen sin llegar trabajos');
  const pr = await openApp(page, 'Impresoras');
  await runProbe(pr, 'Revertir el controlador a UniPrint 5.2');
  await expect(pr).toContainText('No cambió nada visible');
  // Recuperación: consola simulada, comandos equivalentes a la GUI con confirmación.
  const con = await openApp(page, 'Consola');
  const input = con.getByRole('textbox', { name: 'Comando' });
  await input.fill('dns srv-impresion 10.20.0.15');
  await expect(con.locator('.console-hint')).toContainText('Intervención');
  await input.press('Enter');
  await input.fill('s');
  await input.press('Enter');
  await expect(con).toContainText('Registro corregido');
  await input.fill('ipconfig /flushdns');
  await input.press('Enter');
  await input.fill('s');
  await input.press('Enter');
  await expect(con).toContainText('ahora resuelve');
  await closePanel(page);
  await verifyByPhone(page, /salió/);
  const report = await closeCase(page, 'Resuelto con costo');
  expect(report).toContain('Se revirtió sin necesidad');
});
