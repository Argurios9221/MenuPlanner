/**
 * Barcode Scanner Module
 * Scans product barcodes and provides allergen/menu validation
 */

import { getBasketIngredients } from './basket.js';
import { loadRecipe } from './recipe.js';

// UPC/EAN database mapping (basic set)
// In production, use Spoonacular API or OpenFoodFacts API
const BARCODE_DATABASE = {
  '5901234123457': { // Example UPC
    name: 'Milk 1L',
    category: 'Dairy',
    allergens: ['milk'],
    price: 1.40,
  },
  '5901234567890': {
    name: 'Eggs 12-pack',
    category: 'Dairy',
    allergens: ['eggs'],
    price: 2.20,
  },
  '5901234987654': {
    name: 'Whole Wheat Bread',
    category: 'Bread',
    allergens: ['gluten', 'wheat'],
    price: 1.40,
  },
};

let isScanning = false;
let scannerInstance = null;

/**
 * Initialize barcode scanner
 * Uses Quagg JS library
 */
export async function initBarcodeScanner(videoElement) {
  if (!videoElement || !window.Quagga) {
    console.error('🔍 [Barcode] Quagga not loaded or video element missing');
    return false;
  }

  try {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: 'environment', // Use rear camera
          },
          target: videoElement,
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'code_128_reader',
            'code_39_reader',
            'code_39_vin_reader',
            'codabar_reader',
            'upc_reader',
            'upc_e_reader',
            'i2of5_reader',
          ],
          debug: {
            showCanvas: true,
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false,
            boxFromPatches: {
              showTransformed: false,
              showTransformedBox: false,
              showBB: false,
            },
          },
        },
      },
      (err) => {
        if (err) {
          console.error('🔍 [Barcode] Initialization error:', err);
          return false;
        }
        Quagga.start();
        isScanning = true;
        scannerInstance = Quagga;
        console.log('🔍 [Barcode] Scanner started');
        return true;
      }
    );
  } catch (err) {
    console.error('🔍 [Barcode] Error initializing scanner:', err);
    return false;
  }
}

/**
 * Stop barcode scanner
 */
export function stopBarcodeScanner() {
  if (scannerInstance) {
    try {
      Quagga.stop();
      isScanning = false;
      console.log('🔍 [Barcode] Scanner stopped');
      return true;
    } catch (err) {
      console.error('🔍 [Barcode] Error stopping scanner:', err);
      return false;
    }
  }
}

/**
 * Register barcode detection listener
 */
export function onBarcodeDetected(callback) {
  if (!scannerInstance) {
    console.warn('🔍 [Barcode] Scanner not initialized');
    return;
  }

  Quagga.onDetected((result) => {
    const barcode = result.codeResult?.code;
    if (barcode) {
      console.log('🔍 [Barcode] Detected:', barcode);
      const product = resolveBarcode(barcode);
      callback(product, barcode);
    }
  });
}

/**
 * Look up product by barcode
 * Returns product data or null if not found
 */
function resolveBarcode(barcode) {
  // Check local database first
  if (BARCODE_DATABASE[barcode]) {
    return { ...BARCODE_DATABASE[barcode], barcode, source: 'local' };
  }

  // In production, query Spoonacular API or OpenFoodFacts API
  console.log(`🔍 [Barcode] ${barcode} not in local database - would query API`);
  return null;
}

/**
 * Check if product is in current menu
 */
export function isProductInMenu(product, currentBasket) {
  if (!product || !currentBasket) {
    return { found: false, matches: [] };
  }

  const productName = (product.name || '').toLowerCase();
  const matches = [];

  // Check all basket items
  for (const category in currentBasket) {
    for (const item of currentBasket[category]) {
      const itemName = (item.name || '').toLowerCase();
      if (itemName.includes(productName) || productName.includes(itemName)) {
        matches.push({ category, item });
      }
    }
  }

  return { found: matches.length > 0, matches };
}

/**
 * Check product allergens against user allergies
 */
export function checkAllergens(product, userAllergies = []) {
  if (!product || !product.allergens || !userAllergies.length) {
    return { safe: true, conflicts: [] };
  }

  const conflicts = product.allergens.filter((allergen) =>
    userAllergies.some(
      (userAllergen) =>
        normalizeAllergen(allergen) === normalizeAllergen(userAllergen)
    )
  );

  return {
    safe: conflicts.length === 0,
    conflicts,
    message:
      conflicts.length > 0
        ? `⚠️ Contains: ${conflicts.join(', ')}`
        : '✅ Safe for you',
  };
}

/**
 * Check product against dietary restrictions
 */
export function checkDietaryRestrictions(product, dietary = []) {
  if (!product || !dietary.length) {
    return { compliant: true, violations: [] };
  }

  const violations = [];

  for (const requirement of dietary) {
    const normalizedReq = requirement.toLowerCase().trim();

    if (normalizedReq === 'vegetarian' && product.allergens?.includes('meat')) {
      violations.push('Not vegetarian');
    }
    if (normalizedReq === 'vegan' && (product.allergens?.includes('dairy') || product.allergens?.includes('eggs'))) {
      violations.push('Not vegan');
    }
    if (normalizedReq === 'gluten_free' && product.allergens?.includes('gluten')) {
      violations.push('Contains gluten');
    }
  }

  return { compliant: violations.length === 0, violations };
}

/**
 * Get alternative products (from menu)
 */
export function getProductAlternatives(product, currentBasket) {
  if (!currentBasket) {
    return [];
  }

  const category = product.category?.toLowerCase() || '';
  const alternatives = [];

  // Find items in same category
  for (const basketCategory in currentBasket) {
    for (const item of currentBasket[basketCategory]) {
      if (basketCategory.toLowerCase().includes(category)) {
        alternatives.push(item);
      }
    }
  }

  return alternatives.slice(0, 3); // Return top 3
}

/**
 * Normalize allergen names for comparison
 */
function normalizeAllergen(allergen) {
  return String(allergen || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Add scanned product to barcode history
 */
export function logScannedProduct(product, barcode) {
  try {
    const history = JSON.parse(localStorage.getItem('barcode_history') || '[]');
    history.unshift({
      product,
      barcode,
      timestamp: Date.now(),
    });
    // Keep last 50 scans
    localStorage.setItem('barcode_history', JSON.stringify(history.slice(0, 50)));
    return true;
  } catch (err) {
    console.error('🔍 [Barcode] Error logging product:', err);
    return false;
  }
}

/**
 * Get barcode scan history
 */
export function getScannedProductHistory() {
  try {
    return JSON.parse(localStorage.getItem('barcode_history') || '[]');
  } catch {
    return [];
  }
}
