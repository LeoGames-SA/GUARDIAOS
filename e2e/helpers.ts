import { expect, type Page } from '@playwright/test';

/** Recoge errores de consola para exigir que no haya. */
export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Arranca limpio: sin guardados y sin texto progresivo (las pruebas no esperan animaciones). */
export async function fresh(page: Page, opts: { typewriter?: boolean } = {}) {
  await page.goto('/');
  await page.evaluate((tw) => {
    localStorage.clear();
    localStorage.setItem(
      'tdg.prefs',
      JSON.stringify({
        schema: 'turno-de-guardia',
        slot: 'prefs',
        version: 1,
        savedAt: '',
        data: { typewriter: tw, sound: false },
      }),
    );
  }, opts.typewriter ?? false);
  await page.reload();
}

export const os = (page: Page) => page.locator('.os-panel');
export const win = (page: Page, name: string | RegExp) =>
  page.locator('section.win', { has: page.locator('.win-name', { hasText: name }) });

export async function openMonitor(page: Page) {
  await page.getByRole('button', { name: /Monitor: abrir GuardiaOS/ }).click();
  await expect(os(page)).toBeVisible();
}

export async function openApp(page: Page, label: string) {
  await os(page).locator('.os-icons').getByRole('button', { name: label, exact: true }).click();
  await expect(win(page, label).first()).toBeVisible();
  return win(page, label).first();
}

/** Ejecuta la acción de una tarjeta por su título (y confirma si es intervención). */
export async function runProbe(scope: ReturnType<Page['locator']>, title: string | RegExp) {
  const card = scope
    .locator('article.probe', { has: scope.page().locator('h4', { hasText: title }) })
    .first();
  await card.getByRole('button', { name: /Ejecutar|Leer|Aplicar…|Repetir/ }).click();
  const apply = card.getByRole('button', { name: 'Aplicar', exact: true });
  if (await apply.isVisible().catch(() => false)) await apply.click();
  await expect(card.locator('.probe-result')).toBeVisible();
  return card;
}

export async function closePanel(page: Page) {
  await page.keyboard.press('Escape');
}

/** Nueva guardia con semilla por URL, saltando la práctica. */
export async function startGuard(page: Page, seed: number) {
  await page.goto(`/?semilla=${seed}`);
  await page.getByRole('button', { name: 'Nueva guardia' }).click();
  await page.getByRole('button', { name: 'Ir directo a la guardia' }).click();
  await expect(page.locator('.hud-clock')).toContainText('23:00');
}

export async function answer(page: Page) {
  await page.getByRole('button', { name: /Teléfono: está sonando/ }).click();
  await expect(page.locator('aside.call')).toBeVisible();
}

export async function selectRow(scope: ReturnType<Page['locator']>, name: string | RegExp) {
  await scope.getByRole('option', { name }).click();
}

export async function closeCase(page: Page, expected: string | RegExp) {
  await openMonitor(page);
  const tickets = await openApp(page, 'Centro de tickets');
  await tickets.getByRole('button', { name: 'Cerrar como resuelto' }).click();
  const report = page.getByRole('dialog', { name: 'Informe del expediente' });
  await expect(report).toContainText(expected);
  const text = await report.innerText();
  await report.getByRole('button', { name: /Cerrar/ }).click();
  await closePanel(page);
  return text;
}
