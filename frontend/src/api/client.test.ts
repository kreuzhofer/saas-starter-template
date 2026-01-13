import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from './client';
import type { ProfileData, UpdateProfileRequest, UpdateProfileResponse } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the auth utils
vi.mock('../utils/auth', () => ({
  getAuthToken: () => 'test-jwt-token',
  clearAuthToken: vi.fn(),
  getUserRole: vi.fn(),
}));

describe('API Client - Profile Methods', () => {
  const mockToken = 'test-jwt-token';
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables - both runtime and build-time
    (window as any).ENV = {
      API_BASE_URL: 'http://localhost:3000',
      API_KEY: mockApiKey,
    };
    
    // Also mock import.meta.env for build-time fallback
    (import.meta as any).env.VITE_API_BASE_URL = 'http://localhost:3000';
    (import.meta as any).env.VITE_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete (window as any).ENV;
  });

  describe('getProfile', () => {
    it('should fetch profile data successfully with firstName and lastName', async () => {
      const mockProfile: ProfileData = {
        id: 'user-1',
        username: 'testuser@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        firstName: 'John',
        lastName: 'Doe',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await api.getProfile();

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/profile');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);

      expect(result).toEqual(mockProfile);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should fetch profile data with null firstName and lastName', async () => {
      const mockProfile: ProfileData = {
        id: 'user-1',
        username: 'testuser@example.com',
        createdAt: '2024-01-01T00:00:00.000Z',
        firstName: null,
        lastName: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await api.getProfile();

      expect(result).toEqual(mockProfile);
      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
    });

    it('should include JWT token in request headers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'user-1',
          username: 'testuser@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          firstName: null,
          lastName: null,
        }),
      });

      await api.getProfile();

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should throw error when request fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(api.getProfile()).rejects.toThrow('Internal server error');
    });
  });

  describe('updateProfile', () => {
    it('should update profile with firstName and lastName successfully', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockResponse: UpdateProfileResponse = {
        message: 'Profile updated successfully',
        profile: {
          id: 'user-1',
          username: 'testuser@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateProfile(requestData);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/profile');
      expect(callArgs[1].method).toBe('PATCH');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      expect(callArgs[1].body).toBe(JSON.stringify(requestData));

      expect(result).toEqual(mockResponse);
      expect(result.profile.firstName).toBe('Jane');
      expect(result.profile.lastName).toBe('Smith');
    });

    it('should update only firstName', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: 'Jane',
      };

      const mockResponse: UpdateProfileResponse = {
        message: 'Profile updated successfully',
        profile: {
          id: 'user-1',
          username: 'testuser@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateProfile(requestData);

      expect(result.profile.firstName).toBe('Jane');
      expect(result.profile.lastName).toBe('Doe');
    });

    it('should update only lastName', async () => {
      const requestData: UpdateProfileRequest = {
        lastName: 'Smith',
      };

      const mockResponse: UpdateProfileResponse = {
        message: 'Profile updated successfully',
        profile: {
          id: 'user-1',
          username: 'testuser@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          firstName: 'John',
          lastName: 'Smith',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateProfile(requestData);

      expect(result.profile.firstName).toBe('John');
      expect(result.profile.lastName).toBe('Smith');
    });

    it('should handle empty string values', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: '',
        lastName: '',
      };

      const mockResponse: UpdateProfileResponse = {
        message: 'Profile updated successfully',
        profile: {
          id: 'user-1',
          username: 'testuser@example.com',
          createdAt: '2024-01-01T00:00:00.000Z',
          firstName: null,
          lastName: null,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateProfile(requestData);

      expect(result.profile.firstName).toBeNull();
      expect(result.profile.lastName).toBeNull();
    });

    it('should throw error for names exceeding 50 characters', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: 'A'.repeat(51),
        lastName: 'Smith',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'firstName must be 50 characters or less' }),
      });

      await expect(api.updateProfile(requestData)).rejects.toThrow(
        'firstName must be 50 characters or less'
      );
    });

    it('should include JWT token in request headers', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Profile updated successfully',
          profile: {
            id: 'user-1',
            username: 'testuser@example.com',
            createdAt: '2024-01-01T00:00:00.000Z',
            firstName: 'Jane',
            lastName: 'Smith',
          },
        }),
      });

      await api.updateProfile(requestData);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should throw error when request fails', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      await expect(api.updateProfile(requestData)).rejects.toThrow('Internal server error');
    });

    it('should handle validation errors with details', async () => {
      const requestData: UpdateProfileRequest = {
        firstName: 'A'.repeat(51),
        lastName: 'B'.repeat(51),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: [
            { field: 'firstName', message: 'must be 50 characters or less' },
            { field: 'lastName', message: 'must be 50 characters or less' },
          ],
        }),
      });

      await expect(api.updateProfile(requestData)).rejects.toThrow(
        'firstName: must be 50 characters or less. lastName: must be 50 characters or less'
      );
    });
  });
});
