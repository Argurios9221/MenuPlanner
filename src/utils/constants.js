// Application constants and configuration

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Fresh Kitchen';
export const APP_DESCRIPTION =
  'AI-powered weekly meal planner with shopping lists and recipe translations';

// API Configuration
export const API = {
  MEALSDB_BASE_URL: 'https://www.themealdb.com/api/json/v1/1',
  MYMEMORY_BASE_URL: 'https://api.mymemory.translated.net/get',
  TIMEOUT: 10000, // 10 seconds
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour
};

// UI Configuration
export const UI = {
  TOAST_DURATION: 3000,
  TOAST_LONG_DURATION: 5000,
  MODAL_TRANSITION_DELAY: 300,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 300,
};

// Default Preferences
export const DEFAULT_PREFERENCES = {
  people: 4,
  variety: 'medium',
  cuisine: 'mix',
  dietary: [],
  allergies: [],
  notes: '',
};

// Meal Configuration
export const MEALS = {
  PER_DAY: 3, // breakfast, lunch, dinner
  DAYS_PER_WEEK: 7,
  TOTAL_PER_WEEK: 21,
  CATEGORIES: {
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    DINNER: 'Dinner',
  },
};

// Ingredient Categories
export const INGREDIENT_CATEGORIES = [
  'Meat & Poultry',
  'Fish & Seafood',
  'Dairy & Eggs',
  'Vegetables',
  'Fruits',
  'Grains & Pasta',
  'Spices & Herbs',
  'Oils & Sauces',
  'Other',
];

// Languages
export const LANGUAGES = {
  EN: 'en',
  BG: 'bg',
};

export const LANGUAGE_NAMES = {
  en: 'English',
  bg: 'Български',
};

// Storage Keys
export const STORAGE_KEYS = {
  FAVORITES: 'menuPlanner_favorites',
  PREFERENCES: 'menuPlanner_preferences',
  CHECKED_ITEMS: 'menuPlanner_checkedItems',
  TRANSLATION_CACHE: 'menuPlanner_translationCache',
  LANG: 'menuPlanner_lang',
  CURRENT_MENU: 'menuPlanner_currentMenu',
  ERROR_LOG: 'menuPlanner_errorLog',
  SETTINGS: 'menuPlanner_settings',
  THEME: 'menuPlanner_theme',
};

// Difficulty Levels
export const DIFFICULTY_LEVELS = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

// Variety Levels
export const VARIETY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// Feature Flags
export const FEATURES = {
  OFFLINE_MODE: true,
  TRANSLATIONS: true,
  SHARING: true,
  FAVORITES: true,
  BASKET: true,
  PDF_EXPORT: true,
  ALLERGEN_FILTER: true,
  RECIPE_SEARCH: true,
  TRENDING_RECIPES: true,
  RECOMMENDATIONS: true,
  COST_ESTIMATION: false, // Coming soon
  USER_ACCOUNTS: false, // Coming soon
};

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  YOUTUBE: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  HASHTAG: /#\w+/g,
  MENTION: /@\w+/g,
};

// HTTP Status Codes
export const HTTP_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Failed to connect to server. Please check your internet.',
  TIMEOUT: 'Request timed out. Please try again.',
  NOT_FOUND: 'The requested resource was not found.',
  INVALID_INPUT: 'Please check your input and try again.',
  STORAGE_FULL: 'Storage is full. Please clear some data.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  MENU_GENERATED: 'Your weekly menu has been generated!',
  MENU_SAVED: 'Menu saved to favorites!',
  RECIPE_ADDED: 'Recipe added to favorites!',
  RECIPE_REMOVED: 'Recipe removed from favorites.',
  ITEM_EXPORTED: 'Item exported successfully!',
  DATA_CLEARED: 'Data cleared successfully.',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
};

// Search Configuration
export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 50,
  DEBOUNCE_DELAY: 500,
};

// Sharing Platforms
export const SHARE_PLATFORMS = {
  WHATSAPP: 'whatsapp',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  EMAIL: 'email',
  COPY: 'copy',
};

// Theme
export const THEME = {
  PRIMARY_COLOR: '#8b5a3c',
  SECONDARY_COLOR: '#c9a876',
  ACCENT_COLOR: '#e8a87c',
  LIGHT_BG: '#f5e6d3',
  DARK_TEXT: '#2c2c2c',
  BORDER_COLOR: '#d4b5a0',
  SUCCESS_COLOR: '#6b8e23',
  ERROR_COLOR: '#d32f2f',
  WARNING_COLOR: '#ff9800',
  INFO_COLOR: '#2196f3',
};

// Animation Durations (in ms)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
};

// Breakpoints (in px)
export const BREAKPOINTS = {
  XS: 360,
  SM: 600,
  MD: 900,
  LG: 1200,
  XL: 1600,
};
