/**
 * Theme management utilities
 * Handles dark mode toggle and persistence
 */

import { storage, STORAGE_KEYS } from './storage';

export type Theme = 'light' | 'dark';

/**
 * Get current theme
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  const stored = storage.get(STORAGE_KEYS.THEME, 'light' as Theme);
  return stored;
}

/**
 * Set theme
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  storage.set(STORAGE_KEYS.THEME, theme);
  applyTheme(theme);
}

/**
 * Toggle theme
 */
export function toggleTheme(): Theme {
  const current = getTheme();
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  const root = window.document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
  const theme = getTheme();
  applyTheme(theme);
}

/**
 * Check if system prefers dark mode
 */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Use system theme preference
 */
export function useSystemTheme(): void {
  const theme = systemPrefersDark() ? 'dark' : 'light';
  setTheme(theme);
}
