# Fresh Kitchen 🍽️ Weekly Menu Planner

> **"Argurios is generating your menu…"**  
> A smart, bilingual weekly meal planner built with Vanilla JS, powered by multiple recipe APIs and Spoonacular integration.

🌐 **Live app:** [https://argurios9221.github.io/MenuPlanner/](https://argurios9221.github.io/MenuPlanner/)

---

## Features

### 🗓️ Menu Generation
- Generates a full **7-day meal plan** (Breakfast, Lunch, Dinner) with a single click
- Respects cuisine preference, prep time, dietary exclusions, allergies and number of servings
- **Swap** individual meals without regenerating the whole menu
- **Lock** meals you want to keep across regenerations
- Menu history — browse and reload previously generated menus

### 🛒 Shopping Basket
- Auto-builds an organised shopping list from the current menu
- Categorised by ingredient type (Meat, Vegetables, Dairy, etc.)
- Check off items as you shop
- Scalable serving sizes — adjust quantities on the fly
- Export basket as **PDF** or copy as text

### 🥄 Spoonacular Integration
- Set `VITE_SPOONACULAR_KEY` in `.env` to unlock:
  - Richer recipes from Spoonacular's database (5,000+ recipes)
  - **Real nutritional data** per serving — calories, protein, carbs, fat, fiber — shown as badges on meal cards and in the recipe modal
  - Smarter search — filters by cuisine, diet, intolerances and prep time in parallel with TheMealDB
  - Ingredient substitutes lookup
  - Direct link to original recipe source
- Fully optional — the app works without a key using TheMealDB + DummyJSON + SampleAPIs + local recipes

### 🏪 Markets Assistant
- Detects **nearby supermarkets** (Lidl, Kaufland, Metro, Fantastico, BILLA, T-Market, CBA, 345, FRESCO) via Overpass API using your location
- Online stores: **EBAG.bg, Supermag, Glovo Market**
- Filter by chain; **All Chains** view shows the nearest location per chain
- Promotional offer matching against your basket
- Budget indicator — see at a glance which stores are within your weekly budget

### ⭐ Favorites
- Save whole menus, individual recipes and products
- Click a saved menu to reload it directly into the planner

### 📤 Sharing & Export
- Share menus and recipes via **WhatsApp, Facebook, Twitter** or copy link
- Export menus, basket and individual recipes as **PDF**

### 🌍 Bilingual UI
- Full **English / Bulgarian** interface toggle
- Meal names auto-translated to Bulgarian via MyMemory API
- All labels, hints and status messages available in both languages

### ♿ UX & Accessibility
- Light / Dark mode
- Responsive — works on mobile, tablet and desktop
- Keyboard navigable with ARIA labels
- PWA-ready (installable on home screen)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (ES Modules), no framework |
| Build | Vite 8 + Terser |
| Styling | CSS3 — Custom Properties, CSS Grid, `color-mix()` |
| Recipe APIs | TheMealDB · DummyJSON · SampleAPIs · Local recipes · Spoonacular |
| Maps | Overpass API (OpenStreetMap) |
| Translation | MyMemory API |
| PDF | pdf-lib |
| Testing | Playwright (5 E2E tests) |
| Linting | ESLint + Prettier |
| Deployment | GitHub Pages via GitHub Actions |

---

## Project Structure

```
MenuPlanner/
├── index.html                  # Root HTML (Vite entry)
├── src/
│   ├── main.js                 # App entry point
│   ├── index.html              # Dev HTML template
│   ├── modules/
│   │   ├── app.js              # Main controller — wires all modules
│   │   ├── api.js              # TheMealDB + multi-source recipe fetching
│   │   ├── spoonacular.js      # Spoonacular API client
│   │   ├── menu.js             # Menu generation & swap logic
│   │   ├── basket.js           # Shopping basket builder
│   │   ├── supermarkets.js     # Nearby stores & offer matching
│   │   ├── recipe.js           # Recipe loading & translation pipeline
│   │   ├── search.js           # Advanced multi-source recipe search
│   │   ├── favorites.js        # Favorites management
│   │   ├── sharing.js          # Social share helpers
│   │   ├── translation.js      # MyMemory translation client
│   │   ├── metadata.js         # Prep time, difficulty, calorie estimates
│   │   ├── storage.js          # localStorage abstraction
│   │   ├── ui.js               # DOM rendering helpers
│   │   ├── ui-advanced.js      # Advanced UI components
│   │   ├── pdf.js              # PDF export
│   │   └── i18n.js             # EN / BG translation dictionary
│   ├── styles/
│   │   └── main.css            # All styles incl. dark mode & responsive
│   ├── data/
│   │   └── local-recipes.js    # Bundled local recipe collections
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── errors.js
│   └── sw.js                   # Service Worker (PWA / offline)
├── public/
│   └── manifest.json           # PWA manifest
├── tests/
│   └── app.spec.js             # Playwright E2E tests
├── .env                        # Local secrets — never committed
├── vite.config.js
├── playwright.config.js
├── package.json
├── .eslintrc.json
└── .prettierrc.json
```

---

## Getting Started

### Prerequisites
- Node.js >= 16
- npm >= 8

### Installation

```bash
git clone https://github.com/Argurios9221/MenuPlanner.git
cd MenuPlanner
npm install
```

### Environment Variables

Create a `.env` file in the project root (already in `.gitignore`):

```env
VITE_SPOONACULAR_KEY=your_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_CLOUDE_ANALYZER_URL=https://your-worker.workers.dev
VITE_CLOUDE_ANALYZER_KEY=optional_bearer_key
```

Get a free key (150 requests/day) at [spoonacular.com/food-api](https://spoonacular.com/food-api).  
The app is fully functional without this key.

For authentication (email/password, Google, Facebook, X), create a Firebase project and enable these sign-in providers in Firebase Authentication.
Also add your local and production domains to Firebase Authorized Domains.

GDPR note: the app includes explicit consent in auth flow plus in-app actions for data export and account deletion.

If deploying on GitHub Pages via Actions, add these repository secrets so the production build can enable auth:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_APP_ID
- VITE_CLOUDE_ANALYZER_URL
- VITE_CLOUDE_ANALYZER_KEY

### Cloude Analyzer Endpoint (Optional)

This repository now includes a ready-to-deploy Cloudflare Worker in `cloud/cloude-analyzer-worker/`.

Quick start:

```bash
cd cloud/cloude-analyzer-worker
npm install
npx wrangler login
npm run deploy
```

After deploy, copy the generated `https://...workers.dev` URL into `VITE_CLOUDE_ANALYZER_URL`.

### Development

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run build:pages # Build for GitHub Pages (/MenuPlanner/ base)
npm run preview    # Preview production build
npm run lint       # ESLint check
npm run lint:fix   # Auto-fix lint errors
npm run format     # Prettier format
npm test           # Playwright E2E tests
```

---

## Cuisine & Dietary Options

| Cuisine | Dietary Exclusions |
|---------|-------------------|
| International (Mix) | No beef |
| Bulgarian | No pork |
| Italian | Lactose-free |
| Vegetarian | No chicken |
| Vegan | No seafood |
| Gluten-free | No nuts |
| | Gluten-free ingredients |

---

## Supported Supermarkets

### Physical (Bulgaria)
Lidl · Kaufland · Metro · Fantastico · BILLA · T-Market · CBA · 345 · FRESCO

### Online
EBAG.bg · Supermag · Glovo Market

---

## API Sources

| API | Purpose | Auth |
|-----|---------|------|
| [TheMealDB](https://www.themealdb.com/) | Recipe data | Free, no key |
| [DummyJSON](https://dummyjson.com/recipes) | Extra recipes | Free, no key |
| [SampleAPIs](https://api.sampleapis.com/recipes/recipes) | Extra recipes | Free, no key |
| [Spoonacular](https://spoonacular.com/food-api) | Rich recipes + nutrition | Free tier (150/day) |
| [MyMemory](https://mymemory.translated.net/) | Recipe translation | Free, no key |
| [Overpass API](https://overpass-api.de/) | Nearby stores (OSM) | Free, no key |

---

## Browser Support

Chrome/Edge >= 90 · Firefox >= 88 · Safari >= 14 · iOS Safari · Chrome Mobile

---

## License

MIT
