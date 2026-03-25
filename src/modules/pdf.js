// PDF export functionality using pdf-lib
import { PDFDocument, rgb } from 'pdf-lib';

const Colors = {
  primary: rgb(0.424, 0.388, 1.0), // #6C63FF
  secondary: rgb(0.655, 0.545, 0.98), // #A78BFA
  accent: rgb(0.957, 0.447, 0.714), // #F472B6
  dark: rgb(0.118, 0.161, 0.231), // #1E293B
  light: rgb(0.941, 0.957, 1.0), // #F0F4FF
};

// Export weekly menu to PDF
export async function exportMenuToPDF(menu, preferences = {}, lang = 'en') {
  const labels = getPdfLabels(lang);
  const pdfDoc = await PDFDocument.create();

  // Create pages (one per week or 2-3 per week)
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  // Header
  drawHeader(page, width, labels.weeklyMenuPlan, Colors.primary);

  // Menu content
  let yPosition = height - 100;

  // Add preferences info
  yPosition = drawPreferencesPanel(page, yPosition, preferences, labels, 50);

  // Add days
  const dayNames = labels.days;
  let currentPage = page;
  for (let i = 0; i < menu.days.length; i++) {
    if (yPosition < 100) {
      // New page needed
      currentPage = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
      drawHeader(currentPage, width, `${labels.weeklyMenuShort} - ${dayNames[i]}`, Colors.primary);
      yPosition -= 40;
    }

    const day = menu.days[i];
    yPosition = drawDayMeals(
      currentPage,
      yPosition,
      dayNames[i],
      day,
      labels,
      50
    );
  }

  // Save and return
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Export shopping basket to PDF
export async function exportBasketToPDF(basket, stats = {}, lang = 'en') {
  const labels = getPdfLabels(lang);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let currentPage = page;

  // Header
  drawHeader(page, width, labels.shoppingList, Colors.primary);

  let yPosition = height - 100;

  // Stats
  if (stats.totalItems) {
    currentPage.drawText(
      sanitizePdfText(
        `${labels.totalItems}: ${stats.totalItems} | ${labels.checkedItems}: ${stats.checkedItems}`
      ),
      {
        x: 50,
        y: yPosition,
        size: 12,
        color: Colors.dark,
      }
    );
    yPosition -= 30;
  }

  // Categories
  for (const [category, ingredients] of Object.entries(basket)) {
    yPosition = drawBasketCategory(currentPage, yPosition, category, ingredients);

    if (yPosition < 100) {
      currentPage = pdfDoc.addPage([595, 842]);
      drawHeader(currentPage, width, labels.shoppingList, Colors.primary);
      yPosition = height - 50;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Export recipe to PDF
export async function exportRecipeToPDF(recipe, lang = 'en') {
  const labels = getPdfLabels(lang);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  let currentPage = page;

  // Header
  drawHeader(currentPage, width, sanitizePdfText(recipe.strMeal), Colors.primary);

  let yPosition = height - 100;

  // Meta information
  const metaText = `${recipe.strCategory} - ${recipe.strArea} - ${recipe.prepTime || 30} ${labels.minuteShort}`;
  currentPage.drawText(sanitizePdfText(metaText), {
    x: 50,
    y: yPosition,
    size: 11,
    color: Colors.secondary,
  });
  yPosition -= 25;

  // Ingredients section
  yPosition -= 10;
  currentPage.drawText(labels.ingredients, {
    x: 50,
    y: yPosition,
    size: 13,
    color: Colors.primary,
  });
  yPosition -= 5;
  currentPage.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    color: Colors.secondary,
  });
  yPosition -= 15;

  // Ingredient list
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    for (const ing of recipe.ingredients) {
      const ingText = `- ${ing.name} ${ing.measure || ''}`;
      const wrapped = wrapText(ingText, 65);

      for (const line of wrapped) {
        currentPage.drawText(sanitizePdfText(line), {
          x: 60,
          y: yPosition,
          size: 10,
          color: Colors.dark,
        });
        yPosition -= 15;

        if (yPosition < 80) {
          currentPage = pdfDoc.addPage([595, 842]);
          drawHeader(currentPage, width, sanitizePdfText(recipe.strMeal), Colors.primary);
          yPosition = height - 50;
        }
      }
    }
  }

  // Instructions section
  yPosition -= 10;
  currentPage.drawText(labels.instructions, {
    x: 50,
    y: yPosition,
    size: 13,
    color: Colors.primary,
  });
  yPosition -= 5;
  currentPage.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    color: Colors.secondary,
  });
  yPosition -= 15;

  // Instructions text
  const instructionText = lang === 'bg' ? recipe.strInstructionsTranslated || recipe.strInstructions || '' : recipe.strInstructions || '';
  if (instructionText) {
    const instructions = instructionText.split('. ').filter((s) => s.trim());
    for (let i = 0; i < instructions.length; i++) {
      const stepText = `${i + 1}. ${instructions[i]}.`;
      const wrapped = wrapText(stepText, 70);

      for (const line of wrapped) {
        currentPage.drawText(sanitizePdfText(line), {
          x: 60,
          y: yPosition,
          size: 10,
          color: Colors.dark,
        });
        yPosition -= 15;

        if (yPosition < 80) {
          currentPage = pdfDoc.addPage([595, 842]);
          drawHeader(currentPage, width, sanitizePdfText(recipe.strMeal), Colors.primary);
          yPosition = height - 50;
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// Helper function to draw header
function drawHeader(page, width, title, color) {
  const { height } = page.getSize();

  // Background rectangle
  page.drawRectangle({
    x: 0,
    y: height - 60,
    width: width,
    height: 60,
    color: color,
  });

  // Title
  page.drawText('Fresh Kitchen', {
    x: 50,
    y: height - 25,
    size: 24,
    color: rgb(1, 1, 1),
  });

  // Page title
  page.drawText(sanitizePdfText(title), {
    x: 50,
    y: height - 50,
    size: 16,
    color: rgb(1, 1, 1),
  });
}

// Helper function to draw preferences panel
function drawPreferencesPanel(page, yPosition, preferences, labels, _width) {
  const cuisineMap = {
    mix: labels.cuisineMix,
    Vegetarian: labels.cuisineVegetarian,
    Vegan: labels.cuisineVegan,
    GlutenFree: labels.cuisineGlutenFree,
  };

  const prefTexts = [
    `${labels.people}: ${preferences.people || 4}`,
    `${labels.variety}: ${preferences.variety || 'medium'}`,
    `${labels.cuisine}: ${cuisineMap[preferences.cuisine] || preferences.cuisine || labels.cuisineMix}`,
  ];

  for (const text of prefTexts) {
    page.drawText(sanitizePdfText(text), {
      x: 50,
      y: yPosition,
      size: 10,
      color: Colors.dark,
    });
    yPosition -= 15;
  }

  yPosition -= 10;
  return yPosition;
}

// Helper function to draw day meals
function drawDayMeals(page, yPosition, dayName, day, labels, _pageWidth) {
  // Day header
  page.drawText(sanitizePdfText(dayName.toUpperCase()), {
    x: 50,
    y: yPosition,
    size: 12,
    color: Colors.primary,
  });
  yPosition -= 20;

  // Meals
  const mealTypeMap = {
    Breakfast: labels.breakfast,
    Lunch: labels.lunch,
    Dinner: labels.dinner,
  };

  for (const meal of day.meals) {
    const mealText = `${mealTypeMap[meal.type] || meal.type}: ${meal.strMeal}`;
    page.drawText(sanitizePdfText(mealText), {
      x: 60,
      y: yPosition,
      size: 10,
      color: Colors.dark,
    });
    yPosition -= 15;
  }

  yPosition -= 10;
  return yPosition;
}

// Helper function to draw basket category
function drawBasketCategory(page, yPosition, category, ingredients) {
  // Category header
  page.drawText(sanitizePdfText(category), {
    x: 50,
    y: yPosition,
    size: 12,
    color: Colors.primary,
  });
  yPosition -= 20;

  // Ingredients
  for (const ing of ingredients) {
    const ingText = `- ${ing.name}${ing.measures?.length > 0 ? ` (${ing.measures.join(', ')})` : ''}`;
    page.drawText(sanitizePdfText(ingText), {
      x: 60,
      y: yPosition,
      size: 10,
      color: Colors.dark,
    });
    yPosition -= 15;
  }

  yPosition -= 10;
  return yPosition;
}

// Helper function to wrap text
function wrapText(text, maxCharsPerLine) {
  if (text.length <= maxCharsPerLine) {
    return [text];
  }

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function sanitizePdfText(text) {
  if (!text) {
    return '';
  }

  return String(text)
    .replace(/[•☐🔥📅📋📄📂🌍⏱️⚠️👥]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/–|—/g, '-')
    .replace(/№/g, 'No.')
    .replace(/[^ -]/g, '');
}

function getPdfLabels(lang = 'en') {
  if (lang === 'bg') {
    return {
      weeklyMenuPlan: 'Sedmichno menu',
      weeklyMenuShort: 'Sedmichno menu',
      shoppingList: 'Spisak za pazaruvane',
      totalItems: 'Obshto produkti',
      checkedItems: 'Otmetnati',
      ingredients: 'Sastavki',
      instructions: 'Nachin na prigotvyane',
      minuteShort: 'min',
      people: 'Hora',
      variety: 'Raznoobrazie',
      cuisine: 'Kuhnya',
      cuisineMix: 'Internatsionalna',
      cuisineVegetarian: 'Vegetarianska',
      cuisineVegan: 'Vegan',
      cuisineGlutenFree: 'Bezglutenova',
      breakfast: 'Zakuska',
      lunch: 'Obyad',
      dinner: 'Vecherya',
      days: ['Ponedelnik', 'Vtornik', 'Syada', 'Chetvurtuk', 'Petuk', 'Subota', 'Nedelya'],
    };
  }

  return {
    weeklyMenuPlan: 'Weekly Menu Plan',
    weeklyMenuShort: 'Weekly Menu',
    shoppingList: 'Shopping List',
    totalItems: 'Total Items',
    checkedItems: 'Checked',
    ingredients: 'INGREDIENTS',
    instructions: 'INSTRUCTIONS',
    minuteShort: 'min',
    people: 'People',
    variety: 'Variety',
    cuisine: 'Cuisine',
    cuisineMix: 'International (Mix)',
    cuisineVegetarian: 'Vegetarian',
    cuisineVegan: 'Vegan',
    cuisineGlutenFree: 'Gluten-free',
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  };
}

// Download blob as file
export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate filename with timestamp
export function generatePDFFilename(type = 'menu') {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `fresh-kitchen-${type}-${date}-${time}.pdf`;
}
