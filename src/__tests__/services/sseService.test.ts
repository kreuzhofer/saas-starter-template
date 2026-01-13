/**
 * Unit Tests for SSE Service
 * 
 * Tests connection management, message broadcasting, and initial banner delivery.
 */

import { Response } from 'express';
import { SSEService } from '../../services/sseService';
import { BannerOutput, ToastInput } from '../../types/banner';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';
import * as notificationService from '../../services/notificationService';

const db = getTestDb();

// Mock the notificationService
jest.mock('../../services/notificationService', () => ({
  getActiveBanners: jest.fn(),
}));

describe('SSE Service - Unit Tests', () => {
  let sseService: SSEService;
  let testAccount1: any;
  let testAccount2: any;

  // Helper to create a mock Response object
  const createMockResponse = (): Response => {
    const writes: string[] = [];
    const mockRes = {
      write: jest.fn((data: string) => {
        writes.push(data);
        return true;
      }),
      _writes: writes,
    } as unknown as Response;
    return mockRes;
  };

  beforeEach(async () => {
    await cleanupTestDb();
    sseService = new SSEService();

    // Create test accounts
    const result1 = await createTestAccount(db, {
      username: `sse-test-1-${Date.now()}@example.com`,
      password: 'password123',
    });
    testAccount1 = result1.account;

    const result2 = await createTestAccount(db, {
      username: `sse-test-2-${Date.now()}@example.com`,
      password: 'password123',
    });
    testAccount2 = result2.account;

    await db.account.updateMany({
      where: { id: { in: [testAccount1.id, testAccount2.id] } },
      data: { isActive: true },
    });

    // Clear mock
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('Connection Management', () => {
    it('should register a connection for an authenticated user', () => {
      const mockRes = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes);
      
      expect(sseService.getAccountConnectionCount(testAccount1.id)).toBe(1);
      expect(sseService.getConnectionCount()).toBe(1);
    });

    it('should register a connection for an unauthenticated user', () => {
      const mockRes = createMockResponse();
      
      sseService.registerConnection(null, mockRes);
      
      expect(sseService.getAccountConnectionCount(null)).toBe(1);
      expect(sseService.getConnectionCount()).toBe(1);
    });

    it('should register multiple connections for the same account', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount1.id, mockRes2);
      
      expect(sseService.getAccountConnectionCount(testAccount1.id)).toBe(2);
      expect(sseService.getConnectionCount()).toBe(2);
    });

    it('should register connections for different accounts', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      
      expect(sseService.getAccountConnectionCount(testAccount1.id)).toBe(1);
      expect(sseService.getAccountConnectionCount(testAccount2.id)).toBe(1);
      expect(sseService.getConnectionCount()).toBe(2);
    });

    it('should remove a connection', () => {
      const mockRes = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes);
      expect(sseService.getConnectionCount()).toBe(1);
      
      sseService.removeConnection(testAccount1.id, mockRes);
      expect(sseService.getConnectionCount()).toBe(0);
    });

    it('should remove only the specified connection when multiple exist', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount1.id, mockRes2);
      expect(sseService.getConnectionCount()).toBe(2);
      
      sseService.removeConnection(testAccount1.id, mockRes1);
      expect(sseService.getConnectionCount()).toBe(1);
      expect(sseService.getAccountConnectionCount(testAccount1.id)).toBe(1);
    });

    it('should handle removing a non-existent connection gracefully', () => {
      const mockRes = createMockResponse();
      
      // Should not throw
      expect(() => {
        sseService.removeConnection(testAccount1.id, mockRes);
      }).not.toThrow();
      
      expect(sseService.getConnectionCount()).toBe(0);
    });
  });

  describe('Banner Broadcasting', () => {
    it('should broadcast account-specific banner only to that account', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      
      const banner: BannerOutput = {
        id: 'banner-1',
        accountId: testAccount1.id,
        type: 'info',
        message: 'Account-specific message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      sseService.broadcastBanner(banner);
      
      // Only account1 should receive the message
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).not.toHaveBeenCalled();
      
      const writtenData = (mockRes1 as any)._writes[0];
      expect(writtenData).toContain('"type":"banner"');
      expect(writtenData).toContain('"message":"Account-specific message"');
    });

    it('should broadcast global banner with audience "all" to all connections', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      const mockResUnauth = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      sseService.registerConnection(null, mockResUnauth);
      
      const banner: BannerOutput = {
        id: 'banner-1',
        type: 'warning',
        message: 'Global message for all',
        dismissable: true,
        audience: 'all',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      sseService.broadcastBanner(banner);
      
      // All connections should receive the message
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).toHaveBeenCalledTimes(1);
      expect(mockResUnauth.write).toHaveBeenCalledTimes(1);
    });

    it('should broadcast global banner with audience "authenticated" only to authenticated users', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      const mockResUnauth = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      sseService.registerConnection(null, mockResUnauth);
      
      const banner: BannerOutput = {
        id: 'banner-1',
        type: 'info',
        message: 'Authenticated users only',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      sseService.broadcastBanner(banner);
      
      // Only authenticated connections should receive the message
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).toHaveBeenCalledTimes(1);
      expect(mockResUnauth.write).not.toHaveBeenCalled();
    });

    it('should broadcast global banner with audience "unauthenticated" only to unauthenticated users', () => {
      const mockRes1 = createMockResponse();
      const mockResUnauth = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(null, mockResUnauth);
      
      const banner: BannerOutput = {
        id: 'banner-1',
        type: 'info',
        message: 'Unauthenticated users only',
        dismissable: true,
        audience: 'unauthenticated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      sseService.broadcastBanner(banner);
      
      // Only unauthenticated connection should receive the message
      expect(mockRes1.write).not.toHaveBeenCalled();
      expect(mockResUnauth.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('Banner Removal Broadcasting', () => {
    it('should broadcast account-specific banner removal only to that account', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      
      sseService.broadcastBannerRemoval('banner-1', testAccount1.id);
      
      // Only account1 should receive the removal message
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).not.toHaveBeenCalled();
      
      const writtenData = (mockRes1 as any)._writes[0];
      expect(writtenData).toContain('"type":"banner_removed"');
      expect(writtenData).toContain('"bannerId":"banner-1"');
    });

    it('should broadcast global banner removal to all connections', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      const mockResUnauth = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      sseService.registerConnection(null, mockResUnauth);
      
      sseService.broadcastBannerRemoval('banner-1');
      
      // All connections should receive the removal message
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).toHaveBeenCalledTimes(1);
      expect(mockResUnauth.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toast Broadcasting', () => {
    it('should send account-specific toast only to that account', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      
      const toast: ToastInput = {
        accountId: testAccount1.id,
        type: 'success',
        message: 'Operation successful',
        duration: 5000,
      };
      
      sseService.sendToast(toast);
      
      // Only account1 should receive the toast
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).not.toHaveBeenCalled();
      
      const writtenData = (mockRes1 as any)._writes[0];
      expect(writtenData).toContain('"type":"toast"');
      expect(writtenData).toContain('"message":"Operation successful"');
    });

    it('should send global toast to all connections', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      const mockResUnauth = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount2.id, mockRes2);
      sseService.registerConnection(null, mockResUnauth);
      
      const toast: ToastInput = {
        type: 'info',
        message: 'System maintenance scheduled',
        duration: 10000,
      };
      
      sseService.sendToast(toast);
      
      // All connections should receive the toast
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).toHaveBeenCalledTimes(1);
      expect(mockResUnauth.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('Initial Banner Delivery', () => {
    it('should send initial banners to a newly connected authenticated user', async () => {
      const mockRes = createMockResponse();
      
      const mockBanners: BannerOutput[] = [
        {
          id: 'banner-1',
          type: 'info',
          message: 'Welcome banner',
          dismissable: true,
          audience: 'authenticated',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'banner-2',
          type: 'warning',
          message: 'Warning banner',
          dismissable: true,
          audience: 'all',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      (notificationService.getActiveBanners as jest.Mock).mockResolvedValue(mockBanners);
      
      await sseService.sendInitialBanners(testAccount1.id, true, mockRes);
      
      expect(notificationService.getActiveBanners).toHaveBeenCalledWith(testAccount1.id, true);
      expect(mockRes.write).toHaveBeenCalledTimes(2);
      
      const writes = (mockRes as any)._writes;
      expect(writes[0]).toContain('"message":"Welcome banner"');
      expect(writes[1]).toContain('"message":"Warning banner"');
    });

    it('should send initial banners to a newly connected unauthenticated user', async () => {
      const mockRes = createMockResponse();
      
      const mockBanners: BannerOutput[] = [
        {
          id: 'banner-1',
          type: 'info',
          message: 'Public banner',
          dismissable: true,
          audience: 'unauthenticated',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      (notificationService.getActiveBanners as jest.Mock).mockResolvedValue(mockBanners);
      
      await sseService.sendInitialBanners(null, false, mockRes);
      
      expect(notificationService.getActiveBanners).toHaveBeenCalledWith(null, false);
      expect(mockRes.write).toHaveBeenCalledTimes(1);
      
      const writes = (mockRes as any)._writes;
      expect(writes[0]).toContain('"message":"Public banner"');
    });

    it('should handle empty initial banners gracefully', async () => {
      const mockRes = createMockResponse();
      
      (notificationService.getActiveBanners as jest.Mock).mockResolvedValue([]);
      
      await sseService.sendInitialBanners(testAccount1.id, true, mockRes);
      
      expect(notificationService.getActiveBanners).toHaveBeenCalledWith(testAccount1.id, true);
      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it('should handle errors in initial banner delivery gracefully', async () => {
      const mockRes = createMockResponse();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (notificationService.getActiveBanners as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      
      // Should not throw
      await expect(
        sseService.sendInitialBanners(testAccount1.id, true, mockRes)
      ).resolves.not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending initial banners:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle write errors gracefully when broadcasting', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockRes = {
        write: jest.fn(() => {
          throw new Error('Connection closed');
        }),
      } as unknown as Response;
      
      sseService.registerConnection(testAccount1.id, mockRes);
      
      const banner: BannerOutput = {
        id: 'banner-1',
        type: 'info',
        message: 'Test message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Should not throw
      expect(() => {
        sseService.broadcastBanner(banner);
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending to connection:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple connections for the same account receiving different messages', () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();
      
      sseService.registerConnection(testAccount1.id, mockRes1);
      sseService.registerConnection(testAccount1.id, mockRes2);
      
      const banner: BannerOutput = {
        id: 'banner-1',
        accountId: testAccount1.id,
        type: 'info',
        message: 'Test message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      sseService.broadcastBanner(banner);
      
      // Both connections should receive the message
      expect(mockRes1.write).toHaveBeenCalledTimes(1);
      expect(mockRes2.write).toHaveBeenCalledTimes(1);
    });

    it('should return 0 for connection count of non-existent account', () => {
      expect(sseService.getAccountConnectionCount('non-existent-id')).toBe(0);
    });

    it('should handle broadcasting to account with no connections', () => {
      const banner: BannerOutput = {
        id: 'banner-1',
        accountId: 'non-existent-account',
        type: 'info',
        message: 'Test message',
        dismissable: true,
        audience: 'authenticated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Should not throw
      expect(() => {
        sseService.broadcastBanner(banner);
      }).not.toThrow();
    });
  });
});
