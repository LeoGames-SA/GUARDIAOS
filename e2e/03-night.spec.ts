import { expect, test, type Page } from '@playwright/test';
import {
  answer,
  closeCase,
  closePanel,
  fresh,
  openApp,
  openMonitor,
  runProbe,
  startGuard,
  watchConsole,
} from './helpers';

test.beforeEach(async ({ page }) => fresh(page));

async function solve001Job(page: Page) {
  await answer(page);
  await openMonitor(page);
  const pr = await openApp(page, 'Impresoras');
  await runProbe(pr, 'Consultar la cola de IMP-ADM-02');
  await runProbe(pr, 'Cancelar el trabajo que encabeza la cola');
  await closePanel(page);
  const call = page.locator('aside.call');
  await call.getByRole('button', { name: '¿Podés probar de nuevo y decirme qué pasa?' }).click();
  await expect(call).toContainText(/salió/);
  await call.getByRole('button', { name: 'Cortar la llamada' }).click();
  await closeCase(page, 'Resuelto y verificado');
}

async function waitUntil(page: Page, hhmm: string) {
  await page.getByRole('button', { name: new RegExp(`Esperar.*${hhmm}`) }).click();
  await expect(page.locator('.hud-clock')).toContainText(hhmm);
}

async function take(page: Page, number: string) {
  await openMonitor(page);
  const t = await openApp(page, 'Centro de tickets');
  await t.getByRole('tab', { name: /Bandeja/ }).click();
  await t.getByRole('option', { name: new RegExp(`#${number}`) }).click();
  await t.getByRole('button', { name: 'Tomar el expediente' }).click();
  await closePanel(page);
}

