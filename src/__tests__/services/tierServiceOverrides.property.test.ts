/**
 * Property Tests for TierService Override Behavior
 * 
 * Tests the limit override functionality including:
 * - Property 12: Active Override Precedence
 * - Property 13: Expired Override Ignored
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import prisma from '../../db/client';
import { TierService } from '../../services/tierService';
import { ACCOUNT_TIERS, AccountTier } from '../../types/accountTier';

describe('TierService Override Properties', () => {
  let tierService: TierService;
  const testAccountIds: string[] = [];

  beforeAll(async () => {
    tierService = new TierService();
  });

  afterAll(async () => {
    // Clean up test accounts and their related data
    if (testAccountIds.length > 0) {
      await prisma.limitOverride.deleteMany({
        where: { accountId: { in: testAccountIds } },
      });
      await prisma.usageRecord.deleteMany({
        where: { accountId: { in: testAccountIds } },
      });
      await prisma.account.deleteMany({
        where: { id: { in: testAccountIds } },
      });
    }
  });

  beforeEach(async () => {
    // Clean up overrides before each test
    if (testAccountIds.length > 0) {
      await prisma.limitOverride.deleteMany({
        where: { accountId: { in: testAccountIds } },
      });
    }
  });

  /**
   * Helper to create a test account
   */
  async function createTestAccount(tier: AccountTier = 'starter'): Promise<string> {
    const account = await prisma.account.create({
      data: {
        username: `test-override-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: 'test-hash',
        isActive: true,
        tier,
      },
    });
    testAccountIds.push(account.id);
    return account.id;
  }

  /**
   * Property 12: Active Override Precedence
   * 
   * For any account with an active (non-expired) override:
   * - getLimit should return the override value, not the tier default
   * - The override value should be exactly what was set
   */
  describe('Property 12: Active Override Precedence', () => {
    it('should return override value instead of tier default when override is active', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_TIERS),
          fc.integer({ min: 1, max: 10000 }),
          async (tier, overrideValue) => {
            const accountId = await createTestAccount(tier);
            const limitName = 'short_urls_total';

            // Get the tier default first
            const tierDefault = await tierService.getTierDefaultLimit(accountId, limitName);

            // Set an override with a different value
            const actualOverrideValue = overrideValue === tierDefault ? overrideValue + 1 : overrideValue;
            await tierService.setOverride(accountId, limitName, actualOverrideValue);

            // getLimit should return the override value
            const result = await tierService.getLimit(accountId, limitName);
            expect(result).toBe(actualOverrideValue);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should return override value for permanent overrides (no expiration)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          async (overrideValue) => {
            const accountId = await createTestAccount('starter');
            const limitName = 'short_urls_total';

            // Set a permanent override (null expiresAt)
            await tierService.setOverride(accountId, limitName, overrideValue, null);

            // getLimit should return the override value
            const result = await tierService.getLimit(accountId, limitName);
            expect(result).toBe(overrideValue);

            // Verify it's marked as permanent
            const overrides = await tierService.getOverrides(accountId);
            const override = overrides.find(o => o.limitName === limitName);
            expect(override?.isPermanent).toBe(true);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should return override value for non-expired time-bound overrides', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 365 }), // days in the future
          async (overrideValue, daysInFuture) => {
            const accountId = await createTestAccount('starter');
            const limitName = 'short_urls_total';

            // Set an override that expires in the future
            const expiresAt = new Date(Date.now() + daysInFuture * 24 * 60 * 60 * 1000);
            await tierService.setOverride(accountId, limitName, overrideValue, expiresAt);

            // getLimit should return the override value
            const result = await tierService.getLimit(accountId, limitName);
            expect(result).toBe(overrideValue);
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  /**
   * Property 13: Expired Override Ignored
   * 
   * For any account with an expired override:
   * - getLimit should return the tier default, not the override value
   * - The expired override should not affect limit calculations
   */
  describe('Property 13: Expired Override Ignored', () => {
    it('should return tier default when override is expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_TIERS),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 365 }), // days in the past
          async (tier, overrideValue, daysInPast) => {
            const accountId = await createTestAccount(tier);
            const limitName = 'short_urls_total';

            // Get the tier default
            const tierDefault = await tierService.getTierDefaultLimit(accountId, limitName);

            // Set an override that expired in the past
            const expiresAt = new Date(Date.now() - daysInPast * 24 * 60 * 60 * 1000);
            
            // Create the override directly in the database (bypassing any validation)
            await prisma.limitOverride.create({
              data: {
                accountId,
                limitName,
                overrideValue,
                expiresAt,
              },
            });

            // getLimit should return the tier default, not the expired override
            const result = await tierService.getLimit(accountId, limitName);
            expect(result).toBe(tierDefault);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should ignore override that expired exactly now', async () => {
      const accountId = await createTestAccount('starter');
      const limitName = 'short_urls_total';
      const overrideValue = 9999;

      // Get the tier default
      const tierDefault = await tierService.getTierDefaultLimit(accountId, limitName);

      // Set an override that expires exactly now (or slightly in the past)
      const expiresAt = new Date(Date.now() - 1000); // 1 second ago
      
      await prisma.limitOverride.create({
        data: {
          accountId,
          limitName,
          overrideValue,
          expiresAt,
        },
      });

      // getLimit should return the tier default
      const result = await tierService.getLimit(accountId, limitName);
      expect(result).toBe(tierDefault);
    });
  });

  /**
   * Additional property: Override CRUD operations
   */
  describe('Override CRUD Operations', () => {
    it('should correctly set, get, and delete overrides', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          async (overrideValue) => {
            const accountId = await createTestAccount('starter');
            const limitName = 'short_urls_total';

            // Initially no overrides
            let overrides = await tierService.getOverrides(accountId);
            expect(overrides.length).toBe(0);

            // Set an override
            await tierService.setOverride(accountId, limitName, overrideValue);

            // Should have one override
            overrides = await tierService.getOverrides(accountId);
            expect(overrides.length).toBe(1);
            expect(overrides[0].limitName).toBe(limitName);
            expect(overrides[0].overrideValue).toBe(overrideValue);

            // Delete the override
            await tierService.deleteOverride(accountId, limitName);

            // Should have no overrides
            overrides = await tierService.getOverrides(accountId);
            expect(overrides.length).toBe(0);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should update existing override when setting same limit', async () => {
      const accountId = await createTestAccount('starter');
      const limitName = 'short_urls_total';

      // Set initial override
      await tierService.setOverride(accountId, limitName, 100);
      let result = await tierService.getLimit(accountId, limitName);
      expect(result).toBe(100);

      // Update the override
      await tierService.setOverride(accountId, limitName, 200);
      result = await tierService.getLimit(accountId, limitName);
      expect(result).toBe(200);

      // Should still have only one override
      const overrides = await tierService.getOverrides(accountId);
      expect(overrides.length).toBe(1);
    });

    it('should correctly identify expiring soon overrides', async () => {
      const accountId = await createTestAccount('starter');
      const limitName = 'short_urls_total';

      // Set an override expiring in 3 days (within 7 day threshold)
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await tierService.setOverride(accountId, limitName, 100, expiresAt);

      const overrides = await tierService.getOverrides(accountId);
      expect(overrides.length).toBe(1);
      expect(overrides[0].isExpiringSoon).toBe(true);
      expect(overrides[0].isPermanent).toBe(false);
    });

    it('should not mark override as expiring soon if more than 7 days away', async () => {
      const accountId = await createTestAccount('starter');
      const limitName = 'short_urls_total';

      // Set an override expiring in 10 days (outside 7 day threshold)
      const expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      await tierService.setOverride(accountId, limitName, 100, expiresAt);

      const overrides = await tierService.getOverrides(accountId);
      expect(overrides.length).toBe(1);
      expect(overrides[0].isExpiringSoon).toBe(false);
      expect(overrides[0].isPermanent).toBe(false);
    });
  });
});
