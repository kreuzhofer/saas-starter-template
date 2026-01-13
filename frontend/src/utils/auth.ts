import type { AccountRole } from '../types';

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * JWT payload structure
 * Matches the backend JWT payload interface
 */
export interface JwtPayload {
  accountId: string;
  username: string;
  role: AccountRole;
  iat: number;
  exp: number;
}

export function storeAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  // Dispatch custom event to notify components of auth state change
  window.dispatchEvent(new CustomEvent('auth-change', { detail: { authenticated: true } }));
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Decode a JWT token and extract its payload
 * Does not verify the signature - only decodes the payload
 * 
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if decoding fails
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as JwtPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extract the role from the current JWT token
 * 
 * @returns The account role from the JWT, or null if not available
 */
export function getUserRole(): AccountRole | null {
  const token = getAuthToken();
  if (!token) return null;

  const payload = decodeJwt(token);
  return payload?.role || null;
}

/**
 * Extract the account ID from the current JWT token
 * 
 * @returns The account ID from the JWT, or null if not available
 */
export function getUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  const payload = decodeJwt(token);
  return payload?.accountId || null;
}

/**
 * Extract the username from the current JWT token
 * 
 * @returns The username from the JWT, or null if not available
 */
export function getUsername(): string | null {
  const token = getAuthToken();
  if (!token) return null;

  const payload = decodeJwt(token);
  return payload?.username || null;
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;

  try {
    // Decode JWT to check expiration (without verification)
    const payload = decodeJwt(token);
    if (!payload) {
      clearAuthToken();
      return false;
    }

    const isExpired = payload.exp * 1000 < Date.now();
    
    if (isExpired) {
      clearAuthToken();
      return false;
    }
    
    return true;
  } catch (err) {
    clearAuthToken();
    return false;
  }
}
