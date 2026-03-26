// Advanced UI components for Phase 2 features
import { t } from './i18n.js';

// Create recipe search bar
export function createSearchBar() {
  const container = document.createElement('div');
  container.className = 'search-bar-container';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'recipe-search';
  searchInput.className = 'search-input';
  searchInput.placeholder = t('search') || 'Search recipes...';

  const searchBtn = document.createElement('button');
  searchBtn.className = 'search-btn';
  searchBtn.innerHTML = '🔍';
  searchBtn.title = 'Search';

  container.appendChild(searchInput);
  container.appendChild(searchBtn);

  return { container, searchInput, searchBtn };
}

// Create advanced filters panel
export function createFiltersPanel() {
  const panel = document.createElement('div');
  panel.className = 'filters-panel';

  const html = `
    <div class="filter-group">
      <label for="difficulty-filter">Difficulty</label>
      <select id="difficulty-filter" class="filter-select">
        <option value="">All levels</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="prep-time-filter">Max Prep Time</label>
      <select id="prep-time-filter" class="filter-select">
        <option value="">Any time</option>
        <option value="30">30 minutes</option>
        <option value="60">1 hour</option>
        <option value="120">2 hours</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="diet-filter">Diet Type</label>
      <select id="diet-filter" class="filter-select">
        <option value="">All diets</option>
        <option value="vegetarian">Vegetarian</option>
        <option value="vegan">Vegan</option>
        <option value="gluten_free">Gluten-free</option>
        <option value="dairy_free">Dairy-free</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="allergen-filter">${t('filterAllergen') || 'Exclude allergens'}</label>
      <select id="allergen-filter" class="filter-select" multiple>
        <option value="nuts">Nuts</option>
        <option value="shellfish">Shellfish</option>
        <option value="fish">Fish</option>
        <option value="dairy">Dairy</option>
        <option value="gluten">Gluten</option>
        <option value="eggs">Eggs</option>
        <option value="soy">Soy</option>
      </select>
    </div>

    <div class="filter-actions">
      <button id="apply-filters" class="btn btn-primary">Apply Filters</button>
      <button id="clear-filters" class="btn btn-secondary">Clear</button>
    </div>
  `;

  panel.innerHTML = html;
  return panel;
}

// Create recipe metadata display
export function createRecipeMetadata(recipe) {
  const container = document.createElement('div');
  container.className = 'recipe-metadata';

  if (!recipe.metadata) {
    return container;
  }

  const meta = recipe.metadata;

  const html = `
    <div class="metadata-grid">
      <div class="metadata-item">
        <span class="label">⏱️ Prep Time</span>
        <span class="value">${meta.prepTime || 30}m</span>
      </div>
      <div class="metadata-item">
        <span class="label">📊 Difficulty</span>
        <span class="value">${meta.difficulty || 'Medium'}</span>
      </div>
      <div class="metadata-item">
        <span class="label">👥 Servings</span>
        <span class="value">${meta.servings || 4}</span>
      </div>
      <div class="metadata-item">
        <span class="label">🔥 Calories</span>
        <span class="value">${meta.nutrition?.estimatedCalories || 300}cal</span>
      </div>
    </div>

    ${
  meta.nutrition?.allergens?.length > 0
    ? `
      <div class="allergens-warning">
        <strong>⚠️ Contains:</strong> ${meta.nutrition.allergens.join(', ')}
      </div>
    `
    : ''
}

    <div class="ingredients-info">
      <span>📦 ${meta.ingredientCount || 0} ingredients</span>
    </div>
  `;

  container.innerHTML = html;
  return container;
}

// Create allergen selector for preferences
export function createAllergenSelector() {
  const container = document.createElement('div');
  container.className = 'allergen-selector';

  const allergens = ['Nuts', 'Shellfish', 'Fish', 'Dairy', 'Gluten', 'Eggs', 'Soy', 'Sesame'];

  const html = `
    <h3>${t('labelAllergies') || 'Your Allergies'}</h3>
    <div class="allergen-grid">
      ${allergens
    .map(
      (allergen) => `
        <label class="allergen-checkbox">
          <input type="checkbox" class="allergen-input" value="${allergen.toLowerCase()}">
          <span>${allergen}</span>
        </label>
      `
    )
    .join('')}
    </div>
  `;

  container.innerHTML = html;
  return container;
}

// Create PDF export options
export function createPDFExportPanel() {
  const panel = document.createElement('div');
  panel.className = 'pdf-export-panel';

  const html = `
    <h3>📄 Export as PDF</h3>
    <div class="export-options">
      <button id="export-menu-pdf" class="export-btn">
        📅 Export Menu
      </button>
      <button id="export-basket-pdf" class="export-btn">
        🛒 Export Basket
      </button>
      <button id="export-recipe-pdf" class="export-btn">
        📖 Export Recipe
      </button>
    </div>
  `;

  panel.innerHTML = html;
  return panel;
}

