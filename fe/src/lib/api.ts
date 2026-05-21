/**
 * API Utility - Centralized API configuration
 *
 * All API calls to the Laravel backend should use the API_BASE_URL constant.
 * This ensures consistency and makes it easy to change the API endpoint.
 */

// API Base URL - points to Laravel backend
export const API_BASE_URL = '/api/portal';

/**
 * Make an authenticated API request
 * Automatically includes credentials (cookies) for session-based auth
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for session auth
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

/**
 * Sanctum CSRF token URL
 */
export const CSRF_COOKIE_URL = '/sanctum/csrf-cookie';

/**
 * Get CSRF token before making state-changing requests
 */
export async function getCsrfToken() {
  await fetch(CSRF_COOKIE_URL, {
    credentials: 'include',
  });
}
