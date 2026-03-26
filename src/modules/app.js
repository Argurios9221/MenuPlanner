// Main application logic - connects all modules
import { initLang, setLang, getLang, t } from './i18n.js';
import { generateMenu, swapMealInMenu } from './menu.js';
import { buildBasket, getBasketStats } from './basket.js';
import { buildSupermarketRecommendations } from './supermarkets.js';
import {
  initBarcodeScanner,
  stopBarcodeScanner,
  onBarcodeDetected,
  checkAllergens,
  checkDietaryRestrictions,
  isProductInMenu,
  getProductAlternatives,
  logScannedProduct,
  getScannedProductHistory,
} from './barcode.js';
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
  addLeftover,
  getPreferences,
  getLeftovers,
  getRecipeRating,
  removeLeftover,
  savePreferences,
  saveCurrentMenu,
  setRecipeRating,
  clearCurrentMenu,
  getTheme,
  saveTheme,
  addFavoriteMenu,
  removeFavoriteMenu,
  getFavorites,
  saveFavorites,
  getMenuHistory,
  addMenuToHistory,
  clearAllData,
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
import { isSpoonacularEnabled } from './spoonacular.js';
import { getWeatherDescription, getWeatherMealSuggestion } from './weather.js';
import { estimateCalories } from './metadata.js';
import {
  deleteCurrentAccount,
  exportUserLocalData,
  getCurrentUser,
  hasGdprConsent,
  initAuth,
  isAuthConfigured,
  loginWithEmail,
  loginWithGoogle,
  logout,
  registerWithEmail,
  resolveAuthRedirectResult,
  resetPassword,
  setGdprConsent,
} from './auth.js';

function scaleIngredientMeasure(measureStr, factor) {
  if (!measureStr) {
    return measureStr;
  }
  return String(measureStr).replace(/(\d+(?:\.\d+)?)/g, (_match, num) => {
    const scaled = parseFloat(num) * factor;
    return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1);
  });
}

function parsePantryFromNotes(notes) {
  const text = String(notes || '');
  const match = text.match(/(?:pantry|килер)\s*:\s*([^\n]+)/i);
  if (!match) {
    return [];
  }
  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePantryInput(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePantryExpiryInput(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nameRaw = '', expiryDateRaw = '', quantityRaw = '1'] = line.split('|').map((part) => part.trim());
      const quantity = Math.max(1, Number(quantityRaw) || 1);
      return {
        name: nameRaw,
        expiryDate: expiryDateRaw,
        quantity,
      };
    })
    .filter((item) => item.name);
}

function stringifyPantryExpiryItems(items = []) {
  return items
    .map((item) => `${item.name || ''}|${item.expiryDate || ''}|${item.quantity || 1}`)
    .join('\n');
}

function parseFamilyProfilesInput(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [nameRaw = '', roleRaw = 'adult', portionRaw = '1', exclusionsRaw = '', replacementsRaw = ''] = line
        .split('|')
        .map((part) => part.trim());
      const replacements = replacementsRaw
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [from = '', to = ''] = entry.split('>').map((part) => part.trim());
          return { from, to };
        })
        .filter((entry) => entry.from && entry.to);
      return {
        name: nameRaw,
        role: roleRaw || 'adult',
        portionMultiplier: Math.max(0.5, Number(portionRaw) || 1),
        exclusions: exclusionsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        replacements,
      };
    })
    .filter((profile) => profile.name);
}

function stringifyFamilyProfiles(profiles = []) {
  return profiles
    .map((profile) => {
      const exclusions = (profile.exclusions || []).join(',');
      const replacements = (profile.replacements || [])
        .map((entry) => `${entry.from}>${entry.to}`)
        .join(';');
      return `${profile.name || ''}|${profile.role || 'adult'}|${profile.portionMultiplier || 1}|${exclusions}|${replacements}`;
    })
    .join('\n');
}

function getDaysUntil(dateText) {
  if (!dateText) {
    return Number.POSITIVE_INFINITY;
  }
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  const diffMs = date.getTime() - Date.now();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function getPantryUrgencyClass(daysUntil) {
  if (daysUntil <= 1) {
    return 'is-urgent';
  }
  if (daysUntil <= 3) {
    return 'is-soon';
  }
  if (daysUntil <= 7) {
    return 'is-upcoming';
  }
  return 'is-stable';
}

function parseGoalFromNotes(notes) {
  const text = String(notes || '');
  const match = text.match(/(?:goal|цел)\s*:\s*([^\n]+)/i);
  if (!match) {
    return '';
  }

  const value = match[1].toLowerCase();
  if (value.includes('high') || value.includes('protein') || value.includes('протеин')) {
    return 'high_protein';
  }
  if (value.includes('low') || value.includes('calorie') || value.includes('калор')) {
    return 'low_calorie';
  }
  if (value.includes('budget') || value.includes('бюдж')) {
    return 'budget';
  }
  return '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizeInsightToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-zа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateMealCalories(meal) {
  return Number(meal?.nutrition?.calories || estimateCalories(meal?.ingredients || []) || 0);
}

function estimateMealProteinGrams(meal) {
  const explicitProtein = Number(meal?.nutrition?.protein || 0);
  if (explicitProtein > 0) {
    return explicitProtein;
  }

  const haystack = [
    meal?.strMeal,
    meal?.strCategory,
    ...(meal?.ingredients || []).map((item) => item?.name || ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let grams = 6;
  if (/chicken|beef|pork|lamb|fish|salmon|tuna|cod|shrimp|egg|eggs/.test(haystack)) {
    grams += 16;
  }
  if (/bean|lentil|chickpea|tofu|yogurt|cheese/.test(haystack)) {
    grams += 10;
  }
  return grams;
}

function getNutritionTargets(goal) {
  if (goal === 'low_calorie') {
    return { kcalTarget: 1800, proteinTarget: 75 };
  }
  if (goal === 'high_protein') {
    return { kcalTarget: 2400, proteinTarget: 120 };
  }
  if (goal === 'budget') {
    return { kcalTarget: 2200, proteinTarget: 80 };
  }
  return { kcalTarget: 2200, proteinTarget: 85 };
}

function buildWeeklyNutritionDashboard(menu, goal) {
  const days = menu?.days || [];
  if (!days.length) {
    return null;
  }

  const targets = getNutritionTargets(goal);
  const lines = [];
  let daysOnTarget = 0;

  days.forEach((day, index) => {
    const meals = day?.meals || [];
    const kcal = meals.reduce((sum, meal) => sum + estimateMealCalories(meal), 0);
    const protein = meals.reduce((sum, meal) => sum + estimateMealProteinGrams(meal), 0);
    const onTarget = kcal <= targets.kcalTarget && protein >= targets.proteinTarget * 0.75;
    if (onTarget) {
      daysOnTarget += 1;
    }

    lines.push({
      dayIndex: index,
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      onTarget,
    });
  });

  return {
    kcalTarget: targets.kcalTarget,
    proteinTarget: targets.proteinTarget,
    daysOnTarget,
    lines,
  };
}

function buildBatchCookingCalendar(menu) {
  const days = menu?.days || [];
  const dayNames = t('days') || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const groups = new Map();

  days.forEach((day, dayIndex) => {
    (day?.meals || []).forEach((meal) => {
      const label = meal?.mealPrepLabel;
      if (!label) {
        return;
      }
      const existing = groups.get(label) || [];
      existing.push({
        dayIndex,
        dayName: dayNames[dayIndex] || `Day ${dayIndex + 1}`,
        mealName: meal.strMealTranslated || meal.strMeal,
      });
      groups.set(label, existing);
    });
  });

  if (!groups.size) {
    return null;
  }

  const lines = Array.from(groups.entries()).map(([label, items]) => {
    const sorted = items.sort((a, b) => a.dayIndex - b.dayIndex);
    const cook = sorted[0];
    const reheatDays = sorted.slice(1).map((item) => item.dayName).join(', ');
    return {
      label,
      cookDay: cook.dayName,
      mealName: cook.mealName,
      reheatDays,
    };
  });

  return { lines };
}

function buildRouteOptimizer(report, splitPlan) {
  const assignments = splitPlan?.assignments || [];
  if (assignments.length < 2) {
    return null;
  }

  const route = assignments
    .map((assignment) => {
      const chainStores = (report?.stores || []).filter((store) => store.chainLabel === assignment.chainLabel);
      const nearestStore = chainStores
        .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))[0] || null;
      return {
        ...assignment,
        distanceKm: nearestStore?.distanceKm ?? null,
      };
    })
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));

  const knownDistance = route.reduce((sum, stop) => sum + (stop.distanceKm || 0), 0);
  const estimatedMinutes = Math.round(knownDistance * 4 + route.length * 6);

  return {
    route,
    estimatedMinutes,
  };
}

