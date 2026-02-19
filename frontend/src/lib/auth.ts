import Swal from 'sweetalert2';

let isLoggingOut = false;

export function forceLogout(message?: string) {
  if (isLoggingOut) return;
  isLoggingOut = true;

  localStorage.clear();
  sessionStorage.clear();

  Swal.fire({
    icon: 'warning',
    title: 'Session Expired',
    text: message || 'Your session has expired. Please log in again.',
    confirmButtonColor: '#f59e0b',
    allowOutsideClick: false,
  }).then(() => {
    isLoggingOut = false;
    window.location.href = '/login';
  });
}

function isTokenError(status: number, body: string): boolean {
  if (status === 401) return true;
  if (status === 403 && body) {
    const lower = body.toLowerCase();
    return (
      lower.includes('invalid token') ||
      lower.includes('token expired') ||
      lower.includes('jwt expired') ||
      lower.includes('not authenticated')
    );
  }
  return false;
}

const originalFetch = window.fetch.bind(window);

export function installAuthInterceptor() {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    if (response.status === 401 || response.status === 403) {
      const body = await response.clone().text().catch(() => '');
      if (isTokenError(response.status, body)) {
        forceLogout();
      }
    }

    return response;
  };
}
