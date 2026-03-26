import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('menuPlanner_forceGuest', '1');
  });

  await page.goto('/');
});

test.describe('Responsive and viewport behavior', () => {
  test('desktop layout keeps two-column shell and keeps only account in top header', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('desktop'), 'Desktop-only assertion');

    const mainContainer = page.locator('.main-container');
    const templateColumns = await mainContainer.evaluate((node) => getComputedStyle(node).gridTemplateColumns);
    const columnCount = templateColumns.split(' ').filter(Boolean).length;

    expect(columnCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('#lang-btn')).toHaveCount(0);
    await expect(page.locator('#theme-btn')).toHaveCount(0);
    await expect(page.locator('#auth-btn')).toBeVisible();
  });

  test('mobile header stays fixed and visible on scroll', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile-only assertion');

    const header = page.locator('.header');
    await expect(header).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(header).toBeVisible();
    await expect(header).not.toHaveClass(/header-hidden/);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).toBeVisible();
    await expect(header).not.toHaveClass(/header-hidden/);
  });

  test('no zoom controls are shown in header', async ({ page }) => {
    await expect(page.locator('#zoom-in-btn')).toHaveCount(0);
    await expect(page.locator('#zoom-out-btn')).toHaveCount(0);
    await expect(page.locator('#zoom-reset-btn')).toHaveCount(0);
  });
});
