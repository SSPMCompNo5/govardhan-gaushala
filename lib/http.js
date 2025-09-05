// Utility function to get CSRF token from cookie
export function getCSRFToken() {
  try {
    if (typeof document === 'undefined') return '';
    const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

// Helper to add CSRF token to headers for mutation requests
export function addCSRFHeader(headers = {}) {
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const method = headers?.method || 'GET';
  
  if (methods.includes(method.toUpperCase())) {
    const token = getCSRFToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  return headers;
}
