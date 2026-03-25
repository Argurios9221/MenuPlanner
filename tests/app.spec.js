import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('MenuPlanner UI', () => {
  test('Генериране на меню и навигация', async ({ page }) => {
    await page.goto(BASE_URL);

    // Избери Италианска кухня (TheMealDB, не изисква AI API)
    await page.selectOption('#cuisine', 'italian');

    await page.click('button#generate');
    await page.waitForSelector('.day-card', { timeout: 30000 });
    const days = await page.$$('.day-card');
    expect(days.length).toBeGreaterThan(0);

    await page.click('.tab[data-tab="basket"]');
    await expect(page.locator('#basketContainer')).toHaveCSS('display', 'grid');

    await page.click('.tab[data-tab="menu"]');
    await expect(page.locator('#menuContainer')).toHaveCSS('display', 'grid');

    const errorVisible = await page.isVisible('#error');
    expect(errorVisible).toBeFalsy();
  });
});