export class MenuPlannerApp {
  constructor() {
    this.currentMenu = null;
    this.currentRecipe = null;
    this.currentBasket = null;
    this.lockedMeals = new Map(); // key: "dayIdx:mealIdx", value: mealObject
    this.marketState = {
      report: null,
      filter: 'all',
      selectedChains: [],
      basketKey: '',
      loading: false,
      error: '',
      requestId: 0,
    };
    this.recipeRequestId = 0;
    this.state = {
      preferences: getPreferences(),
      favorites: getAllFavorites(),
      authUser: null,
    };
    this.authUnsubscribe = null;
    this.barcodeListenersBound = false;
  }

  async init() {
    initLang();
    this.applyTheme(getTheme());
    this.currentMenu = null;
    clearCurrentMenu();

    this.applyPreferencesToForm(this.state.preferences);
    this.attachEventListeners();
    await this.initAuthState();
    this.updateUI();
    this.renderMenu();
  }

  async initAuthState() {
    if (!isAuthConfigured()) {
      this.syncAuthUI();
      return;
    }

    this.authUnsubscribe = initAuth((user) => {
      this.state.authUser = user || null;
      this.syncAuthUI();
    });

    const redirectResult = await resolveAuthRedirectResult();
    if (redirectResult?.user) {
      this.state.authUser = redirectResult.user;
      this.syncAuthUI();
      showToast(t('authLoginDone'));
    }
  }

  applyPreferencesToForm(prefs = {}) {
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (element && value !== undefined && value !== null) {
        element.value = String(value);
      }
    };

    setValue('people-input', prefs.people ?? 4);
    setValue('variety-select', prefs.variety ?? 'medium');
    setValue('cuisine-select', prefs.cuisine ?? 'mix');
    setValue('prep-time-select', prefs.prepTime ?? 'any');
    setValue('allergies-input', Array.isArray(prefs.allergies) ? prefs.allergies.join(', ') : '');
    setValue('notes-input', prefs.notes ?? '');
    setValue('budget-input', prefs.budget || '');
    setValue('goal-select', prefs.goal || '');
    setValue('pantry-input', Array.isArray(prefs.pantry) ? prefs.pantry.join(', ') : '');
    setValue('pantry-expiry-input', stringifyPantryExpiryItems(prefs.pantryItemsDetailed || []));

    const mealPrepMode = document.getElementById('meal-prep-mode');
    if (mealPrepMode) {
      mealPrepMode.checked = Boolean(prefs.mealPrepMode);
    }

    setValue('family-profiles-input', stringifyFamilyProfiles(prefs.familyProfiles || []));

