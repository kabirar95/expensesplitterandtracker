/* ============================================================
   THEME STORE — Dark/Light mode state management
   ============================================================
   Zustand is a tiny state management library for React.
   Think of it like a global variable that all components can 
   read and update. When the theme changes, every component
   that uses this store automatically re-renders.
   
   How dark mode works:
   1. On first load → check localStorage, then system preference
   2. Set data-theme="dark" or "light" on <html>
   3. All CSS variables switch automatically (see theme.css)
   4. Save preference to localStorage for next visit
   ============================================================ */

import { create } from 'zustand';

const useThemeStore = create((set) => ({
  // Current theme: "light" or "dark"
  theme: getInitialTheme(),

  // Toggle between light and dark
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      return { theme: newTheme };
    });
  },

  // Set a specific theme
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));


/**
 * Determine the initial theme on first load.
 * Priority: localStorage > system preference > light (default)
 */
function getInitialTheme() {
  // Check if user has a saved preference
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
    return saved;
  }

  // Check system preference (is the user's OS in dark mode?)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = prefersDark ? 'dark' : 'light';
  applyTheme(theme);
  return theme;
}


/**
 * Apply the theme by setting the data-theme attribute on <html>
 * and saving to localStorage.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}


export default useThemeStore;
