import { toast } from 'sonner';
import { Button } from './ui/button';
import { Undo2 } from 'lucide-react';

/**
 * Show a toast notification with an undo button
 */
export const showUndoToast = (
  message: string,
  onUndo: () => void,
  duration: number = 5000
) => {
  toast(message, {
    duration,
    action: {
      label: (
        <div className="flex items-center gap-1">
          <Undo2 className="w-3 h-3" />
          <span>Undo</span>
        </div>
      ) as any,
      onClick: onUndo,
    },
  });
};

/**
 * Show a success toast with optional undo
 */
export const showSuccessWithUndo = (
  message: string,
  onUndo?: () => void
) => {
  if (onUndo) {
    showUndoToast(message, onUndo);
  } else {
    toast.success(message);
  }
};
