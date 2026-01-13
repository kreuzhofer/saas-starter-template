import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  storeAuthToken,
  getAuthToken,
  clearAuthToken,
  decodeJwt,
  getUserRole,
  getUserId,
  getUsername,
  isAuthenticated,
} from './auth';

describe('Auth Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Token Storage', () => {
    it('should store and retrieve auth token', () => {
      const token = 'test-token';
      storeAuthToken(token);
      expect(getAuthToken()).toBe(token);
    });

    it('should clear auth token', () => {
      storeAuthToken('test-token');
      clearAuthToken();
      expect(getAuthToken()).toBeNull();
    });

    it('should return null when no token is stored', () => {
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('JWT Decoding', () => {
    it('should decode a valid JWT token', () => {
      // Create a mock JWT with payload: { accountId: '123', username: 'test@example.com', role: 'admin', iat: 1234567890, exp: 9999999999 }
      const payload = {
        accountId: '123',
        username: 'test@example.com',
        role: 'admin',
        iat: 1234567890,
        exp: 9999999999,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      const decoded = decodeJwt(mockToken);
      expect(decoded).toEqual(payload);
    });

    it('should return null for invalid JWT token', () => {
      const invalidToken = 'invalid-token';
      const decoded = decodeJwt(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should return null for malformed JWT token', () => {
      const malformedToken = 'header.invalid-base64.signature';
      const decoded = decodeJwt(malformedToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Role Extraction', () => {
    it('should extract role from stored JWT token', () => {
      const payload = {
        accountId: '123',
        username: 'test@example.com',
        role: 'account_owner',
        iat: 1234567890,
        exp: 9999999999,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(getUserRole()).toBe('account_owner');
    });

    it('should return null when no token is stored', () => {
      expect(getUserRole()).toBeNull();
    });

    it('should return null for invalid token', () => {
      storeAuthToken('invalid-token');
      expect(getUserRole()).toBeNull();
    });
  });

  describe('User ID Extraction', () => {
    it('should extract account ID from stored JWT token', () => {
      const payload = {
        accountId: 'user-456',
        username: 'test@example.com',
        role: 'admin',
        iat: 1234567890,
        exp: 9999999999,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(getUserId()).toBe('user-456');
    });

    it('should return null when no token is stored', () => {
      expect(getUserId()).toBeNull();
    });
  });

  describe('Username Extraction', () => {
    it('should extract username from stored JWT token', () => {
      const payload = {
        accountId: '123',
        username: 'admin@example.com',
        role: 'admin',
        iat: 1234567890,
        exp: 9999999999,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(getUsername()).toBe('admin@example.com');
    });

    it('should return null when no token is stored', () => {
      expect(getUsername()).toBeNull();
    });
  });

  describe('Authentication Check', () => {
    it('should return true for valid non-expired token', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = {
        accountId: '123',
        username: 'test@example.com',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: futureTimestamp,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false and clear token for expired token', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = {
        accountId: '123',
        username: 'test@example.com',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: pastTimestamp,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
    });

    it('should return false when no token is stored', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false and clear token for invalid token', () => {
      storeAuthToken('invalid-token');
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('Role-based scenarios', () => {
    it('should handle admin role correctly', () => {
      const payload = {
        accountId: 'admin-123',
        username: 'admin@example.com',
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(getUserRole()).toBe('admin');
      expect(isAuthenticated()).toBe(true);
    });

    it('should handle account_owner role correctly', () => {
      const payload = {
        accountId: 'owner-456',
        username: 'owner@example.com',
        role: 'account_owner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(getUserRole()).toBe('account_owner');
      expect(isAuthenticated()).toBe(true);
    });

    it('should handle account_user role correctly', () => {
      const payload = {
        accountId: 'user-789',
        username: 'user@example.com',
        role: 'account_user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const encodedPayload = btoa(JSON.stringify(payload));
      const mockToken = `header.${encodedPayload}.signature`;

      storeAuthToken(mockToken);
      expect(getUserRole()).toBe('account_user');
      expect(isAuthenticated()).toBe(true);
    });
  });
});
