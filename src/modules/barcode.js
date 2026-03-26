/**
 * Barcode Scanner Module
 * Scans product barcodes and provides allergen/menu validation
 */

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
let detectHandler = null;
let lastDetectedCode = '';
let lastDetectedAt = 0;

/**
 * Initialize barcode scanner
 * Uses Quagg JS library
 */
export async function initBarcodeScanner(videoElement) {
  if (isScanning && scannerInstance) {
    return true;
  }

  if (!videoElement || !window.Quagga) {
    console.error('🔍 [Barcode] Quagga not loaded or video element missing');
    return false;
  }

  try {
    const targetContainer = videoElement.parentElement || videoElement;
    return await new Promise((resolve) => {
      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            constraints: {
              width: { min: 640 },
              height: { min: 480 },
              facingMode: 'environment',
            },
            target: targetContainer,
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
            resolve(false);
            return;
          }

          Quagga.start();
          isScanning = true;
          scannerInstance = Quagga;
          console.log('🔍 [Barcode] Scanner started');
          resolve(true);
        }
      );
    });
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
      if (detectHandler) {
        Quagga.offDetected(detectHandler);
        detectHandler = null;
      }
      Quagga.stop();
      isScanning = false;
      scannerInstance = null;
      lastDetectedCode = '';
      lastDetectedAt = 0;
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

  if (detectHandler) {
    Quagga.offDetected(detectHandler);
  }

  detectHandler = async (result) => {
    const barcode = result.codeResult?.code;
    if (barcode) {
      const now = Date.now();
      if (barcode === lastDetectedCode && now - lastDetectedAt < 1500) {
        return;
      }

      lastDetectedCode = barcode;
      lastDetectedAt = now;
      console.log('🔍 [Barcode] Detected:', barcode);
      const product = await resolveBarcode(barcode);
      callback(product, barcode);
    }
  };

  Quagga.onDetected(detectHandler);
}

/**
 * Look up product by barcode
 * Returns product data or null if not found
 */
async function resolveBarcode(barcode) {
  // Check local database first
  if (BARCODE_DATABASE[barcode]) {
    return { ...BARCODE_DATABASE[barcode], code: barcode, barcode, source: 'local' };
  }

  const remoteProduct = await fetchOpenFoodFactsProduct(barcode);
  if (remoteProduct) {
    return remoteProduct;
  }

  console.log(`🔍 [Barcode] ${barcode} not found in local DB or OpenFoodFacts`);
  return {
    name: 'Unknown product',
    category: 'Unknown',
    allergens: [],
    code: barcode,
    barcode,
    source: 'unknown',
  };
}

async function fetchOpenFoodFactsProduct(barcode) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const product = data?.product;
    if (!product) {
      return null;
    }

    const name = product.product_name || product.product_name_en || product.brands || 'Unknown product';
    const category = (product.categories_tags && product.categories_tags[0]) || 'Unknown';
    const allergens = parseOpenFoodFactsAllergens(product);

    return {
      name,
      category,
      allergens,
      code: barcode,
      barcode,
      source: 'openfoodfacts',
    };
  } catch (error) {
    console.warn('🔍 [Barcode] OpenFoodFacts lookup failed:', error?.message || error);
    return null;
  }
}

function parseOpenFoodFactsAllergens(product) {
  const rawAllergens = Array.isArray(product.allergens_tags) ? product.allergens_tags : [];
  const extracted = rawAllergens
    .map((tag) => String(tag).split(':').pop())
    .filter(Boolean)
    .map((item) => String(item).toLowerCase());

  // Fallback: infer common allergens from ingredients text when tags are missing
  if (extracted.length > 0) {
    return extracted;
  }

  const ingredientsText = String(product.ingredients_text || '').toLowerCase();
  const inferred = [];
  if (ingredientsText.includes('milk')) {
    inferred.push('milk');
  }
  if (ingredientsText.includes('egg')) {
    inferred.push('eggs');
  }
  if (ingredientsText.includes('gluten') || ingredientsText.includes('wheat')) {
    inferred.push('gluten');
  }
  if (ingredientsText.includes('nut') || ingredientsText.includes('almond') || ingredientsText.includes('hazelnut')) {
    inferred.push('nuts');
  }

  return inferred;
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
  const productName = String(product.name || '').toLowerCase();
  const productAllergens = Array.isArray(product.allergens) ? product.allergens : [];

  for (const requirement of dietary) {
    const normalizedReq = requirement.toLowerCase().trim();

    if (normalizedReq === 'no_beef' && productName.includes('beef')) {
      violations.push('Contains beef');
    }
    if (normalizedReq === 'no_pork' && productName.includes('pork')) {
      violations.push('Contains pork');
    }
    if (normalizedReq === 'no_chicken' && productName.includes('chicken')) {
      violations.push('Contains chicken');
    }
    if (normalizedReq === 'no_seafood' && (productName.includes('fish') || productName.includes('seafood'))) {
      violations.push('Contains seafood');
    }
    if (normalizedReq === 'no_nuts' && productAllergens.includes('nuts')) {
      violations.push('Contains nuts');
    }
    if (normalizedReq === 'lactose_free' && (productAllergens.includes('milk') || productAllergens.includes('dairy'))) {
      violations.push('Contains lactose');
    }
    if (normalizedReq === 'gluten_free' && productAllergens.includes('gluten')) {
      violations.push('Contains gluten');
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    message: violations.join(', '),
  };
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
