import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from './client';
import type { BannerOutput, CreateBannerInput, UpdateBannerInput, ToastInput } from '../types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the auth utils
vi.mock('../utils/auth', () => ({
  getAuthToken: () => 'test-jwt-token',
  clearAuthToken: vi.fn(),
  getUserRole: vi.fn(),
}));

describe('API Client - Banner Methods', () => {
  const mockToken = 'test-jwt-token';
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    (window as any).ENV = {
      API_BASE_URL: 'http://localhost:3000',
      API_KEY: mockApiKey,
    };
    
    (import.meta as any).env.VITE_API_BASE_URL = 'http://localhost:3000';
    (import.meta as any).env.VITE_API_KEY = mockApiKey;
  });

  afterEach(() => {
    delete (window as any).ENV;
  });

  describe('createBanner', () => {
    it('should create a banner successfully with all fields', async () => {
      const requestData: CreateBannerInput = {
        key: 'test-banner',
        type: 'info',
        message: 'Test banner message',
        dismissable: true,
        audience: 'authenticated',
        link: {
          text: 'Learn more',
          url: 'https://example.com',
          external: true,
          style: 'button',
        },
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
      };

      const mockResponse: BannerOutput = {
        id: 'banner-1',
        key: 'test-banner',
        type: 'info',
        message: 'Test banner message',
        dismissable: true,
        audience: 'authenticated',
        link: {
          text: 'Learn more',
          url: 'https://example.com',
          external: true,
          style: 'button',
        },
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createBanner(requestData);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/banners');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      expect(callArgs[1].body).toBe(JSON.stringify(requestData));

      expect(result).toEqual(mockResponse);
    });

    it('should create a banner with only required fields', async () => {
      const requestData: CreateBannerInput = {
        type: 'error',
        message: 'Error message',
      };

      const mockResponse: BannerOutput = {
        id: 'banner-2',
        type: 'error',
        message: 'Error message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.createBanner(requestData);

      expect(result).toEqual(mockResponse);
      expect(result.type).toBe('error');
      expect(result.message).toBe('Error message');
    });

    it('should throw error when request fails', async () => {
      const requestData: CreateBannerInput = {
        type: 'info',
        message: 'Test message',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid banner data' }),
      });

      await expect(api.createBanner(requestData)).rejects.toThrow('Invalid banner data');
    });
  });

  describe('updateBanner', () => {
    it('should update a banner successfully', async () => {
      const bannerId = 'banner-1';
      const requestData: UpdateBannerInput = {
        message: 'Updated message',
        type: 'warning',
      };

      const mockResponse: BannerOutput = {
        id: bannerId,
        type: 'warning',
        message: 'Updated message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T01:00:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.updateBanner(bannerId, requestData);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain(`/api/banners/${bannerId}`);
      expect(callArgs[1].method).toBe('PUT');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(callArgs[1].body).toBe(JSON.stringify(requestData));

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when banner not found', async () => {
      const bannerId = 'non-existent';
      const requestData: UpdateBannerInput = {
        message: 'Updated message',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Banner not found' }),
      });

      await expect(api.updateBanner(bannerId, requestData)).rejects.toThrow('Banner not found');
    });
  });

  describe('deleteBanner', () => {
    it('should delete a banner successfully', async () => {
      const bannerId = 'banner-1';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await api.deleteBanner(bannerId);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain(`/api/banners/${bannerId}`);
      expect(callArgs[1].method).toBe('DELETE');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should throw error when banner not found', async () => {
      const bannerId = 'non-existent';

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Banner not found' }),
      });

      await expect(api.deleteBanner(bannerId)).rejects.toThrow('Banner not found');
    });

    it('should handle authentication errors', async () => {
      const bannerId = 'banner-1';

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(api.deleteBanner(bannerId)).rejects.toThrow();
    });
  });

  describe('deleteBannersByKey', () => {
    it('should delete banners by key successfully', async () => {
      const key = 'test-banner';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: 2 }),
      });

      const result = await api.deleteBannersByKey(key);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain(`/api/banners/key/${encodeURIComponent(key)}`);
      expect(callArgs[1].method).toBe('DELETE');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);

      expect(result.deleted).toBe(2);
    });

    it('should handle key with special characters', async () => {
      const key = 'test/banner:key';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: 1 }),
      });

      await api.deleteBannersByKey(key);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain(`/api/banners/key/${encodeURIComponent(key)}`);
    });
  });

  describe('getActiveBanners', () => {
    it('should fetch active banners successfully', async () => {
      const mockBanners: BannerOutput[] = [
        {
          id: 'banner-1',
          type: 'info',
          message: 'Info message',
          dismissable: true,
          audience: 'authenticated',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'banner-2',
          type: 'warning',
          message: 'Warning message',
          dismissable: false,
          audience: 'all',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ banners: mockBanners, total: mockBanners.length }),
      });

      const result = await api.getActiveBanners();

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/banners/active');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);

      expect(result).toEqual(mockBanners);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no active banners', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ banners: [], total: 0 }),
      });

      const result = await api.getActiveBanners();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('dismissBanner', () => {
    it('should dismiss a banner successfully', async () => {
      const bannerId = 'banner-1';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await api.dismissBanner(bannerId);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain(`/api/banners/${bannerId}/dismiss`);
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should throw error when banner not found', async () => {
      const bannerId = 'non-existent';

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Banner not found' }),
      });

      await expect(api.dismissBanner(bannerId)).rejects.toThrow('Banner not found');
    });

    it('should handle authentication errors', async () => {
      const bannerId = 'banner-1';

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(api.dismissBanner(bannerId)).rejects.toThrow();
    });
  });

  describe('sendToast', () => {
    it('should send a toast successfully', async () => {
      const toastData: ToastInput = {
        type: 'success',
        message: 'Operation completed successfully',
        duration: 5000,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await api.sendToast(toastData);

      expect(global.fetch).toHaveBeenCalled();
      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[0]).toContain('/api/toasts');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
      expect(callArgs[1].body).toBe(JSON.stringify(toastData));
    });

    it('should send toast with account ID', async () => {
      const toastData: ToastInput = {
        accountId: 'account-1',
        type: 'info',
        message: 'Account-specific notification',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await api.sendToast(toastData);

      const callArgs = (global.fetch as any).mock.calls[0];
      expect(callArgs[1].body).toBe(JSON.stringify(toastData));
    });

    it('should throw error when request fails', async () => {
      const toastData: ToastInput = {
        type: 'error',
        message: 'Error message',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid toast data' }),
      });

      await expect(api.sendToast(toastData)).rejects.toThrow('Invalid toast data');
    });

    it('should handle authentication errors', async () => {
      const toastData: ToastInput = {
        type: 'info',
        message: 'Test message',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(api.sendToast(toastData)).rejects.toThrow();
    });
  });
});
