const cuisineEl = document.getElementById("cuisine");
const prepTimeEl = document.getElementById("prepTime");
const generateBtn = document.getElementById("generate");
const resetBtn = document.getElementById("reset");
const menuContainer = document.getElementById("menuContainer");
const basketContainer = document.getElementById("basketContainer");
const errorBox = document.getElementById("error");
const statusEl = document.getElementById("status");
const langToggle = document.getElementById("langToggle");

// ── i18n ──
let currentLang = "en";

const translations = {
  en: {
    tagline: "Plan your weekly meals with ease",
    tabMenu: "Weekly Menu",
    tabBasket: "Shopping Basket",
    preferences: "Preferences",
    labelPeople: "Number of people",
    labelVariety: "Variety",
    varietyLow: "Low",
    varietyMedium: "Medium",
    varietyHigh: "High",
    labelCuisine: "Cuisine",
    labelPrepTime: "Prep time",
    prepTimeAny: "Any duration",
    prepTimeQuick: "Quick (up to 25 min)",
    prepTimeMedium: "Medium (up to 45 min)",
    prepTimeLong: "Long (45+ min)",
    cuisineMix: "Mix of all cuisines",
    cuisineVegetarian: "Vegetarian",
    cuisineVegan: "Vegan",
    cuisineGlutenfree: "Gluten-free",
    cuisineItalian: "Italian",
    labelNotes: "Additional notes",
    placeholderNotes: "Any dietary preferences or notes...",
    btnReset: "Reset",
    btnGenerate: "Generate Menu",
    statusReady: "Ready to generate.",
    statusGenerating: (s) => `Argurios is generating the menu\u2026 (${s}s)`,
    statusDone: (s) => `Argurios generated the menu in ${s}s.`,
    statusError: "An error occurred while generating.",
    errorPrefix: "Error: ",
    errorFetch: "Failed to fetch from TheMealDB",
    errorNoMeals: "No meals found!",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    recipe: "Recipe",
    recipeTitle: "Recipe",
    recipeLoading: "Loading recipe...",
    recipeError: "Could not load recipe.",
    recipeIngredients: "Ingredients",
    recipeInstructions: "Instructions",
    categories: {
      "Meat & Poultry": "Meat & Poultry",
      "Fish & Seafood": "Fish & Seafood",
      "Dairy & Eggs": "Dairy & Eggs",
      "Vegetables": "Vegetables",
      "Fruits": "Fruits",
      "Grains & Pasta": "Grains & Pasta",
      "Spices & Herbs": "Spices & Herbs",
      "Oils & Sauces": "Oils & Sauces",
      "Other": "Other"
    },
    langBtn: "\ud83c\udde7\ud83c\uddec",
    langTitle: "Switch to Bulgarian",
    recipeNote: "",
    translating: "",    tabFavorites: "Favorites",
    favEmpty: "No favorites yet. Add menus, recipes or products!",
    favMenus: "Saved Menus",
    favRecipes: "Saved Recipes",
    favProducts: "Saved Products",
    share: "Share full menu",
    shareRecipe: "Share",
    copyLink: "Copy link",
    linkCopied: "Link copied!",
    addedToFav: "Added to favorites!",
    removedFromFav: "Removed from favorites",
    shareVia: "Share via",
    menuSaved: "Menu saved to favorites!",
    menuGenerated: "Menu generated successfully!",    // Ingredient translations (en→en is identity)
    ingredients: {}
  },
  bg: {
    tagline: "\u041f\u043b\u0430\u043d\u0438\u0440\u0430\u0439 \u0441\u0435\u0434\u043c\u0438\u0447\u043d\u043e\u0442\u043e \u0441\u0438 \u043c\u0435\u043d\u044e \u043b\u0435\u0441\u043d\u043e",
    tabMenu: "\u0421\u0435\u0434\u043c\u0438\u0447\u043d\u043e \u043c\u0435\u043d\u044e",
    tabBasket: "\u041a\u043e\u0448\u043d\u0438\u0446\u0430 \u0437\u0430 \u043f\u0430\u0437\u0430\u0440\u0443\u0432\u0430\u043d\u0435",
    preferences: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438",
    labelPeople: "\u0411\u0440\u043e\u0439 \u0445\u043e\u0440\u0430",
    labelVariety: "\u0420\u0430\u0437\u043d\u043e\u043e\u0431\u0440\u0430\u0437\u0438\u0435",
    varietyLow: "\u041d\u0438\u0441\u043a\u043e",
    varietyMedium: "\u0421\u0440\u0435\u0434\u043d\u043e",
    varietyHigh: "\u0412\u0438\u0441\u043e\u043a\u043e",
    labelCuisine: "\u041a\u0443\u0445\u043d\u044f",
    labelPrepTime: "\u0412\u0440\u0435\u043c\u0435 \u0437\u0430 \u043f\u0440\u0438\u0433\u043e\u0442\u0432\u044f\u043d\u0435",
    prepTimeAny: "\u0411\u0435\u0437 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0435",
    prepTimeQuick: "\u0411\u044a\u0440\u0437\u043e (\u0434\u043e 25 \u043c\u0438\u043d)",
    prepTimeMedium: "\u0421\u0440\u0435\u0434\u043d\u043e (\u0434\u043e 45 \u043c\u0438\u043d)",
    prepTimeLong: "\u0414\u044a\u043b\u0433\u043e (\u043d\u0430\u0434 45 \u043c\u0438\u043d)",
    cuisineMix: "\u041c\u0438\u043a\u0441 \u043e\u0442 \u0432\u0441\u0438\u0447\u043a\u0438 \u043a\u0443\u0445\u043d\u0438",
    cuisineVegetarian: "\u0412\u0435\u0433\u0435\u0442\u0430\u0440\u0438\u0430\u043d\u0441\u043a\u0430",
    cuisineVegan: "\u0412\u0435\u0433\u0430\u043d",
    cuisineGlutenfree: "\u0411\u0435\u0437\u0433\u043b\u0443\u0442\u0435\u043d\u043e\u0432\u0430",
    cuisineItalian: "\u0418\u0442\u0430\u043b\u0438\u0430\u043d\u0441\u043a\u0430",
    labelNotes: "\u0414\u043e\u043f\u044a\u043b\u043d\u0438\u0442\u0435\u043b\u043d\u0438 \u0431\u0435\u043b\u0435\u0436\u043a\u0438",
    placeholderNotes: "\u0414\u0438\u0435\u0442\u0438\u0447\u043d\u0438 \u043f\u0440\u0435\u0434\u043f\u043e\u0447\u0438\u0442\u0430\u043d\u0438\u044f \u0438\u043b\u0438 \u0437\u0430\u0431\u0435\u043b\u0435\u0436\u043a\u0438...",
    btnReset: "\u0418\u0437\u0447\u0438\u0441\u0442\u0438",
    btnGenerate: "\u0413\u0435\u043d\u0435\u0440\u0438\u0440\u0430\u0439 \u043c\u0435\u043d\u044e",
    statusReady: "\u0413\u043e\u0442\u043e\u0432\u043e \u0437\u0430 \u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0430\u043d\u0435.",
    statusGenerating: (s) => `Argurios \u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0430 \u043c\u0435\u043d\u044e\u0442\u043e\u2026 (${s}s)`,
    statusDone: (s) => `Argurios \u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0430 \u043c\u0435\u043d\u044e\u0442\u043e \u0437\u0430 ${s}s.`,
    statusError: "\u0412\u044a\u0437\u043d\u0438\u043a\u043d\u0430 \u0433\u0440\u0435\u0448\u043a\u0430 \u043f\u0440\u0438 \u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0430\u043d\u0435\u0442\u043e.",
    errorPrefix: "\u0413\u0440\u0435\u0448\u043a\u0430: ",
    errorFetch: "\u041d\u0435\u0443\u0441\u043f\u0435\u0448\u043d\u0430 \u0437\u0430\u044f\u0432\u043a\u0430 \u043a\u044a\u043c TheMealDB",
    errorNoMeals: "\u041d\u044f\u043c\u0430 \u043d\u0430\u043c\u0435\u0440\u0435\u043d\u0438 \u044f\u0441\u0442\u0438\u044f!",
    days: ["\u041f\u043e\u043d\u0435\u0434\u0435\u043b\u043d\u0438\u043a", "\u0412\u0442\u043e\u0440\u043d\u0438\u043a", "\u0421\u0440\u044f\u0434\u0430", "\u0427\u0435\u0442\u0432\u044a\u0440\u0442\u044a\u043a", "\u041f\u0435\u0442\u044a\u043a", "\u0421\u044a\u0431\u043e\u0442\u0430", "\u041d\u0435\u0434\u0435\u043b\u044f"],
    mealTypes: ["\u0417\u0430\u043a\u0443\u0441\u043a\u0430", "\u041e\u0431\u044f\u0434", "\u0412\u0435\u0447\u0435\u0440\u044f"],
    recipe: "\u0420\u0435\u0446\u0435\u043f\u0442\u0430",
    recipeTitle: "\u0420\u0435\u0446\u0435\u043f\u0442\u0430",
    recipeLoading: "\u0417\u0430\u0440\u0435\u0436\u0434\u0430\u043d\u0435 \u043d\u0430 \u0440\u0435\u0446\u0435\u043f\u0442\u0430\u0442\u0430...",
    recipeError: "\u041d\u0435 \u043c\u043e\u0436\u0430 \u0434\u0430 \u0441\u0435 \u0437\u0430\u0440\u0435\u0434\u0438 \u0440\u0435\u0446\u0435\u043f\u0442\u0430\u0442\u0430.",
    recipeIngredients: "\u0421\u044a\u0441\u0442\u0430\u0432\u043a\u0438",
    recipeInstructions: "\u041d\u0430\u0447\u0438\u043d \u043d\u0430 \u043f\u0440\u0438\u0433\u043e\u0442\u0432\u044f\u043d\u0435",
    categories: {
      "Meat & Poultry": "\u041c\u0435\u0441\u043e \u0438 \u043f\u0442\u0438\u0446\u0438",
      "Fish & Seafood": "\u0420\u0438\u0431\u0430 \u0438 \u043c\u043e\u0440\u0441\u043a\u0438 \u0434\u0430\u0440\u043e\u0432\u0435",
      "Dairy & Eggs": "\u041c\u043b\u0435\u0447\u043d\u0438 \u0438 \u044f\u0439\u0446\u0430",
      "Vegetables": "\u0417\u0435\u043b\u0435\u043d\u0447\u0443\u0446\u0438",
      "Fruits": "\u041f\u043b\u043e\u0434\u043e\u0432\u0435",
      "Grains & Pasta": "\u0417\u044a\u0440\u043d\u0435\u043d\u0438 \u0438 \u043f\u0430\u0441\u0442\u0430",
      "Spices & Herbs": "\u041f\u043e\u0434\u043f\u0440\u0430\u0432\u043a\u0438 \u0438 \u0431\u0438\u043b\u043a\u0438",
      "Oils & Sauces": "\u041c\u0430\u0441\u043b\u0430 \u0438 \u0441\u043e\u0441\u043e\u0432\u0435",
      "Other": "\u0414\u0440\u0443\u0433\u0438"
    },
    langBtn: "\ud83c\uddec\ud83c\udde7",
    langTitle: "\u041f\u0440\u0435\u0432\u043a\u043b\u044e\u0447\u0438 \u043d\u0430 \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438",
    recipeNote: "\u0417\u0430\u0431\u0435\u043b\u0435\u0436\u043a\u0430: \u0420\u0435\u0446\u0435\u043f\u0442\u0430\u0442\u0430 \u0435 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e \u043f\u0440\u0435\u0432\u0435\u0434\u0435\u043d\u0430. \u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u044a\u0442 \u0435 \u043d\u0430 \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438.",
    translating: "\u041f\u0440\u0435\u0432\u0435\u0436\u0434\u0430 \u0441\u0435...",
    tabFavorites: "\u041b\u044e\u0431\u0438\u043c\u0438",
    favEmpty: "\u041d\u044f\u043c\u0430 \u043b\u044e\u0431\u0438\u043c\u0438 \u0432\u0441\u0435 \u043e\u0449\u0435. \u0414\u043e\u0431\u0430\u0432\u0435\u0442\u0435 \u043c\u0435\u043d\u044e\u0442\u0430, \u0440\u0435\u0446\u0435\u043f\u0442\u0438 \u0438\u043b\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438!",
    favMenus: "\u0417\u0430\u043f\u0430\u0437\u0435\u043d\u0438 \u043c\u0435\u043d\u044e\u0442\u0430",
    favRecipes: "\u0417\u0430\u043f\u0430\u0437\u0435\u043d\u0438 \u0440\u0435\u0446\u0435\u043f\u0442\u0438",
    favProducts: "\u0417\u0430\u043f\u0430\u0437\u0435\u043d\u0438 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438",
    share: "\u0421\u043f\u043e\u0434\u0435\u043b\u0438 \u0446\u044f\u043b\u043e \u043c\u0435\u043d\u044e",
    shareRecipe: "\u0421\u043f\u043e\u0434\u0435\u043b\u0438",
    copyLink: "\u041a\u043e\u043f\u0438\u0440\u0430\u0439 \u043b\u0438\u043d\u043a",
    linkCopied: "\u041b\u0438\u043d\u043a\u044a\u0442 \u0435 \u043a\u043e\u043f\u0438\u0440\u0430\u043d!",
    addedToFav: "\u0414\u043e\u0431\u0430\u0432\u0435\u043d\u043e \u0432 \u043b\u044e\u0431\u0438\u043c\u0438!",
    removedFromFav: "\u041f\u0440\u0435\u043c\u0430\u0445\u043d\u0430\u0442\u043e \u043e\u0442 \u043b\u044e\u0431\u0438\u043c\u0438",
    shareVia: "\u0421\u043f\u043e\u0434\u0435\u043b\u0438 \u0447\u0440\u0435\u0437",
    menuSaved: "\u041c\u0435\u043d\u044e\u0442\u043e \u0435 \u0437\u0430\u043f\u0430\u0437\u0435\u043d\u043e!",
    menuGenerated: "\u041c\u0435\u043d\u044e\u0442\u043e \u0435 \u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0430\u043d\u043e \u0443\u0441\u043f\u0435\u0448\u043d\u043e!",
    ingredients: {
      "chicken": "\u043f\u0438\u043b\u0435\u0448\u043a\u043e", "beef": "\u0433\u043e\u0432\u0435\u0436\u0434\u043e", "pork": "\u0441\u0432\u0438\u043d\u0441\u043a\u043e", "lamb": "\u0430\u0433\u043d\u0435\u0448\u043a\u043e", "turkey": "\u043f\u0443\u0439\u043a\u0430",
      "duck": "\u043f\u0430\u0442\u0438\u0446\u0430", "bacon": "\u0431\u0435\u043a\u043e\u043d", "sausage": "\u043a\u043e\u043b\u0431\u0430\u0441", "ham": "\u0448\u0443\u043d\u043a\u0430", "steak": "\u0441\u0442\u0435\u043a",
      "salmon": "\u0441\u044c\u043e\u043c\u0433\u0430", "tuna": "\u0442\u043e\u043d", "cod": "\u0442\u0440\u0435\u0441\u043a\u0430", "shrimp": "\u0441\u043a\u0430\u0440\u0438\u0434\u0438", "prawn": "\u0441\u043a\u0430\u0440\u0438\u0434\u0438",
      "fish": "\u0440\u0438\u0431\u0430", "crab": "\u0440\u0430\u043a", "lobster": "\u043e\u043c\u0430\u0440", "squid": "\u043a\u0430\u043b\u043c\u0430\u0440\u0438",
      "milk": "\u043c\u043b\u044f\u043a\u043e", "cheese": "\u0441\u0438\u0440\u0435\u043d\u0435", "butter": "\u043c\u0430\u0441\u043b\u043e", "cream": "\u0441\u043c\u0435\u0442\u0430\u043d\u0430",
      "yogurt": "\u043a\u0438\u0441\u0435\u043b\u043e \u043c\u043b\u044f\u043a\u043e", "yoghurt": "\u043a\u0438\u0441\u0435\u043b\u043e \u043c\u043b\u044f\u043a\u043e", "egg": "\u044f\u0439\u0446\u0435", "eggs": "\u044f\u0439\u0446\u0430",
      "mozzarella": "\u043c\u043e\u0446\u0430\u0440\u0435\u043b\u0430", "parmesan": "\u043f\u0430\u0440\u043c\u0435\u0437\u0430\u043d", "parmesan cheese": "\u043f\u0430\u0440\u043c\u0435\u0437\u0430\u043d",
      "cheddar": "\u0447\u0435\u0434\u044a\u0440", "ricotta": "\u0440\u0438\u043a\u043e\u0442\u0430", "feta": "\u0444\u0435\u0442\u0430", "mascarpone": "\u043c\u0430\u0441\u043a\u0430\u0440\u043f\u043e\u043d\u0435",
      "sour cream": "\u043a\u0438\u0441\u0435\u043b\u0430 \u0441\u043c\u0435\u0442\u0430\u043d\u0430", "creme fraiche": "\u043a\u0440\u0435\u043c \u0444\u0440\u0435\u0448",
      "onion": "\u043b\u0443\u043a", "onions": "\u043b\u0443\u043a", "garlic": "\u0447\u0435\u0441\u044a\u043d", "garlic clove": "\u0441\u043a\u0438\u043b\u0438\u0434\u043a\u0430 \u0447\u0435\u0441\u044a\u043d",
      "garlic cloves": "\u0441\u043a\u0438\u043b\u0438\u0434\u043a\u0438 \u0447\u0435\u0441\u044a\u043d",
      "tomato": "\u0434\u043e\u043c\u0430\u0442", "tomatoes": "\u0434\u043e\u043c\u0430\u0442\u0438", "chopped tomatoes": "\u043d\u0430\u0440\u044f\u0437\u0430\u043d\u0438 \u0434\u043e\u043c\u0430\u0442\u0438",
      "potato": "\u043a\u0430\u0440\u0442\u043e\u0444", "potatoes": "\u043a\u0430\u0440\u0442\u043e\u0444\u0438", "carrot": "\u043c\u043e\u0440\u043a\u043e\u0432", "carrots": "\u043c\u043e\u0440\u043a\u043e\u0432\u0438",
      "pepper": "\u043f\u0438\u043f\u0435\u0440", "red pepper": "\u0447\u0435\u0440\u0432\u0435\u043d \u043f\u0438\u043f\u0435\u0440", "green pepper": "\u0437\u0435\u043b\u0435\u043d \u043f\u0438\u043f\u0435\u0440",
      "celery": "\u0446\u0435\u043b\u0438\u043d\u0430", "spinach": "\u0441\u043f\u0430\u043d\u0430\u043a", "broccoli": "\u0431\u0440\u043e\u043a\u043e\u043b\u0438",
      "zucchini": "\u0442\u0438\u043a\u0432\u0438\u0447\u043a\u0430", "courgette": "\u0442\u0438\u043a\u0432\u0438\u0447\u043a\u0430", "eggplant": "\u043f\u0430\u0442\u043b\u0430\u0434\u0436\u0430\u043d", "aubergine": "\u043f\u0430\u0442\u043b\u0430\u0434\u0436\u0430\u043d",
      "mushroom": "\u0433\u044a\u0431\u0438", "mushrooms": "\u0433\u044a\u0431\u0438", "lettuce": "\u043c\u0430\u0440\u0443\u043b\u044f", "cucumber": "\u043a\u0440\u0430\u0441\u0442\u0430\u0432\u0438\u0446\u0430",
      "cabbage": "\u0437\u0435\u043b\u0435", "kale": "\u043a\u0435\u0439\u043b", "peas": "\u0433\u0440\u0430\u0445", "corn": "\u0446\u0430\u0440\u0435\u0432\u0438\u0446\u0430",
      "asparagus": "\u0430\u0441\u043f\u0435\u0440\u0436\u0438", "leek": "\u043f\u0440\u0430\u0437", "beetroot": "\u0446\u0432\u0435\u043a\u043b\u043e", "pumpkin": "\u0442\u0438\u043a\u0432\u0430",
      "spring onion": "\u043f\u0440\u044f\u0441\u043d\u043e \u043b\u0443\u0447\u0435", "spring onions": "\u043f\u0440\u044f\u0441\u043d\u043e \u043b\u0443\u0447\u0435",
      "green beans": "\u0437\u0435\u043b\u0435\u043d \u0444\u0430\u0441\u0443\u043b", "chilli": "\u043b\u044e\u0442\u0430 \u0447\u0443\u0448\u043a\u0430",
      "apple": "\u044f\u0431\u044a\u043b\u043a\u0430", "banana": "\u0431\u0430\u043d\u0430\u043d", "lemon": "\u043b\u0438\u043c\u043e\u043d", "lemon juice": "\u043b\u0438\u043c\u043e\u043d\u043e\u0432 \u0441\u043e\u043a",
      "lime": "\u043b\u0430\u0439\u043c", "lime juice": "\u0441\u043e\u043a \u043e\u0442 \u043b\u0430\u0439\u043c", "orange": "\u043f\u043e\u0440\u0442\u043e\u043a\u0430\u043b",
      "mango": "\u043c\u0430\u043d\u0433\u043e", "pineapple": "\u0430\u043d\u0430\u043d\u0430\u0441", "coconut": "\u043a\u043e\u043a\u043e\u0441", "coconut milk": "\u043a\u043e\u043a\u043e\u0441\u043e\u0432\u043e \u043c\u043b\u044f\u043a\u043e",
      "avocado": "\u0430\u0432\u043e\u043a\u0430\u0434\u043e", "raisins": "\u0441\u0442\u0430\u0444\u0438\u0434\u0438",
      "flour": "\u0431\u0440\u0430\u0448\u043d\u043e", "plain flour": "\u0431\u044f\u043b\u043e \u0431\u0440\u0430\u0448\u043d\u043e", "self-raising flour": "\u0441\u0430\u043c\u043e\u043d\u0430\u0431\u0443\u0445\u0432\u0430\u0449\u043e \u0431\u0440\u0430\u0448\u043d\u043e",
      "rice": "\u043e\u0440\u0438\u0437", "pasta": "\u043f\u0430\u0441\u0442\u0430", "bread": "\u0445\u043b\u044f\u0431",
      "spaghetti": "\u0441\u043f\u0430\u0433\u0435\u0442\u0438", "penne": "\u043f\u0435\u043d\u0435", "noodles": "\u043d\u0443\u0434\u044a\u043b\u0441",
      "oats": "\u043e\u0432\u0435\u0441\u0435\u043d\u0438 \u044f\u0434\u043a\u0438", "tortilla": "\u0442\u043e\u0440\u0442\u0438\u043b\u0430", "lasagne sheets": "\u043b\u0430\u0437\u0430\u043d\u044f",
      "breadcrumbs": "\u0433\u0430\u043b\u0435\u0442\u0430",
      "salt": "\u0441\u043e\u043b", "salt and pepper": "\u0441\u043e\u043b \u0438 \u0447\u0435\u0440\u0435\u043d \u043f\u0438\u043f\u0435\u0440",
      "pepper": "\u0447\u0435\u0440\u0435\u043d \u043f\u0438\u043f\u0435\u0440", "black pepper": "\u0447\u0435\u0440\u0435\u043d \u043f\u0438\u043f\u0435\u0440",
      "cumin": "\u043a\u0438\u043c\u0438\u043e\u043d", "paprika": "\u0447\u0435\u0440\u0432\u0435\u043d \u043f\u0438\u043f\u0435\u0440", "cinnamon": "\u043a\u0430\u043d\u0435\u043b\u0430",
      "oregano": "\u0440\u0438\u0433\u0430\u043d", "basil": "\u0431\u043e\u0441\u0438\u043b\u0435\u043a", "fresh basil": "\u043f\u0440\u0435\u0441\u0435\u043d \u0431\u043e\u0441\u0438\u043b\u0435\u043a",
      "thyme": "\u043c\u0430\u0449\u0435\u0440\u043a\u0430", "rosemary": "\u0440\u043e\u0437\u043c\u0430\u0440\u0438\u043d", "parsley": "\u043c\u0430\u0433\u0434\u0430\u043d\u043e\u0437",
      "coriander": "\u043a\u043e\u0440\u0438\u0430\u043d\u0434\u044a\u0440", "turmeric": "\u043a\u0443\u0440\u043a\u0443\u043c\u0430", "ginger": "\u0434\u0436\u0438\u043d\u0434\u0436\u0438\u0444\u0438\u043b",
      "nutmeg": "\u0438\u043d\u0434\u0438\u0439\u0441\u043a\u043e \u043e\u0440\u0435\u0445\u0447\u0435", "chili powder": "\u043b\u044e\u0442 \u043f\u0438\u043f\u0435\u0440", "cayenne pepper": "\u043a\u0430\u0439\u0435\u043d\u0441\u043a\u0438 \u043f\u0438\u043f\u0435\u0440",
      "bay leaf": "\u0434\u0430\u0444\u0438\u043d\u043e\u0432 \u043b\u0438\u0441\u0442", "bay leaves": "\u0434\u0430\u0444\u0438\u043d\u043e\u0432\u0438 \u043b\u0438\u0441\u0442\u0430",
      "mint": "\u043c\u0435\u043d\u0442\u0430", "dill": "\u043a\u043e\u043f\u044a\u0440", "vanilla": "\u0432\u0430\u043d\u0438\u043b\u0438\u044f", "vanilla extract": "\u0432\u0430\u043d\u0438\u043b\u043e\u0432 \u0435\u043a\u0441\u0442\u0440\u0430\u043a\u0442",
      "olive oil": "\u0437\u0435\u0445\u0442\u0438\u043d", "vegetable oil": "\u0440\u0430\u0441\u0442\u0438\u0442\u0435\u043b\u043d\u043e \u043c\u0430\u0441\u043b\u043e", "oil": "\u043e\u043b\u0438\u043e",
      "vinegar": "\u043e\u0446\u0435\u0442", "balsamic vinegar": "\u0431\u0430\u043b\u0441\u0430\u043c\u0438\u043a\u043e\u0432 \u043e\u0446\u0435\u0442",
      "soy sauce": "\u0441\u043e\u0435\u0432 \u0441\u043e\u0441", "tomato paste": "\u0434\u043e\u043c\u0430\u0442\u0435\u043d\u043e \u043f\u044e\u0440\u0435", "tomato puree": "\u0434\u043e\u043c\u0430\u0442\u0435\u043d\u043e \u043f\u044e\u0440\u0435",
      "honey": "\u043c\u0435\u0434", "sugar": "\u0437\u0430\u0445\u0430\u0440", "brown sugar": "\u043a\u0430\u0444\u044f\u0432\u0430 \u0437\u0430\u0445\u0430\u0440", "caster sugar": "\u0444\u0438\u043d\u0430 \u0437\u0430\u0445\u0430\u0440",
      "mustard": "\u0433\u043e\u0440\u0447\u0438\u0446\u0430", "ketchup": "\u043a\u0435\u0442\u0447\u0443\u043f",
      "stock": "\u0431\u0443\u043b\u044c\u043e\u043d", "chicken stock": "\u043f\u0438\u043b\u0435\u0448\u043a\u0438 \u0431\u0443\u043b\u044c\u043e\u043d", "beef stock": "\u0433\u043e\u0432\u0435\u0436\u0434\u0438 \u0431\u0443\u043b\u044c\u043e\u043d",
      "vegetable stock": "\u0437\u0435\u043b\u0435\u043d\u0447\u0443\u043a\u043e\u0432 \u0431\u0443\u043b\u044c\u043e\u043d",
      "water": "\u0432\u043e\u0434\u0430", "wine": "\u0432\u0438\u043d\u043e", "red wine": "\u0447\u0435\u0440\u0432\u0435\u043d\u043e \u0432\u0438\u043d\u043e", "white wine": "\u0431\u044f\u043b\u043e \u0432\u0438\u043d\u043e",
      "chicken breast": "\u043f\u0438\u043b\u0435\u0448\u043a\u0438 \u0433\u044a\u0440\u0434\u0438", "chicken thighs": "\u043f\u0438\u043b\u0435\u0448\u043a\u0438 \u0431\u0443\u0442\u0447\u0435\u0442\u0430",
      "minced beef": "\u043a\u0430\u0439\u043c\u0430", "mince": "\u043a\u0430\u0439\u043c\u0430", "ground beef": "\u043a\u0430\u0439\u043c\u0430",
      "tomato sauce": "\u0434\u043e\u043c\u0430\u0442\u0435\u043d \u0441\u043e\u0441", "worcestershire sauce": "\u0443\u0443\u0441\u0442\u044a\u0440\u0448\u0438\u0440\u0441\u043a\u0438 \u0441\u043e\u0441",
      "baking powder": "\u0431\u0430\u043a\u043f\u0443\u043b\u0432\u0435\u0440", "baking soda": "\u0441\u043e\u0434\u0430 \u0431\u0438\u043a\u0430\u0440\u0431\u043e\u043d\u0430\u0442",
      "dark chocolate": "\u0442\u044a\u043c\u0435\u043d \u0448\u043e\u043a\u043e\u043b\u0430\u0434", "chocolate": "\u0448\u043e\u043a\u043e\u043b\u0430\u0434",
      "almonds": "\u0431\u0430\u0434\u0435\u043c\u0438", "walnuts": "\u043e\u0440\u0435\u0445\u0438", "pine nuts": "\u043a\u0435\u0434\u0440\u043e\u0432\u0438 \u044f\u0434\u043a\u0438",
      "sesame seed": "\u0441\u0443\u0441\u0430\u043c", "sesame seeds": "\u0441\u0443\u0441\u0430\u043c",
      "coconut cream": "\u043a\u043e\u043a\u043e\u0441\u043e\u0432 \u043a\u0440\u0435\u043c",
      "double cream": "\u0433\u044a\u0441\u0442\u0430 \u0441\u043c\u0435\u0442\u0430\u043d\u0430", "single cream": "\u0442\u0435\u0447\u043d\u0430 \u0441\u043c\u0435\u0442\u0430\u043d\u0430",
      "passata": "\u043f\u0430\u0441\u0430\u0442\u0430", "harissa": "\u0445\u0430\u0440\u0438\u0441\u0430",
      "red onion": "\u0447\u0435\u0440\u0432\u0435\u043d \u043b\u0443\u043a", "red onions": "\u0447\u0435\u0440\u0432\u0435\u043d \u043b\u0443\u043a",
      "shallots": "\u0448\u0430\u043b\u043e\u0442", "fennel": "\u043a\u043e\u043f\u044a\u0440"
    }
  }
};

