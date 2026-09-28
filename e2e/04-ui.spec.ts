import { expect, test, type Page } from '@playwright/test';
import {
  answer,
  closePanel,
  fresh,
  openApp,
  openMonitor,
  runProbe,
  startGuard,
  watchConsole,
  win,
} from './helpers';

/** Distancia máxima entre el extremo de cada hilo y el centro de su chinche (px). */
async function threadMisalignment(page: Page): Promise<number> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('svg.threads')!;
    const base = svg.getBoundingClientRect();
    let worst = 0;
    const pins = [...document.querySelectorAll<HTMLElement>('.note.on .pin')];
    const hyp = document.querySelector<HTMLElement>('.hyp-card .pin')!.getBoundingClientRect();
    const paths = [...svg.querySelectorAll('path')];
    paths.forEach((p, i) => {
      const m = /M(-?[\d.e+-]+),(-?[\d.e+-]+) Q\S+ (-?[\d.e+-]+),(-?[\d.e+-]+)/.exec(p.getAttribute('d')!)!;
      const [x1, y1, x2, y2] = m.slice(1).map(Number) as [number, number, number, number];
      const pin = pins[i]!.getBoundingClientRect();
      const d1 = Math.hypot(
        base.left + x1 - (pin.left + pin.width / 2),
        base.top + y1 - (pin.top + pin.height * 0.28),
      );
      const d2 = Math.hypot(
        base.left + x2 - (hyp.left + hyp.width / 2),
        base.top + y2 - (hyp.top + hyp.height * 0.28),
      );
      worst = Math.max(worst, d1, d2);
    });
    return paths.length ? worst : -1;
  });
}

test('pizarra con teclado; hilos alineados tras redimensionar y con zoom 125 %', async ({
  page,
  browser,
}) => {
  const errors = watchConsole(page);
  await fresh(page);
  await startGuard(page, 7);
  await answer(page);
  const call = page.locator('aside.call');
  await call.getByRole('button', { name: '¿Hubo algún cambio hoy?' }).click();
  await openMonitor(page);
  const svc = await openApp(page, 'Servicios');
  await runProbe(svc, 'Consultar el servicio «Cola de impresión»');
  await closePanel(page);

  // Sólo teclado: llegar a la pizarra, elegir hipótesis, conectar notas.
  await page.getByRole('button', { name: 'Pizarra de pruebas' }).focus();
  await page.keyboard.press('Enter');
  const hyp = page.getByRole('button', { name: /Controlador defectuoso tras un cambio/ });
  await hyp.focus();
  await page.keyboard.press('Enter');
  for (const name of [/Dijo la persona: Elena recuerda/, /Comprobé: El servicio de cola/]) {
    await page.getByRole('button', { name }).focus();
    await page.keyboard.press('Space');
  }
  await expect(page.locator('.note.on')).toHaveCount(2);
  await expect(page.locator('.thread')).toHaveCount(2);
  await expect(page.locator('.rel-supports')).toHaveCount(2);
  expect(await threadMisalignment(page)).toBeLessThan(3);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(150);
  expect(await threadMisalignment(page)).toBeLessThan(3);

  // Quitar una conexión.
  await page.getByRole('button', { name: /Dijo la persona: Elena recuerda/ }).press('Enter');
  await expect(page.locator('.thread')).toHaveCount(1);

  // Zoom 125 %: mismo estado, viewport CSS reducido y escala de dispositivo 1,25.
  const state = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const ctx = await browser.newContext({ viewport: { width: 1093, height: 614 }, deviceScaleFactor: 1.25 });
  const zoomed = await ctx.newPage();
  await zoomed.goto('/');
  await zoomed.evaluate(
    (s) => Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v as string)),
    state,
  );
  await zoomed.reload();
  await zoomed
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  // Durante la llamada, la pizarra también se abre desde la tarjeta de conversación.
  await zoomed.locator('aside.call').getByRole('button', { name: 'Pizarra', exact: true }).click();
  await expect(zoomed.locator('.thread')).toHaveCount(1);
  expect(await threadMisalignment(zoomed)).toBeLessThan(3);
  await ctx.close();
  expect(errors).toEqual([]); // incluye recursos que no cargan (p. ej. el corcho)
});

