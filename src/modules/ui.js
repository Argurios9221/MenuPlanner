// UI rendering and DOM manipulation
import { t } from './i18n.js';
import { getCheckedItems, toggleCheckedItem, isFavoriteRecipe as isFavRecipe } from './storage.js';
import { formatIngredients, formatInstructions } from './recipe.js';
import { estimateCalories } from './metadata.js';

function getLocalizedDifficulty(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('easy') || normalized.includes('лес')) {
    return t('difficultyEasy');
  }
  if (normalized.includes('hard') || normalized.includes('труд')) {
    return normalized.includes('very') ? t('difficultyVeryHard') : t('difficultyHard');
  }
  return t('difficultyMedium');
}

// DOM Selectors
const DOM = {
  app: '#app',
  tabsContainer: '.tabs',
  menuTab: '#menu-tab',
  basketTab: '#basket-tab',
  favoritesTab: '#favorites-tab',
  menuContainer: '#menu-container',
  basketContainer: '#basket-container',
  favoritesContainer: '#favorites-container',
  statusText: '#status-text',
  modal: '#recipe-modal',
  modalContent: '.modal-content',
  modalClose: '.modal-close',
  langBtn: '#lang-btn',
};

function isReliableImageSrc(meal) {
  const src = String(meal?.strMealThumb || '').trim().toLowerCase();
  const id = String(meal?.idMeal || '').toLowerCase();
  if (!src) {
    return false;
  }
  if (id.startsWith('local_') || src.includes('unsplash.com') || src.includes('/preview/')) {
    return false;
  }
  return true;
}

function getMealPlaceholderIcon(mealType) {
  if (mealType === 'Breakfast') {
    return '🍳';
  }
  if (mealType === 'Lunch') {
    return '🥗';
  }
  if (mealType === 'Dinner') {
    return '🍲';
  }
  return '🍽️';
}

