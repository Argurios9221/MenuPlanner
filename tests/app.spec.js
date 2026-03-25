import { test, expect } from '@playwright/test';

const mealsByCategory = {
  Breakfast: [
    { idMeal: '101', strMeal: 'Oat Pancakes', strMealThumb: 'https://img.local/101.jpg' },
    { idMeal: '102', strMeal: 'Fruit Yogurt Bowl', strMealThumb: 'https://img.local/102.jpg' },
  ],
  Vegetarian: [
    { idMeal: '201', strMeal: 'Veggie Burger', strMealThumb: 'https://img.local/201.jpg' },
    { idMeal: '202', strMeal: 'Mushroom Pasta', strMealThumb: 'https://img.local/202.jpg' },
  ],
  Vegan: [
    { idMeal: '301', strMeal: 'Chickpea Curry', strMealThumb: 'https://img.local/301.jpg' },
    { idMeal: '302', strMeal: 'Tofu Stir Fry', strMealThumb: 'https://img.local/302.jpg' },
  ],
  Pasta: [{ idMeal: '202', strMeal: 'Mushroom Pasta', strMealThumb: 'https://img.local/202.jpg' }],
  Side: [{ idMeal: '303', strMeal: 'Roasted Vegetables', strMealThumb: 'https://img.local/303.jpg' }],
  Starter: [{ idMeal: '304', strMeal: 'Tomato Soup', strMealThumb: 'https://img.local/304.jpg' }],
  Seafood: [{ idMeal: '401', strMeal: 'Baked Cod', strMealThumb: 'https://img.local/401.jpg' }],
  Chicken: [{ idMeal: '402', strMeal: 'Grilled Chicken', strMealThumb: 'https://img.local/402.jpg' }],
  Beef: [{ idMeal: '403', strMeal: 'Beef Stew', strMealThumb: 'https://img.local/403.jpg' }],
  Pork: [{ idMeal: '404', strMeal: 'Pork Skillet', strMealThumb: 'https://img.local/404.jpg' }],
  Lamb: [{ idMeal: '405', strMeal: 'Lamb Roast', strMealThumb: 'https://img.local/405.jpg' }],
  Dessert: [{ idMeal: '501', strMeal: 'Apple Crumble', strMealThumb: 'https://img.local/501.jpg' }],
  Miscellaneous: [{ idMeal: '303', strMeal: 'Roasted Vegetables', strMealThumb: 'https://img.local/303.jpg' }],
};

function makeMealDetails(id, meal, category, area, instructions, ingredients) {
  const details = {
    idMeal: id,
    strMeal: meal,
    strCategory: category,
    strArea: area,
    strInstructions: instructions,
    strMealThumb: `https://img.local/${id}.jpg`,
    strTags: '',
    strYoutube: '',
  };

  for (let i = 1; i <= 20; i++) {
    const ing = ingredients[i - 1];
    details[`strIngredient${i}`] = ing ? ing.name : '';
    details[`strMeasure${i}`] = ing ? ing.measure : '';
  }

  return details;
}

