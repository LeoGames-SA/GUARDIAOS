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