function t(key) {
  return translations[currentLang][key] || translations.en[key] || key;
}

// ── Translation API (MyMemory) ──
const translationCache = new Map();

const bgGlossary = [
  ["\\badd\\b", "добавете"],
  ["\\bmix\\b", "смесете"],
  ["\\bstir\\b", "разбъркайте"],
  ["\\bcook\\b", "гответе"],
  ["\\bbake\\b", "печете"],
  ["\\bboil\\b", "сварете"],
  ["\\bfry\\b", "изпържете"],
  ["\\bheat\\b", "загрейте"],
  ["\\bserve\\b", "сервирайте"],
  ["\\bchop\\b", "нарежете"],
  ["\\bslice\\b", "нарежете"],
  ["\\bdice\\b", "нарежете на кубчета"],
  ["\\bseason\\b", "овкусете"],
  ["\\bsimmer\\b", "оставете да къкри"],
  ["\\bminutes?\\b", "минути"],
  ["\\bhours?\\b", "часа"],
  ["\\bcup\\b", "чаша"],
  ["\\btbsp\\b", "с.л."],
  ["\\btsp\\b", "ч.л."],
];

function applyBgGlossary(text) {
  let out = String(text || "");
  for (const [pattern, replacement] of bgGlossary) {
    out = out.replace(new RegExp(pattern, "gi"), replacement);
  }
  return out;
}