const mealDetails = {
  '101': makeMealDetails(
    '101',
    'Oat Pancakes',
    'Breakfast',
    'International',
    'Mix oats with milk. Cook on a hot pan. Serve warm.',
    [
      { name: 'Oats', measure: '1 cup' },
      { name: 'Milk', measure: '200 ml' },
      { name: 'Banana', measure: '1 pc' },
    ]
  ),
  '102': makeMealDetails(
    '102',
    'Fruit Yogurt Bowl',
    'Breakfast',
    'International',
    'Combine yogurt and fruits. Top with seeds and serve.',
    [
      { name: 'Yogurt', measure: '250 g' },
      { name: 'Strawberry', measure: '100 g' },
      { name: 'Banana', measure: '1 pc' },
    ]
  ),
  '201': makeMealDetails(
    '201',
    'Veggie Burger',
    'Vegetarian',
    'International',
    'Mix beans and vegetables. Shape patties. Grill and serve in buns.',
    [
      { name: 'Beans', measure: '1 cup' },
      { name: 'Onion', measure: '1 pc' },
      { name: 'Burger Bun', measure: '2 pcs' },
    ]
  ),
  '202': makeMealDetails(
    '202',
    'Mushroom Pasta',
    'Vegetarian',
    'Italian',
    'Boil pasta. Saute mushrooms. Combine and season.',
    [
      { name: 'Pasta', measure: '250 g' },
      { name: 'Mushroom', measure: '200 g' },
      { name: 'Olive Oil', measure: '2 tbsp' },
    ]
  ),
  '301': makeMealDetails(
    '301',
    'Chickpea Curry',
    'Vegan',
    'Indian',
    'Cook onion and spices. Add chickpeas. Simmer and serve.',
    [
      { name: 'Chickpeas', measure: '1 can' },
      { name: 'Tomato', measure: '2 pcs' },
      { name: 'Onion', measure: '1 pc' },
    ]
  ),
  '302': makeMealDetails(
    '302',
    'Tofu Stir Fry',
    'Vegan',
    'Asian',
    'Saute tofu and vegetables. Add soy sauce. Serve hot.',
    [
      { name: 'Tofu', measure: '300 g' },
      { name: 'Broccoli', measure: '150 g' },
      { name: 'Soy Sauce', measure: '2 tbsp' },
    ]
  ),
  '303': makeMealDetails(
    '303',
    'Roasted Vegetables',
    'Vegetarian',
    'International',
    'Cut vegetables. Roast with oil and salt.',
    [
      { name: 'Carrot', measure: '2 pcs' },
      { name: 'Potato', measure: '2 pcs' },
      { name: 'Olive Oil', measure: '1 tbsp' },
    ]
  ),
  '304': makeMealDetails(
    '304',
    'Tomato Soup',
    'Vegetarian',
    'International',
    'Cook tomatoes and onions. Blend smooth and season.',
    [
      { name: 'Tomato', measure: '4 pcs' },
      { name: 'Onion', measure: '1 pc' },
      { name: 'Salt', measure: '1 tsp' },
    ]
  ),
  '401': makeMealDetails(
    '401',
    'Baked Cod',
    'Seafood',
    'British',
    'Season fish. Bake for 25 minutes and serve.',
    [
      { name: 'Cod', measure: '400 g' },
      { name: 'Lemon', measure: '1 pc' },
      { name: 'Olive Oil', measure: '1 tbsp' },
    ]
  ),
  '402': makeMealDetails(
    '402',
    'Grilled Chicken',
    'Chicken',
    'American',
    'Season chicken. Grill until cooked through.',
    [
      { name: 'Chicken Breast', measure: '2 pcs' },
      { name: 'Paprika', measure: '1 tsp' },
      { name: 'Salt', measure: '1 tsp' },
    ]
  ),
  '403': makeMealDetails(
    '403',
    'Beef Stew',
    'Beef',
    'French',
    'Brown beef. Simmer with vegetables.',
    [
      { name: 'Beef', measure: '500 g' },
      { name: 'Carrot', measure: '2 pcs' },
      { name: 'Onion', measure: '1 pc' },
    ]
  ),
  '404': makeMealDetails(
    '404',
    'Pork Skillet',
    'Pork',
    'German',
    'Cook pork with onions and peppers.',
    [
      { name: 'Pork', measure: '400 g' },
      { name: 'Onion', measure: '1 pc' },
      { name: 'Pepper', measure: '1 pc' },
    ]
  ),
  '405': makeMealDetails(
    '405',
    'Lamb Roast',
    'Lamb',
    'Greek',
    'Season lamb and roast until tender.',
    [
      { name: 'Lamb', measure: '600 g' },
      { name: 'Rosemary', measure: '1 tbsp' },
      { name: 'Garlic', measure: '3 cloves' },
    ]
  ),
  '501': makeMealDetails(
    '501',
    'Apple Crumble',
    'Dessert',
    'British',
    'Bake apples with topping until golden.',
    [
      { name: 'Apple', measure: '3 pcs' },
      { name: 'Flour', measure: '150 g' },
      { name: 'Butter', measure: '100 g' },
    ]
  ),
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });

  let randomIndex = 0;
  const randomPool = ['301', '302', '303', '201', '202', '304'];

  await page.route('**/api/json/v1/1/filter.php?c=*', async (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get('c') || 'Miscellaneous';
    const meals = mealsByCategory[category] || mealsByCategory.Miscellaneous;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals }),
    });
  });

  await page.route('**/api/json/v1/1/lookup.php?i=*', async (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('i');
    const details = mealDetails[id] || mealDetails['303'];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [details] }),
    });
  });

  await page.route('**/api/json/v1/1/random.php', async (route) => {
    const id = randomPool[randomIndex % randomPool.length];
    randomIndex += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ meals: [mealDetails[id]] }),
    });
  });

  await page.route('**/mymemory.translated.net/get*', async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') || '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        responseStatus: 200,
        responseData: { translatedText: `[BG] ${q}` },
      }),
    });
  });
});

