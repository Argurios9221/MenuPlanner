// Main application logic - connects all modules
import { initLang, setLang, getLang, t } from './i18n.js';
import { generateMenu } from './menu.js';
import { buildBasket, getBasketStats } from './basket.js';
import { buildSupermarketRecommendations } from './supermarkets.js';
import { loadRecipe, getTranslatedRecipe, toggleRecipeFavorite } from './recipe.js';
import { translateText } from './translation.js';
import { getAllFavorites, removeFavoriteRecipe } from './favorites.js';
import {
  generateMenuShareText,
  generateRecipeShareText,
  generateBasketShareText,
  shareToWhatsApp,
  shareToFacebook,
  shareToTwitter,
  copyToClipboard,
} from './sharing.js';
import {
  getPreferences,
  savePreferences,
  saveCurrentMenu,
  clearCurrentMenu,
  getTheme,
  saveTheme,
  addFavoriteMenu,
  removeFavoriteMenu,
  getFavorites,
  saveFavorites,
} from './storage.js';
import {
  createMenuDayCard,
  createBasketCategory,
  createFavoritesSection,
  showToast,
  updateStatusText,
  showModal,
  hideModal,
  populateRecipeModal,
  switchTab,
} from './ui.js';
import { exportMenuToPDF, exportBasketToPDF, exportRecipeToPDF, downloadFile, generatePDFFilename } from './pdf.js';

export class MenuPlannerApp {
  constructor() {
    this.currentMenu = null;
    this.currentRecipe = null;
    this.currentBasket = null;
    this.marketState = {
      report: null,
      filter: 'all',
      basketKey: '',
      loading: false,
      error: '',
      requestId: 0,
    };
    this.recipeRequestId = 0;
    this.state = {
      preferences: getPreferences(),
      favorites: getAllFavorites(),
    };
  }

  async init() {
    initLang();
    this.applyTheme(getTheme());
    this.currentMenu = null;
    clearCurrentMenu();

    this.attachEventListeners();
    this.updateUI();
    this.renderMenu();
  }

