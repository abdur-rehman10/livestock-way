import Swal, { type SweetAlertIcon } from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timerProgressBar: true,
  didOpen: (t) => {
    t.onmouseenter = Swal.stopTimer;
    t.onmouseleave = Swal.resumeTimer;
  },
});

type ToastOptions = { description?: string; duration?: number } | undefined;

function fireToast(icon: SweetAlertIcon, title: string, timer: number, opts?: ToastOptions) {
  return Toast.fire({
    icon,
    title,
    timer: opts?.duration ?? timer,
    ...(opts?.description ? { text: opts.description } : {}),
  });
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => fireToast('success', title, 3000, opts),
  error: (title: string, opts?: ToastOptions) => fireToast('error', title, 5000, opts),
  info: (title: string, opts?: ToastOptions) => fireToast('info', title, 3000, opts),
  warning: (title: string, opts?: ToastOptions) => fireToast('warning', title, 4000, opts),
};

export async function swalConfirm({
  title = 'Are you sure?',
  text = '',
  confirmText = 'Yes',
  cancelText = 'Cancel',
  icon = 'warning' as SweetAlertIcon,
  confirmColor = '#ef4444',
} = {}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor: confirmColor,
    cancelButtonColor: '#6b7280',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });
  return result.isConfirmed;
}

export { Swal };
export default toast;
