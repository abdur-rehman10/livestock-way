/**
 * LocalStorage utilities for data persistence
 * Provides type-safe storage with fallback for SSR environments
 */

const isClient = typeof window !== 'undefined';

function storageGet<T>(key: string, defaultValue: T): T {
  if (!isClient) return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function storageSet<T>(key: string, value: T): void {
  if (!isClient) return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key "${key}":`, error);
  }
}

function storageRemove(key: string): void {
  if (!isClient) return;
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing localStorage key "${key}":`, error);
  }
}

function storageClear(): void {
  if (!isClient) return;
  
  try {
    window.localStorage.clear();
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
  }
}

export const storage = {
  /**
   * Get item from localStorage with JSON parsing
   */
  get: storageGet,

  /**
   * Set item in localStorage with JSON stringification
   */
  set: storageSet,

  /**
   * Remove item from localStorage
   */
  remove: storageRemove,

  /**
   * Clear all localStorage
   */
  clear: storageClear,
};

/**
 * Storage keys used throughout the app
 */
export const STORAGE_KEYS = {
  THEME: 'livestockway_theme',
  USER_ROLE: 'livestockway_user_role',
  LANDING_ROLE: 'livestockway_landing_role',
  USER_EMAIL: 'livestockway_user_email',
  ONBOARDING_COMPLETED: 'livestockway_onboarding_completed',
  FILTERS: 'livestockway_filters',
  LAST_SCREEN: 'livestockway_last_screen',
  DRIVER_ONLINE_STATUS: 'livestockway_driver_online',
  PREFERENCES: 'livestockway_preferences',
  KEYBOARD_SHORTCUTS_ENABLED: 'livestockway_shortcuts_enabled',
  SEARCH_HISTORY: 'livestockway_search_history',
  SAVED_FILTERS: 'livestockway_saved_filters',
  WELCOME_DISMISSED: 'livestockway_welcome_dismissed',
} as const;

/**
 * App preferences type
 */
export interface AppPreferences {
  theme: 'light' | 'dark';
  keyboardShortcutsEnabled: boolean;
  showOnboarding: boolean;
  lastScreen: string;
  notificationsEnabled: boolean;
}

/**
 * Get app preferences
 */
export function getPreferences(): AppPreferences {
  return storage.get(STORAGE_KEYS.PREFERENCES, {
    theme: 'light',
    keyboardShortcutsEnabled: true,
    showOnboarding: true,
    lastScreen: 'splash',
    notificationsEnabled: true,
  } as AppPreferences);
}

/**
 * Update app preferences
 */
export function updatePreferences(updates: Partial<AppPreferences>): void {
  const current = getPreferences();
  storage.set(STORAGE_KEYS.PREFERENCES, { ...current, ...updates });
}

/**
 * Save search query to history
 */
export function saveSearchQuery(query: string): void {
  if (!query.trim()) return;
  
  const history = storage.get(STORAGE_KEYS.SEARCH_HISTORY, [] as string[]);
  const updated = [query, ...history.filter(q => q !== query)].slice(0, 10);
  storage.set(STORAGE_KEYS.SEARCH_HISTORY, updated);
}

/**
 * Get search history
 */
export function getSearchHistory(): string[] {
  return storage.get(STORAGE_KEYS.SEARCH_HISTORY, [] as string[]);
}

/**
 * Save filter preset
 */
export function saveFilterPreset(name: string, filters: Record<string, any>): void {
  const presets = storage.get(STORAGE_KEYS.SAVED_FILTERS, {} as Record<string, any>);
  presets[name] = { ...filters, savedAt: new Date().toISOString() };
  storage.set(STORAGE_KEYS.SAVED_FILTERS, presets);
}

/**
 * Get saved filter presets
 */
export function getFilterPresets(): Record<string, any> {
  return storage.get(STORAGE_KEYS.SAVED_FILTERS, {} as Record<string, any>);
}

/**
 * Delete filter preset
 */
export function deleteFilterPreset(name: string): void {
  const presets = getFilterPresets();
  delete presets[name];
  storage.set(STORAGE_KEYS.SAVED_FILTERS, presets);
}