function hasCyrillic(text) {
  return /[\u0400-\u04FF]/.test(String(text || ""));
}

async function translateText(text, from = "en", to = "bg") {
  if (!text || !text.trim()) return text;
  const cacheKey = `${from}|${to}|${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached && (to !== "bg" || hasCyrillic(cached) || cached !== text)) return cached;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const primary = data.responseData?.translatedText || "";
      const alt = (data.matches || []).find((m) => m?.translation && m.translation !== text)?.translation;
      const translated = (primary && primary !== text ? primary : alt) || text;
      const normalized = to === "bg" ? applyBgGlossary(translated) : translated;
      const accepted = to !== "bg" ? normalized : (normalized !== text || hasCyrillic(normalized) ? normalized : applyBgGlossary(text));
      translationCache.set(cacheKey, accepted);
      return accepted;
    } catch {
      // Retry
    }
  }

  const fallback = to === "bg" ? applyBgGlossary(text) : text;
  translationCache.set(cacheKey, fallback);
  return fallback;
}

function splitIntoChunks(text, maxLen) {
  const sentences = text.split(/(?<=\.)\s+/);
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? " " : "") + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

// ── Toast notification ──
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

// ── Favorites (localStorage) ──
function getFavorites() {
  try { return JSON.parse(localStorage.getItem("menuPlanner_favorites")) || { menus: [], recipes: [], products: [] }; }
  catch { return { menus: [], recipes: [], products: [] }; }
}
function saveFavorites(fav) { localStorage.setItem("menuPlanner_favorites", JSON.stringify(fav)); }

function toggleFavMenu(menuData) {
  const fav = getFavorites();
  const ts = menuData._ts;
  const idx = fav.menus.findIndex(m => m._ts === ts);
  if (idx >= 0) { fav.menus.splice(idx, 1); saveFavorites(fav); showToast(t("removedFromFav")); return false; }
  fav.menus.push(menuData);
  saveFavorites(fav);
  showToast(t("menuSaved"));
  return true;
}
function isMenuFav(ts) { return getFavorites().menus.some(m => m._ts === ts); }

function toggleFavRecipe(recipe) {
  const fav = getFavorites();
  const idx = fav.recipes.findIndex(r => r.id === recipe.id);
  if (idx >= 0) { fav.recipes.splice(idx, 1); saveFavorites(fav); showToast(t("removedFromFav")); return false; }
  fav.recipes.push(recipe);
  saveFavorites(fav);
  showToast(t("addedToFav"));
  return true;
}
function isRecipeFav(id) { return getFavorites().recipes.some(r => r.id === id); }

function toggleFavProduct(product) {
  const fav = getFavorites();
  const key = product.name.toLowerCase();
  const idx = fav.products.findIndex(p => p.name.toLowerCase() === key);
  if (idx >= 0) { fav.products.splice(idx, 1); saveFavorites(fav); showToast(t("removedFromFav")); return false; }
  fav.products.push(product);
  saveFavorites(fav);
  showToast(t("addedToFav"));
  return true;
}
function isProductFav(name) { return getFavorites().products.some(p => p.name.toLowerCase() === name.toLowerCase()); }

// ── Basket checkboxes (localStorage) ──
function getCheckedItems() {
  try { return JSON.parse(localStorage.getItem("menuPlanner_checked")) || []; }
  catch { return []; }
}
function saveCheckedItems(arr) { localStorage.setItem("menuPlanner_checked", JSON.stringify(arr)); }
function toggleCheckedItem(name) {
  const checked = getCheckedItems();
  const key = name.toLowerCase();
  const idx = checked.indexOf(key);
  if (idx >= 0) { checked.splice(idx, 1); } else { checked.push(key); }
  saveCheckedItems(checked);
  return idx < 0;
}
function isItemChecked(name) { return getCheckedItems().includes(name.toLowerCase()); }

// ── Sharing ──
function generateMenuText(menuData) {
  const days = t("days");
  const types = t("mealTypes");
  let text = "Fresh Kitchen \u2013 " + t("tabMenu") + "\n\n";
  menuData.days.forEach((day, i) => {
    text += days[i] + ":\n";
    day.meals.forEach((m, j) => { text += "  " + types[j] + ": " + m.name + "\n"; });
    text += "\n";
  });
  return text.trim();
}

function generateRecipeText(name) {
  return "Fresh Kitchen \u2013 " + name + "\nhttps://www.themealdb.com/";
}

function closeAllShareDropdowns() {
  document.querySelectorAll(".share-dropdown.visible").forEach((d) => d.classList.remove("visible"));
  document.querySelectorAll(".btn-share.is-open").forEach((b) => {
    b.classList.remove("is-open");
    b.setAttribute("aria-expanded", "false");
  });
}

function showShareDropdown(dropdownEl, text, title, triggerBtn) {
  const wasVisible = dropdownEl.classList.contains("visible");
  closeAllShareDropdowns();
  if (wasVisible) return;

  if (triggerBtn) {
    triggerBtn.classList.add("is-open");
    triggerBtn.setAttribute("aria-expanded", "true");
  }

  const encoded = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title || "Fresh Kitchen");
  dropdownEl.innerHTML = `
    <button data-action="copy">\ud83d\udccb ${t("copyLink")}</button>
    <button data-action="whatsapp">\ud83d\udfe2 WhatsApp</button>
    <button data-action="facebook">\ud83d\udd35 Facebook</button>
    <button data-action="twitter">\ud83d\udc26 X / Twitter</button>
  `;
  dropdownEl.classList.add("visible");
  dropdownEl.onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "copy") {
      navigator.clipboard.writeText(text).then(() => showToast(t("linkCopied")));
    } else if (action === "whatsapp") {
      window.open("https://wa.me/?text=" + encoded, "_blank", "noopener");
    } else if (action === "facebook") {
      window.open("https://www.facebook.com/sharer/sharer.php?quote=" + encoded, "_blank", "noopener");
    } else if (action === "twitter") {
      window.open("https://twitter.com/intent/tweet?text=" + encoded, "_blank", "noopener");
    }
    dropdownEl.classList.remove("visible");
  };
}

// Close share dropdowns on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".share-wrap")) {
    closeAllShareDropdowns();
  }
});

function translateIngredient(name) {
  if (currentLang === "en") return name;
  const dict = translations.bg.ingredients;
  const lower = name.toLowerCase();
  // Try exact match first, then lowercase
  if (dict[lower]) return dict[lower];
  if (dict[name]) return dict[name];
  // Try partial — find longest matching key
  let best = "";
  for (const key of Object.keys(dict)) {
    if (lower.includes(key) && key.length > best.length) best = key;
  }
  if (best) return lower.replace(best, dict[best]);
  return applyBgGlossary(name);
}

async function translateIngredientAsync(name) {
  const dictTranslated = translateIngredient(name);
  if (dictTranslated !== name || hasCyrillic(dictTranslated)) {
    return dictTranslated;
  }
  return translateText(name);
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val) el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key);
    if (val) el.placeholder = val;
  });
  langToggle.textContent = t("langBtn");
  langToggle.title = t("langTitle");
  document.documentElement.lang = currentLang === "bg" ? "bg" : "en";
}

langToggle.addEventListener("click", () => {
  currentLang = currentLang === "en" ? "bg" : "en";
  applyTranslations();
  // Re-render if there's existing content
  if (lastMenu) renderMenu(lastMenu);
  if (lastIngredients) renderBasket(lastIngredients);
  // Update status if idle
  if (!timerId) {
    statusEl.textContent = t("statusReady");
  }
});

// Store last generated data for re-render on language switch
let lastMenu = null;
let lastIngredients = null;

let timerId = null;
let seconds = 0;

function startStatusTimer() {
  seconds = 0;
  statusEl.textContent = t("statusGenerating")(0);
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    seconds += 1;
    statusEl.textContent = t("statusGenerating")(seconds);
  }, 1000);
}

function stopStatusTimer(success) {
  if (timerId) { clearInterval(timerId); timerId = null; }
  statusEl.textContent = success
    ? t("statusDone")(seconds)
    : t("statusError");
}

async function fetchMealDetails(mealId) {
  try {
    const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.meals ? data.meals[0] : null;
  } catch { return null; }
}

function estimatePrepTime(instructions = "", category = "") {
  const length = instructions.length;
  const base = 10 + Math.ceil(length / 100);
  const cat = category.toLowerCase();
  let multiplier = 1;
  if (cat.includes("dessert")) multiplier = 0.8;
  if (cat.includes("pasta")) multiplier = 1.1;
  if (cat.includes("seafood")) multiplier = 1.2;
  if (cat.includes("beef")) multiplier = 1.4;
  return Math.min(Math.round(base * multiplier), 120);
}

function matchesPrepFilter(minutes, prepFilter) {
  if (!prepFilter || prepFilter === "any") return true;
  if (prepFilter === "quick") return minutes <= 25;
  if (prepFilter === "medium") return minutes <= 45;
  if (prepFilter === "long") return minutes > 45;
  return true;
}

function matchesMealSlot(details, slotType) {
  const category = String(details?.strCategory || "").toLowerCase();
  const text = [details?.strMeal, details?.strCategory, details?.strTags].filter(Boolean).join(" ").toLowerCase();

  const breakfastKeywords = /breakfast|pancake|omelette|omelet|toast|porridge|oat|muesli|granola|cereal|crepe|waffle|smoothie|muffin/;
  const savoryMealKeywords = /soup|stew|roast|curry|burger|steak|pasta|risotto|grill|bake|fried rice/;
  const dessertKeywords = /dessert|cake|pie|cookie|brownie|ice cream|pudding|tart/;

  if (slotType === "Breakfast") {
    if (category === "breakfast") return true;
    if (dessertKeywords.test(text) || savoryMealKeywords.test(text) || category === "starter" || category === "side") return false;
    return breakfastKeywords.test(text);
  }

  if (slotType === "Lunch" || slotType === "Dinner") {
    if (category === "breakfast" || category === "dessert") return false;
    if (breakfastKeywords.test(text) || dessertKeywords.test(text)) return false;
    return true;
  }

  return true;
}

async function pickMealWithPrepFilter(pool, startIndex, prepFilter, slotType, usedMealIds = new Set()) {
  if (!pool.length) return null;
  const fallback = pool[startIndex % pool.length];
  if (prepFilter === "any" && !slotType) return fallback;

  for (let i = 0; i < Math.min(pool.length, 30); i++) {
    const candidate = pool[(startIndex + i) % pool.length];
    if (!candidate || usedMealIds.has(candidate.idMeal)) continue;
    const details = await fetchMealDetails(candidate.idMeal);
    if (!details) continue;
    if (!matchesMealSlot(details, slotType)) continue;
    const prep = estimatePrepTime(details.strInstructions || "", details.strCategory || "");
    if (matchesPrepFilter(prep, prepFilter)) {
      return candidate;
    }
  }

  return usedMealIds.has(fallback.idMeal) ? null : fallback;
}

function extractIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push({ name: ing.trim(), measure: measure ? measure.trim() : "" });
    }
  }
  return ingredients;
}

// Ingredient categorization by keywords
const categoryRules = [
  { name: "Meat & Poultry", icon: "\ud83e\udd69", keywords: ["chicken", "beef", "pork", "lamb", "turkey", "duck", "bacon", "sausage", "mince", "ham", "steak", "veal", "prosciutto", "salami", "chorizo", "pancetta"] },
  { name: "Fish & Seafood", icon: "\ud83d\udc1f", keywords: ["salmon", "tuna", "cod", "shrimp", "prawn", "fish", "anchov", "crab", "lobster", "mussel", "clam", "squid", "sardine", "mackerel"] },
  { name: "Dairy & Eggs", icon: "\ud83e\uddc0", keywords: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "egg", "mozzarella", "parmesan", "cheddar", "ricotta", "mascarpone", "feta", "gouda", "brie", "creme fraiche", "sour cream"] },
  { name: "Vegetables", icon: "\ud83e\udd66", keywords: ["onion", "garlic", "tomato", "potato", "carrot", "pepper", "celery", "spinach", "broccoli", "zucchini", "courgette", "aubergine", "eggplant", "mushroom", "lettuce", "cucumber", "cabbage", "kale", "pea", "bean", "corn", "asparagus", "leek", "shallot", "beetroot", "radish", "turnip", "squash", "pumpkin", "artichoke", "fennel", "rocket", "arugula", "spring onion", "green bean", "chilli", "jalapeno"] },
  { name: "Fruits", icon: "\ud83c\udf4e", keywords: ["apple", "banana", "lemon", "lime", "orange", "berry", "strawberr", "blueberr", "raspberr", "mango", "pineapple", "coconut", "grape", "peach", "pear", "plum", "cherry", "avocado", "fig", "date", "raisin", "sultana", "cranberr", "pomegranate"] },
  { name: "Grains & Pasta", icon: "\ud83c\udf5e", keywords: ["flour", "rice", "pasta", "bread", "spaghetti", "penne", "noodle", "oat", "couscous", "quinoa", "tortilla", "wrap", "lasagne", "macaroni", "fettuccine", "tagliatelle", "gnocchi", "cornflour", "breadcrumb", "pita", "baguette", "ciabatta", "focaccia"] },
  { name: "Spices & Herbs", icon: "\ud83c\udf3f", keywords: ["salt", "pepper", "cumin", "paprika", "cinnamon", "oregano", "basil", "thyme", "rosemary", "parsley", "cilantro", "coriander", "turmeric", "ginger", "nutmeg", "chili powder", "cayenne", "saffron", "bay leaf", "mint", "dill", "sage", "tarragon", "clove", "cardamom", "fennel seed", "mustard seed", "vanilla"] },
  { name: "Oils & Sauces", icon: "\ud83e\uded2", keywords: ["oil", "olive oil", "vinegar", "soy sauce", "worcestershire", "ketchup", "mayo", "mustard", "honey", "syrup", "sauce", "paste", "stock", "broth", "bouillon"] },
];

function categorizeIngredient(name) {
  const lower = name.toLowerCase();
  for (const cat of categoryRules) {
    if (cat.keywords.some(kw => lower.includes(kw))) return cat.name;
  }
  return "Other";
}

function getCategoryMeta(catName) {
  const found = categoryRules.find(c => c.name === catName);
  return found || { name: "Other", icon: "\ud83d\udce6" };
}

function renderMenu(data) {
  menuContainer.innerHTML = "";
  const actionsBar = document.getElementById("menuActionsBar");
  actionsBar.innerHTML = "";
  actionsBar.style.display = "none";
  if (!data || !data.days) return;

  // Ensure menu has a timestamp for favorites tracking
  if (!data._ts) data._ts = Date.now();

  // Action bar: save menu + share menu (rendered above the grid)
  const favMenuBtn = document.createElement("button");
  favMenuBtn.className = "btn-fav" + (isMenuFav(data._ts) ? " active" : "");
  favMenuBtn.textContent = isMenuFav(data._ts) ? "\u2665" : "\u2661";
  favMenuBtn.title = t("tabFavorites");
  favMenuBtn.addEventListener("click", () => {
    const added = toggleFavMenu(data);
    favMenuBtn.className = "btn-fav" + (added ? " active" : "");
    favMenuBtn.textContent = added ? "\u2665" : "\u2661";
  });
  actionsBar.appendChild(favMenuBtn);

  const shareWrap = document.createElement("div");
  shareWrap.className = "share-wrap";
  const shareBtn = document.createElement("button");
  shareBtn.className = "btn-share";
  shareBtn.innerHTML = "\ud83d\udcf2 " + t("share");
  const shareDrop = document.createElement("div");
  shareDrop.className = "share-dropdown";
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showShareDropdown(shareDrop, generateMenuText(data), t("tabMenu"), shareBtn);
  });
  shareWrap.appendChild(shareBtn);
  shareWrap.appendChild(shareDrop);
  actionsBar.appendChild(shareWrap);
  actionsBar.style.display = "flex";

  const mealTypes = t("mealTypes");
  const dayNames = t("days");
  data.days.forEach((day, dayIdx) => {
    const card = document.createElement("div");
    card.className = "day-card";

    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = dayNames[dayIdx];
    card.appendChild(name);

    const list = document.createElement("div");
    list.className = "meal-list";

    day.meals.forEach((m, idx) => {
      const item = document.createElement("div");
      item.className = "meal-item";

      const img = document.createElement("img");
      img.className = "meal-thumb";
      img.src = m.thumb + "/preview";
      img.alt = m.name;
      img.loading = "lazy";

      const info = document.createElement("div");
      info.className = "meal-info";

      const type = document.createElement("span");
      type.className = "meal-type";
      type.textContent = mealTypes[idx] || "";

      const mealName = document.createElement("span");
      mealName.className = "meal-name";
      mealName.textContent = m.name;

      info.appendChild(type);
      info.appendChild(mealName);
      item.appendChild(img);
      item.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "meal-actions";

      // Fav heart for individual recipe
      const favBtn = document.createElement("button");
      favBtn.className = "btn-fav" + (isRecipeFav(m.id) ? " active" : "");
      favBtn.textContent = isRecipeFav(m.id) ? "\u2665" : "\u2661";
      favBtn.addEventListener("click", () => {
        const added = toggleFavRecipe({ id: m.id, name: m.name, thumb: m.thumb });
        favBtn.className = "btn-fav" + (added ? " active" : "");
        favBtn.textContent = added ? "\u2665" : "\u2661";
      });
      actions.appendChild(favBtn);

      const recipeBtn = document.createElement("button");
      recipeBtn.className = "btn-recipe";
      recipeBtn.textContent = t("recipe");
      recipeBtn.dataset.mealId = m.id;
      recipeBtn.addEventListener("click", () => showRecipe(m.id));
      actions.appendChild(recipeBtn);
      item.appendChild(actions);

      list.appendChild(item);
    });

    card.appendChild(list);
    menuContainer.appendChild(card);
  });
}

function renderBasket(ingredients) {
  basketContainer.innerHTML = "";
  if (!ingredients || !ingredients.length) return;

  // Deduplicate by name (keep first measure)
  const seen = new Map();
  for (const ing of ingredients) {
    const key = ing.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, ing);
    } else if (ing.measure && !seen.get(key).measure) {
      seen.set(key, ing);
    }
  }

  // Group by category
  const groups = {};
  for (const [, ing] of seen) {
    const cat = categorizeIngredient(ing.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ing);
  }

  // Sort categories: defined order first, "Other" last
  const catOrder = categoryRules.map(c => c.name);
  const sortedCats = Object.keys(groups).sort((a, b) => {
    const ai = catOrder.indexOf(a);
    const bi = catOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const catName of sortedCats) {
    const meta = getCategoryMeta(catName);
    const section = document.createElement("div");
    section.className = "basket-category";

    const header = document.createElement("div");
    header.className = "basket-category-header";
    header.innerHTML = `<span class="cat-icon">${meta.icon}</span> ${t("categories")[catName] || catName}`;

    const items = document.createElement("div");
    items.className = "basket-items";

    groups[catName].sort((a, b) => a.name.localeCompare(b.name));
    for (const ing of groups[catName]) {
      const row = document.createElement("div");
      row.className = "basket-item-row" + (isItemChecked(ing.name) ? " checked" : "");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isItemChecked(ing.name);
      cb.addEventListener("change", () => {
        toggleCheckedItem(ing.name);
        row.classList.toggle("checked");
      });

      const label = document.createElement("span");
      label.className = "basket-item-label";
      const displayName = translateIngredient(ing.name);
      label.textContent = ing.measure ? `${displayName} \u2013 ${ing.measure}` : displayName;
      label.addEventListener("click", () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event("change")); });

      const favBtn = document.createElement("button");
      favBtn.className = "btn-fav" + (isProductFav(ing.name) ? " active" : "");
      favBtn.textContent = isProductFav(ing.name) ? "\u2665" : "\u2661";
      favBtn.style.fontSize = "14px";
      favBtn.addEventListener("click", () => {
        const added = toggleFavProduct({ name: ing.name, measure: ing.measure || "" });
        favBtn.className = "btn-fav" + (added ? " active" : "");
        favBtn.textContent = added ? "\u2665" : "\u2661";
      });

      row.appendChild(cb);
      row.appendChild(label);
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "basket-item-actions";
      actionsDiv.appendChild(favBtn);
      row.appendChild(actionsDiv);
      items.appendChild(row);
    }

    section.appendChild(header);
    section.appendChild(items);
    basketContainer.appendChild(section);
  }
}

// Recipe modal
const recipeOverlay = document.getElementById("recipeOverlay");
const recipeTitle = document.getElementById("recipeTitle");
const recipeBody = document.getElementById("recipeBody");
const recipeClose = document.getElementById("recipeClose");
const recipeFavBtn = document.getElementById("recipeFavBtn");
const recipeShareBtn = document.getElementById("recipeShareBtn");
const recipeShareDrop = document.getElementById("recipeShareDrop");
const favoritesContainer = document.getElementById("favoritesContainer");
const marketsContainer = document.getElementById("marketsContainer");

let currentRecipeId = null;
let currentRecipeName = null;
let currentRecipeThumb = null;

recipeClose.addEventListener("click", () => {
  closeAllShareDropdowns();
  recipeOverlay.classList.remove("visible");
});

recipeOverlay.addEventListener("click", (e) => {
  if (e.target === recipeOverlay) {
    closeAllShareDropdowns();
    recipeOverlay.classList.remove("visible");
  }
});

recipeFavBtn.addEventListener("click", () => {
  if (!currentRecipeId) return;
  const added = toggleFavRecipe({ id: currentRecipeId, name: currentRecipeName, thumb: currentRecipeThumb });
  recipeFavBtn.className = "btn-fav" + (added ? " active" : "");
  recipeFavBtn.textContent = added ? "\u2665" : "\u2661";
});

recipeShareBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!currentRecipeName) return;
  showShareDropdown(recipeShareDrop, generateRecipeText(currentRecipeName), currentRecipeName, recipeShareBtn);
});

async function showRecipe(mealId) {
  recipeOverlay.classList.add("visible");
  recipeTitle.textContent = t("recipeTitle");
  recipeBody.innerHTML = `<div class="recipe-loading">${t("recipeLoading")}</div>`;
  currentRecipeId = mealId;

  // Update fav btn state
  recipeFavBtn.className = "btn-fav" + (isRecipeFav(mealId) ? " active" : "");
  recipeFavBtn.textContent = isRecipeFav(mealId) ? "\u2665" : "\u2661";

  const details = await fetchMealDetails(mealId);
  if (!details) {
    recipeBody.innerHTML = `<div class="recipe-loading">${t("recipeError")}</div>`;
    return;
  }

  currentRecipeName = details.strMeal;
  currentRecipeThumb = details.strMealThumb;
  recipeTitle.textContent = details.strMeal;

  if (currentLang === "bg") {
    const translatedTitle = await translateText(details.strMeal);
    recipeTitle.textContent = translatedTitle || details.strMeal;
    currentRecipeName = translatedTitle || details.strMeal;
  }

  const ingredients = extractIngredients(details);
  const translatedIngredients = await Promise.all(
    ingredients.map(async (ing) => {
      const name = await translateIngredientAsync(ing.name);
      const measure = ing.measure ? await translateText(ing.measure) : "";
      return { name, measure };
    })
  );
  const ingListHTML = translatedIngredients
    .map((ing) => `<li>${ing.name}${ing.measure ? " \u2013 " + ing.measure : ""}</li>`)
    .join("");

  const instructions = details.strInstructions;

  recipeBody.innerHTML = `
    <img src="${details.strMealThumb}" alt="${details.strMeal}">
    <div class="recipe-section-title">${t("recipeIngredients")}</div>
    <ul class="recipe-ingredients-list">${ingListHTML}</ul>
    <div class="recipe-section-title">${t("recipeInstructions")}</div>
    ${currentLang === "bg" ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;font-style:italic">${t("recipeNote")}</div>` : ""}
    <div class="recipe-instructions">${currentLang === "bg" ? t("translating") : instructions}</div>
  `;

  if (currentLang === "bg") {
    const chunks = splitIntoChunks(instructions, 450);
    const translatedChunks = [];
    for (const chunk of chunks) {
      translatedChunks.push(await translateText(chunk));
    }
    const translatedInstructions = translatedChunks.join(" ");
    const instrEl = recipeBody.querySelector(".recipe-instructions");
    if (instrEl) instrEl.textContent = translatedInstructions;
  }
}

// ── Render Markets ──
function renderMarkets() {
  marketsContainer.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <p style="color: var(--text-muted);">
        🏬 ${t("marketPanelTitle") || "Supermarket Assistant"}<br/>
        <small>${t("marketPanelHint") || "Feature available in the modern Vite version. Please use the dev server: npm run dev"}</small>
      </p>
    </div>
  `;
}

// ── Render Favorites ──
function renderFavorites() {
  favoritesContainer.innerHTML = "";
  const fav = getFavorites();
  const hasAny = fav.menus.length || fav.recipes.length || fav.products.length;

  if (!hasAny) {
    favoritesContainer.innerHTML = `<div class="fav-empty">${t("favEmpty")}</div>`;
    return;
  }

  // Saved Menus
  if (fav.menus.length) {
    const sec = document.createElement("div");
    sec.className = "fav-section";
    sec.innerHTML = `<div class="fav-section-title">${t("favMenus")}</div>`;
    fav.menus.forEach((menu, idx) => {
      const card = document.createElement("div");
      card.className = "fav-card";
      const mealNames = menu.days.slice(0, 3).map(d => d.meals[0].name).join(", ") + "...";
      card.innerHTML = `
        <div class="fav-card-info">
          \ud83d\udccb ${t("tabMenu")} #${idx + 1}
          <div class="fav-card-sub">${mealNames}</div>
        </div>
      `;
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-remove-fav";
      removeBtn.textContent = "\u2715";
      removeBtn.addEventListener("click", () => {
        const f = getFavorites();
        f.menus = f.menus.filter(m => m._ts !== menu._ts);
        saveFavorites(f);
        renderFavorites();
        showToast(t("removedFromFav"));
      });
      const loadBtn = document.createElement("button");
      loadBtn.className = "btn-recipe";
      loadBtn.textContent = "\u25b6";
      loadBtn.title = "Load";
      loadBtn.addEventListener("click", () => {
        lastMenu = menu;
        renderMenu(menu);
        // Switch to menu tab
        document.querySelectorAll(".tab").forEach(tb => tb.classList.remove("active"));
        document.querySelector('[data-tab="menu"]').classList.add("active");
        menuContainer.style.display = "grid";
        basketContainer.style.display = "none";
        favoritesContainer.style.display = "none";
      });
      card.appendChild(loadBtn);
      card.appendChild(removeBtn);
      sec.appendChild(card);
    });
    favoritesContainer.appendChild(sec);
  }

  // Saved Recipes
  if (fav.recipes.length) {
    const sec = document.createElement("div");
    sec.className = "fav-section";
    sec.innerHTML = `<div class="fav-section-title">${t("favRecipes")}</div>`;
    fav.recipes.forEach(recipe => {
      const card = document.createElement("div");
      card.className = "fav-card";
      const thumbUrl = recipe.thumb && typeof recipe.thumb === 'string' 
        ? (recipe.thumb.includes('http') ? recipe.thumb : recipe.thumb + '/preview')
        : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E';
      card.innerHTML = `
        <img src="${thumbUrl}" alt="${recipe.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22300%22 height=%22300%22/%3E%3C/svg%3E'">
        <div class="fav-card-info">${recipe.name}</div>
      `;
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn-recipe";
      viewBtn.textContent = t("recipe");
      viewBtn.addEventListener("click", () => {
        if (!recipe.id) {
          showToast(t("failedLoadRecipe"));
          return;
        }
        showRecipe(recipe.id);
      });
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-remove-fav";
      removeBtn.textContent = "\u2715";
      removeBtn.addEventListener("click", () => {
        const f = getFavorites();
        f.recipes = f.recipes.filter(r => r.id !== recipe.id);
        saveFavorites(f);
        renderFavorites();
        showToast(t("removedFromFav"));
      });
      card.appendChild(viewBtn);
      card.appendChild(removeBtn);
      sec.appendChild(card);
    });
    favoritesContainer.appendChild(sec);
  }

  // Saved Products
  if (fav.products.length) {
    const sec = document.createElement("div");
    sec.className = "fav-section";
    sec.innerHTML = `<div class="fav-section-title">${t("favProducts")}</div>`;
    fav.products.forEach(product => {
      const card = document.createElement("div");
      card.className = "fav-card";
      const displayName = translateIngredient(product.name);
      card.innerHTML = `
        <div class="fav-card-info">${displayName}${product.measure ? " \u2013 " + product.measure : ""}</div>
      `;
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-remove-fav";
      removeBtn.textContent = "\u2715";
      removeBtn.addEventListener("click", () => {
        const f = getFavorites();
        f.products = f.products.filter(p => p.name.toLowerCase() !== product.name.toLowerCase());
        saveFavorites(f);
        renderFavorites();
        showToast(t("removedFromFav"));
      });
      card.appendChild(removeBtn);
      sec.appendChild(card);
    });
    favoritesContainer.appendChild(sec);
  }
}

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    closeAllShareDropdowns();
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    menuContainer.style.display = "none";
    basketContainer.style.display = "none";
    marketsContainer.style.display = "none";
    favoritesContainer.style.display = "none";
    if (tab.dataset.tab === "menu") {
      menuContainer.style.display = "grid";
    } else if (tab.dataset.tab === "basket") {
      basketContainer.style.display = "grid";
    } else if (tab.dataset.tab === "markets") {
      marketsContainer.style.display = "block";
      renderMarkets();
    } else if (tab.dataset.tab === "favorites") {
      favoritesContainer.style.display = "block";
      renderFavorites();
    }
  });
});

