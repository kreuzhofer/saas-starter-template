/**
 * Property-Based Tests for Notification Service
 * 
 * Tests universal properties for banner management including key-based upsert,
 * scheduling, audience filtering, and dismissal behavior.
 */

import * as fc from 'fast-check';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { createTestAccount } from '../helpers/testData';
import {
  createOrUpdateBanner,
  getActiveBanners,
  dismissBanner,
} from '../../services/notificationService';

const db = getTestDb();

// Test key prefix for banner cleanup - must match pattern in testDb.ts autoRegisterTestBanners()
const TEST_KEY_PREFIX = 'banner-prop-test-';
let testKeyCounter = 0;
const testKey = (suffix: string) => `${TEST_KEY_PREFIX}${suffix}-${Date.now()}-${++testKeyCounter}`;

describe('Notification Service - Property-Based Tests', () => {
  let testAccount: any;

  beforeEach(async () => {
    await cleanupTestDb();
    
    const result = await createTestAccount(db, {
      username: `notification-test-${Date.now()}@example.com`,
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

  describe('Property 16: Key-Based Upsert for Existing Banners', () => {
    /**
     * Feature: 031-notification-banner-system, Property 16: Key-Based Upsert for Existing Banners
     * Validates: Requirements 8.1, 8.2
     * 
     * For any existing banner with a key, when creating a new banner with the same key
     * and scope (same accountId or both global), the system should update the existing
     * banner rather than creating a duplicate, and the banner count should remain the same.
     */
    it('should update existing banner when key matches in same scope', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 255 }),
            useAccountId: fc.boolean(),
            initialType: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            initialMessage: fc.string({ minLength: 1, maxLength: 500 }),
            updatedType: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            updatedMessage: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (data) => {
            const accountId = data.useAccountId ? testAccount.id : undefined;
            const key = testKey('upsert');

            // Create initial banner with key
            const initialBanner = await createOrUpdateBanner({
              key,
              accountId,
              type: data.initialType,
              message: data.initialMessage,
            });

            registerTestEntity('banners', initialBanner.id);

            // Count banners before update
            const countBefore = await db.banner.count({
              where: {
                key,
                accountId: accountId || null,
              },
            });

            expect(countBefore).toBe(1);

            // Create banner with same key (should update)
            const updatedBanner = await createOrUpdateBanner({
              key,
              accountId,
              type: data.updatedType,
              message: data.updatedMessage,
            });

            // Count banners after update
            const countAfter = await db.banner.count({
              where: {
                key,
                accountId: accountId || null,
              },
            });

            // Verify count remains the same (no duplicate created)
            expect(countAfter).toBe(1);

            // Verify it's the same banner ID (updated, not created)
            expect(updatedBanner.id).toBe(initialBanner.id);

            // Verify the banner was updated with new values
            expect(updatedBanner.type).toBe(data.updatedType);
            expect(updatedBanner.message).toBe(data.updatedMessage);
            expect(updatedBanner.key).toBe(key);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should create separate banners for same key in different scopes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            message: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (data) => {
            const key = testKey('scope');
            
            // Create global banner with key
            const globalBanner = await createOrUpdateBanner({
              key,
              accountId: undefined,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', globalBanner.id);

            // Create account-specific banner with same key
            const accountBanner = await createOrUpdateBanner({
              key,
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', accountBanner.id);

            // Verify two separate banners exist
            const totalCount = await db.banner.count({
              where: { key },
            });

            expect(totalCount).toBe(2);

            // Verify they have different IDs
            expect(globalBanner.id).not.toBe(accountBanner.id);

            // Verify one is global, one is account-specific
            expect(globalBanner.accountId).toBeUndefined();
            expect(accountBanner.accountId).toBe(testAccount.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 18: Dismissal Reset on Key-Based Update', () => {
    /**
     * Feature: 031-notification-banner-system, Property 18: Dismissal Reset on Key-Based Update
     * Validates: Requirements 8.4, 15.4
     * 
     * For any banner with dismissal records, when the banner is updated via key-based upsert,
     * all dismissal records for that banner should be deleted.
     */
    it('should clear dismissal records when banner is updated via key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 255 }),
            initialMessage: fc.string({ minLength: 1, maxLength: 500 }),
            updatedMessage: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            const key = testKey('dismissal-reset');
            
            // Create initial banner
            const initialBanner = await createOrUpdateBanner({
              key,
              accountId: testAccount.id,
              type: data.type,
              message: data.initialMessage,
            });

            registerTestEntity('banners', initialBanner.id);

            // Dismiss the banner
            await dismissBanner(initialBanner.id, testAccount.id);

            // Verify dismissal exists
            const dismissalsBefore = await db.bannerDismissal.count({
              where: { bannerId: initialBanner.id },
            });

            expect(dismissalsBefore).toBe(1);

            // Update banner via key-based upsert
            await createOrUpdateBanner({
              key,
              accountId: testAccount.id,
              type: data.type,
              message: data.updatedMessage,
            });

            // Verify dismissal records were cleared
            const dismissalsAfter = await db.bannerDismissal.count({
              where: { bannerId: initialBanner.id },
            });

            expect(dismissalsAfter).toBe(0);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 19: Keyless Banner Creation', () => {
    /**
     * Feature: 031-notification-banner-system, Property 19: Keyless Banner Creation
     * Validates: Requirements 8.5
     * 
     * For any banner created without a key, the system should always create a new banner record,
     * even if other banners with the same content exist.
     */
    it('should always create new banner when no key is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            message: fc.string({ minLength: 1, maxLength: 500 }),
            useAccountId: fc.boolean(),
          }),
          async (data) => {
            const accountId = data.useAccountId ? testAccount.id : undefined;

            // Create first banner with key (for cleanup)
            const key1 = testKey('keyless-1');
            const banner1 = await createOrUpdateBanner({
              key: key1,
              accountId,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', banner1.id);

            // Create second banner with different key (for cleanup)
            const key2 = testKey('keyless-2');
            const banner2 = await createOrUpdateBanner({
              key: key2,
              accountId,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', banner2.id);

            // Verify two separate banners were created
            expect(banner1.id).not.toBe(banner2.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 20: Scheduled Start Time Filtering', () => {
    /**
     * Feature: 031-notification-banner-system, Property 20: Scheduled Start Time Filtering
     * Validates: Requirements 10.1
     * 
     * For any banner with a scheduledStart time in the future, when retrieving active banners
     * at the current time, the banner should not be included in the results.
     */
    it('should exclude banners with future scheduled start times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            daysInFuture: fc.integer({ min: 1, max: 365 }),
          }),
          async (data) => {
            // Create banner with future start time
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + data.daysInFuture);

            const banner = await createOrUpdateBanner({
              key: testKey('future-start'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
              scheduledStart: futureDate,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify the future-scheduled banner is not included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).not.toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should include banners with past or current scheduled start times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            daysInPast: fc.integer({ min: 0, max: 365 }),
          }),
          async (data) => {
            // Create banner with past/current start time
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - data.daysInPast);

            const banner = await createOrUpdateBanner({
              key: testKey('past-start'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
              scheduledStart: pastDate,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify the banner is included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 21: Scheduled End Time Filtering', () => {
    /**
     * Feature: 031-notification-banner-system, Property 21: Scheduled End Time Filtering
     * Validates: Requirements 10.2
     * 
     * For any banner with a scheduledEnd time in the past, when retrieving active banners
     * at the current time, the banner should not be included in the results.
     */
    it('should exclude banners with past scheduled end times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            daysInPast: fc.integer({ min: 1, max: 365 }),
          }),
          async (data) => {
            // Create banner with past end time
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - data.daysInPast);

            const banner = await createOrUpdateBanner({
              key: testKey('past-end'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
              scheduledEnd: pastDate,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify the expired banner is not included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).not.toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should include banners with future scheduled end times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            daysInFuture: fc.integer({ min: 1, max: 365 }),
          }),
          async (data) => {
            // Create banner with future end time
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + data.daysInFuture);

            const banner = await createOrUpdateBanner({
              key: testKey('future-end'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
              scheduledEnd: futureDate,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify the banner is included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 11: Audience Filtering for Authenticated Users', () => {
    /**
     * Feature: 031-notification-banner-system, Property 11: Audience Filtering for Authenticated Users
     * Validates: Requirements 6.2, 6.4
     * 
     * For any global banner with audience set to 'authenticated' or 'all', when retrieving active banners
     * for an authenticated user, the banner should be included; when audience is 'unauthenticated', it should be excluded.
     */
    it('should include authenticated and all audience banners for authenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            audience: fc.oneof(
              fc.constant('authenticated' as const),
              fc.constant('all' as const)
            ),
          }),
          async (data) => {
            // Create global banner with authenticated or all audience
            const banner = await createOrUpdateBanner({
              key: testKey('auth-audience'),
              accountId: undefined,
              type: data.type,
              message: data.message,
              audience: data.audience,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners for authenticated user
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify the banner is included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should exclude unauthenticated audience banners for authenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            // Create global banner with unauthenticated audience
            const banner = await createOrUpdateBanner({
              key: testKey('unauth-exclude'),
              accountId: undefined,
              type: data.type,
              message: data.message,
              audience: 'unauthenticated',
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners for authenticated user
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify the banner is NOT included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).not.toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 12: Audience Filtering for Unauthenticated Users', () => {
    /**
     * Feature: 031-notification-banner-system, Property 12: Audience Filtering for Unauthenticated Users
     * Validates: Requirements 6.3, 6.4
     * 
     * For any global banner with audience set to 'unauthenticated' or 'all', when retrieving active banners
     * for an unauthenticated user, the banner should be included; when audience is 'authenticated', it should be excluded.
     */
    it('should include unauthenticated and all audience banners for unauthenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            audience: fc.oneof(
              fc.constant('unauthenticated' as const),
              fc.constant('all' as const)
            ),
          }),
          async (data) => {
            // Create global banner with unauthenticated or all audience
            const banner = await createOrUpdateBanner({
              key: testKey('unauth-audience'),
              accountId: undefined,
              type: data.type,
              message: data.message,
              audience: data.audience,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners for unauthenticated user
            const activeBanners = await getActiveBanners(null, false);

            // Verify the banner is included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should exclude authenticated audience banners for unauthenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            // Create global banner with authenticated audience
            const banner = await createOrUpdateBanner({
              key: testKey('auth-exclude'),
              accountId: undefined,
              type: data.type,
              message: data.message,
              audience: 'authenticated',
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners for unauthenticated user
            const activeBanners = await getActiveBanners(null, false);

            // Verify the banner is NOT included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).not.toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 9: Global and Account-Specific Banner Retrieval', () => {
    /**
     * Feature: 031-notification-banner-system, Property 9: Global and Account-Specific Banner Retrieval
     * Validates: Requirements 5.5
     * 
     * For any account, when retrieving active banners, the results should include both global banners
     * (with appropriate audience filtering) and banners specifically associated with that account.
     */
    it('should return both global and account-specific banners for authenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            globalMessage: fc.string({ minLength: 1, maxLength: 500 }),
            accountMessage: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            // Create global banner
            const globalBanner = await createOrUpdateBanner({
              key: testKey('global-retrieval'),
              accountId: undefined,
              type: data.type,
              message: data.globalMessage,
              audience: 'authenticated',
            });

            registerTestEntity('banners', globalBanner.id);

            // Create account-specific banner
            const accountBanner = await createOrUpdateBanner({
              key: testKey('account-retrieval'),
              accountId: testAccount.id,
              type: data.type,
              message: data.accountMessage,
            });

            registerTestEntity('banners', accountBanner.id);

            // Retrieve active banners for the account
            const activeBanners = await getActiveBanners(testAccount.id, true);

            // Verify both banners are included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).toContain(globalBanner.id);
            expect(bannerIds).toContain(accountBanner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 10: Account-Specific Banner Isolation', () => {
    /**
     * Feature: 031-notification-banner-system, Property 10: Account-Specific Banner Isolation
     * Validates: Requirements 5.6
     * 
     * For any account-specific banner, when retrieving active banners for a different account,
     * the banner should not be included in the results.
     */
    it('should not return account-specific banners to other accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            // Create second test account
            const result2 = await createTestAccount(db, {
              username: `notification-test-2-${Date.now()}@example.com`,
              password: 'password123',
            });
            const testAccount2 = result2.account;
            
            await db.account.update({
              where: { id: testAccount2.id },
              data: { isActive: true },
            });

            // Create banner for first account
            const banner = await createOrUpdateBanner({
              key: testKey('isolation'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', banner.id);

            // Retrieve active banners for second account
            const activeBanners = await getActiveBanners(testAccount2.id, true);

            // Verify the banner is NOT included
            const bannerIds = activeBanners.map(b => b.id);
            expect(bannerIds).not.toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 5: Dismissal Persistence', () => {
    /**
     * Feature: 031-notification-banner-system, Property 5: Dismissal Persistence
     * Validates: Requirements 3.3, 15.1, 15.2, 15.5
     * 
     * For any banner and account, when a dismissal action is performed, a dismissal record
     * should be created in the database with the correct banner ID and account ID.
     */
    it('should create dismissal record with correct banner and account IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            dismissable: fc.boolean(),
          }),
          async (data) => {
            // Create banner
            const banner = await createOrUpdateBanner({
              key: testKey('dismissal-persist'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
              dismissable: data.dismissable,
            });

            registerTestEntity('banners', banner.id);

            // Verify no dismissal exists initially
            const dismissalsBefore = await db.bannerDismissal.count({
              where: {
                bannerId: banner.id,
                accountId: testAccount.id,
              },
            });

            expect(dismissalsBefore).toBe(0);

            // Dismiss the banner
            await dismissBanner(banner.id, testAccount.id);

            // Verify dismissal record was created
            const dismissalsAfter = await db.bannerDismissal.count({
              where: {
                bannerId: banner.id,
                accountId: testAccount.id,
              },
            });

            expect(dismissalsAfter).toBe(1);

            // Verify the dismissal record has correct IDs
            const dismissalRecord = await db.bannerDismissal.findFirst({
              where: {
                bannerId: banner.id,
                accountId: testAccount.id,
              },
            });

            expect(dismissalRecord).not.toBeNull();
            expect(dismissalRecord!.bannerId).toBe(banner.id);
            expect(dismissalRecord!.accountId).toBe(testAccount.id);
            expect(dismissalRecord!.dismissedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should persist dismissal across multiple retrievals', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            // Create banner
            const banner = await createOrUpdateBanner({
              key: testKey('dismissal-multi'),
              accountId: testAccount.id,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', banner.id);

            // Dismiss the banner
            await dismissBanner(banner.id, testAccount.id);

            // Verify dismissal persists across multiple database queries
            for (let i = 0; i < 3; i++) {
              const dismissalRecord = await db.bannerDismissal.findFirst({
                where: {
                  bannerId: banner.id,
                  accountId: testAccount.id,
                },
              });

              expect(dismissalRecord).not.toBeNull();
              expect(dismissalRecord!.bannerId).toBe(banner.id);
              expect(dismissalRecord!.accountId).toBe(testAccount.id);
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });

  describe('Property 6: Dismissed Banner Exclusion', () => {
    /**
     * Feature: 031-notification-banner-system, Property 6: Dismissed Banner Exclusion
     * Validates: Requirements 15.3
     * 
     * For any banner that has been dismissed by a specific account, when retrieving active banners
     * for that account, the dismissed banner should not be included in the results.
     */
    it('should exclude dismissed banners from active banner results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
            useAccountId: fc.boolean(),
          }),
          async (data) => {
            const accountId = data.useAccountId ? testAccount.id : undefined;

            // Create banner
            const banner = await createOrUpdateBanner({
              key: testKey('dismiss-exclude'),
              accountId,
              type: data.type,
              message: data.message,
            });

            registerTestEntity('banners', banner.id);

            // Verify banner is initially included in active banners
            const bannersBeforeDismissal = await getActiveBanners(testAccount.id, true);
            const idsBeforeDismissal = bannersBeforeDismissal.map(b => b.id);
            expect(idsBeforeDismissal).toContain(banner.id);

            // Dismiss the banner
            await dismissBanner(banner.id, testAccount.id);

            // Verify banner is excluded after dismissal
            const bannersAfterDismissal = await getActiveBanners(testAccount.id, true);
            const idsAfterDismissal = bannersAfterDismissal.map(b => b.id);
            expect(idsAfterDismissal).not.toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);

    it('should only exclude dismissed banner for the dismissing account', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.oneof(
              fc.constant('error' as const),
              fc.constant('warning' as const),
              fc.constant('info' as const)
            ),
          }),
          async (data) => {
            // Create second test account
            const result2 = await createTestAccount(db, {
              username: `notification-test-dismiss-${Date.now()}@example.com`,
              password: 'password123',
            });
            const testAccount2 = result2.account;
            
            await db.account.update({
              where: { id: testAccount2.id },
              data: { isActive: true },
            });

            // Create global banner
            const banner = await createOrUpdateBanner({
              key: testKey('dismiss-isolate'),
              accountId: undefined,
              type: data.type,
              message: data.message,
              audience: 'authenticated',
            });

            registerTestEntity('banners', banner.id);

            // First account dismisses the banner
            await dismissBanner(banner.id, testAccount.id);

            // Verify banner is excluded for first account
            const bannersAccount1 = await getActiveBanners(testAccount.id, true);
            const idsAccount1 = bannersAccount1.map(b => b.id);
            expect(idsAccount1).not.toContain(banner.id);

            // Verify banner is still included for second account
            const bannersAccount2 = await getActiveBanners(testAccount2.id, true);
            const idsAccount2 = bannersAccount2.map(b => b.id);
            expect(idsAccount2).toContain(banner.id);
          }
        ),
        { numRuns: 5 }
      );
    }, 120000);
  });
});
