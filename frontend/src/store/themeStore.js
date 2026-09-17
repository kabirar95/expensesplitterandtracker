/* ============================================================
   THEME STORE — Permanently Dark Command Studio Mode
   ============================================================ */

import { create } from 'zustand';

const useThemeStore = create((set) => ({
  // Always dark theme
  theme: 'dark',

  // No-op or keep dark
  toggleTheme: () => {
    applyDarkTheme();
    set({ theme: 'dark' });
  },

  setTheme: () => {
    applyDarkTheme();
    set({ theme: 'dark' });
  },
}));

function applyDarkTheme() {
  document.documentElement.setAttribute('data-theme', 'dark');
  localStorage.setItem('theme', 'dark');
}

// Initial application
applyDarkTheme();

export default useThemeStore;