// Reset
resetBtn.addEventListener("click", () => {
  closeAllShareDropdowns();
  errorBox.style.display = "none";
  if (prepTimeEl) prepTimeEl.value = "any";
  menuContainer.innerHTML = "";
  basketContainer.innerHTML = "";
  document.getElementById("menuActionsBar").style.display = "none";
  if (timerId) { clearInterval(timerId); timerId = null; }
  statusEl.textContent = t("statusReady");
});

// Generate menu from TheMealDB
generateBtn.addEventListener("click", async () => {
  const favoritesSnapshot = JSON.stringify(getFavorites());
  errorBox.style.display = "none";
  startStatusTimer();
  generateBtn.disabled = true;

  try {
    const selectedCuisine = cuisineEl.value;
    const selectedPrepTime = prepTimeEl?.value || "any";
    let allMeals = [];

    if (selectedCuisine === "vegetarian") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian");
      if (!resp.ok) throw new Error(t("errorFetch"));
      const json = await resp.json();
      allMeals = json.meals || [];
    } else if (selectedCuisine === "vegan") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegan");
      if (!resp.ok) throw new Error(t("errorFetch"));
      const json = await resp.json();
      allMeals = json.meals || [];
    } else if (selectedCuisine === "glutenfree") {
      const r1 = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian");
      const r2 = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegan");
      if (r1.ok) { const j = await r1.json(); allMeals = allMeals.concat(j.meals || []); }
      if (r2.ok) { const j = await r2.json(); allMeals = allMeals.concat(j.meals || []); }
    } else if (selectedCuisine === "italian") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?a=Italian");
      if (!resp.ok) throw new Error(t("errorFetch"));
      const json = await resp.json();
      allMeals = json.meals || [];
    } else {
      // Mix: pick from several random areas
      const areas = ["Italian", "British", "American", "French", "Spanish", "Mexican", "Chinese", "Indian", "Turkish", "German", "Japanese"];
      const picked = areas.sort(() => Math.random() - 0.5).slice(0, 4);
      for (const area of picked) {
        const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`);
        if (resp.ok) {
          const json = await resp.json();
          if (json.meals) allMeals = allMeals.concat(json.meals);
        }
      }
    }

    if (!allMeals.length) throw new Error(t("errorNoMeals"));

    // Fetch breakfast items from TheMealDB Breakfast category
    let breakfastMeals = [];
    try {
      const bResp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast");
      if (bResp.ok) {
        const bJson = await bResp.json();
        breakfastMeals = (bJson.meals || []).sort(() => Math.random() - 0.5);
      }
    } catch { /* use allMeals as fallback */ }

    // Also fetch Dessert for lighter variety
    let dessertMeals = [];
    try {
      const dResp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert");
      if (dResp.ok) {
        const dJson = await dResp.json();
        dessertMeals = (dJson.meals || []).sort(() => Math.random() - 0.5);
      }
    } catch { /* ignore */ }

    // Shuffle main meals (for lunch & dinner)
    allMeals = allMeals.sort(() => Math.random() - 0.5);

    // If no breakfast meals found, use desserts or fallback to allMeals
    if (!breakfastMeals.length) breakfastMeals = dessertMeals.length ? dessertMeals : allMeals;

    // Build 7 breakfasts, 7 lunches, 7 dinners with prep-time filtering
    const breakfasts = [];
    const lunches = [];
    const dinners = [];
    const usedMealIds = new Set();
    for (let i = 0; i < 7; i++) {
      const breakfast = await pickMealWithPrepFilter(
        breakfastMeals,
        i,
        selectedPrepTime,
        "Breakfast",
        usedMealIds
      );
      if (breakfast) {
        breakfasts.push(breakfast);
        usedMealIds.add(breakfast.idMeal);
      }

      const lunch = await pickMealWithPrepFilter(allMeals, i, selectedPrepTime, "Lunch", usedMealIds);
      if (lunch) {
        lunches.push(lunch);
        usedMealIds.add(lunch.idMeal);
      }

      const dinner = await pickMealWithPrepFilter(allMeals, i + 7, selectedPrepTime, "Dinner", usedMealIds);
      if (dinner) {
        dinners.push(dinner);
        usedMealIds.add(dinner.idMeal);
      }
    }

    if (breakfasts.length < 7 || lunches.length < 7 || dinners.length < 7) {
      throw new Error("Not enough unique meals found. Try another cuisine or variety.");
    }

    const daysOfWeek = t("days");
    const menu = { days: [] };
    for (let i = 0; i < 7; i++) {
      const breakfastName = currentLang === "bg" ? await translateText(breakfasts[i].strMeal) : breakfasts[i].strMeal;
      const lunchName = currentLang === "bg" ? await translateText(lunches[i].strMeal) : lunches[i].strMeal;
      const dinnerName = currentLang === "bg" ? await translateText(dinners[i].strMeal) : dinners[i].strMeal;

      menu.days.push({
        name: daysOfWeek[i],
        meals: [
          { name: breakfastName, thumb: breakfasts[i].strMealThumb, id: breakfasts[i].idMeal },
          { name: lunchName, thumb: lunches[i].strMealThumb, id: lunches[i].idMeal },
          { name: dinnerName, thumb: dinners[i].strMealThumb, id: dinners[i].idMeal }
        ]
      });
    }
    renderMenu(menu);
    lastMenu = menu;

    // Basket: fetch ingredient details for unique meals
    const allUsed = [...breakfasts, ...lunches, ...dinners];
    const uniqueMeals = [...new Map(allUsed.map(m => [m.idMeal, m])).values()];
    const allIngredients = [];
    for (const meal of uniqueMeals) {
      const details = await fetchMealDetails(meal.idMeal);
      if (details) {
        allIngredients.push(...extractIngredients(details));
      }
    }
    renderBasket(allIngredients);
    lastIngredients = allIngredients;

    // Safety net: generation should not change favorites implicitly.
    if (JSON.stringify(getFavorites()) !== favoritesSnapshot) {
      saveFavorites(JSON.parse(favoritesSnapshot));
    }

    stopStatusTimer(true);
    showToast(t("menuGenerated"));
  } catch (err) {
    errorBox.style.display = "block";
    errorBox.textContent = t("errorPrefix") + err.message;
    stopStatusTimer(false);
  } finally {
    generateBtn.disabled = false;
  }
});
