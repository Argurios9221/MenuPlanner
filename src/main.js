// Main entry point for the application
import { MenuPlannerApp } from './modules/app.js';
import './styles/main.css';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new MenuPlannerApp();
  await app.init();
});

// Export for global access if needed
window.MenuPlannerApp = MenuPlannerApp;
