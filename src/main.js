// Main entry point for the application
import { MenuPlannerApp } from './modules/app.js';
import './styles/main.css';

// Ensure Markets tab exists in DOM
function ensureMarketsTab() {
  const tabsDiv = document.querySelector('.tabs');
  if (!tabsDiv) return;
  
  // Check if Markets tab already exists
  if (document.querySelector('[data-tab="markets"]')) return;
  
  // Find Favorites tab
  const favTab = tabsDiv.querySelector('[data-tab="favorites"]');
  if (!favTab) return;
  
  // Create Markets tab button
  const marketsBtn = document.createElement('button');
  marketsBtn.className = 'tab';
  marketsBtn.setAttribute('data-tab', 'markets');
  marketsBtn.setAttribute('data-i18n', 'tabMarkets');
  marketsBtn.textContent = 'Markets';
  
  // Insert before Favorites tab
  favTab.parentNode.insertBefore(marketsBtn, favTab);
  
  // Ensure Markets pane exists
  const panesContainer = document.querySelector('[data-pane="favorites"]')?.parentNode;
  if (panesContainer && !document.querySelector('[data-pane="markets"]')) {
    const marketPane = document.createElement('section');
    marketPane.className = 'pane';
    marketPane.setAttribute('data-pane', 'markets');
    marketPane.innerHTML = '<div id="markets-container" class="markets-container"></div>';
    
    const favPane = panesContainer.querySelector('[data-pane="favorites"]');
    favPane.parentNode.insertBefore(marketPane, favPane);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Ensure Markets tab exists before initializing app
  ensureMarketsTab();
  
  const app = new MenuPlannerApp();
  await app.init();
});

// Export for global access if needed
window.MenuPlannerApp = MenuPlannerApp;
