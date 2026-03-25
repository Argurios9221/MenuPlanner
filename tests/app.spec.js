import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('MenuPlanner UI', () => {
  test('Generate menu and navigate tabs', async ({ page }) => {
    await page.goto(BASE_URL);

    // Select Italian cuisine
    await page.selectOption('#cuisine', 'italian');

    await page.click('button#generate');
    await page.waitForSelector('.day-card', { timeout: 30000 });
    const days = await page.$$('.day-card');
    expect(days.length).toBeGreaterThan(0);

    // Verify meal images are rendered
    const images = await page.$$('.meal-thumb');
    expect(images.length).toBeGreaterThan(0);

    // Switch to basket tab
    await page.click('.tab[data-tab="basket"]');
    await expect(page.locator('#basketContainer')).toHaveCSS('display', 'grid');

    // Wait for categorized basket sections to load (ingredients are fetched async)
    await page.waitForSelector('.basket-category', { timeout: 30000 });
    const categories = await page.$$('.basket-category');
    expect(categories.length).toBeGreaterThan(0);

    // Switch back to menu
    await page.click('.tab[data-tab="menu"]');
    await expect(page.locator('#menuContainer')).toHaveCSS('display', 'grid');

    const errorVisible = await page.isVisible('#error');
    expect(errorVisible).toBeFalsy();
  });
});