test('ventanas: mover, minimizar, restaurar, cerrar y menú contextual por teclado', async ({ page }) => {
  const errors = watchConsole(page);
  await fresh(page);
  await startGuard(page, 1);
  await openMonitor(page);
  const hist = await openApp(page, 'Historial');
  const title = hist.locator('.win-title');
  const before = await hist.boundingBox();
  // Arrastre con puntero.
  await title.hover({ position: { x: 60, y: 12 } });
  await page.mouse.down();
  await page.mouse.move(before!.x + 160, before!.y + 90, { steps: 5 });
  await page.mouse.up();
  const after = await hist.boundingBox();
  expect(Math.abs(after!.x - before!.x - 100)).toBeLessThanOrEqual(2);
  // Flechas del teclado.
  await title.focus();
  await page.keyboard.press('ArrowRight');
  expect(Math.round((await hist.boundingBox())!.x - after!.x)).toBe(16);
  // Menú contextual con Shift+F10 y flechas.
  await page.keyboard.press('Shift+F10');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Minimizar' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(hist).toHaveCount(0);
  // Restaurar desde la barra de tareas conserva la posición.
  await page.getByRole('button', { name: 'Historial (minimizada)' }).click();
  await expect(win(page, 'Historial')).toBeVisible();
  expect(Math.round((await win(page, 'Historial').boundingBox())!.x - after!.x)).toBe(16);
  // Clic repetido en el ícono no duplica instancias.
  await openApp(page, 'Historial');
  await openApp(page, 'Historial');
  await expect(win(page, 'Historial')).toHaveCount(1);
  // Botón «⋯» también abre el menú; Escape lo cierra.
  await win(page, 'Historial').getByRole('button', { name: 'Más opciones' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await win(page, 'Historial').getByRole('button', { name: 'Cerrar ventana' }).click();
  await expect(win(page, 'Historial')).toHaveCount(0);
  // Escape cierra GuardiaOS y devuelve el foco al monitor.
  await closePanel(page);
  await expect(page.getByRole('button', { name: /Monitor: abrir GuardiaOS/ })).toBeFocused();
  expect(errors).toEqual([]);
});

test('pausas, pelota, cubo y gato: costos visibles y efectos acotados', async ({ page }) => {
  await fresh(page);
  await startGuard(page, 1);
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  await page.locator('aside.call').getByRole('button', { name: 'Cortar', exact: true }).click();

  // Café desde la taza: 5 min y novedades del turno.
  await page.getByRole('button', { name: 'Taza: pausa para café' }).click();
  await page.locator('.pauses li.preset').getByRole('button', { name: /Tomar/ }).click();
  await expect(page.locator('.pause-result')).toContainText('23:00 → 23:05');
  await page.getByRole('button', { name: 'Volver al puesto' }).click();
  await expect(page.locator('.pose')).toBeVisible(); // mano con taza, sin la taza suelta
  await expect(page.getByRole('button', { name: 'Taza: pausa para café' })).toBeHidden();

  // Comer: atraviesa la llegada del correo de las 23:20.
  await page.getByRole('button', { name: 'Pausa', exact: true }).click();
  await page.locator('.pauses li', { hasText: 'Comer algo' }).getByRole('button').click();
  await expect(page.locator('.pause-result')).toContainText('Llegó el expediente 002');
  await page.getByRole('button', { name: 'Volver al puesto' }).click();

  // Pelota: requiere apretar; segunda vez seguida rinde menos.
  await page.getByRole('button', { name: 'Pelota antiestrés' }).click();
  await page.getByRole('button', { name: 'Apretar la pelota' }).press('Space');
  await expect(page.getByRole('button', { name: /Terminar la pausa.*−6/ })).toBeVisible();
  await page.getByRole('button', { name: /Terminar la pausa/ }).click();
  await closePanel(page);
  await page.getByRole('button', { name: 'Pelota antiestrés' }).click();
  await page.getByRole('button', { name: 'Apretar la pelota' }).press('Space');
  await expect(page.getByRole('button', { name: /Terminar la pausa.*−1/ })).toBeVisible();
  await closePanel(page);

  // Cubo real: un giro y deshacer; el progreso se guarda.
  await page.getByRole('button', { name: 'Cubo 3×3' }).click();
  await page.getByRole('button', { name: '↻ Girar horario' }).click();
  await expect(page.getByText(/Movimientos: 1/)).toBeVisible();
  await page.getByRole('button', { name: 'Mezclar' }).click();
  await expect(page.getByText('Sin resolver.', { exact: false })).toBeVisible();
  const cube = await page.evaluate(
    () => JSON.parse(localStorage.getItem('tdg.profile')!).data.cube.state as string,
  );
  await closePanel(page);
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tdg.profile')!).data.cube.state)).toBe(
    cube,
  );

  // Gato: página local del navegador, recompensa una vez.
  await openMonitor(page);
  const br = await openApp(page, 'Navegador');
  await br.getByRole('button', { name: /gatitos.local/ }).click();
  await expect(br.getByRole('img', { name: /gatito naranja/ })).toBeVisible();
  await br.getByRole('button', { name: /Quedarse mirándolo.*una vez por noche/ }).click();
  await expect(br.getByRole('button', { name: /Quedarse mirándolo/ })).not.toContainText('una vez por noche');
});

test('la llamada no mueve la mesa: atender, contraer, espera, retomar y cortar', async ({ page }) => {
  await fresh(page);
  await startGuard(page, 7);
  const boxes = async () =>
    page.evaluate(() =>
      ['monitor', 'board', 'notebook', 'mug', 'phone'].map((t) => {
        const r = document.querySelector(`[data-target=${t}]`)!.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(',');
      }),
    );
  const before = await boxes();
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  const call = page.locator('aside.call');
  await expect(call).toContainText('En conversación');
  expect(await boxes()).toEqual(before);
  await call.getByRole('button', { name: 'Poner en espera' }).click();
  await expect(call).toContainText('En espera');
  await expect(call).toContainText('te pongo un momento en espera');
  expect(await boxes()).toEqual(before);
  await call.getByRole('button', { name: 'Contraer la llamada' }).click();
  await expect(page.locator('.call-pill')).toContainText('en espera');
  expect(await boxes()).toEqual(before);
  await page.locator('.call-pill').getByRole('button', { name: 'Retomar' }).click();
  await page.locator('.call-pill').getByRole('button', { name: 'Ver conversación' }).click();
  await expect(call).toContainText('Gracias por esperar');
  await expect(call).toContainText('Mesa de ayuda'); // el diálogo continúa, no se reinicia
  await call.getByRole('button', { name: 'Cortar', exact: true }).click();
  await expect(call).toHaveCount(0);
  expect(await boxes()).toEqual(before);
});

test('pizarra vacía sobre corcho con acceso a archivados; menú sin avanzar la guardia', async ({ page }) => {
  await fresh(page);
  await startGuard(page, 1);
  await page.getByRole('button', { name: 'Pizarra de pruebas' }).click();
  await expect(page.locator('.corkframe')).toBeVisible();
  await expect(page.locator('.empty-note')).toContainText('Sin expediente activo');
  await expect(page.locator('.note')).toHaveCount(0); // no se inventan pruebas
  await page.keyboard.press('Escape');
  // Resolver 001 y verlo archivado en la pizarra, en sólo lectura.
  await page.evaluate(() => {
    const t = (window as unknown as { __tdg: { dispatch: (a: unknown) => void } }).__tdg;
    t.dispatch({ type: 'answerCall' });
    for (const id of ['t-queue', 'i-cancel-job', 'v-retry'])
      t.dispatch({ type: 'probe', caseId: 'c001', probeId: id });
    t.dispatch({ type: 'close', caseId: 'c001' });
    t.dispatch({ type: 'hangUp' });
  });
  await page
    .getByRole('dialog', { name: 'Informe del expediente' })
    .getByRole('button', { name: /Cerrar/ })
    .click();
  await page.getByRole('button', { name: 'Pizarra de pruebas' }).click();
  await page.locator('.arch-note').getByRole('button', { name: /#001/ }).click();
  await expect(page.locator('.board-panel h2')).toContainText('archivado');
  const notes = await page.locator('.note').count();
  expect(notes).toBeGreaterThan(0);
  await expect(page.locator('.note').first()).toHaveAttribute('aria-disabled', 'true'); // sólo lectura
  await page.keyboard.press('Escape');
  // El menú no avanza la guardia.
  const minute = await page.locator('.hud-clock').innerText();
  await page.getByRole('button', { name: 'Menú y opciones' }).click();
  await page.getByRole('button', { name: 'Volver al menú principal' }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator('.menu-main')).toContainText('Continuar');
  await page.locator('.menu-main').click();
  expect(await page.locator('.hud-clock').innerText()).toBe(minute);
});

test('ventanas dentro del área útil, recordadas al recargar y corregidas al achicar la pantalla', async ({
  page,
}) => {
  await fresh(page);
  await startGuard(page, 1);
  await openMonitor(page);
  const inside = async () =>
    page.evaluate(() => {
      const d = document.querySelector('.os-desktop')!.getBoundingClientRect();
      const icons = document.querySelector('.os-icons')!.getBoundingClientRect();
      return (
        [...document.querySelectorAll('section.win')].every((w) => {
          const r = w.getBoundingClientRect();
          return (
            r.left >= d.left - 1 && r.top >= d.top - 1 && r.right <= d.right + 1 && r.bottom <= d.bottom + 1
          );
        }) &&
        [...document.querySelectorAll('section.win')].every(
          (w) => w.getBoundingClientRect().left >= icons.right - 1,
        )
      );
    });
  for (const app of ['Correo', 'Navegador', 'Historial', 'Consola']) await openApp(page, app);
  expect(await inside()).toBe(true);
  const hist = win(page, 'Historial');
  const t = hist.locator('.win-title');
  const b = (await t.boundingBox())!;
  await page.mouse.move(b.x + 80, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 20, b.y + 60, { steps: 4 });
  await page.mouse.up();
  const moved = (await hist.boundingBox())!;
  await page.waitForTimeout(400); // guardado diferido de la geometría
  await page.reload();
  await page
    .getByRole('button', { name: /Continuar/ })
    .first()
    .click();
  await openMonitor(page);
  // Esperar el fin de la animación de apertura del monitor antes de medir.
  await page.waitForTimeout(800);
  const again = (await win(page, 'Historial').boundingBox())!;
  expect(Math.abs(again.x - moved.x)).toBeLessThanOrEqual(2);
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.waitForTimeout(200);
  const controlsVisible = await page.evaluate(() =>
    [...document.querySelectorAll('section.win .win-close')].every((c) => {
      const r = c.getBoundingClientRect();
      return r.right <= window.innerWidth && r.bottom <= window.innerHeight && r.left >= 0 && r.top >= 0;
    }),
  );
  expect(controlsVisible).toBe(true);
});