  attachEventListeners() {
    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.handleGenerateMenu());
    }

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleResetPreferences());
    }

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => this.handleLanguageToggle());
    }

    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.handleThemeToggle());
    }

    this.attachPreferencesListeners();
    this.attachTabListeners();

    const modal = document.getElementById('recipe-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          hideModal();
        }
        if (e.target.closest('.modal-close')) {
          hideModal();
        }
      });
    }
  }

  async handleGenerateMenu() {
    const prefs = this.getFormPreferences();
    savePreferences(prefs);
    this.state.preferences = prefs;
    const favoritesSnapshot = getFavorites();

    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
      generateBtn.disabled = true;
    }

    const startTime = Date.now();
    updateStatusText(t('statusGenerating')(0), 'generating');
    this.renderMenuGeneratingLoader();

    const timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      updateStatusText(t('statusGenerating')(elapsed), 'generating');
      const loaderText = document.querySelector('.market-loading-text');
      if (loaderText) {
        loaderText.textContent = t('statusGenerating')(elapsed);
      }
    }, 1000);

    try {
      const menu = await generateMenu(prefs);
      const basket = await buildBasket(menu);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      menu.generationTime = elapsed;

      this.currentMenu = menu;
      this.currentBasket = basket;
      this.marketState = {
        report: null,
        filter: 'all',
        basketKey: this.getBasketStateKey(basket),
        loading: false,
        error: '',
        requestId: 0,
      };
      saveCurrentMenu(menu);

      // Safety net: generation should never mutate favorites without explicit user action.
      const favoritesNow = getFavorites();
      if (JSON.stringify(favoritesNow) !== JSON.stringify(favoritesSnapshot)) {
        saveFavorites(favoritesSnapshot);
      }

      updateStatusText(t('statusDone')(elapsed), 'done');
      this.renderMenu();
      showToast(t('menuGenerated'));
    } catch (error) {
      console.error('Menu generation error:', error);
      updateStatusText(t('statusError'), 'error');
      showToast(error.message);
    } finally {
      clearInterval(timerInterval);
      if (generateBtn) {
        generateBtn.disabled = false;
      }
    }
  }

  renderMenuGeneratingLoader() {
    const container = document.getElementById('menu-container');
    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="market-loading-container">
        <div class="store-visitor">
          <svg class="visitor-person" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="25" r="12" fill="#4CAF50"/>
            <rect x="44" y="39" width="12" height="20" fill="#4CAF50"/>
            <line x1="35" y1="44" x2="65" y2="44" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>
            <line x1="42" y1="59" x2="38" y2="75" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>
            <line x1="58" y1="59" x2="62" y2="75" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="market-loading-text">${t('statusGenerating')(0)}</p>
      </div>
    `;
  }

  handleResetPreferences() {
    document.getElementById('people-input').value = 4;
    document.getElementById('variety-select').value = 'medium';
    document.getElementById('cuisine-select').value = 'mix';
    document.getElementById('prep-time-select').value = 'any';
    document.getElementById('allergies-input').value = '';
    document.getElementById('notes-input').value = '';

    const defaultPrefs = {
      people: 4,
      variety: 'medium',
      cuisine: 'mix',
      prepTime: 'any',
      dietary: [],
      allergies: [],
      notes: '',
    };
    savePreferences(defaultPrefs);
    this.state.preferences = defaultPrefs;
    showToast(t('prefsReset'));
  }

  handleLanguageToggle() {
    const current = getLang();
    const newLang = current === 'en' ? 'bg' : 'en';
    setLang(newLang);
    this.updateUI();
    showToast(newLang === 'en' ? 'Language: English' : 'Language: Bulgarian');
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.textContent = theme === 'dark' ? 'Light' : 'Dark';
      themeBtn.title = theme === 'dark' ? t('themeToLight') : t('themeToDark');
    }
  }

  handleThemeToggle() {
    const current = getTheme();
    const newTheme = current === 'dark' ? 'light' : 'dark';
    saveTheme(newTheme);
    this.applyTheme(newTheme);
    showToast(newTheme === 'dark' ? t('darkModeOn') : t('darkModeOff'));
  }

  attachPreferencesListeners() {
    const inputs = document.querySelectorAll(
      '#people-input, #variety-select, #cuisine-select, #prep-time-select, #allergies-input, #notes-input'
    );
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        const prefs = this.getFormPreferences();
        savePreferences(prefs);
        this.state.preferences = prefs;
      });
    });
  }

  attachTabListeners() {
    const tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = tab.getAttribute('data-tab');
        switchTab(tabName);

        if (tabName === 'basket') {
          this.renderBasket();
        }
        if (tabName === 'markets') {
          this.renderMarkets();
        }
        if (tabName === 'favorites') {
          this.renderFavorites();
        }
      });
    });
  }

  getFormPreferences() {
    return {
      people: parseInt(document.getElementById('people-input')?.value || 4, 10),
      variety: document.getElementById('variety-select')?.value || 'medium',
      cuisine: document.getElementById('cuisine-select')?.value || 'mix',
      prepTime: document.getElementById('prep-time-select')?.value || 'any',
      dietary: [],
      allergies: (document.getElementById('allergies-input')?.value || '')
        .split(',')
        .filter((x) => x.trim()),
      notes: document.getElementById('notes-input')?.value || '',
    };
  }

  renderMenu() {
    const container = document.getElementById('menu-container');
    if (!container) {
      return;
    }

    if (!this.currentMenu) {
      container.innerHTML = `
        <div class="empty-state-container">
          <svg class="empty-state-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" fill="var(--highlight)"/>
            <rect x="22" y="26" width="36" height="28" rx="4" stroke="var(--primary-color)" stroke-width="2.2" fill="none"/>
            <line x1="28" y1="34" x2="52" y2="34" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
            <line x1="28" y1="40" x2="46" y2="40" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
            <line x1="28" y1="46" x2="50" y2="46" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p>${t('emptyMenu')}</p>
          <p class="empty-hint">${t('emptyMenuHint')}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    const actionBar = document.createElement('div');
    actionBar.className = 'menu-actions-bar';
    actionBar.innerHTML = `
      <button class="action-btn save-menu-btn">${t('saveMenu')}</button>
      <button class="action-btn share-menu-btn">${t('share')}</button>
      <button class="action-btn export-pdf-btn">${t('exportPDF')}</button>
      <button class="action-btn new-menu-btn">&#8635; ${t('btnRegenerate')}</button>
    `;
    container.appendChild(actionBar);

    const grid = document.createElement('div');
    grid.className = 'menu-grid';

    for (let i = 0; i < this.currentMenu.days.length; i++) {
      const card = createMenuDayCard(this.currentMenu.days[i], i);
      grid.appendChild(card);
      this.attachMealListeners(card);
    }

    container.appendChild(grid);
    this.attachMenuActionListeners();

    if (getLang() === 'bg') {
      this.localizeMenuMealNames();
    }
  }

  async localizeMenuMealNames() {
    if (!this.currentMenu?.days) {
      return;
    }

    const tasks = [];
    for (const day of this.currentMenu.days) {
      for (const meal of day.meals || []) {
        if (!meal.strMealTranslated) {
          tasks.push(
            translateText(meal.strMeal, 'bg').then((translated) => {
              meal.strMealTranslated = translated;
            })
          );
        }
      }
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
      this.renderMenu();
    }
  }

  attachMealListeners(card) {
    card.querySelectorAll('.meal-item').forEach((item) => {
      const openRecipe = () =>
        this.showRecipeModal(item.getAttribute('data-meal-id'), item.getAttribute('data-meal-name'));
      item.addEventListener('click', openRecipe);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openRecipe();
        }
      });
    });

    card.querySelectorAll('.share-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleShareRecipeFromMenu(btn.getAttribute('data-meal-id'), btn);
      });
    });

    card.querySelectorAll('.fav-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.toggleRecipeFavorite(btn.getAttribute('data-meal-id'), btn);
      });
    });
  }

  async showRecipeModal(mealId, initialName = '') {
    const lang = getLang();
    const requestId = ++this.recipeRequestId;
    showModal(mealId, initialName || t('recipeLoading'), '');

    try {
      let recipe;
      try {
        recipe = await getTranslatedRecipe(mealId, lang);
      } catch {
        // Fallback to base recipe fetch if translation pipeline fails.
        recipe = await loadRecipe(mealId);
      }

      if (requestId !== this.recipeRequestId) {
        return;
      }

      this.currentRecipe = recipe;

      populateRecipeModal(recipe, lang);
      this.attachRecipeModalListeners(recipe);
    } catch (error) {
      console.error('Failed to show recipe:', error);
      showToast(t('failedLoadRecipe'));
    }
  }

  attachRecipeModalListeners(recipe) {
    const modal = document.getElementById('recipe-modal');
    if (!modal) {
      return;
    }

    const favBtn = modal.querySelector('.fav-recipe-btn');
    const shareBtn = modal.querySelector('.share-recipe-btn');
    const exportPdfBtn = modal.querySelector('.export-recipe-pdf-btn');

    if (favBtn) {
      favBtn.addEventListener('click', async () => {
        const isFav = await this.toggleRecipeFavorite(recipe.idMeal, favBtn);
        favBtn.textContent = isFav ? t('savedFav') : t('saveFav');
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.showShareDropdown({
          type: 'recipe',
          triggerEl: shareBtn,
          text: generateRecipeShareText(this.currentRecipe || recipe),
        });
      });
    }

    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', async () => {
        try {
          const blob = await exportRecipeToPDF(recipe, getLang());
          downloadFile(blob, generatePDFFilename('recipe'));
          showToast(t('recipeExportedPDF'));
        } catch (error) {
          console.error('PDF export error:', error);
          showToast(t('failedExportPDF'));
        }
      });
    }
  }

  async toggleRecipeFavorite(mealId, btn) {
    try {
      const recipe = await loadRecipe(mealId);
      const isFav = toggleRecipeFavorite(recipe);

      if (btn) {
        btn.textContent = isFav ? t('savedFav') : t('saveFav');
      }

      showToast(isFav ? t('addedToFav') : t('removedFromFav'));
      this.state.favorites = getAllFavorites();
      return isFav;
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      showToast(t('failedUpdateFav'));
      return false;
    }
  }

  async handleShareRecipeFromMenu(mealId, triggerBtn) {
    try {
      const recipe = await loadRecipe(mealId);
      this.currentRecipe = recipe;
      this.showShareDropdown({
        type: 'recipe',
        triggerEl: triggerBtn,
        text: generateRecipeShareText(recipe),
      });
    } catch (error) {
      console.error('Failed to prepare share text:', error);
      showToast(t('failedLoadRecipe'));
    }
  }

  showShareDropdown({ type = 'menu', triggerEl, text }) {
    if (!text) {
      const fallbackText =
        type === 'recipe'
          ? generateRecipeShareText(this.currentRecipe)
          : generateMenuShareText(this.currentMenu);
      text = fallbackText;
    }

    const options = [
      { label: t('copyText'), action: () => this.handleCopyShare(text) },
      { label: t('whatsapp'), action: () => this.handleWhatsAppShare(text) },
      { label: t('facebook'), action: () => this.handleFacebookShare() },
      { label: t('twitter'), action: () => this.handleTwitterShare(text) },
    ];

    const sameTriggerWasOpen = Boolean(triggerEl?.classList.contains('share-trigger-open'));

    // Remove any existing dropdown/open state
    document.querySelectorAll('.share-dropdown-menu').forEach((el) => el.remove());
    document.querySelectorAll('.share-trigger-open').forEach((el) => {
      el.classList.remove('share-trigger-open');
      el.setAttribute('aria-expanded', 'false');
    });

    if (sameTriggerWasOpen) {
      return;
    }

    if (triggerEl) {
      triggerEl.classList.add('share-trigger-open');
      triggerEl.setAttribute('aria-expanded', 'true');
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'share-dropdown-menu';

    const cleanup = () => {
      dropdown.remove();
      document.removeEventListener('click', closeHandler);
      window.removeEventListener('resize', placeDropdown);
      window.removeEventListener('scroll', placeDropdown, true);
      if (triggerEl) {
        triggerEl.classList.remove('share-trigger-open');
        triggerEl.setAttribute('aria-expanded', 'false');
      }
    };

    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = 'share-option';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        opt.action();
        cleanup();
      });
      dropdown.appendChild(btn);
    }

    // Use fixed positioning so dropdown is always anchored reliably to the trigger.
    dropdown.style.position = 'fixed';
    document.body.appendChild(dropdown);

    const placeDropdown = () => {
      if (!triggerEl) {
        dropdown.style.top = '80px';
        dropdown.style.left = '20px';
        return;
      }

      const rect = triggerEl.getBoundingClientRect();
      const menuWidth = dropdown.offsetWidth || 180;
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        Math.max(8, window.innerWidth - menuWidth - 8)
      );

      dropdown.style.top = `${Math.round(rect.bottom + 8)}px`;
      dropdown.style.left = `${Math.round(left)}px`;
    };
    placeDropdown();

    // Close on outside click
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
        cleanup();
      }
    };
    window.addEventListener('resize', placeDropdown);
    window.addEventListener('scroll', placeDropdown, true);
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  }

  handleCopyShare(text) {
    copyToClipboard(text)
      .then(() => showToast(t('linkCopied')))
      .catch(() => showToast(t('failedCopy')));
  }

  handleWhatsAppShare(text) {
    const url = shareToWhatsApp(text);
    window.open(url, '_blank');
  }

  handleFacebookShare() {
    const url = shareToFacebook(window.location.href);
    window.open(url, '_blank');
  }

  handleTwitterShare(text) {
    const url = shareToTwitter(text, window.location.href);
    window.open(url, '_blank');
  }

  attachMenuActionListeners() {
    const saveBtn = document.querySelector('.save-menu-btn');
    const shareBtn = document.querySelector('.share-menu-btn');
    const exportBtn = document.querySelector('.export-pdf-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!this.currentMenu) {
          return;
        }
        const result = addFavoriteMenu(this.currentMenu);
        this.state.favorites = getAllFavorites();
        showToast(result.added ? t('menuSaved') : t('menuAlreadySaved'));
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.showShareDropdown({
          type: 'menu',
          triggerEl: shareBtn,
          text: generateMenuShareText(this.currentMenu),
        });
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportPDF());
    }

    const newMenuBtn = document.querySelector('.new-menu-btn');
    if (newMenuBtn) {
      newMenuBtn.addEventListener('click', () => this.handleGenerateMenu());
    }
  }

  async renderBasket() {
    const container = document.getElementById('basket-container');
    if (!container) {
      return;
    }

    if (!this.currentMenu) {
      container.innerHTML = `
        <div class="empty-state-container">
          <svg class="empty-state-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="36" fill="var(--highlight)"/>
            <path d="M20 30h4l5 20h22l5-16H30" stroke="var(--primary-color)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="35" cy="55" r="2.5" fill="var(--primary-color)"/>
            <circle cx="52" cy="55" r="2.5" fill="var(--primary-color)"/>
          </svg>
          <p>${t('emptyBasket')}</p>
          <p class="empty-hint">${t('emptyBasketHint')}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="empty-state-container">
        <svg class="empty-state-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="36" fill="var(--highlight)"/>
          <rect x="20" y="34" width="40" height="18" rx="4" stroke="var(--primary-color)" stroke-width="2.2" fill="none"/>
          <line x1="32" y1="34" x2="32" y2="28" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
          <line x1="48" y1="34" x2="48" y2="28" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="30" cy="45" r="2" fill="var(--primary-color)"/>
          <circle cx="40" cy="45" r="2" fill="var(--primary-color)"/>
          <circle cx="50" cy="45" r="2" fill="var(--primary-color)"/>
        </svg>
        <p>${t('loadingBasket')}</p>
      </div>
    `;

    this.currentBasket = await buildBasket(this.currentMenu);
    container.innerHTML = '';

    for (const category in this.currentBasket) {
      const categoryDiv = createBasketCategory(category, this.currentBasket[category]);
      container.appendChild(categoryDiv);
    }

    const actions = document.createElement('div');
    actions.className = 'basket-actions';
    const stats = getBasketStats(this.currentBasket);
    actions.innerHTML = `
      <p>${t('itemsChecked')(stats.checkedItems, stats.totalItems)}</p>
      <button class="action-btn export-basket-btn">${t('exportList')}</button>
      <button class="action-btn export-basket-pdf-btn">${t('exportPDF')}</button>
      <button class="action-btn clear-basket-btn">${t('clearSelection')}</button>
    `;
    container.appendChild(actions);

    container.querySelector('.export-basket-btn')?.addEventListener('click', () => {
      const text = generateBasketShareText(this.currentBasket);
      copyToClipboard(text)
        .then(() => showToast(t('shoppingListCopied')))
        .catch(() => showToast(t('failedCopy')));
    });

    container.querySelector('.export-basket-pdf-btn')?.addEventListener('click', async () => {
      try {
        const blob = await exportBasketToPDF(this.currentBasket, stats, getLang());
        downloadFile(blob, generatePDFFilename('basket'));
        showToast(t('basketExportedPDF'));
      } catch (error) {
        console.error('PDF export error:', error);
        showToast(t('failedExportPDF'));
      }
    });

    container.querySelector('.clear-basket-btn')?.addEventListener('click', () => {
      document.querySelectorAll('.ingredient-checkbox:checked').forEach((cb) => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
      });
    });
  }

  async renderMarkets() {
    const container = document.getElementById('markets-container');
    if (!container) {
      return;
    }

    // Build basket if not yet built
    if (!this.currentBasket && this.currentMenu) {
      this.currentBasket = await buildBasket(this.currentMenu);
    }

    container.innerHTML = '';

    const page = document.createElement('div');
    page.className = 'markets-page';

    const basketItems = this.currentBasket
      ? Object.values(this.currentBasket).flat().length
      : 0;
    const basketKey = this.currentBasket ? this.getBasketStateKey(this.currentBasket) : '';

    const basketSummaryHtml = this.currentBasket
      ? `<p class="markets-basket-count">\ud83d\uded2 ${typeof t('marketBasketCount') === 'function' ? t('marketBasketCount')(basketItems) : `${basketItems} items in basket`}</p>`
      : `<p class="markets-no-basket">${t('marketNoBasket')}</p>`;

    page.innerHTML = `
      <div class="markets-hero">
        <h2>&#127970; ${t('marketPanelTitle')}</h2>
        <p class="markets-hint">${t('marketPanelHint')}</p>
        ${basketSummaryHtml}
        <button class="btn btn-primary find-markets-btn" ${!this.currentBasket || this.marketState.loading ? 'disabled' : ''}>&#128205; ${t('findNearbyMarkets')}</button>
      </div>
      <div class="market-results"></div>
    `;
    container.appendChild(page);

    const results = page.querySelector('.market-results');
    if (results && this.marketState.loading && this.marketState.basketKey === basketKey) {
      results.innerHTML = this.getMarketsLoadingMarkup();
    } else if (results && this.marketState.report && this.marketState.basketKey === basketKey) {
      this.renderMarketResults(results, this.marketState.report, this.marketState.filter);
    } else if (results && this.marketState.error && this.marketState.basketKey === basketKey) {
      results.innerHTML = `<p class="market-loading">${this.marketState.error}</p>`;
    }

    page.querySelector('.find-markets-btn')?.addEventListener('click', async () => {
      const btn = page.querySelector('.find-markets-btn');
      if (!btn || !results) {
        return;
      }

      if (this.marketState.loading) {
        return;
      }

      btn.disabled = true;
      this.marketState = {
        ...this.marketState,
        report: null,
        loading: true,
        error: '',
        basketKey,
        requestId: Date.now(),
      };
      const requestId = this.marketState.requestId;
      results.innerHTML = this.getMarketsLoadingMarkup();

      try {
        const report = await buildSupermarketRecommendations(this.currentBasket);
        if (requestId !== this.marketState.requestId) {
          return;
        }
        if (!report.stores.length) {
          this.marketState = {
            ...this.marketState,
            report: null,
            loading: false,
            error: t('marketNoStores'),
            basketKey,
          };
          if (document.querySelector('.pane.active[data-pane="markets"]')) {
            this.renderMarkets();
          }
          return;
        }
        this.marketState = {
          report,
          filter: this.marketState.filter || 'all',
          basketKey,
          loading: false,
          error: '',
          requestId,
        };
        if (document.querySelector('.pane.active[data-pane="markets"]')) {
          this.renderMarkets();
        }
      } catch (error) {
        console.error('Failed to build market recommendations:', error);
        this.marketState = {
          ...this.marketState,
          report: null,
          loading: false,
          error: t('marketFailed'),
          basketKey,
        };
        if (document.querySelector('.pane.active[data-pane="markets"]')) {
          this.renderMarkets();
        }
      } finally {
        if (document.querySelector('.pane.active[data-pane="markets"]')) {
          const activeButton = document.querySelector('.find-markets-btn');
          if (activeButton) {
            activeButton.disabled = this.marketState.loading || !this.currentBasket;
          }
        }
      }
    });
  }

  getMarketsLoadingMarkup() {
    return `
      <div class="market-loading-container">
        <div class="store-visitor">
          <svg class="visitor-person" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="25" r="12" fill="#4CAF50"/>
            <rect x="44" y="39" width="12" height="20" fill="#4CAF50"/>
            <line x1="35" y1="44" x2="65" y2="44" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>
            <line x1="42" y1="59" x2="38" y2="75" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>
            <line x1="58" y1="59" x2="62" y2="75" stroke="#4CAF50" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <div class="visitor-stores">
            <div class="store-icon">&#127978;</div>
            <div class="store-icon">&#127970;</div>
            <div class="store-icon">&#127970;</div>
          </div>
        </div>
        <p class="market-loading-text">${t('marketLoading')}</p>
      </div>
    `;
  }

  renderFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) {
      return;
    }

    this.state.favorites = getAllFavorites();
    container.innerHTML = '';

    const sections = {
      menus: this.state.favorites.menus,
      recipes: this.state.favorites.recipes,
      products: this.state.favorites.products,
    };

    for (const [type, items] of Object.entries(sections)) {
      const section = createFavoritesSection(type, items);
      container.appendChild(section);
      this.attachFavoritesListeners(section, type);
    }
  }

  attachFavoritesListeners(section, type) {
    section.querySelectorAll('.favorite-openable').forEach((item) => {
      item.addEventListener('click', async () => {
        if (type === 'recipes') {
          await this.showRecipeModal(item.getAttribute('data-meal-id'));
          return;
        }

        if (type === 'menus') {
          const menuId = item.getAttribute('data-menu-id');
          const selectedMenu = this.state.favorites.menus.find((menu) => menu.id === menuId);
          if (!selectedMenu) {
            return;
          }
          this.currentMenu = selectedMenu;
          this.currentBasket = null;
          this.marketState = {
            report: null,
            filter: 'all',
            basketKey: '',
            loading: false,
            error: '',
            requestId: 0,
          };
          saveCurrentMenu(selectedMenu);
          switchTab('menu');
          this.renderMenu();
          showToast(t('menuLoaded'));
        }
      });
    });

    section.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (type === 'recipes') {
          removeFavoriteRecipe(btn.getAttribute('data-meal-id'));
        }
        if (type === 'menus') {
          removeFavoriteMenu(btn.getAttribute('data-menu-id'));
        }
        this.renderFavorites();
        showToast(t('removedFromFav'));
      });
    });
  }

  getBasketStateKey(basket) {
    return Object.values(basket || {})
      .flat()
      .map((item) => item.key || item.name)
      .sort()
      .join('|');
  }

  renderMarketResults(results, report, activeFilter = 'all') {
    const locationWarning = report.coords.isFallback
      ? `<p class="market-location-warning">&#9888;&#65039; ${t('marketLocationApprox')}</p>`
      : '';

    const cards = report.stores
      .map((store) => {
        const distanceHtml = store.distanceKm !== null
          ? `<span class="market-meta-item">&#128205; ${store.distanceKm} km</span>`
          : '';

        const availabilityLabel = t('marketAvailability') || 'availability';
        const promoLabel = t('marketPromoCoverage') || 'promo';
        const minCoverage = report.minRecommendedCoverage || 70;
        const promoCount = store.coverage.promoMatchedCount || 0;
        const thresholdLabel = store.coverage.percent >= minCoverage ? 'OK' : 'LOW';

        const matchedRows = store.coverage.matchedOffers
          .map((match) => {
            const priceTag = match.offer.price !== null
              ? `<span class="offer-price">&euro;${match.offer.price.toFixed(2)}</span>`
              : '';
            return `<li><span class="offer-ingredient">${match.ingredient}</span><span class="offer-title">${match.offer.title}</span>${priceTag}</li>`;
          })
          .join('');

        const unmatchedRows = store.coverage.unmatchedItems
          .map((item) => `<li class="unmatched-item">${item}</li>`)
          .join('');

        const unmatchedSection = store.coverage.unmatchedItems.length > 0
          ? `<details class="market-unmatched">
              <summary>${t('marketNotCovered')(store.coverage.unmatchedItems.length)}</summary>
              <ul class="market-unmatched-list">${unmatchedRows}</ul>
            </details>`
          : '';

        const links = [
          store.directionsUrl
            ? `<a href="${store.directionsUrl}" target="_blank" rel="noopener">&#129517; ${t('marketDirections')}</a>`
            : '',
          store.offerUrl
            ? `<a href="${store.offerUrl}" target="_blank" rel="noopener">&#127991;&#65039; ${t('marketOffers')}</a>`
            : '',
        ]
          .filter(Boolean)
          .join('');

        return `
          <article class="market-card ${store.id === report.recommendedStoreId ? 'recommended' : ''}" data-chain-id="${store.chainId}">
            <div class="market-card-head">
              <h4>${store.chainLabel}</h4>
              ${store.id === report.recommendedStoreId ? `<span class="market-badge">${t('marketRecommended')}</span>` : ''}
            </div>
            <div class="market-meta">
              ${distanceHtml}
              <span class="market-meta-item coverage-tag">${store.coverage.percent}% ${availabilityLabel}</span>
              <span class="market-meta-item promo-tag">${store.coverage.promoPercent || 0}% ${promoLabel}</span>
              <span class="market-meta-item price-tag">&euro;${store.coverage.estimatedTotal.toFixed(2)}</span>
            </div>
            <p class="market-coverage-line">${t('marketCoverage')(store.coverage.matchedCount, store.coverage.total, store.coverage.percent)} · min ${minCoverage}%: ${thresholdLabel} · ${t('marketMatchedOffers')(promoCount)} · ${t('marketEstimatedPrice')(store.coverage.estimatedTotal)}</p>
            ${store.address ? `<p class="market-address">${store.address}</p>` : ''}
            ${links ? `<div class="market-links">${links}</div>` : ''}
            ${store.coverage.matchedOffers.length > 0 ? `
              <div class="market-offers-section">
                <h5>${t('marketMatchedOffers')(store.coverage.matchedOffers.length)}</h5>
                <ul class="market-offers-list">${matchedRows}</ul>
              </div>
            ` : `<p class="market-no-offers">${t('marketNoOffers')}</p>`}
            ${unmatchedSection}
          </article>
        `;
      })
      .join('');

    const topStore = report.stores[0] || null;
    const summaryText = topStore
      ? `${topStore.chainLabel}: ${t('marketCoverage')(topStore.coverage.matchedCount, topStore.coverage.total, topStore.coverage.percent)}${topStore.coverage.estimatedTotal > 0 ? ` · ${t('marketEstimatedPrice')(topStore.coverage.estimatedTotal)}` : ''}`
      : '';

    const chainIds = [...new Set(report.stores.map((store) => store.chainId))];
    const filterBtns = [
      `<button class="market-filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">${t('marketFilterAll')}</button>`,
      ...chainIds.map((id) => {
        const label = report.stores.find((store) => store.chainId === id)?.chainLabel || id;
        const activeClass = activeFilter === id ? 'active' : '';
        return `<button class="market-filter-btn ${activeClass}" data-filter="${id}">${label}</button>`;
      }),
    ].join('');

    results.innerHTML = `
      ${locationWarning}
      ${summaryText ? `<p class="market-summary">${summaryText}</p>` : ''}
      <div class="market-filter-bar">${filterBtns}</div>
      <div class="market-cards">${cards}</div>
    `;

    this.applyMarketFilter(results, activeFilter);
    results.querySelectorAll('.market-filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter || 'all';
        this.marketState.filter = filter;
        results.querySelectorAll('.market-filter-btn').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        this.applyMarketFilter(results, filter);
      });
    });
  }

  applyMarketFilter(results, filter) {
    results.querySelectorAll('.market-card[data-chain-id]').forEach((card) => {
      card.style.display = filter === 'all' || card.dataset.chainId === filter ? '' : 'none';
    });
  }

  async handleExportPDF() {
    if (!this.currentMenu) {
      showToast(t('noMenuToExport'));
      return;
    }
    try {
      const blob = await exportMenuToPDF(this.currentMenu, this.state.preferences, getLang());
      downloadFile(blob, generatePDFFilename('menu'));
      showToast(t('menuExportedPDF'));
    } catch (error) {
      console.error('PDF export error:', error);
      showToast(t('failedExportPDF'));
    }
  }

  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });

    document.querySelectorAll('[data-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-placeholder');
      el.setAttribute('placeholder', t(key));
    });

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
      langBtn.textContent = t('langBtn');
      langBtn.title = t('langTitle');
    }

    const theme = getTheme();
    this.applyTheme(theme);

    if (this.currentMenu) {
      this.renderMenu();
    }
  }
}