// Create search results display
export function createSearchResults(results, onSelectRecipe) {
  const container = document.createElement('div');
  container.className = 'search-results';

  if (results.length === 0) {
    container.innerHTML = '<p class="no-results">No recipes found. Try different keywords.</p>';
    return container;
  }

  const html = `
    <p class="results-count">Found ${results.length} recipes</p>
    <div class="results-grid">
      ${results
    .map(
      (recipe) => `
        <div class="result-item" data-meal-id="${recipe.idMeal}">
          ${recipe.strMealThumb ? `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">` : ''}
          <h4>${recipe.strMeal}</h4>
          ${recipe.strCategory ? `<p class="category">${recipe.strCategory}</p>` : ''}
          <button class="btn-select">View Recipe</button>
        </div>
      `
    )
    .join('')}
    </div>
  `;

  container.innerHTML = html;

  // Attach click handlers
  container.querySelectorAll('.btn-select').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const mealId = e.target.closest('.result-item').dataset.mealId;
      onSelectRecipe(mealId);
    });
  });

  return container;
}

// Create trending recipes section
export function createTrendingSection(recipes) {
  const container = document.createElement('div');
  container.className = 'trending-section';

  if (recipes.length === 0) {
    container.innerHTML = '<p>No trending recipes available.</p>';
    return container;
  }

  const html = `
    <h3>🔥 ${t('trending') || 'Trending Recipes'}</h3>
    <div class="trending-grid">
      ${recipes
    .slice(0, 6)
    .map(
      (recipe) => `
        <div class="trending-item" data-meal-id="${recipe.idMeal}">
          ${recipe.strMealThumb ? `<img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">` : ''}
          <h4>${recipe.strMeal}</h4>
          <button class="btn-add">Add to Menu</button>
        </div>
      `
    )
    .join('')}
    </div>
  `;

  container.innerHTML = html;
  return container;
}

// Create recipe comparison view
export function createRecipeComparison(recipes) {
  const container = document.createElement('div');
  container.className = 'recipe-comparison';

  if (recipes.length < 2) {
    container.innerHTML = '<p>Select at least 2 recipes to compare.</p>';
    return container;
  }

  const comparisonItems = recipes
    .map((recipe) => {
      const meta = recipe.metadata || {};
      return `
      <div class="comparison-item">
        <h4>${recipe.strMeal}</h4>
        <div class="comparison-details">
          <p>⏱️ ${meta.prepTime || 30}m</p>
          <p>📊 ${meta.difficulty || 'Medium'}</p>
          <p>👥 ${meta.servings || 4}</p>
          <p>📦 ${meta.ingredientCount || 0} ingredients</p>
        </div>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <h3>Recipe Comparison</h3>
    <div class="comparison-grid">
      ${comparisonItems}
    </div>
  `;

  return container;
}

// Style definitions
const styles = `
.search-bar-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-family: inherit;
}

.search-input:focus {
  outline: none;
  border-color: var(--secondary-color);
  box-shadow: 0 0 4px rgba(201, 168, 118, 0.3);
}

.search-btn {
  padding: 0.75rem 1rem;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: all var(--transition-speed);
}

.search-btn:hover {
  background: var(--primary-color);
}

.filters-panel {
  background: white;
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-sm);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--dark-text);
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  background: white;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--secondary-color);
}

.filter-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.5rem;
}

.recipe-metadata {
  background: var(--light-bg);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin: 1rem 0;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.metadata-item {
  text-align: center;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.metadata-item .label {
  display: block;
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 0.25rem;
}

.metadata-item .value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--primary-color);
}

.allergens-warning {
  background: #fff3e0;
  padding: 0.75rem;
  border-left: 3px solid #ff9800;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.search-results {
  margin: 1rem 0;
}

.results-count {
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.result-item {
  background: white;
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-speed);
}

.result-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.result-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.result-item h4 {
  padding: 0.5rem;
  color: var(--dark-text);
  margin: 0;
}

.result-item .category {
  padding: 0 0.5rem;
  font-size: 0.85rem;
  color: #999;
  margin: 0;
}

.result-item .btn-select {
  width: calc(100% - 1rem);
  margin: 0.5rem;
  padding: 0.5rem;
  background: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all var(--transition-speed);
}

.result-item .btn-select:hover {
  background: var(--primary-color);
}

.trending-section,
.pdf-export-panel {
  background: white;
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin: 1rem 0;
  box-shadow: var(--shadow-sm);
}

.trending-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.trending-item {
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-speed);
}

.trending-item img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.trending-item h4 {
  font-size: 0.9rem;
  margin: 0.5rem 0;
}

.allergen-selector {
  background: white;
  border-radius: var(--border-radius);
  padding: 1rem;
  margin: 1rem 0;
}

.allergen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
}

.allergen-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background var(--transition-speed);
}

.allergen-checkbox:hover {
  background: var(--light-bg);
}

.allergen-checkbox input {
  cursor: pointer;
}

`;

// Export styles
export function injectStyles() {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}
