// Sharing functionality

export function generateMenuShareText(menu, format = 'text') {
  if (format === 'markdown') {
    return generateMenuShareMarkdown(menu);
  }
  return generateMenuSharePlain(menu);
}

function generateMenuSharePlain(menu) {
  let text = 'Fresh Kitchen Weekly Menu\n';
  text += '='.repeat(40) + '\n\n';

  for (const day of menu.days) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    text += `${dayNames[day.day]}\n${'-'.repeat(20)}\n`;

    for (const meal of day.meals) {
      text += `• ${meal.type}: ${meal.strMeal}\n`;
    }
    text += '\n';
  }

  text += `\n⏱️ Generated in ${menu.generationTime}s\n`;
  return text;
}

function generateMenuShareMarkdown(menu) {
  let md = '# Fresh Kitchen Weekly Menu\n\n';

  for (const day of menu.days) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    md += `## ${dayNames[day.day]}\n\n`;

    for (const meal of day.meals) {
      md += `- **${meal.type}:** ${meal.strMeal}\n`;
    }
    md += '\n';
  }

  md += `_Generated in ${menu.generationTime}s_\n`;
  return md;
}

export function generateRecipeShareText(recipe, format = 'text') {
  if (format === 'markdown') {
    return generateRecipeShareMarkdown(recipe);
  }
  return generateRecipeSharePlain(recipe);
}

function generateRecipeSharePlain(recipe) {
  let text = `${recipe.strMeal}\n`;
  text += '='.repeat(40) + '\n\n';
  text += `Category: ${recipe.strCategory}\n`;
  text += `Area: ${recipe.strArea}\n`;
  text += `Prep Time: ~${recipe.metadata?.prepTime || 30} minutes\n\n`;

  text += 'INGREDIENTS:\n' + '-'.repeat(40) + '\n';
  if (recipe.ingredients) {
    for (const ing of recipe.ingredients) {
      text += `• ${ing.name} ${ing.measure}\n`;
    }
  }

  text += '\nINSTRUCTIONS:\n' + '-'.repeat(40) + '\n';
  text += recipe.strInstructions || 'N/A';
  text += '\n';

  return text;
}

function generateRecipeShareMarkdown(recipe) {
  let md = `# ${recipe.strMeal}\n\n`;
  md += `**${recipe.strCategory}** | ${recipe.strArea}\n\n`;
  md += `⏱️ ~${recipe.metadata?.prepTime || 30} minutes\n\n`;

  md += '## Ingredients\n\n';
  if (recipe.ingredients) {
    for (const ing of recipe.ingredients) {
      md += `- ${ing.name} ${ing.measure}\n`;
    }
  }

  md += '\n## Instructions\n\n';
  md += recipe.strInstructions || 'N/A';
  md += '\n';

  return md;
}

export function generateBasketShareText(basket) {
  let text = 'Shopping List\n';
  text += '='.repeat(40) + '\n\n';

  for (const category in basket) {
    text += `${category}\n${'-'.repeat(category.length)}\n`;
    for (const ingredient of basket[category]) {
      const measures = ingredient.measures.length > 0 ? ` (${ingredient.measures.join(', ')})` : '';
      text += `☐ ${ingredient.name}${measures}\n`;
    }
    text += '\n';
  }

  return text;
}

export function generateShareUrl(type, data, baseUrl = window.location.origin) {
  // Generate a shareable URL with encoded data
  const params = new URLSearchParams();
  params.append('type', type);
  params.append('data', btoa(JSON.stringify(data)));
  return `${baseUrl}?share=${params}`;
}

export function shareToWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/?text=${encoded}`;
}

export function shareToFacebook(url) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function shareToTwitter(text, url) {
  const encoded = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encoded}&url=${encodeURIComponent(url)}`;
}

export function shareToX(text, url) {
  // X.com (formerly Twitter) uses same API
  return shareToTwitter(text, url);
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

export function generateSocialMediaText(type, data) {
  const hashtags = ' 🍽️ #FreshKitchen #MealPlanning #RecipeShare';

  if (type === 'menu') {
    return `Just planned my weekly menu! 📅 ${hashtags}`;
  }

  if (type === 'recipe') {
    return `Found an amazing recipe for ${data.strMeal}! 👨‍🍳 ${hashtags}`;
  }

  if (type === 'basket') {
    return `My shopping list is ready! 🛒 ${hashtags}`;
  }

  return `Check out Fresh Kitchen! 🎉 ${hashtags}`;
}