test.describe('MenuPlanner full app coverage', () => {
  test('generates a full weekly menu and opens recipe on meal click', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-generate');

    await expect(page.locator('.day-card')).toHaveCount(7, { timeout: 30000 });
    await expect(page.locator('.day-card').first().locator('.meal-item')).toHaveCount(3);

    await page.locator('.day-card .meal-item').first().click();
    await expect(page.locator('#recipe-modal')).toHaveClass(/open/);
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible();

    await page.locator('#recipe-modal .modal-close').click();
    await expect(page.locator('#recipe-modal')).not.toHaveClass(/open/);
  });

  test('builds shopping basket and categories from generated menu', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-generate');
    await expect(page.locator('.day-card')).toHaveCount(7, { timeout: 30000 });

    await page.click('[data-tab="basket"]');
    await expect(page.locator('.basket-category').first()).toBeVisible({ timeout: 30000 });

    const categoryCount = await page.locator('.basket-category').count();
    expect(categoryCount).toBeGreaterThan(0);

    const itemCount = await page.locator('.basket-item').count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('supports favorites and PDF exports for menu, basket and recipe', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-generate');
    await expect(page.locator('.day-card')).toHaveCount(7, { timeout: 30000 });

    await page.locator('.day-card .fav-btn').first().click();
    await page.click('[data-tab="favorites"]');

    const favoriteItems = await page.locator('.favorites-recipes .favorites-item').count();
    expect(favoriteItems).toBeGreaterThan(0);

    await page.click('[data-tab="menu"]');
    await page.locator('.day-card .meal-item').first().click();

    await page.locator('.export-recipe-pdf-btn').click();
    await expect(page.locator('.toast').last()).toContainText('Recipe exported as PDF');

    await page.locator('#recipe-modal .modal-close').click();

    await page.locator('.export-pdf-btn').click();
    await expect(page.locator('.toast').last()).toContainText('Menu exported as PDF');

    await page.click('[data-tab="basket"]');
    await expect(page.locator('.export-basket-pdf-btn')).toBeVisible({ timeout: 30000 });
    await page.locator('.export-basket-pdf-btn').click();
    await expect(page.locator('.toast').last()).toContainText('Basket exported as PDF');
  });

  test('supports language toggle and translated recipe fields', async ({ page }) => {
    await page.goto('/');

    await page.click('#lang-btn');
    await page.click('#btn-generate');

    await expect(page.locator('.day-card')).toHaveCount(7, { timeout: 30000 });

    await page.locator('.day-card .meal-item').first().click();
    await expect(page.locator('.recipe-section h3').nth(1)).toContainText('Начин на приготвяне');
    await expect(page.locator('.translation-note')).toContainText('Забележка');
  });

  test('renders Bulgarian translations for key labels and placeholders', async ({ page }) => {
    await page.goto('/');

    await page.click('#lang-btn');

    await expect(page.locator('h2[data-i18n="preferences"]')).toHaveText('Настройки');
    await expect(page.locator('[data-i18n="tabMenu"]')).toHaveText('Седмично меню');
    await expect(page.locator('[data-i18n="tabBasket"]')).toHaveText('Кошница за пазаруване');
    await expect(page.locator('[data-i18n="tabFavorites"]')).toHaveText('Любими');

    await expect(page.locator('label[for="people-input"]')).toHaveText('Брой хора');
    await expect(page.locator('label[for="variety-select"]')).toHaveText('Разнообразие');
    await expect(page.locator('label[for="cuisine-select"]')).toHaveText('Кухня');
    await expect(page.locator('label[for="allergies-input"]')).toHaveText(
      'Алергии (разделени със запетая)'
    );
    await expect(page.locator('label[for="notes-input"]')).toHaveText('Допълнителни бележки');

    await expect(page.locator('#allergies-input')).toHaveAttribute('placeholder', 'напр. ядки, миди');
    await expect(page.locator('#notes-input')).toHaveAttribute(
      'placeholder',
      'Диетични предпочитания или забележки...'
    );

    await expect(page.locator('#theme-btn')).toHaveAttribute('title', 'Превключи към тъмен режим');
  });
});