test('noche completa: correo/permisos, alerta/aplicación, resumen, mejora y rejugar', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchConsole(page);
  await startGuard(page, 1);
  await solve001Job(page);

  // 002 por correo.
  await waitUntil(page, '23:20');
  await take(page, '002');
  await openMonitor(page);
  const mail = await openApp(page, 'Correo');
  await expect(mail).toContainText('No puedo entrar a la carpeta de Compras');
  await mail.getByRole('button', { name: /acceso-denegado.png/ }).click();
  await expect(mail).toContainText('Acceso denegado');
  await mail.getByRole('button', { name: /Preguntar si hubo un cambio de puesto/ }).click();
  await expect(mail).toContainText('RRHH-2291');
  const acc = await openApp(page, 'Cuentas y permisos');
  // Sin autorización encontrada, la intervención explica por qué no está disponible.
  await expect(
    acc.locator('article.probe', { hasText: 'Agregar tibarra a GG_Compras_Editores' }),
  ).toContainText('Falta una autorización');
  await runProbe(acc, 'Ver grupos de tibarra');
  const tk = await openApp(page, 'Centro de tickets');
  await tk.getByRole('option', { name: /#002/ }).click();
  await runProbe(tk, 'Buscar solicitudes vinculadas a tibarra');
  const acc2 = await openApp(page, 'Cuentas y permisos');
  await runProbe(acc2, 'Agregar tibarra a GG_Compras_Editores');
  await runProbe(acc2, 'Retirar tibarra de GG_Logistica_Editores');
  const mail2 = await openApp(page, 'Correo');
  await mail2.getByRole('option').first().click();
  await mail2.getByRole('button', { name: /Pedirle que pruebe abrir la carpeta/ }).click();
  await expect(mail2).toContainText('No cerré sesión');
  const remote = await openApp(page, 'Acceso remoto');
  await remote.getByRole('button', { name: /PC-CMP-04/ }).click();
  await runProbe(page.locator('section.win-remote'), 'Renovar credenciales de la sesión');
  const mail3 = await openApp(page, 'Correo');
  await mail3.getByRole('option').first().click();
  await mail3.getByRole('button', { name: /Pedirle que pruebe abrir la carpeta/ }).click();
  await expect(mail3).toContainText('¡Entré!');
  await closePanel(page);
  await closeCase(page, 'Resuelto y verificado');

  // 003 alerta automática.
  await waitUntil(page, '01:00');
  await take(page, '003');
  await openMonitor(page);
  const svc = await openApp(page, 'Servicios');
  await runProbe(svc, 'Consultar servicios de SRV-APP-02');
  await expect(svc).toContainText('PortalPersonal (aplicación) · Detenido · Manual');
  await runProbe(svc, 'Iniciar el servicio PortalPersonal');
  await runProbe(svc, 'Configurar PortalPersonal con inicio automático');
  const br = await openApp(page, 'Navegador');
  await br.getByRole('button', { name: /portal.mutualsur.local\/salud/ }).click();
  await runProbe(br, 'Abrir /salud desde tu navegador');
  await expect(br).toContainText('200 OK');
  const tk3 = await openApp(page, 'Centro de tickets');
  await tk3.getByRole('option', { name: /#003/ }).click();
  await runProbe(tk3, 'Pedir revalidación al monitor externo');
  await tk3
    .locator('article.probe', { hasText: 'Publicar diagnóstico' })
    .getByRole('button', { name: /Ejecutar/ })
    .click();
  await closePanel(page);
  await closeCase(page, 'Resuelto y verificado');

  // Cierre de guardia sin obligar a mirar horas vacías.
  await page.getByRole('button', { name: 'Cerrar la guardia' }).click();
  await expect(page.getByRole('heading', { name: /Fin del turno/ })).toBeVisible();
  await expect(page.locator('.summary-card')).toContainText('3 de 3 expedientes');
  await expect(page.locator('.summary-card')).toContainText('Segundo monitor habilitado');
  await page.getByRole('button', { name: 'Rejugar la noche con otra semilla' }).click();
  await expect(page.getByRole('button', { name: 'Segundo monitor: correo e historial' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('dos expedientes activos: reloj común, pruebas separadas y cambio de foco', async ({ page }) => {
  await startGuard(page, 7);
  await answer(page);
  await page.locator('aside.call').getByRole('button', { name: 'Cortar la llamada' }).click();
  await waitUntil(page, '23:20');
  await take(page, '002');
  await expect(page.locator('.case-chip')).toHaveCount(2);
  await openMonitor(page);
  const ev = await openApp(page, 'Eventos');
  await expect(ev.locator('.case-banner')).toContainText('002');
  await runProbe(ev, 'Filtrar registro de seguridad de SRV-ARCH-01');
  await expect(page.locator('.hud-clock')).toContainText('23:23');
  await closePanel(page);
  // Pizarra de 002 sin notas de 001; al cambiar a 001 se ven las suyas.
  await page.getByRole('button', { name: 'Pizarra de pruebas' }).click();
  await expect(page.locator('.note')).toHaveCount(1);
  await expect(page.locator('.note')).toContainText('tibarra');
  await page.getByRole('button', { name: 'Ver 001' }).click();
  await expect(page.locator('.note')).toHaveCount(0);
  await closePanel(page);
  // 001 conserva su plazo y lo vence si el tiempo pasa.
  await expect(page.locator('.case-chip', { hasText: '001' })).toContainText('plazo 00:30');
});

test('recargar a mitad de guardia y de práctica conserva el estado', async ({ page }) => {
  await startGuard(page, 7);
  await answer(page);
  await openMonitor(page);
  const svc = await openApp(page, 'Servicios');
  await runProbe(svc, 'Consultar el servicio «Cola de impresión»');
  await closePanel(page);
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  await expect(page.locator('.hud-clock')).toContainText('23:01');
  await expect(page.locator('aside.call')).toContainText('Elena');
  await page.getByRole('button', { name: 'Pizarra de pruebas' }).click();
  await expect(page.locator('.note')).toHaveCount(1);
  await closePanel(page);

  // Práctica desde el menú: independiente de la campaña.
  await page.getByRole('button', { name: 'Menú y opciones' }).click();
  await page.getByRole('button', { name: 'Volver al menú principal' }).click();
  await page.getByRole('button', { name: /Cómo se juega/ }).click();
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar la práctica' }).click();
  await expect(page.locator('aside.call')).toContainText('Marta');
  await page.getByRole('button', { name: 'Omitir práctica' }).click();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  await expect(page.locator('.hud-clock')).toContainText('23:01');
});

test('Elena vuelve a llamar: tranquilizar una vez, citar evidencia real y plazo vencido', async ({
  page,
}) => {
  await startGuard(page, 7);
  await answer(page);
  const call = page.locator('aside.call');
  await call.getByRole('button', { name: 'Cortar la llamada' }).click();
  await openMonitor(page);
  const svc = await openApp(page, 'Servicios');
  await runProbe(svc, 'Consultar el servicio «Cola de impresión»');
  await closePanel(page);
  await waitUntil(page, '23:20');
  await waitUntil(page, '23:40');
  await expect(page.getByRole('button', { name: /Teléfono: está sonando/ })).toBeVisible();
  await answer(page);
  await expect(call).toContainText('¿Hay alguna novedad?');
  await call.getByRole('button', { name: /Entiendo la urgencia/ }).click();
  await expect(call).toContainText('gracias por avisar');
  await call.getByRole('button', { name: /Ya comprobé que/ }).click();
  await call.getByRole('button', { name: /servicio de cola está detenido/ }).click();
  await expect(call).toContainText('ya me dijiste');
  // No se ofrece «ya está resuelto» ni «causa probable» sin respaldo en la pizarra.
  await expect(call.getByRole('button', { name: /causa probable/ })).toHaveCount(0);
  await call.getByRole('button', { name: 'Cortar la llamada' }).click();
  await page.getByRole('button', { name: 'Pausa', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.locator('.pauses li', { hasText: 'Comer algo' }).getByRole('button').click();
    await page.getByRole('button', { name: 'Otra pausa' }).click();
  }
  await closePanel(page);
  await expect(page.locator('.case-chip', { hasText: '001' })).toContainText('plazo vencido');
});
