/**
 * Unit Tests for Notification Service
 * 
 * Tests error cases, edge cases, and specific examples for banner management.
 */

import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';
import {
  createOrUpdateBanner,
  updateBanner,
  deleteBanner,
  deleteBannersByKey,
  getActiveBanners,
  dismissBanner,
} from '../../services/notificationService';

const db = getTestDb();

// Test key prefix for banner cleanup - must match pattern in testDb.ts autoRegisterTestBanners()
const TEST_KEY_PREFIX = 'banner-unit-test-';
let testKeyCounter = 0;
const testKey = (suffix: string) => `${TEST_KEY_PREFIX}${suffix}-${Date.now()}-${++testKeyCounter}`;

describe('Notification Service - Unit Tests', () => {
  let testAccount: any;

  beforeEach(async () => {
    await cleanupTestDb();
    
    const result = await createTestAccount(db, {
      username: `notification-unit-test-${Date.now()}@example.com`,
      password: 'password123',
    });
    testAccount = result.account;
    
    await db.account.update({
      where: { id: testAccount.id },
      data: { isActive: true },
    });
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('createOrUpdateBanner', () => {
    it('should create a new banner with all fields', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('all-fields'),
        accountId: testAccount.id,
        type: 'error',
        message: 'Test error message',
        dismissable: true,
        audience: 'authenticated',
        link: {
          text: 'Click here',
          url: 'https://example.com',
          external: true,
          style: 'button',
        },
        backgroundColor: '#FF0000',
        textColor: '#FFFFFF',
        scheduledStart: new Date('2025-01-01'),
        scheduledEnd: new Date('2025-12-31'),
      });

      registerTestEntity('banners', banner.id);

      expect(banner.id).toBeDefined();
      expect(banner.key).toMatch(new RegExp(`^${TEST_KEY_PREFIX}all-fields-`));
      expect(banner.accountId).toBe(testAccount.id);
      expect(banner.type).toBe('error');
      expect(banner.message).toBe('Test error message');
      expect(banner.dismissable).toBe(true);
      expect(banner.audience).toBe('authenticated');
      expect(banner.link).toEqual({
        text: 'Click here',
        url: 'https://example.com',
        external: true,
        style: 'button',
      });
      expect(banner.backgroundColor).toBe('#FF0000');
      expect(banner.textColor).toBe('#FFFFFF');
      expect(banner.scheduledStart).toEqual(new Date('2025-01-01'));
      expect(banner.scheduledEnd).toEqual(new Date('2025-12-31'));
    });

    it('should create a banner with minimal required fields', async () => {
      const key = testKey('minimal');
      const banner = await createOrUpdateBanner({
        key,
        type: 'info',
        message: 'Simple info message',
      });

      registerTestEntity('banners', banner.id);

      expect(banner.id).toBeDefined();
      expect(banner.type).toBe('info');
      expect(banner.message).toBe('Simple info message');
      expect(banner.dismissable).toBe(true); // Default
      expect(banner.audience).toBe('authenticated'); // Default
      expect(banner.key).toBe(key);
      expect(banner.accountId).toBeUndefined();
      expect(banner.link).toBeUndefined();
    });

    it('should update existing banner when key matches', async () => {
      const key = testKey('update');
      // Create initial banner
      const initial = await createOrUpdateBanner({
        key,
        type: 'warning',
        message: 'Initial message',
      });

      registerTestEntity('banners', initial.id);

      // Update via key
      const updated = await createOrUpdateBanner({
        key,
        type: 'error',
        message: 'Updated message',
      });

      expect(updated.id).toBe(initial.id);
      expect(updated.type).toBe('error');
      expect(updated.message).toBe('Updated message');
    });
  });

  describe('updateBanner', () => {
    it('should update specific fields of a banner', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('update-fields'),
        type: 'info',
        message: 'Original message',
        dismissable: true,
      });

      registerTestEntity('banners', banner.id);

      const updated = await updateBanner(banner.id, {
        message: 'Updated message',
        dismissable: false,
      });

      expect(updated.id).toBe(banner.id);
      expect(updated.type).toBe('info'); // Unchanged
      expect(updated.message).toBe('Updated message');
      expect(updated.dismissable).toBe(false);
    });

    it('should remove link when set to null', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('remove-link'),
        type: 'info',
        message: 'Message with link',
        link: {
          text: 'Click',
          url: 'https://example.com',
          external: false,
          style: 'inline',
        },
      });

      registerTestEntity('banners', banner.id);

      const updated = await updateBanner(banner.id, {
        link: null,
      });

      expect(updated.link).toBeUndefined();
    });

    it('should throw error when banner not found', async () => {
      await expect(
        updateBanner('00000000-0000-0000-0000-000000000000', {
          message: 'New message',
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteBanner', () => {
    it('should delete a banner by ID', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('delete-by-id'),
        type: 'info',
        message: 'To be deleted',
      });

      registerTestEntity('banners', banner.id);

      await deleteBanner(banner.id);

      const found = await db.banner.findUnique({
        where: { id: banner.id },
      });

      expect(found).toBeNull();
    });

    it('should throw error when banner not found', async () => {
      await expect(
        deleteBanner('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });

    it('should cascade delete dismissals', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('cascade-delete'),
        accountId: testAccount.id,
        type: 'info',
        message: 'To be deleted with dismissals',
      });

      registerTestEntity('banners', banner.id);

      await dismissBanner(banner.id, testAccount.id);

      const dismissalsBefore = await db.bannerDismissal.count({
        where: { bannerId: banner.id },
      });
      expect(dismissalsBefore).toBe(1);

      await deleteBanner(banner.id);

      const dismissalsAfter = await db.bannerDismissal.count({
        where: { bannerId: banner.id },
      });
      expect(dismissalsAfter).toBe(0);
    });
  });

  describe('deleteBannersByKey', () => {
    it('should delete all banners with matching key', async () => {
      const multiDeleteKey = testKey('multi-delete');
      const banner1 = await createOrUpdateBanner({
        key: multiDeleteKey,
        accountId: testAccount.id,
        type: 'info',
        message: 'First',
      });

      registerTestEntity('banners', banner1.id);

      const banner2 = await createOrUpdateBanner({
        key: multiDeleteKey,
        type: 'info',
        message: 'Second',
      });

      registerTestEntity('banners', banner2.id);

      const count = await deleteBannersByKey(multiDeleteKey);

      expect(count).toBe(2);

      const remaining = await db.banner.count({
        where: { key: multiDeleteKey },
      });

      expect(remaining).toBe(0);
    });

    it('should return 0 when no banners match key', async () => {
      const count = await deleteBannersByKey(testKey('nonexistent'));
      expect(count).toBe(0);
    });
  });

  describe('getActiveBanners', () => {
    it('should return empty array when no banners exist for the account', async () => {
      // Get banners for the test account
      const banners = await getActiveBanners(testAccount.id, true);
      
      // Filter to only account-specific banners (not global ones)
      const accountSpecificBanners = banners.filter(b => b.accountId === testAccount.id);
      
      // No account-specific banners should exist for this new test account
      expect(accountSpecificBanners).toEqual([]);
    });

    it('should exclude dismissed banners', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('exclude-dismissed'),
        accountId: testAccount.id,
        type: 'info',
        message: 'Dismissable banner',
      });

      registerTestEntity('banners', banner.id);

      await dismissBanner(banner.id, testAccount.id);

      const banners = await getActiveBanners(testAccount.id, true);
      const bannerIds = banners.map(b => b.id);

      expect(bannerIds).not.toContain(banner.id);
    });

    it('should handle multiple dismissals for same banner', async () => {
      const result2 = await createTestAccount(db, {
        username: `notification-unit-test-2-${Date.now()}@example.com`,
        password: 'password123',
      });
      const testAccount2 = result2.account;

      const banner = await createOrUpdateBanner({
        key: testKey('multi-dismiss'),
        type: 'info',
        message: 'Global banner',
        audience: 'authenticated',
      });

      registerTestEntity('banners', banner.id);

      // Both accounts dismiss the banner
      await dismissBanner(banner.id, testAccount.id);
      await dismissBanner(banner.id, testAccount2.id);

      const banners1 = await getActiveBanners(testAccount.id, true);
      const banners2 = await getActiveBanners(testAccount2.id, true);

      expect(banners1.map(b => b.id)).not.toContain(banner.id);
      expect(banners2.map(b => b.id)).not.toContain(banner.id);
    });

    it('should handle banners with no scheduling', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('no-schedule'),
        accountId: testAccount.id,
        type: 'info',
        message: 'Always active',
      });

      registerTestEntity('banners', banner.id);

      const banners = await getActiveBanners(testAccount.id, true);
      const bannerIds = banners.map(b => b.id);

      expect(bannerIds).toContain(banner.id);
    });

    it('should handle edge case of banner scheduled to start exactly now', async () => {
      const now = new Date();
      
      const banner = await createOrUpdateBanner({
        key: testKey('start-now'),
        accountId: testAccount.id,
        type: 'info',
        message: 'Starting now',
        scheduledStart: now,
      });

      registerTestEntity('banners', banner.id);

      // Wait a tiny bit to ensure "now" is in the past
      await new Promise(resolve => setTimeout(resolve, 10));

      const banners = await getActiveBanners(testAccount.id, true);
      const bannerIds = banners.map(b => b.id);

      expect(bannerIds).toContain(banner.id);
    });

    it('should handle edge case of banner scheduled to end exactly now', async () => {
      const now = new Date();
      
      const banner = await createOrUpdateBanner({
        key: testKey('end-now'),
        accountId: testAccount.id,
        type: 'info',
        message: 'Ending now',
        scheduledEnd: now,
      });

      registerTestEntity('banners', banner.id);

      // Wait a tiny bit to ensure "now" is in the past
      await new Promise(resolve => setTimeout(resolve, 10));

      const banners = await getActiveBanners(testAccount.id, true);
      const bannerIds = banners.map(b => b.id);

      // Banner should be excluded (scheduledEnd must be > now, not >=)
      expect(bannerIds).not.toContain(banner.id);
    });
  });

  describe('dismissBanner', () => {
    it('should create dismissal record', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('dismissal-record'),
        accountId: testAccount.id,
        type: 'info',
        message: 'Dismissable',
      });

      registerTestEntity('banners', banner.id);

      await dismissBanner(banner.id, testAccount.id);

      const dismissal = await db.bannerDismissal.findUnique({
        where: {
          bannerId_accountId: {
            bannerId: banner.id,
            accountId: testAccount.id,
          },
        },
      });

      expect(dismissal).not.toBeNull();
      expect(dismissal?.bannerId).toBe(banner.id);
      expect(dismissal?.accountId).toBe(testAccount.id);
    });

    it('should handle duplicate dismissal attempts gracefully', async () => {
      const banner = await createOrUpdateBanner({
        key: testKey('dup-dismiss'),
        accountId: testAccount.id,
        type: 'info',
        message: 'Dismissable',
      });

      registerTestEntity('banners', banner.id);

      await dismissBanner(banner.id, testAccount.id);

      // Second dismissal should fail due to unique constraint
      await expect(
        dismissBanner(banner.id, testAccount.id)
      ).rejects.toThrow();
    });
  });
});
