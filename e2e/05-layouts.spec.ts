import { expect, test } from '@playwright/test';
import { fresh, startGuard, watchConsole } from './helpers';

const SIZES = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 3440, height: 1440 },
  { width: 390, height: 844 },
];

for (const size of SIZES) {
  test(`layout ${size.width}×${size.height}: sin scroll horizontal, controles accesibles`, async ({
    page,
  }) => {
    const errors = watchConsole(page);
    await page.setViewportSize(size);
    await fresh(page);
    await expect(page.getByRole('button', { name: 'Nueva guardia' })).toBeInViewport();
    await startGuard(page, 1);
    const mobile = size.width < 700;
    const phone = mobile
      ? page.locator('.mobile-nav').getByRole('button', { name: 'Atender' })
      : page.getByRole('button', { name: /Teléfono: está sonando/ });
    await expect(phone).toBeInViewport();
    await phone.click();
    await expect(page.locator('aside.call')).toBeInViewport();
    // En móvil la conversación se contrae para usar las herramientas sin perder su estado.
    if (mobile) await page.getByRole('button', { name: 'Contraer la llamada' }).click();
    const monitor = mobile
      ? page.locator('.mobile-nav').getByRole('button', { name: 'Monitor' })
      : page.getByRole('button', { name: /Monitor: abrir GuardiaOS/ });
    await expect(monitor).toBeInViewport();
    await monitor.click();
    await expect(page.locator('section.win').first()).toBeInViewport();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `test-results/layout-${size.width}x${size.height}.png` });
    expect(errors).toEqual([]);
  });
}

for (const size of SIZES) {
  test(`mesa ${size.width}×${size.height}: objetos apoyados con madera delante; tutorial sin tapar`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await fresh(page);
    await page.getByRole('button', { name: /Cómo se juega/ }).click();
    // Todos los objetos delanteros terminan antes del borde de la mesa (y≈885 de 941) con margen.
    const gaps = await page.evaluate(() => {
      const stage = document.querySelector('.stage')!.getBoundingClientRect();
      const edge = stage.top + (stage.height * 885) / 941;
      const sel = [
        '[data-target=notebook]',
        '[data-target=ticket]',
        '[data-target=snack]',
        '[data-target=phone]',
        'img.decor[src*="keyboard"]',
        'img.decor[src*="mouse"]',
      ];
      return Object.fromEntries(
        sel
          .map((s) => [s, document.querySelector(s)] as const)
          .filter(([, el]) => el)
          .map(([s, el]) => [s, (edge - el!.getBoundingClientRect().bottom) / stage.height]),
      );
    });
    for (const [sel, gap] of Object.entries(gaps)) expect(gap, sel).toBeGreaterThan(0.04);
    // La indicación del tutorial queda fuera del escenario y de la barra de tareas de GuardiaOS.
    const tut = page.locator('.tutorial');
    await expect(tut).toBeVisible();
    const t = (await tut.boundingBox())!;
    const stage = (await page.locator('.stage').boundingBox())!;
    expect(t.y + t.height).toBeLessThanOrEqual(stage.y + 1);
    const mobile = size.width < 700;
    await (
      mobile
        ? page.locator('.mobile-nav').getByRole('button', { name: 'Monitor' })
        : page.getByRole('button', { name: /Monitor: abrir GuardiaOS/ })
    ).click();
    const bar = (await page.locator('.os-taskbar').boundingBox())!;
    expect(t.y + t.height).toBeLessThanOrEqual(bar.y);
  });
}
