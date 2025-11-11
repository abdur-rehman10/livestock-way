/**
 * Keyboard shortcuts manager
 * Provides centralized keyboard shortcut handling
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
  handler: () => void;
  enabled?: boolean;
}

export class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;

  constructor() {
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * Register a keyboard shortcut
   */
  register(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start listening for keyboard events
   */
  start(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyPress);
    }
  }

  /**
   * Stop listening for keyboard events
   */
  stop(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyPress);
    }
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Handle keypress events
   */
  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to work even in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    for (const [id, shortcut] of this.shortcuts) {
      if (shortcut.enabled === false) continue;

      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
      const altMatch = shortcut.alt === undefined || event.altKey === shortcut.alt;
      const shiftMatch = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
      const metaMatch = shortcut.meta === undefined || event.metaKey === shortcut.meta;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
        event.preventDefault();
        shortcut.handler();
        break;
      }
    }
  }
}

/**
 * Format shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const keys: string[] = [];
  
  if (shortcut.meta) keys.push('⌘');
  if (shortcut.ctrl) keys.push('Ctrl');
  if (shortcut.alt) keys.push('Alt');
  if (shortcut.shift) keys.push('⇧');
  
  keys.push(shortcut.key.toUpperCase());
  
  return keys.join(' + ');
};

/**
 * Default app shortcuts
 */
export const DEFAULT_SHORTCUTS = {
  SEARCH: { key: 'k', meta: true, description: 'Open search' },
  REFRESH: { key: 'r', meta: true, description: 'Refresh data' },
  HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  TOGGLE_THEME: { key: 'd', meta: true, description: 'Toggle dark mode' },
  ESCAPE: { key: 'Escape', description: 'Close modal/dialog' },
  GO_HOME: { key: 'h', alt: true, description: 'Go to home' },
  GO_BACK: { key: '[', meta: true, description: 'Go back' },
  GO_FORWARD: { key: ']', meta: true, description: 'Go forward' },
} as const;