export function createMenuDayCard(day, dayIndex, lockedMeals = new Map()) {
  const dayNames = t('days') || [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const mealTypes = t('mealTypes') || ['Breakfast', 'Lunch', 'Dinner'];

  const card = document.createElement('div');
  card.className = 'day-card';
  card.setAttribute('data-day', dayIndex);

  const totalKcal = day.meals.reduce((sum, meal) => {
    // Prefer Spoonacular's accurate calorie data; fall back to estimation
    const kcal = meal.nutrition?.calories || estimateCalories(meal.ingredients || []);
    return sum + kcal;
  }, 0);

  let html = `<div class="day-card-header"><h3>${dayNames[dayIndex]}</h3><span class="day-kcal">~${totalKcal} ${t('kcalPerDay')}</span></div>`;

  for (let mealIndex = 0; mealIndex < day.meals.length; mealIndex++) {
    const meal = day.meals[mealIndex];
    const lockKey = `${dayIndex}:${mealIndex}`;
    const isLocked = lockedMeals.has(lockKey);
    const mealName = meal.strMealTranslated || meal.strMeal;
    const mealTypeLabel = mealTypes[mealTypes.indexOf(meal.type)] || meal.type;
    const thumbHtml = isReliableImageSrc(meal)
      ? `<img src="${meal.strMealThumb}" alt="${mealName}" class="meal-thumb" loading="lazy">`
      : `<div class="meal-thumb meal-thumb-fallback" aria-hidden="true">${getMealPlaceholderIcon(meal.type)}</div>`;
    const nutritionBadge = meal.nutrition?.calories
      ? `<span class="meal-nutrition-badge" title="Per serving">🔥 ${meal.nutrition.calories} kcal</span>`
      : '';
    html += `
      <div class="meal-item${isLocked ? ' meal-locked' : ''}" data-meal-id="${meal.idMeal}" data-meal-name="${mealName}" data-meal-type="${meal.type}" data-day="${dayIndex}" data-meal-index="${mealIndex}" tabindex="0" role="button" aria-label="${mealTypeLabel}: ${mealName}">
        <div class="meal-content">
          ${thumbHtml}
          <div class="meal-info">
            <span class="meal-type-badge">${mealTypeLabel}</span>
            <p class="meal-name">${mealName}</p>
            ${nutritionBadge}
          </div>
        </div>
        <div class="meal-actions">
          <button class="meal-action-icon swap-btn" data-meal-id="${meal.idMeal}" title="${t('swapMeal')}" ${isLocked ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          <button class="meal-action-icon lock-btn ${isLocked ? 'locked' : ''}" data-meal-id="${meal.idMeal}" title="${isLocked ? t('unlockMeal') : t('lockMeal')}">
            ${isLocked
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'
}
          </button>
          <button class="meal-action-icon share-btn" data-meal-id="${meal.idMeal}" title="${t('shareRecipe')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button class="meal-action-icon fav-btn" data-meal-id="${meal.idMeal}" title="${t('addedToFav')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  card.innerHTML = html;
  return card;
}

export function createBasketCategory(categoryName, ingredients) {
  const section = document.createElement('div');
  section.className = 'basket-category';
  section.setAttribute('data-category', categoryName);

  const heading = document.createElement('h3');
  heading.textContent = categoryName;
  section.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'ingredient-list';

  for (const ingredient of ingredients) {
    const item = createBasketItem(ingredient);
    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}

function createBasketItem(ingredient) {
  const li = document.createElement('li');
  li.className = 'basket-item';
  li.setAttribute('data-ingredient-key', ingredient.key);

  const checked = getCheckedItems()[ingredient.key] || false;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'ingredient-checkbox';
  checkbox.checked = checked;
  checkbox.addEventListener('change', () => {
    toggleCheckedItem(ingredient.key);
    li.classList.toggle('checked');
  });

  const label = document.createElement('label');
  const measureStr = ingredient.displayMeasure || (ingredient.measures?.length > 0 ? ingredient.measures.join(', ') : '');
  const countBadge = ingredient.count > 1 ? ` ×${ingredient.count}` : '';
  label.textContent = `${ingredient.name}${countBadge}${measureStr ? ` — ${measureStr}` : ''}`;

  li.appendChild(checkbox);
  li.appendChild(label);

  if (checked) {
    li.classList.add('checked');
  }

  return li;
}

export function createFavoritesSection(type, items) {
  const section = document.createElement('div');
  section.className = `favorites-section favorites-${type}`;

  const heading = document.createElement('h3');
  function getHeading() {
    if (type === 'menus') {
      return t('favMenus');
    }
    if (type === 'recipes') {
      return t('favRecipes');
    }
    if (type === 'products') {
      return t('favProducts');
    }
    if (type === 'history') {
      return t('recentMenus');
    }
    return type;
  }
  heading.textContent = getHeading();
  section.appendChild(heading);

  if (items?.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('favEmpty') || 'No items saved yet.';
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement('ul');
  list.className = 'favorites-list';

  for (const item of items) {
    const li = createFavoritesItem(item, type);
    list.appendChild(li);
  }

  section.appendChild(list);
  return section;
}

function createFavoritesItem(item, type) {
  const li = document.createElement('li');
  li.className = 'favorites-item';

  let content = '';
  if (type === 'recipes') {
    content = `
      <div class="fav-item-content favorite-openable" data-favorite-type="recipe" data-meal-id="${item.idMeal}">
        <strong>${item.strMeal}</strong>
        <small>${item.strCategory} • ${item.strArea}</small>
      </div>
      <button class="btn-remove" data-meal-id="${item.idMeal}">✕</button>
    `;
  } else if (type === 'products') {
    content = `
      <div class="fav-item-content">
        <strong>${item.name}</strong>
      </div>
      <button class="btn-remove" data-product-name="${item.name}">✕</button>
    `;
  } else if (type === 'menus') {
    content = `
      <div class="fav-item-content favorite-openable" data-favorite-type="menu" data-menu-id="${item.id}">
        <strong>${t('menuLabel')} ${item.id.substring(0, 8)}</strong>
        <small>${new Date(item.savedAt).toLocaleDateString()}</small>
      </div>
      <button class="btn-remove" data-menu-id="${item.id}">✕</button>
    `;
  } else if (type === 'history') {
    const date = new Date(item.historyAt || item.generatedAt || Date.now()).toLocaleDateString();
    const time = new Date(item.historyAt || item.generatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    content = `
      <div class="fav-item-content favorite-openable" data-favorite-type="history" data-menu-id="${item.id}">
        <strong>🕐 ${date} ${time}</strong>
        <small>${item.days?.length || 7} ${t('days')?.[0] ? t('days').slice(0, 2).join(', ') + '...' : 'days'}</small>
      </div>
    `;
  }

  li.innerHTML = content;
  return li;
}

export function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);
}

export function updateStatusText(message, type = 'ready') {
  const status = document.querySelector(DOM.statusText);
  if (status) {
    const text = String(message || '').trim();
    status.textContent = text;
    status.className = `status-text status-${type}`;
    status.style.display = text ? '' : 'none';
  }
}

export function showModal(mealId, mealName, _imageUrl) {
  const modal = document.querySelector(DOM.modal);
  if (!modal) {
    return;
  }

  const content = modal.querySelector('.recipe-modal-content');
  if (!content) {
    return;
  }

  content.innerHTML = `
    <div class="recipe-header">
      <h2>${mealName}</h2>
      <button class="modal-close">✕</button>
    </div>
    <div class="recipe-loading">${t('recipeLoading')}</div>
  `;

  modal.classList.add('open');

  // Content will be loaded by the app module
  return modal;
}

export function hideModal() {
  const modal = document.querySelector(DOM.modal);
  if (modal) {
    modal.classList.remove('open');
  }
}

export function populateRecipeModal(recipe, lang = 'en') {
  const modal = document.querySelector(DOM.modal);
  if (!modal) {
    return;
  }

  const content = modal.querySelector('.recipe-modal-content');
  if (!content) {
    return;
  }

  const ingredients = formatIngredients(recipe, lang);
  const instructions = formatInstructions(recipe, lang);

  let ingredientsHtml = '';
  for (const ing of ingredients) {
    const measure = ing.measure || '';
    ingredientsHtml += `<li class="ingredient-item"><span class="ing-name">${ing.name}</span> <span class="ing-measure" data-base="${measure}">${measure}</span></li>`;
  }

  const isTranslated = lang === 'bg' && recipe.strInstructionsTranslated;

  const recipeName = lang === 'bg' ? recipe.strMealTranslated || recipe.strMeal : recipe.strMeal;
  const categoryName = lang === 'bg' ? recipe.strCategoryTranslated || recipe.strCategory : recipe.strCategory;
  const areaName = lang === 'bg' ? recipe.strAreaTranslated || recipe.strArea : recipe.strArea;

  content.innerHTML = `
    <div class="recipe-header">
      <h2>${recipeName}</h2>
      <button class="modal-close">✕</button>
    </div>
    
    ${isReliableImageSrc(recipe) ? `<img src="${recipe.strMealThumb}" alt="${recipeName}" class="recipe-image">` : ''}
    
    <div class="recipe-meta">
      <span>📂 ${categoryName}</span>
      <span>🌍 ${areaName}</span>
      <span>⏱️ ~${recipe.metadata?.prepTime || recipe.readyInMinutes || 30} ${t('minuteShort')}</span>
      <span>📊 ${getLocalizedDifficulty(recipe.metadata?.difficulty)}</span>
      ${recipe.metadata?.nutrition?.estimatedCalories ? `<span>🔥 ${recipe.metadata.nutrition.estimatedCalories}${t('calorieShort')}</span>` : ''}
      ${recipe.metadata?.nutrition?.allergens?.length > 0 ? `<span>⚠️ ${recipe.metadata.nutrition.allergens.join(', ')}</span>` : ''}
    </div>
    
    ${recipe.nutrition?.calories ? `
    <div class="spoon-nutrition-panel">
      <h4 class="spoon-nutr-title">${t('spoonacularNutritionTitle')}</h4>
      <div class="spoon-nutr-grid">
        <div class="spoon-nutr-item"><span class="spoon-nutr-val">🔥 ${recipe.nutrition.calories}</span><span class="spoon-nutr-label">${t('spoonacularNutrCalories')}</span></div>
        ${recipe.nutrition.protein ? `<div class="spoon-nutr-item"><span class="spoon-nutr-val">💪 ${recipe.nutrition.protein}g</span><span class="spoon-nutr-label">${t('spoonacularNutrProtein')}</span></div>` : ''}
        ${recipe.nutrition.carbs ? `<div class="spoon-nutr-item"><span class="spoon-nutr-val">🍞 ${recipe.nutrition.carbs}g</span><span class="spoon-nutr-label">${t('spoonacularNutrCarbs')}</span></div>` : ''}
        ${recipe.nutrition.fat ? `<div class="spoon-nutr-item"><span class="spoon-nutr-val">🧈 ${recipe.nutrition.fat}g</span><span class="spoon-nutr-label">${t('spoonacularNutrFat')}</span></div>` : ''}
        ${recipe.nutrition.fiber ? `<div class="spoon-nutr-item"><span class="spoon-nutr-val">🌾 ${recipe.nutrition.fiber}g</span><span class="spoon-nutr-label">${t('spoonacularNutrFiber')}</span></div>` : ''}
      </div>
      ${recipe.sourceUrl ? `<a class="spoon-source-link" href="${recipe.sourceUrl}" target="_blank" rel="noopener noreferrer">${t('spoonacularViewSource')} ↗</a>` : ''}
    </div>` : ''}
    
    <div class="recipe-section">
      <h3>${t('recipeIngredients')}</h3>
      <div class="serving-scaler">
        <span>${t('servings')}:</span>
        <button class="serving-btn serving-down" type="button">−</button>
        <span class="serving-count" data-base="4">4</span>
        <button class="serving-btn serving-up" type="button">+</button>
      </div>
      <ul class="ingredients-list">
        ${ingredientsHtml}
      </ul>
    </div>
    
    <div class="recipe-section">
      <h3>${t('recipeInstructions')}</h3>
      <p class="instructions">${instructions}</p>
      ${isTranslated ? `<small class="translation-note">${t('recipeNote')}</small>` : ''}
    </div>
    
    <div class="recipe-actions">
      <button class="recipe-action-btn fav-recipe-btn" data-meal-id="${recipe.idMeal}">
        ${isFavoriteRecipe(recipe.idMeal) ? '❤️' : '🤍'} ${t('favorite')}
      </button>
      <button class="recipe-action-btn share-recipe-btn" data-meal-id="${recipe.idMeal}">
        📤 ${t('shareRecipe')}
      </button>
      <button class="recipe-action-btn export-recipe-pdf-btn" data-meal-id="${recipe.idMeal}">
        📄 ${t('exportPDF')}
      </button>
    </div>
  `;
}

function isFavoriteRecipe(mealId) {
  return isFavRecipe(mealId);
}

export function attachTabListeners(onTabChange) {
  const tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.getAttribute('data-tab');
      onTabChange(tabName);
    });
  });
}

export function switchTab(tabName) {
  // Hide all panes
  document.querySelectorAll('[data-pane]').forEach((pane) => {
    pane.classList.remove('active');
  });

  // Show selected pane
  const pane = document.querySelector(`[data-pane="${tabName}"]`);
  if (pane) {
    pane.classList.add('active');
  }

  // Update tab buttons
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
}
