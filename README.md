# Fresh Kitchen - Weekly Menu Planner

🍽️ **AI-powered weekly meal planner with shopping lists and recipe translations**

A modern, responsive web application that generates personalized weekly menus, manages shopping lists, and provides recipe translations using TheMealDB API.

## Features

### ✅ Core Features (Active)
- 📅 **Weekly Menu Generation** - Generate 7-day meal plans with customizable preferences
- 🛒 **Shopping Basket** - Organized by ingredient categories with checkout tracking
- ❤️ **Favorites System** - Save menus, recipes, and products for quick access
- 📤 **Social Sharing** - Share menus and recipes via WhatsApp, Facebook, Twitter
- 🌐 **Multi-Language Support** - English and Bulgarian interface + auto-translations
- 🏠 **Offline Support** - Works offline with cached data via Service Workers
- 📱 **Responsive Design** - Optimized for mobile, tablet, and desktop
- ⚡ **PWA Ready** - Installable on home screen with manifest

### 🔜 Coming Soon (Phase 2 & 3)
- 🕐 **Recipe Metadata** - Cooking time, difficulty level, calories
- 📊 **Cost Estimation** - Estimate meal plan cost based on ingredients
- 📄 **PDF Export** - Export menus and shopping lists as PDFs
- 🏷️ **Allergen Filtering** - Filter recipes based on allergies
- 🔍 **Recipe Search** - Search by name or ingredients
- 🔥 **Trending Recipes** - Discover popular recipes
- 💡 **Recommendations** - AI-powered recipe suggestions
- 👤 **User Accounts** - Cloud sync and personalization (Firebase/Supabase)

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+ Modules)
- **Build Tool**: Vite 8
- **Styling**: CSS3 (Custom Properties)
- **APIs**: 
  - TheMealDB (meal and recipe data)
  - MyMemory (recipe translations)
- **Storage**: localStorage + IndexedDB (planned)
- **Testing**: Playwright
- **Quality**: ESLint + Prettier
- **Offline**: Service Workers (PWA)

## Project Structure

```
MenuPlanner/
├── src/
│   ├── index.html              # Main HTML template
│   ├── main.js                 # App entry point
│   ├── sw.js                   # Service worker for offline support
│   ├── modules/
│   │   ├── app.js              # Main application logic
│   │   ├── i18n.js             # Internationalization
│   │   ├── api.js              # TheMealDB API calls
│   │   ├── menu.js             # Menu generation
│   │   ├── recipe.js           # Recipe management
│   │   ├── basket.js           # Shopping basket logic
│   │   ├── favorites.js        # Favorites management
│   │   ├── sharing.js          # Social sharing
│   │   ├── translation.js      # Recipe translation
│   │   ├── ui.js               # UI rendering
│   │   └── storage.js          # localStorage abstraction
│   ├── styles/
│   │   └── main.css            # Main stylesheet
│   └── utils/
│       ├── constants.js        # App constants
│       ├── helpers.js          # Utility functions
│       └── errors.js           # Error handling
├── public/
│   └── manifest.json           # PWA manifest
├── index.html                  # Vite root HTML
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies
├── .eslintrc.json              # ESLint config
└── .prettierrc.json            # Prettier config
```

## Getting Started

### Prerequisites
- Node.js >= 16
- npm >= 8

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/menu-planner.git
cd menu-planner

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Usage

1. **Generate Menu**: Click "Generate Menu" to create a 7-day meal plan
2. **Customize Preferences**: Adjust people count, variety level, cuisine type, dietary preferences
3. **View Recipes**: Click "Recipe" to see ingredients and instructions
4. **Manage Basket**: Switch to the "Basket" tab to see organized shopping list
5. **Save Favorites**: Star recipes or menus to save them for later
6. **Share**: Use the share button to send menus/recipes to friends
7. **Translate**: Recipes are automatically translated to your selected language

## API Integration

### TheMealDB
- Free meal database with 1000+ recipes
- Provides ingredients, instructions, and images
- No authentication required
- Rate limit: Reasonable for single user

### MyMemory
- Free translation API
- Used for recipe instruction translation
- Caching implemented to minimize requests
- Fallback to original text on error

## Localization

Currently supports:
- **English** (en) - Default
- **Bulgarian** (bg) - Full UI + AUTO-TRANSLATION of recipes

To add more languages:
1. Add translations in `src/modules/i18n.js`
2. Update ingredient dictionary in `src/modules/translation.js`
3. Update language selector UI

## Offline Support

The app uses Service Workers to enable offline functionality:
- Static assets are cached on first visit
- API responses are cached for 1 hour
- Network-first strategy for API calls (fall back to cache if offline)
- Cache-first strategy for static assets

To test offline: DevTools → Network → Offline

## Error Handling

Centralized error handling with:
- User-friendly error messages via toasts
- Automatic retry logic for network errors
- Error logging in localStorage
- Validation helpers for input sanitization

## Performance Optimizations

- Vite for fast builds and dev server
- Code splitting and lazy loading
- CSS custom properties for theme management
- Debouncing for search/input
- Memoization for expensive computations
- Service Worker caching strategy

## Testing

```bash
# Run tests
npm test

# Run specific test file
npx playwright test tests/menu.spec.js

# Test with UI
npx playwright test --ui
```

## Development Workflow

```bash
# Start dev server
npm run dev

# Lint before commit
npm run lint
npm run lint:fix

# Format code
npm run format

# Build and preview
npm run build
npm run preview
```

## Browser Support

- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Sufficient color contrast
- Focus indicators on interactive elements

## Security

- Input validation and sanitization
- XSS protection (no innerHTML except trusted sources)
- CSRF protection (GET for data fetching)
- localStorage data is client-side only
- No sensitive data transmitted unencrypted

## License

MIT - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

### Phase 1 (✅ In Progress)
- [x] Modular architecture with ES6 modules
- [x] Vite + ESLint + Prettier setup
- [x] Service Worker for offline support
- [x] Centralized error handling
- [ ] Comprehensive error logging
- [ ] Unit tests for core modules
- [ ] E2E tests with Playwright

### Phase 2 (Planned)
- [ ] Recipe metadata (time, difficulty, calories)
- [ ] PDF export using pdf-lib
- [ ] Allergen filtering system
- [ ] Advanced recipe search
- [ ] Cost estimation
- [ ] Trending recipes feed

### Phase 3 (Planned)
- [ ] User accounts (Firebase/Supabase)
- [ ] Cloud sync
- [ ] Recommendations engine
- [ ] Dark mode theme
- [ ] Mobile app (React Native)

## Known Issues

- Translation cache can grow large (manual clear via settings)
- TheMealDB API occasionally slow (mitigated with caching)
- Some recipes missing ingredient details (using fallback to API)

## Support

For issues and feature requests, please open an issue on GitHub.

## Changelog

### v1.0.0
- Initial release
- Core features: menu generation, basket, favorites, translations
- Multi-language support (EN/BG)
- PWA with offline support

---

Made with ❤️ by the Fresh Kitchen team
