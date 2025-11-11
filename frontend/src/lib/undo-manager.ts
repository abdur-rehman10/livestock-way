/**
 * Undo/Redo manager for reversible actions
 * Provides history stack for user actions
 */

export interface UndoAction {
  id: string;
  description: string;
  undo: () => void;
  redo: () => void;
  timestamp: number;
}

export class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxStackSize = 50;

  /**
   * Add an action to the undo stack
   */
  add(action: Omit<UndoAction, 'timestamp'>): void {
    const fullAction: UndoAction = {
      ...action,
      timestamp: Date.now(),
    };

    this.undoStack.push(fullAction);
    this.redoStack = []; // Clear redo stack when new action is added

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last action
   */
  undo(): UndoAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    try {
      action.undo();
      this.redoStack.push(action);
      return action;
    } catch (error) {
      console.error('Error undoing action:', error);
      // Put it back if it failed
      this.undoStack.push(action);
      return null;
    }
  }

  /**
   * Redo the last undone action
   */
  redo(): UndoAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    try {
      action.redo();
      this.undoStack.push(action);
      return action;
    } catch (error) {
      console.error('Error redoing action:', error);
      // Put it back if it failed
      this.redoStack.push(action);
      return null;
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the last action description
   */
  getLastAction(): string | null {
    const action = this.undoStack[this.undoStack.length - 1];
    return action ? action.description : null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get undo stack size
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get redo stack size
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }
}

// Global undo manager instance
export const undoManager = new UndoManager();
