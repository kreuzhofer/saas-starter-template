/**
 * Property Tests for Override Cleanup Task
 * 
 * Tests the override cleanup scheduled task including:
 * - Property 14: Override Cleanup Correctness
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import prisma from '../../db/client';
import { overrideCleanupTask } from '../../tasks/overrideCleanup';

describe('Override Cleanup Task Properties', () => {
  const testAccountIds: string[] = [];

  afterAll(async () => {
    // Clean up test accounts and their related data
    if (testAccountIds.length > 0) {
      await prisma.limitOverride.deleteMany({
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
  async function createTestAccount(): Promise<string> {
    const account = await prisma.account.create({
      data: {
        username: `test-cleanup-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: 'test-hash',
        isActive: true,
        tier: 'starter',
      },
    });
    testAccountIds.push(account.id);
    return account.id;
  }

  /**
   * Property 14: Override Cleanup Correctness
   * 
   * The cleanup task should:
   * - Delete all overrides where expiresAt < now
   * - Preserve all overrides where expiresAt >= now or expiresAt is null (permanent)
   */
  describe('Property 14: Override Cleanup Correctness', () => {
    it('should delete expired overrides and preserve non-expired ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // number of expired overrides
          fc.integer({ min: 1, max: 5 }), // number of non-expired overrides
          fc.integer({ min: 1, max: 5 }), // number of permanent overrides
          async (expiredCount, nonExpiredCount, permanentCount) => {
            const accountId = await createTestAccount();
            const now = new Date();

            // Create expired overrides
            for (let i = 0; i < expiredCount; i++) {
              await prisma.limitOverride.create({
                data: {
                  accountId,
                  limitName: `expired-limit-${i}`,
                  overrideValue: 100,
                  expiresAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000), // 1-N days ago
                },
              });
            }

            // Create non-expired overrides
            for (let i = 0; i < nonExpiredCount; i++) {
              await prisma.limitOverride.create({
                data: {
                  accountId,
                  limitName: `active-limit-${i}`,
                  overrideValue: 200,
                  expiresAt: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000), // 1-N days from now
                },
              });
            }

            // Create permanent overrides (null expiresAt)
            for (let i = 0; i < permanentCount; i++) {
              await prisma.limitOverride.create({
                data: {
                  accountId,
                  limitName: `permanent-limit-${i}`,
                  overrideValue: 300,
                  expiresAt: null,
                },
              });
            }

            // Verify initial counts
            const initialOverrides = await prisma.limitOverride.findMany({
              where: { accountId },
            });
            expect(initialOverrides.length).toBe(expiredCount + nonExpiredCount + permanentCount);

            // Execute cleanup task
            await overrideCleanupTask.execute();

            // Verify results
            const remainingOverrides = await prisma.limitOverride.findMany({
              where: { accountId },
              orderBy: { limitName: 'asc' },
            });

            // Should have deleted expired, kept non-expired and permanent
            expect(remainingOverrides.length).toBe(nonExpiredCount + permanentCount);

            // Verify no expired overrides remain
            const expiredRemaining = remainingOverrides.filter(
              o => o.expiresAt && o.expiresAt < now
            );
            expect(expiredRemaining.length).toBe(0);

            // Verify all non-expired overrides remain
            const activeRemaining = remainingOverrides.filter(
              o => o.limitName.startsWith('active-limit-')
            );
            expect(activeRemaining.length).toBe(nonExpiredCount);

            // Verify all permanent overrides remain
            const permanentRemaining = remainingOverrides.filter(
              o => o.limitName.startsWith('permanent-limit-')
            );
            expect(permanentRemaining.length).toBe(permanentCount);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle empty database gracefully', async () => {
      // Ensure no overrides exist for test accounts
      if (testAccountIds.length > 0) {
        await prisma.limitOverride.deleteMany({
          where: { accountId: { in: testAccountIds } },
        });
      }

      // Execute cleanup task - should not throw
      await expect(overrideCleanupTask.execute()).resolves.not.toThrow();
    });

    it('should delete overrides that expired exactly at the current moment', async () => {
      const accountId = await createTestAccount();
      
      // Create an override that expired 1 second ago
      const justExpired = new Date(Date.now() - 1000);
      await prisma.limitOverride.create({
        data: {
          accountId,
          limitName: 'just-expired',
          overrideValue: 100,
          expiresAt: justExpired,
        },
      });

      // Execute cleanup
      await overrideCleanupTask.execute();

      // Verify it was deleted
      const remaining = await prisma.limitOverride.findMany({
        where: { accountId },
      });
      expect(remaining.length).toBe(0);
    });

    it('should preserve overrides expiring in the future', async () => {
      const accountId = await createTestAccount();
      
      // Create an override that expires in 1 second
      const expiresInFuture = new Date(Date.now() + 60000); // 1 minute from now
      await prisma.limitOverride.create({
        data: {
          accountId,
          limitName: 'expires-soon',
          overrideValue: 100,
          expiresAt: expiresInFuture,
        },
      });

      // Execute cleanup
      await overrideCleanupTask.execute();

      // Verify it was preserved
      const remaining = await prisma.limitOverride.findMany({
        where: { accountId },
      });
      expect(remaining.length).toBe(1);
      expect(remaining[0].limitName).toBe('expires-soon');
    });
  });

  describe('Task Configuration', () => {
    it('should have correct task configuration', () => {
      expect(overrideCleanupTask.name).toBe('override-cleanup');
      expect(overrideCleanupTask.schedule).toBe('0 3 * * *'); // Daily at 03:00 UTC
      expect(overrideCleanupTask.enabled).toBe(true);
      expect(typeof overrideCleanupTask.execute).toBe('function');
      expect(typeof overrideCleanupTask.onError).toBe('function');
    });
  });
});