    const dietarySet = new Set(Array.isArray(prefs.dietary) ? prefs.dietary : []);
    const dietaryCheckboxes = [
      'diet-no-beef',
      'diet-no-pork',
      'diet-lactose-free',
      'diet-no-chicken',
      'diet-no-seafood',
      'diet-no-nuts',
      'diet-gluten-free',
    ];
    for (const id of dietaryCheckboxes) {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = dietarySet.has(checkbox.value);
      }
    }
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

    const budgetCrisisBtn = document.getElementById('btn-budget-crisis');
    if (budgetCrisisBtn) {
      budgetCrisisBtn.addEventListener('click', () => this.handleBudgetCrisisMode());
    }

    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
      authBtn.addEventListener('click', () => this.openAuthModal());
    }

    this.attachPreferencesListeners();
    this.attachSpoonacularListeners();
    this.attachTabListeners();
    this.attachAuthListeners();

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

  async handleBudgetCrisisMode() {
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
      }
    };

    setValue('variety-select', 'low');
    setValue('goal-select', 'budget');
    setValue('prep-time-select', 'quick');
    const budgetInput = document.getElementById('budget-input');
    if (budgetInput && !Number(budgetInput.value)) {
      budgetInput.value = '60';
    }
    const mealPrepMode = document.getElementById('meal-prep-mode');
    if (mealPrepMode) {
      mealPrepMode.checked = true;
    }

    showToast(t('budgetCrisisApplied') || 'Budget crisis mode enabled');
    await this.handleGenerateMenu();
  }

  attachAuthListeners() {
    const gateLoginBtn = document.getElementById('auth-gate-login');
    if (gateLoginBtn) {
      gateLoginBtn.addEventListener('click', () => this.handleEmailLogin('gate'));
    }
    const gateRegisterBtn = document.getElementById('auth-gate-register');
    if (gateRegisterBtn) {
      gateRegisterBtn.addEventListener('click', () => this.handleEmailRegister('gate'));
    }
    const gateResetBtn = document.getElementById('auth-gate-reset');
    if (gateResetBtn) {
      gateResetBtn.addEventListener('click', () => this.handlePasswordReset('gate'));
    }
    const gateGoogleBtn = document.getElementById('auth-gate-google');
    if (gateGoogleBtn) {
      gateGoogleBtn.addEventListener('click', () => this.handleProviderLogin('google', 'gate'));
    }

    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.addEventListener('click', (event) => {
        if (event.target === authModal || event.target.closest('.auth-close')) {
          this.closeAuthModal();
        }
      });
    }

    const loginBtn = document.getElementById('auth-email-login');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleEmailLogin());
    }

    const registerBtn = document.getElementById('auth-email-register');
    if (registerBtn) {
      registerBtn.addEventListener('click', () => this.handleEmailRegister());
    }

    const resetBtn = document.getElementById('auth-email-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handlePasswordReset());
    }

    const googleBtn = document.getElementById('auth-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleProviderLogin('google'));
    }

    const accountThemeBtn = document.getElementById('account-theme-btn');
    if (accountThemeBtn) {
      accountThemeBtn.addEventListener('click', () => this.handleThemeToggle());
    }

    const accountLangBtn = document.getElementById('account-lang-btn');
    if (accountLangBtn) {
      accountLangBtn.addEventListener('click', () => this.handleLanguageToggle());
    }

    const fbBtn = document.getElementById('auth-facebook');
    if (fbBtn) {
      fbBtn.addEventListener('click', () => this.handleProviderLogin('facebook'));
    }

    const xBtn = document.getElementById('auth-x');
    if (xBtn) {
      xBtn.addEventListener('click', () => this.handleProviderLogin('x'));
    }

    const logoutBtn = document.getElementById('auth-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.runAuthAction(() => logout(), t('authLogoutDone'));
      });
    }

    const exportBtn = document.getElementById('auth-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const payload = exportUserLocalData();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const filename = `menuplanner-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        downloadFile(blob, filename);
        showToast(t('authExportDone'));
      });
    }

    const deleteBtn = document.getElementById('auth-delete-account');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm(t('authDeleteConfirm'))) {
          return;
        }
        await this.runAuthAction(async () => {
          await deleteCurrentAccount();
          clearAllData();
        }, t('authDeleteDone'));
      });
    }
  }

  getAuthFormValues(source = 'modal') {
    if (source === 'gate') {
      return {
        email: String(document.getElementById('auth-gate-email')?.value || '').trim(),
        password: String(document.getElementById('auth-gate-password')?.value || ''),
        consent: Boolean(document.getElementById('auth-gate-consent')?.checked),
      };
    }

    return {
      email: String(document.getElementById('auth-email')?.value || '').trim(),
      password: String(document.getElementById('auth-password')?.value || ''),
      consent: Boolean(document.getElementById('auth-gdpr-consent')?.checked),
    };
  }

  ensureGdprConsent(consentChecked, email) {
    if (!consentChecked && !hasGdprConsent()) {
      showToast(t('authConsentRequired'));
      return false;
    }

    if (consentChecked) {
      setGdprConsent({ email, locale: getLang(), source: 'auth_modal' });
    }
    return true;
  }

  async runAuthAction(action, successMessage = '') {
    try {
      await action();
      if (successMessage) {
        showToast(successMessage);
      }
      this.syncAuthUI();
    } catch (error) {
      const code = String(error?.code || '');
      const known = {
        'auth/popup-closed-by-user': t('authPopupClosed'),
        'auth/popup-blocked': t('authPopupBlocked'),
        'auth/cancelled-popup-request': t('authPopupClosed'),
        'auth/operation-not-supported-in-this-environment': t('authRedirecting'),
        'auth/network-request-failed': t('authNetworkError'),
        'auth/invalid-credential': t('authInvalidCredential'),
        'auth/email-already-in-use': t('authEmailInUse'),
        'auth/weak-password': t('authWeakPassword'),
        'auth/invalid-email': t('authInvalidEmail'),
        'auth/too-many-requests': t('authTooManyRequests'),
        'auth/requires-recent-login': t('authReloginRequired'),
      };
      showToast(known[code] || t('authUnexpectedError'));
    }
  }

  async handleEmailRegister(source = 'modal') {
    const { email, password, consent } = this.getAuthFormValues(source);
    if (!isValidEmail(email)) {
      showToast(t('authInvalidEmail'));
      return;
    }
    if (!password || password.length < 8) {
      showToast(t('authPasswordMinLength'));
      return;
    }
    if (!this.ensureGdprConsent(consent, email)) {
      return;
    }
    await this.runAuthAction(async () => {
      await registerWithEmail(email, password);
      this.closeAuthModal();
    }, t('authRegisterDone'));
  }

  async handleEmailLogin(source = 'modal') {
    const { email, password, consent } = this.getAuthFormValues(source);
    if (!isValidEmail(email) || !password) {
      showToast(t('authEmailPasswordRequired'));
      return;
    }
    if (!this.ensureGdprConsent(consent, email)) {
      return;
    }
    await this.runAuthAction(async () => {
      await loginWithEmail(email, password);
      this.closeAuthModal();
    }, t('authLoginDone'));
  }

  async handlePasswordReset(source = 'modal') {
    const { email } = this.getAuthFormValues(source);
    if (!email) {
      showToast(t('authEmailRequired'));
      return;
    }
    await this.runAuthAction(() => resetPassword(email), t('authResetDone'));
  }

  async handleProviderLogin(provider, source = 'modal') {
    const { consent } = this.getAuthFormValues(source);
    if (!this.ensureGdprConsent(consent, '')) {
      return;
    }

    const actionMap = {
      google: loginWithGoogle,
    };
    const action = actionMap[provider];
    if (!action) {
      return;
    }
    await this.runAuthAction(async () => {
      await action();
      this.closeAuthModal();
    }, t('authLoginDone'));
  }

  openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
      return;
    }
    if (!isAuthConfigured()) {
      showToast(t('authNotConfigured'));
    }
    modal.classList.add('open');
    this.syncAuthUI();
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) {
      return;
    }
    modal.classList.remove('open');

    const passwordField = document.getElementById('auth-password');
    if (passwordField) {
      passwordField.value = '';
    }
  }

  syncAuthUI() {
    const user = this.state.authUser || getCurrentUser();
    const forceGuestMode = localStorage.getItem('menuPlanner_forceGuest') === '1';
    const guestMode = !isAuthConfigured() || forceGuestMode;
    const authBtn = document.getElementById('auth-btn');
    const loggedOut = document.getElementById('auth-logged-out');
    const loggedIn = document.getElementById('auth-logged-in');
    const userEmail = document.getElementById('auth-user-email');

    document.body.classList.toggle('authenticated', Boolean(user) || guestMode);

    if (authBtn) {
      authBtn.textContent = user ? t('authManage') : t('authLogin');
    }
    const userLabel = document.getElementById('auth-user-label');
    if (userLabel) {
      userLabel.textContent = '';
      userLabel.hidden = true;
    }

    if (loggedOut) {
      loggedOut.hidden = Boolean(user);
    }
    if (loggedIn) {
      loggedIn.hidden = !user;
    }
    if (userEmail) {
      userEmail.textContent = user ? `${t('authSignedInAs')}: ${user.email || user.uid}` : '';
    }

    const consentBox = document.getElementById('auth-gdpr-consent');
    if (consentBox && hasGdprConsent()) {
      consentBox.checked = true;
    }

    const providersDisabled = !isAuthConfigured();
    for (const id of ['auth-email-login', 'auth-email-register', 'auth-email-reset', 'auth-google', 'auth-gate-login', 'auth-gate-register', 'auth-gate-reset', 'auth-gate-google']) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = providersDisabled;
      }
    }

    const gateStatus = document.getElementById('auth-gate-status');
    if (gateStatus) {
      if (providersDisabled) {
        gateStatus.textContent = t('authNotConfigured');
      } else {
        gateStatus.textContent = user ? '' : t('authGateSubtitle');
      }
    }

    if (user) {
      this.renderFavorites('account-favorites-container');
    }

    this.applyTheme(getTheme());
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

      // Restore locked meals (survive regeneration)
      if (this.lockedMeals.size > 0) {
        for (const [key, lockedMeal] of this.lockedMeals.entries()) {
          const [dayIdx, mealIdx] = key.split(':').map(Number);
          if (menu.days[dayIdx]?.meals[mealIdx]) {
            menu.days[dayIdx].meals[mealIdx] = { ...lockedMeal };
          }
        }
      }

      addMenuToHistory(menu);
      this.marketState = {
        report: null,
        filter: 'all',
        selectedChains: [],
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
    ['diet-no-beef', 'diet-no-pork', 'diet-lactose-free', 'diet-no-chicken', 'diet-no-seafood', 'diet-no-nuts', 'diet-gluten-free'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = false;
      }
    });
    const budgetInput = document.getElementById('budget-input');
    if (budgetInput) {
      budgetInput.value = '';
    }
    const goalInput = document.getElementById('goal-select');
    if (goalInput) {
      goalInput.value = '';
    }
    const pantryInput = document.getElementById('pantry-input');
    if (pantryInput) {
      pantryInput.value = '';
    }
    const pantryExpiryInput = document.getElementById('pantry-expiry-input');
    if (pantryExpiryInput) {
      pantryExpiryInput.value = '';
    }
    const mealPrepMode = document.getElementById('meal-prep-mode');
    if (mealPrepMode) {
      mealPrepMode.checked = false;
    }
    const familyProfilesInput = document.getElementById('family-profiles-input');
    if (familyProfilesInput) {
      familyProfilesInput.value = '';
    }

    const defaultPrefs = {
      people: 4,
      variety: 'medium',
      cuisine: 'mix',
      prepTime: 'any',
      dietary: [],
      allergies: [],
      notes: '',
      budget: 0,
      pantry: [],
      pantryItemsDetailed: [],
      mealPrepMode: false,
      familyProfiles: [],
      goal: '',
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
    const labels = {
      text: theme === 'dark' ? 'Light' : 'Dark',
      title: theme === 'dark' ? t('themeToLight') : t('themeToDark'),
    };

    const accountThemeBtn = document.getElementById('account-theme-btn');
    if (accountThemeBtn) {
      accountThemeBtn.textContent = labels.text;
      accountThemeBtn.title = labels.title;
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
      '#people-input, #variety-select, #cuisine-select, #prep-time-select, #allergies-input, #notes-input, #budget-input, #goal-select, #pantry-input, #pantry-expiry-input, #meal-prep-mode, #family-profiles-input, #diet-no-beef, #diet-no-pork, #diet-lactose-free, #diet-no-chicken, #diet-no-seafood, #diet-no-nuts, #diet-gluten-free'
    );
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        const prefs = this.getFormPreferences();
        savePreferences(prefs);
        this.state.preferences = prefs;
      });
    });
  }

  attachSpoonacularListeners() {
    const dot = document.getElementById('spoon-status-dot');
    const label = document.getElementById('spoon-status-label');
    const active = isSpoonacularEnabled();

    if (dot) {
      dot.classList.toggle('spoon-active', active);
      dot.title = active ? t('spoonacularActive') : t('spoonacularInactive');
    }

    if (label) {
      label.textContent = active ? t('spoonacularActive') : t('spoonacularInactive');
      label.classList.toggle('spoon-label-active', active);
      label.classList.toggle('spoon-label-inactive', !active);
    }

    if (!active) {
      showToast(t('spoonacularMissingKey'));
    }
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
        if (tabName === 'barcode') {
          this.renderBarcodeScanner();
        }
        if (tabName === 'favorites') {
          this.renderFavorites();
        }
      });
    });
  }

  getFormPreferences() {
    const dietaryCheckboxes = [
      'diet-no-beef',
      'diet-no-pork',
      'diet-lactose-free',
      'diet-no-chicken',
      'diet-no-seafood',
      'diet-no-nuts',
      'diet-gluten-free',
    ];
    const dietary = dietaryCheckboxes
      .filter((id) => document.getElementById(id)?.checked)
      .map((id) => document.getElementById(id).value);
    const notes = document.getElementById('notes-input')?.value || '';
    const pantryInput = document.getElementById('pantry-input')?.value || '';
    const parsedPantry = parsePantryInput(pantryInput);
    const pantryItemsDetailed = parsePantryExpiryInput(document.getElementById('pantry-expiry-input')?.value || '');
    const familyProfiles = parseFamilyProfilesInput(document.getElementById('family-profiles-input')?.value || '');
    const pantryNamesFromExpiry = pantryItemsDetailed.map((item) => item.name).filter(Boolean);
    return {
      people: parseInt(document.getElementById('people-input')?.value || 4, 10),
      variety: document.getElementById('variety-select')?.value || 'medium',
      cuisine: document.getElementById('cuisine-select')?.value || 'mix',
      prepTime: document.getElementById('prep-time-select')?.value || 'any',
      dietary,
      allergies: (document.getElementById('allergies-input')?.value || '')
        .split(',')
        .filter((x) => x.trim()),
      notes,
      budget: parseFloat(document.getElementById('budget-input')?.value) || 0,
      pantry: [...new Set((parsedPantry.length > 0 ? parsedPantry : parsePantryFromNotes(notes)).concat(pantryNamesFromExpiry))],
      pantryItemsDetailed,
      mealPrepMode: Boolean(document.getElementById('meal-prep-mode')?.checked),
      familyProfiles,
      goal: document.getElementById('goal-select')?.value || parseGoalFromNotes(notes),
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

    if (this.currentMenu?.weatherHint) {
      const weatherInfo = document.createElement('div');
      weatherInfo.className = 'weather-aware-banner';
      weatherInfo.innerHTML = `
        <div class="weather-aware-title">${t('weatherAwareTitle')}</div>
        <div class="weather-aware-desc">${getWeatherDescription(this.currentMenu.weatherHint)}</div>
        <div class="weather-aware-suggest">${getWeatherMealSuggestion(this.currentMenu.weatherCategory || 'balanced')}</div>
      `;
      container.appendChild(weatherInfo);
    }

    this.renderPlanningInsights(container);

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
      const card = createMenuDayCard(this.currentMenu.days[i], i, this.lockedMeals);
      grid.appendChild(card);
      this.attachMealListeners(card);
    }

    container.appendChild(grid);
    this.attachMenuActionListeners();

    if (getLang() === 'bg') {
      this.localizeMenuMealNames();
    }
  }

  renderPlanningInsights(container) {
    const leftovers = getLeftovers();
    const currentMeals = (this.currentMenu?.days || []).flatMap((day) => day.meals || []);
    const prefs = this.state.preferences || {};
    const pantryItemsDetailed = Array.isArray(prefs.pantryItemsDetailed) ? prefs.pantryItemsDetailed : [];
    const urgentPantry = [...pantryItemsDetailed]
      .map((item) => ({ ...item, daysUntil: getDaysUntil(item.expiryDate) }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 4);
    const familyProfiles = Array.isArray(prefs.familyProfiles) ? prefs.familyProfiles : [];
    const ratedMeals = currentMeals
      .map((meal) => ({ meal, rating: getRecipeRating(meal.idMeal) }))
      .filter((entry) => entry.rating > 0)
      .sort((a, b) => b.rating - a.rating);
    const leftoverSuggestions = this.getLeftoverSuggestions(leftovers);
    const mealPrepSummary = this.currentMenu?.mealPrepSummary || null;
    const batchCalendar = buildBatchCookingCalendar(this.currentMenu);
    const nutritionDashboard = buildWeeklyNutritionDashboard(this.currentMenu, prefs.goal || '');

    if (!leftovers.length && !ratedMeals.length && !leftoverSuggestions.length && !urgentPantry.length && !familyProfiles.length && !mealPrepSummary && !batchCalendar && !nutritionDashboard) {
      return;
    }

    const averageRating = ratedMeals.length
      ? (ratedMeals.reduce((sum, entry) => sum + entry.rating, 0) / ratedMeals.length).toFixed(1)
      : '';
    const leftoversHtml = leftovers.length
      ? leftovers
        .slice(0, 4)
        .map((entry) => `
          <li class="planning-list-item">
            <div>
              <strong>${entry.mealName}</strong>
              <small>${typeof t('leftoversServings') === 'function' ? t('leftoversServings')(entry.servingsLeft) : `${entry.servingsLeft} portions left`}</small>
              ${entry.note ? `<small>${entry.note}</small>` : ''}
            </div>
            <button class="planning-remove-btn" data-leftover-remove="${entry.id}" type="button">✕</button>
          </li>
        `)
        .join('')
      : `<p class="planning-empty">${t('leftoversEmpty')}</p>`;
    const suggestionsHtml = leftoverSuggestions.length
      ? leftoverSuggestions
        .map((entry) => `<li class="planning-list-item"><div><strong>${entry.mealName}</strong><small>${typeof t('leftoverSuggestionMatch') === 'function' ? t('leftoverSuggestionMatch')(entry.matchCount) : `${entry.matchCount} ingredient matches`}</small></div></li>`)
        .join('')
      : `<p class="planning-empty">${t('leftoverSuggestionsEmpty')}</p>`;
    const ratingsHtml = ratedMeals.length
      ? ratedMeals
        .slice(0, 4)
        .map((entry) => `<li class="planning-list-item"><div><strong>${entry.meal.strMealTranslated || entry.meal.strMeal}</strong><small>⭐ ${entry.rating.toFixed(1)}</small></div></li>`)
        .join('')
      : `<p class="planning-empty">${t('recipeRatingEmpty')}</p>`;
    const pantryHtml = urgentPantry.length
      ? urgentPantry
        .map((item) => `<li class="planning-list-item pantry-urgency ${getPantryUrgencyClass(item.daysUntil)}"><div><strong>${item.name}</strong><small>${typeof t('pantryExpiresIn') === 'function' ? t('pantryExpiresIn')(item.daysUntil) : `${item.daysUntil} days`}</small></div></li>`)
        .join('')
      : `<p class="planning-empty">${t('pantryExpiryEmpty')}</p>`;
    const familyHtml = familyProfiles.length
      ? familyProfiles
        .map((profile) => `<li class="planning-list-item"><div><strong>${profile.name}</strong><small>${profile.role} · x${profile.portionMultiplier}${profile.exclusions?.length ? ` · ${profile.exclusions.join(', ')}` : ''}</small></div></li>`)
        .join('')
      : `<p class="planning-empty">${t('familyProfilesEmpty')}</p>`;
    const batchCalendarHtml = batchCalendar?.lines?.length
      ? batchCalendar.lines
        .map((entry) => `<li class="planning-list-item"><div><strong>${entry.label} · ${entry.mealName}</strong><small>${t('batchCalendarCook') || 'Cook'}: ${entry.cookDay}${entry.reheatDays ? ` · ${t('batchCalendarReheat') || 'Reheat'}: ${entry.reheatDays}` : ''}</small></div></li>`)
        .join('')
      : `<p class="planning-empty">${t('batchCalendarEmpty') || 'Enable meal prep to generate calendar'}</p>`;
    const nutritionHtml = nutritionDashboard?.lines?.length
      ? nutritionDashboard.lines
        .map((line) => `<li class="planning-list-item"><div><strong>${(t('days') || [])[line.dayIndex] || `Day ${line.dayIndex + 1}`}</strong><small>${line.kcal} kcal · ${line.protein}g protein ${line.onTarget ? '✓' : '•'}</small></div></li>`)
        .join('')
      : `<p class="planning-empty">${t('emptyMenuHint') || ''}</p>`;

    const section = document.createElement('section');
    section.className = 'planning-insights';
    section.innerHTML = `
      <article class="planning-card" data-insight="pantry">
        <h3>${t('pantryExpiryTitle')}</h3>
        <ul class="planning-list">${pantryHtml}</ul>
      </article>
      <article class="planning-card" data-insight="meal-prep">
        <h3>${t('mealPrepModeTitle')}</h3>
        ${mealPrepSummary ? `<p class="planning-highlight">${typeof t('mealPrepSummary') === 'function' ? t('mealPrepSummary')(mealPrepSummary.cookSessions, mealPrepSummary.repeatedMeals) : ''}</p>` : ''}
        <ul class="planning-list">${mealPrepSummary?.lines?.map((line) => `<li class="planning-list-item"><div><strong>${line.title}</strong><small>${line.detail}</small></div></li>`).join('') || `<p class="planning-empty">${t('mealPrepEmpty')}</p>`}</ul>
      </article>
      <article class="planning-card" data-insight="batch-calendar">
        <h3>${t('batchCalendarTitle') || 'Batch Cooking Calendar'}</h3>
        <ul class="planning-list">${batchCalendarHtml}</ul>
      </article>
      <article class="planning-card" data-insight="nutrition">
        <h3>${t('nutritionDashboardTitle') || 'Weekly Nutrition Goals'}</h3>
        ${nutritionDashboard ? `<p class="planning-highlight">${typeof t('nutritionDaysOnTarget') === 'function' ? t('nutritionDaysOnTarget')(nutritionDashboard.daysOnTarget, nutritionDashboard.lines.length) : ''}</p>` : ''}
        ${nutritionDashboard ? `<p class="planning-empty">${t('nutritionKcalTarget') || 'Kcal target'}: ${nutritionDashboard.kcalTarget} · ${t('nutritionProteinTarget') || 'Protein target'}: ${nutritionDashboard.proteinTarget}g</p>` : ''}
        <ul class="planning-list">${nutritionHtml}</ul>
      </article>
      <article class="planning-card" data-insight="family">
        <h3>${t('labelFamilyProfiles')}</h3>
        <ul class="planning-list">${familyHtml}</ul>
      </article>
      <article class="planning-card" data-insight="leftovers">
        <h3>${t('leftoversTitle')}</h3>
        <ul class="planning-list">${leftoversHtml}</ul>
      </article>
      <article class="planning-card" data-insight="leftover-suggestions">
        <h3>${t('leftoverSuggestionsTitle')}</h3>
        <ul class="planning-list">${suggestionsHtml}</ul>
      </article>
      <article class="planning-card" data-insight="rating">
        <h3>${t('recipeRatingTitle')}</h3>
        ${ratedMeals.length ? `<p class="planning-highlight">${typeof t('recipeRatingAverage') === 'function' ? t('recipeRatingAverage')(averageRating, ratedMeals.length) : `Average rating ${averageRating}`}</p>` : ''}
        <ul class="planning-list">${ratingsHtml}</ul>
      </article>
    `;
    container.appendChild(section);

    section.querySelectorAll('[data-leftover-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        removeLeftover(button.getAttribute('data-leftover-remove'));
        this.renderMenu();
      });
    });
  }

  getLeftoverSuggestions(leftovers) {
    if (!leftovers.length || !this.currentMenu?.days?.length) {
      return [];
    }

    const leftoverTokens = new Set(
      leftovers
        .flatMap((entry) => entry.ingredients || [])
        .map((ingredient) => normalizeInsightToken(ingredient.name || ingredient))
        .filter(Boolean)
    );

    return this.currentMenu.days
      .flatMap((day) => day.meals || [])
      .map((meal) => {
        const ingredientTokens = (meal.ingredients || [])
          .map((ingredient) => normalizeInsightToken(ingredient.name || ingredient))
          .filter(Boolean);
        const matchCount = ingredientTokens.filter((token) => leftoverTokens.has(token)).length;
        return {
          mealId: meal.idMeal,
          mealName: meal.strMealTranslated || meal.strMeal,
          matchCount,
        };
      })
      .filter((entry) => entry.matchCount >= 2)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 3);
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

    card.querySelectorAll('.swap-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const mealItem = btn.closest('.meal-item');
        if (!mealItem) {
          return;
        }
        const dayIndex = parseInt(mealItem.getAttribute('data-day'), 10);
        const mealIndex = parseInt(mealItem.getAttribute('data-meal-index'), 10);
        if (Number.isNaN(dayIndex) || Number.isNaN(mealIndex)) {
          return;
        }
        await this.handleSwapMeal(dayIndex, mealIndex, btn);
      });
    });

    card.querySelectorAll('.lock-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mealItem = btn.closest('.meal-item');
        const dayIndex = parseInt(mealItem.getAttribute('data-day'), 10);
        const mealIndex = parseInt(mealItem.getAttribute('data-meal-index'), 10);
        this.handleLockMeal(dayIndex, mealIndex);
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

  async handleSwapMeal(dayIndex, mealIndex, btn) {
    const lockKey = `${dayIndex}:${mealIndex}`;
    if (this.lockedMeals.has(lockKey)) {
      showToast(t('mealLocked'));
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.classList.add('spinning');
    }
    try {
      const previousId = this.currentMenu?.days?.[dayIndex]?.meals?.[mealIndex]?.idMeal;
      const newMeal = await swapMealInMenu(this.currentMenu, dayIndex, mealIndex);
      if (newMeal && newMeal.idMeal && newMeal.idMeal !== previousId) {
        this.currentMenu.days[dayIndex].meals[mealIndex] = newMeal;
        this.currentBasket = null;
        this.marketState = { ...this.marketState, report: null, basketKey: '' };
        saveCurrentMenu(this.currentMenu);
        if (getLang() === 'bg') {
          this.localizeMenuMealNames();
        }
        this.renderMenu();
        showToast(t('mealSwapped'));
      } else {
        showToast(t('mealSwapFailed'));
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('spinning');
        }
      }
    } catch (error) {
      console.error('Swap failed:', error);
      showToast(t('mealSwapFailed'));
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('spinning');
      }
    }
  }

  handleLockMeal(dayIndex, mealIndex) {
    const lockKey = `${dayIndex}:${mealIndex}`;
    const meal = this.currentMenu?.days[dayIndex]?.meals[mealIndex];
    if (!meal) {
      return;
    }
    if (this.lockedMeals.has(lockKey)) {
      this.lockedMeals.delete(lockKey);
      showToast(t('mealUnlocked'));
    } else {
      this.lockedMeals.set(lockKey, { ...meal });
      showToast(t('mealLocked'));
    }
    // Re-render only the affected card to update lock icon without full page refresh
    const card = document.querySelector(`.day-card[data-day="${dayIndex}"]`);
    if (card) {
      const newCard = createMenuDayCard(
        this.currentMenu.days[dayIndex],
        dayIndex,
        this.lockedMeals
      );
      card.replaceWith(newCard);
      this.attachMealListeners(newCard);
    }
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
    const leftoversBtn = modal.querySelector('.leftover-recipe-btn');
    const ratingLabel = modal.querySelector('.recipe-rating-value');
    const ratingButtons = Array.from(modal.querySelectorAll('.recipe-rating-btn'));

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

    ratingButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const rating = Number(button.getAttribute('data-rating') || 0);
        if (!rating) {
          return;
        }
        setRecipeRating(recipe.idMeal, rating, recipe.strMeal);
        ratingButtons.forEach((item) => {
          item.classList.toggle('active', Number(item.getAttribute('data-rating')) <= rating);
        });
        if (ratingLabel) {
          ratingLabel.textContent = t('recipeRatedValue')(rating);
        }
        showToast(t('recipeRatingSaved')(rating));
        this.renderMenu();
      });
    });

    if (leftoversBtn) {
      leftoversBtn.addEventListener('click', () => {
        const servingsRaw = window.prompt(t('leftoverPromptServings'), '2');
        if (servingsRaw === null) {
          return;
        }
        const servingsLeft = parseInt(servingsRaw, 10);
        if (!servingsLeft || servingsLeft < 1) {
          showToast(t('leftoverInvalidServings'));
          return;
        }
        const note = window.prompt(t('leftoverPromptNote'), '') || '';
        addLeftover({
          mealId: recipe.idMeal,
          mealName: recipe.strMeal,
          servingsLeft,
          note,
          ingredients: recipe.ingredients || [],
        });
        showToast(t('leftoversAdded'));
        this.renderMenu();
      });
    }

    // Serving scaler
    const servingCountEl = modal.querySelector('.serving-count');
    const servingDownBtn = modal.querySelector('.serving-down');
    const servingUpBtn = modal.querySelector('.serving-up');
    if (servingCountEl && servingDownBtn && servingUpBtn) {
      const base = parseInt(servingCountEl.dataset.base, 10) || 4;
      let current = base;
      const updateServings = () => {
        servingCountEl.textContent = current;
        const factor = current / base;
        modal.querySelectorAll('.ingredients-list .ing-measure').forEach((span) => {
          const orig = span.dataset.base;
          if (orig) {
            span.textContent = scaleIngredientMeasure(orig, factor);
          }
        });
      };
      servingDownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (current > 1) {
          current--; updateServings();
        }
      });
      servingUpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (current < 20) {
          current++; updateServings();
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
      <button class="action-btn print-basket-btn">🖨 ${t('printBasket')}</button>
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
        const blob = await exportBasketToPDF(this.currentBasket, stats, getLang(), this.currentMenu?.options || {});
        downloadFile(blob, generatePDFFilename('basket'));
        showToast(t('basketExportedPDF'));
      } catch (error) {
        console.error('PDF export error:', error);
        showToast(t('failedExportPDF'));
      }
    });

    container.querySelector('.print-basket-btn')?.addEventListener('click', () => {
      window.print();
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
      this.renderMarketResults(results, this.marketState.report, this.marketState.selectedChains || []);
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
        filter: 'all',
        selectedChains: [],
        loading: true,
        error: '',
        basketKey,
        requestId: Date.now(),
      };
      const requestId = this.marketState.requestId;
      results.innerHTML = this.getMarketsLoadingMarkup();

      try {
        const report = await buildSupermarketRecommendations(this.currentBasket, this.currentMenu?.options || {});
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
          filter: 'all',
          selectedChains: [],
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

  renderFavorites(containerId = 'favorites-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    this.state.favorites = getAllFavorites();
    container.innerHTML = '';

    // Recent menus history section (top)
    const history = getMenuHistory();
    if (history.length > 0) {
      const histSection = createFavoritesSection('history', history);
      container.appendChild(histSection);
      this.attachFavoritesListeners(histSection, 'history');
    }

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

        if (type === 'menus' || type === 'history') {
          const menuId = item.getAttribute('data-menu-id');
          let selectedMenu = null;
          if (type === 'menus') {
            selectedMenu = this.state.favorites.menus.find((menu) => menu.id === menuId);
          } else {
            selectedMenu = getMenuHistory().find((menu) => menu.id === menuId);
          }
          if (!selectedMenu) {
            return;
          }
          this.currentMenu = selectedMenu;
          this.currentBasket = null;
          this.lockedMeals = new Map();
          this.marketState = {
            report: null,
            filter: 'all',
            selectedChains: [],
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
        this.renderFavorites('favorites-container');
        this.renderFavorites('account-favorites-container');
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

  renderMarketResults(results, report, selectedChains = []) {
    const selected = Array.isArray(selectedChains) ? selectedChains : [];
    let storesForRender = report.stores || [];
    const allCandidateStores = [...storesForRender];

    if (selected.length > 0) {
      const selectedSet = new Set(selected);
      storesForRender = storesForRender.filter((store) => selectedSet.has(store.chainId || store.chainLabel));
    }

    const recommendedStore = (report.stores || []).find((store) => store.id === report.recommendedStoreId) || null;
    const recommendedChainKey = recommendedStore ? (recommendedStore.chainId || recommendedStore.chainLabel) : '';

    const bestStoreByChain = new Map();
    for (const store of storesForRender) {
      const chainKey = store.chainId || store.chainLabel || store.id;
      const existing = bestStoreByChain.get(chainKey);
      if (!existing) {
        bestStoreByChain.set(chainKey, store);
        continue;
      }

      const existingCoverage = Number(existing.coverage?.percent || 0);
      const currentCoverage = Number(store.coverage?.percent || 0);
      const existingTotal = Number(existing.coverage?.estimatedTotal || Number.POSITIVE_INFINITY);
      const currentTotal = Number(store.coverage?.estimatedTotal || Number.POSITIVE_INFINITY);
      const existingDistance = existing.distanceKm ?? Number.POSITIVE_INFINITY;
      const currentDistance = store.distanceKm ?? Number.POSITIVE_INFINITY;

      if (
        currentCoverage > existingCoverage ||
        (currentCoverage === existingCoverage && currentTotal < existingTotal) ||
        (currentCoverage === existingCoverage && currentTotal === existingTotal && currentDistance < existingDistance)
      ) {
        bestStoreByChain.set(chainKey, store);
      }
    }

    storesForRender = Array.from(bestStoreByChain.values());

    // Sort: recommended store first, then by offer coverage % desc, then by distance
    storesForRender = storesForRender.sort((a, b) => {
      const aChainKey = a.chainId || a.chainLabel;
      const bChainKey = b.chainId || b.chainLabel;
      if (recommendedChainKey && aChainKey === recommendedChainKey) {
        return -1;
      }
      if (recommendedChainKey && bChainKey === recommendedChainKey) {
        return 1;
      }
      if (b.coverage.percent !== a.coverage.percent) {
        return b.coverage.percent - a.coverage.percent;
      }
      const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });

    const locationWarning = report.coords.isFallback
      ? `<p class="market-location-warning">&#9888;&#65039; ${t('marketLocationApprox')}</p>`
      : '';
    const analysisNote = report.analysisProvider
      ? `<p class="market-analysis-note">${report.analysisProvider} analysis${report.searchRadiusKm ? ` · ${report.searchRadiusKm} km radius` : ''}${report.analysisSummary ? ` · ${report.analysisSummary}` : ''}</p>`
      : '';
    const eurToBgn = Number(report?.fx?.BGN || 1.9558);
    const formatTotal = (eurValue) => {
      const eur = Number(eurValue || 0);
      const bgn = eur * eurToBgn;
      return `€${eur.toFixed(2)} / ${bgn.toFixed(2)} лв`;
    };

    const budget = Number(this.state.preferences?.budget || 0);
    const storeTotals = storesForRender
      .map((store) => Number(store.coverage?.estimatedTotal || 0))
      .filter((total) => total > 0);
    const cheapestTotal = storeTotals.length ? Math.min(...storeTotals) : 0;
    let budgetIndicator = '';
    if (budget > 0 && cheapestTotal > 0) {
      const ratio = cheapestTotal / budget;
      const status = ratio > 1 ? 'over' : ratio >= 0.9 ? 'close' : 'ok';
      const statusText = status === 'over'
        ? t('budgetOverBudget')
        : status === 'close'
          ? t('budgetClose')
          : t('budgetOnBudget');
      budgetIndicator = `<p class="budget-indicator ${status}">${statusText}: ${formatTotal(cheapestTotal)} / ${formatTotal(budget)}</p>`;
    }
    const splitPlan = report.optimization?.splitPlan;
    const swapSuggestions = report.optimization?.swapSuggestions || [];
    const routePlan = buildRouteOptimizer(report, splitPlan);
    const familyAdjustments = report.familyAdjustments?.lines || [];
    const familyAdjustmentsMarkup = familyAdjustments.length
      ? `
        <section class="market-optimizer-card market-family-adjustments">
          <h3>${t('marketFamilyAdjustmentsTitle') || 'Family substitutions applied'}</h3>
          <ul class="planning-list">
            ${familyAdjustments.map((entry) => `<li class="planning-list-item"><div><strong>${entry.from}</strong><small>${entry.to}</small></div></li>`).join('')}
          </ul>
        </section>
      `
      : '';
    const splitAssignments = (splitPlan?.assignments || [])
      .slice(0, 3)
      .map((assignment) => `<li><strong>${assignment.chainLabel}</strong> · ${formatTotal(assignment.subtotal)} · ${assignment.items.slice(0, 3).map((item) => item.ingredient).join(', ')}</li>`)
      .join('');
    const swapHtml = swapSuggestions
      .map((suggestion) => `<li>${typeof t('marketSwapSuggestion') === 'function' ? t('marketSwapSuggestion')(suggestion.fromLabel, suggestion.toLabel, suggestion.savings.toFixed(2), suggestion.replacementStore) : `${suggestion.fromLabel} → ${suggestion.toLabel}`}</li>`)
      .join('');
    const optimizerMarkup = splitPlan && (splitPlan.itemCount > 0 || swapSuggestions.length > 0)
      ? `
        <section class="market-optimizer-card">
          <h3>${t('marketOptimizerTitle')}</h3>
          ${splitPlan.itemCount > 0 ? `<p class="planning-highlight">${typeof t('marketSplitSavings') === 'function' ? t('marketSplitSavings')(formatTotal(splitPlan.total), formatTotal(Math.max(0, splitPlan.savingsVsCheapestSingle))) : ''}</p>` : ''}
          ${splitAssignments ? `<ul class="planning-list market-optimizer-list">${splitAssignments}</ul>` : ''}
          ${routePlan?.route?.length ? `<div class="market-route-plan"><h4>${t('marketRouteOptimizerTitle') || 'Store route optimizer'}</h4><p class="planning-empty">${typeof t('marketRouteSummary') === 'function' ? t('marketRouteSummary')(routePlan.route.length, routePlan.estimatedMinutes) : ''}</p><ul class="planning-list">${routePlan.route.map((stop) => `<li class="planning-list-item"><div><strong>${stop.chainLabel}</strong><small>${stop.distanceKm !== null ? `${stop.distanceKm} km` : (t('marketLocationApprox') || 'distance n/a')}</small></div></li>`).join('')}</ul></div>` : ''}
          ${swapHtml ? `<div class="market-smart-swaps"><h4>${t('marketSmartSwaps')}</h4><ul class="planning-list">${swapHtml}</ul></div>` : ''}
        </section>
      `
      : '';

    const cards = storesForRender
      .map((store) => {
        const distanceHtml = store.distanceKm !== null
          ? `<span class="market-meta-item">&#128205; ${store.distanceKm} km</span>`
          : '';

        const availabilityLabel = t('marketAvailability') || 'availability';
        const promoLabel = t('marketPromoCoverage') || 'promo';
        const minCoverage = report.minRecommendedCoverage || 70;
        const promoCount = store.coverage.promoMatchedCount || 0;
        const thresholdLabel = store.coverage.percent >= minCoverage ? 'OK' : 'LOW';
        const confidenceLevel = store.priceConfidence?.level || 'low';

        let budgetBadgeHtml = '';
        if (budget > 0) {
          const total = store.coverage.estimatedTotal;
          const diff = total - budget;
          let cls = 'budget-ok';
          let label = t('budgetOnBudget');
          if (diff > 0) {
            cls = 'budget-over'; label = `+€${diff.toFixed(2)} ${t('budgetOverBudget')}`;
          } else if (diff > -budget * 0.1) {
            cls = 'budget-close'; label = t('budgetOnBudget');
          }
          budgetBadgeHtml = `<span class="budget-indicator ${cls}">${label}</span>`;
        }

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
        const brochureLine = Array.isArray(store.brochureHighlights) && store.brochureHighlights.length > 0
          ? `<p class="market-brochure-line">📰 ${store.brochureHighlights.join(' · ')}</p>`
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
              <span class="market-meta-item price-tag">${formatTotal(store.coverage.estimatedTotal)}</span>
              <span class="market-meta-item confidence-tag confidence-${confidenceLevel}">${t('marketConfidenceLabel')}: ${t(`confidence${confidenceLevel.charAt(0).toUpperCase()}${confidenceLevel.slice(1)}`)}</span>
              ${budgetBadgeHtml}
            </div>
            <p class="market-coverage-line">${t('marketCoverage')(store.coverage.matchedCount, store.coverage.total, store.coverage.percent)} · min ${minCoverage}%: ${thresholdLabel} · ${t('marketMatchedOffers')(promoCount)} · ${formatTotal(store.coverage.estimatedTotal)}</p>
            ${brochureLine}
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

    const cardsMarkup = cards || `<p class="market-loading">${t('marketNoStores')}</p>`;

    const topStore = storesForRender[0] || null;
    const summaryText = topStore && topStore.coverage.percent > 0
      ? `${topStore.chainLabel}: ${t('marketCoverage')(topStore.coverage.matchedCount, topStore.coverage.total, topStore.coverage.percent)}${topStore.coverage.estimatedTotal > 0 ? ` · ${formatTotal(topStore.coverage.estimatedTotal)}` : ''}`
      : '';

    const chains = Array.from(
      new Map(
        allCandidateStores.map((store) => [store.chainId || store.chainLabel, store.chainLabel || store.name || 'Supermarket']),
      ).entries(),
    );
    const chainChecks = chains
      .map(([chainKey, chainLabel]) => {
        const checked = selected.includes(chainKey) ? 'checked' : '';
        return `<label class="market-chain-check-item"><input type="checkbox" class="market-chain-check" data-chain="${chainKey}" ${checked}/> <span>${chainLabel}</span></label>`;
      })
      .join('');

    results.innerHTML = `
      ${locationWarning}
      ${analysisNote}
      ${summaryText ? `<p class="market-summary">${summaryText}</p>` : ''}
      ${budgetIndicator || ''}
      ${familyAdjustmentsMarkup}
      ${optimizerMarkup}
      <div class="market-results-layout">
        <div class="market-cards all-chains">${cardsMarkup}</div>
        <aside class="market-chain-sidebar">
          <h4>${t('marketFilterAll')}</h4>
          <div class="market-chain-check-list">${chainChecks}</div>
        </aside>
      </div>
    `;

    results.querySelectorAll('.market-chain-check').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const selectedNow = Array.from(results.querySelectorAll('.market-chain-check:checked'))
          .map((el) => el.getAttribute('data-chain'))
          .filter(Boolean);
        this.marketState.selectedChains = selectedNow;
        this.renderMarketResults(results, report, selectedNow);
      });
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

  renderBarcodeScanner() {
    const container = document.getElementById('barcode-container');
    if (!container) {
      return;
    }

    // Ensure hero section exists
    const heroSection = container.querySelector('.barcode-hero');
    if (!heroSection) {
      const page = document.createElement('div');
      page.innerHTML = `
        <div class="barcode-hero">
          <h2>🔍 ${t('barcodeTitle') || 'Barcode Scanner'}</h2>
          <p class="barcode-hint">${t('barcodeHint') || 'Scan products to check allergens and menu compliance'}</p>
          <button class="btn btn-primary start-scanner-btn" id="start-scanner-btn">📷 ${t('barcodeStartCamera') || 'Start Camera'}</button>
        </div>
        <div id="scanner-preview" class="scanner-preview" style="display: none;">
          <video id="barcode-video" class="barcode-video"></video>
          <button class="btn btn-secondary stop-scanner-btn" id="stop-scanner-btn">${t('barcodeStop') || 'Stop'}</button>
        </div>
        <div id="scan-results" class="scan-results"></div>
      `;
      container.innerHTML = '';
      container.appendChild(page);
    }

    this.attachBarcodeScannerListeners();
    this.renderBarcodeHistory();
  }

  attachBarcodeScannerListeners() {
    const startBtn = document.getElementById('start-scanner-btn');
    const stopBtn = document.getElementById('stop-scanner-btn');
    const videoElement = document.getElementById('barcode-video');
    const previewContainer = document.getElementById('scanner-preview');
    const resultsContainer = document.getElementById('scan-results');

    if (!startBtn || !stopBtn || !videoElement) {
      return;
    }

    if (this.barcodeListenersBound) {
      return;
    }

    this.barcodeListenersBound = true;

    startBtn.addEventListener('click', async () => {
      try {
        previewContainer.style.display = 'flex';
        resultsContainer.innerHTML = `<p>${t('barcodeScanning') || 'Initializing camera...'}</p>`;
        const started = await initBarcodeScanner(videoElement);
        if (!started) {
          throw new Error('Scanner initialization failed');
        }
        startBtn.style.display = 'none';

        // Register callback for when barcode is detected
        onBarcodeDetected((product, detectedCode) => {
          this.handleBarcodeDetected(product, detectedCode, resultsContainer);
        });
      } catch (error) {
        console.error('Barcode scanner error:', error);
        showToast(t('barcodeCameraError') || 'Failed to access camera');
        previewContainer.style.display = 'none';
        startBtn.style.display = 'block';
      }
    });

    stopBtn.addEventListener('click', () => {
      stopBarcodeScanner();
      previewContainer.style.display = 'none';
      startBtn.style.display = 'block';
      resultsContainer.innerHTML = '';
    });
  }

  handleBarcodeDetected(product, detectedCode, resultsContainer) {
    console.log('🔍 Barcode detected:', product, detectedCode);

    if (!product || !product.code) {
      return;
    }

    logScannedProduct(product, detectedCode);

    // Check if product is in current menu/basket
    const inMenuResult = this.currentBasket ? isProductInMenu(product, this.currentBasket) : { found: false, matches: [] };

    // Check allergens against user preferences
    const userAllergies = this.state.preferences.allergies || [];
    const allergenCheck = checkAllergens(product, userAllergies);

    // Get dietary restrictions
    const dietary = this.state.preferences.dietary || [];
    const dietaryCheck = checkDietaryRestrictions(product, dietary);

    // Get alternatives
    const alternatives = this.currentBasket ? getProductAlternatives(product, this.currentBasket) : [];

    // Build result card
    const resultHtml = `
      <div class="scan-result-card">
        <div class="result-header">
          <h3>${product.name || product.code}</h3>
          <p class="result-barcode">${t('barcodeCode') || 'Code'}: ${product.code}</p>
        </div>

        <div class="result-section">
          <h4>${t('allergenStatus') || 'Allergen Status'}</h4>
          <div class="allergen-status ${allergenCheck.safe ? 'safe' : 'warning'}">
            ${allergenCheck.safe ? '✅' : '⚠️'} ${allergenCheck.message || (allergenCheck.safe ? t('allergenSafe') : t('allergenWarning'))}
            ${allergenCheck.conflicts?.length ? `<p class="allergen-conflicts">${t('allergenConflicts') || 'Contains'}: ${allergenCheck.conflicts.join(', ')}</p>` : ''}
          </div>
        </div>

        <div class="result-section">
          <h4>${t('menuStatus') || 'Menu Status'}</h4>
          <div class="menu-status ${inMenuResult.found ? 'in-menu' : 'not-in-menu'}">
            ${inMenuResult.found ? '✅' : '❌'} ${inMenuResult.found ? t('inMenu') : t('notInMenu') || 'Not in your menu'}
          </div>
        </div>

        ${alternatives.length > 0 ? `
        <div class="result-section">
          <h4>${t('alternatives') || 'Better Alternatives'}</h4>
          <ul class="alternatives-list">
            ${alternatives.map((alt) => `<li>${alt.name || alt}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${dietaryCheck && !dietaryCheck.compliant ? `
        <div class="result-section dietary-warning">
          <h4>⚠️ ${t('dietaryWarning') || 'Dietary Restriction'}</h4>
          <p>${dietaryCheck.message || t('dietaryViolation')}</p>
        </div>
        ` : ''}
      </div>
    `;

    resultsContainer.innerHTML = resultHtml;
    this.renderBarcodeHistory();
  }

  renderBarcodeHistory() {
    const container = document.getElementById('barcode-container');
    if (!container) {
      return;
    }

    let historySection = container.querySelector('.barcode-history');
    if (!historySection) {
      historySection = document.createElement('section');
      historySection.className = 'barcode-history';
      container.appendChild(historySection);
    }

    const history = getScannedProductHistory().slice(0, 8);
    if (history.length === 0) {
      historySection.innerHTML = `<h3>${t('barcodeHistoryTitle')}</h3><p class="history-empty">${t('barcodeHistoryEmpty')}</p>`;
      return;
    }

    const rows = history
      .map((entry) => {
        const name = entry?.product?.name || t('barcodeNotFound');
        const code = entry?.barcode || entry?.product?.code || '-';
        const source = entry?.product?.source || 'unknown';
        const time = new Date(entry?.timestamp || Date.now()).toLocaleString();
        return `
          <li>
            <div class="history-item-main">
              <strong>${name}</strong>
              <span>${t('barcodeCode')}: ${code}</span>
            </div>
            <div class="history-item-meta">
              <span>${t('barcodeSource')}: ${source}</span>
              <span>${time}</span>
            </div>
          </li>
        `;
      })
      .join('');

    historySection.innerHTML = `
      <h3>${t('barcodeHistoryTitle')}</h3>
      <ul class="barcode-history-list">${rows}</ul>
    `;
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

    const accountLangBtn = document.getElementById('account-lang-btn');
    if (accountLangBtn) {
      accountLangBtn.textContent = t('langBtn');
      accountLangBtn.title = t('langTitle');
    }

    const theme = getTheme();
    this.applyTheme(theme);
    this.syncAuthUI();

    if (this.currentMenu) {
      this.renderMenu();
    }
  }

}
