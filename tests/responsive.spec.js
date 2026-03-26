import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('menuPlanner_forceGuest', '1');
  });

  await page.goto('/');
});

test.describe('Responsive and viewport behavior', () => {
  test('desktop layout keeps two-column shell and visible header controls', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only assertion');

    const mainContainer = page.locator('.main-container');
    const templateColumns = await mainContainer.evaluate((node) => getComputedStyle(node).gridTemplateColumns);
    const columnCount = templateColumns.split(' ').filter(Boolean).length;

    expect(columnCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('#zoom-in-btn')).toBeVisible();
    await expect(page.locator('#zoom-out-btn')).toBeVisible();
    await expect(page.locator('#zoom-reset-btn')).toHaveText('100%');
  });

  test('mobile header hides on scroll down and returns on scroll up', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only assertion');

    const header = page.locator('.header');
    await expect(header).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(header).toHaveClass(/header-hidden/);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).not.toHaveClass(/header-hidden/);
  });

  test('zoom controls update zoom level and persist state', async ({ page }) => {
    const html = page.locator('html');

    await expect(page.locator('#zoom-reset-btn')).toHaveText('100%');

    await page.click('#zoom-in-btn');
    await expect(page.locator('#zoom-reset-btn')).toHaveText('105%');
    await expect(html).toHaveCSS('--ui-zoom', '1.05');

    await page.click('#zoom-out-btn');
    await expect(page.locator('#zoom-reset-btn')).toHaveText('100%');

    await page.click('#zoom-out-btn');
    await expect(page.locator('#zoom-reset-btn')).toHaveText('95%');

    const savedZoom = await page.evaluate(() => localStorage.getItem('menuPlanner_uiZoom'));
    expect(savedZoom).toBe('0.95');

    await page.click('#zoom-reset-btn');
    await expect(page.locator('#zoom-reset-btn')).toHaveText('100%');
  });
});
