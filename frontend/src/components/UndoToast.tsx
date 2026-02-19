import Swal from 'sweetalert2';
import { toast } from '../lib/swal';

export const showUndoToast = (
  message: string,
  onUndo: () => void,
  duration: number = 5000
) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'info',
    title: message,
    showConfirmButton: true,
    confirmButtonText: 'Undo',
    confirmButtonColor: '#6366f1',
    timer: duration,
    timerProgressBar: true,
    didOpen: (t) => {
      t.onmouseenter = Swal.stopTimer;
      t.onmouseleave = Swal.resumeTimer;
    },
  }).then((result) => {
    if (result.isConfirmed) {
      onUndo();
    }
  });
};

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
