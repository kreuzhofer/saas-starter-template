/**
 * Property-Based Tests for Account Tier Database Operations
 * 
 * Feature: account-tiers-and-limits, Property 3: New Account Default Tier
 * Validates: Requirements 2.2
 * 
 * These tests verify that:
 * - For any newly created account, the tier field shall be set to "starter"
 */

import * as fc from 'fast-check';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';

describe('Account Tier Property Tests', () => {
  const db = getTestDb();

  afterAll(async () => {
    await cleanupTestDb();
  });

  /**
   * Property 3: New Account Default Tier
   * 
   * For any newly created account, the tier field shall be set to "starter".
   */
  describe('Property 3: New Account Default Tier', () => {
    // Generator for valid email addresses
    const emailArb = fc.tuple(
      fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
      fc.integer({ min: 1000, max: 9999 })
    ).map(([name, num]) => `tier-test-${name}-${num}@example.com`);

    // Generator for valid passwords
    const passwordArb = fc.string({ minLength: 8, maxLength: 20 })
      .filter(s => /[a-zA-Z]/.test(s) && /[0-9]/.test(s));

    it('should assign "starter" tier to newly created accounts without explicit tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          async (email, password) => {
            const passwordHash = await hashPassword(password);
            
            // Create account without specifying tier
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
              },
            });

            registerTestEntity('accounts', account.id);

            // Property: New account should have "starter" tier by default
            expect(account.tier).toBe('starter');

            // Verify by re-fetching from database
            const fetchedAccount = await db.account.findUnique({
              where: { id: account.id },
            });
            expect(fetchedAccount?.tier).toBe('starter');

            // Cleanup this specific account
            await db.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should persist "starter" tier across database operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
          async (email, password, firstName) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
              },
            });

            registerTestEntity('accounts', account.id);

            // Update other fields (not tier)
            await db.account.update({
              where: { id: account.id },
              data: { firstName },
            });

            // Property: Tier should still be "starter" after updating other fields
            const updatedAccount = await db.account.findUnique({
              where: { id: account.id },
            });
            expect(updatedAccount?.tier).toBe('starter');
            expect(updatedAccount?.firstName).toBe(firstName);

            // Cleanup
            await db.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should allow explicit tier assignment during creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fc.constantFrom('starter', 'pro', 'business', 'enterprise'),
          async (email, password, tier) => {
            const passwordHash = await hashPassword(password);
            
            // Create account with explicit tier
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: tier as 'starter' | 'pro' | 'business' | 'enterprise',
              },
            });

            registerTestEntity('accounts', account.id);

            // Property: Account should have the explicitly assigned tier
            expect(account.tier).toBe(tier);

            // Verify by re-fetching
            const fetchedAccount = await db.account.findUnique({
              where: { id: account.id },
            });
            expect(fetchedAccount?.tier).toBe(tier);

            // Cleanup
            await db.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should allow tier updates after account creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fc.constantFrom('pro', 'business', 'enterprise'),
          async (email, password, newTier) => {
            const passwordHash = await hashPassword(password);
            
            // Create account (defaults to starter)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
              },
            });

            registerTestEntity('accounts', account.id);

            // Verify initial tier is starter
            expect(account.tier).toBe('starter');

            // Update tier
            const updatedAccount = await db.account.update({
              where: { id: account.id },
              data: { tier: newTier as 'pro' | 'business' | 'enterprise' },
            });

            // Property: Tier should be updated to the new value
            expect(updatedAccount.tier).toBe(newTier);

            // Verify by re-fetching
            const fetchedAccount = await db.account.findUnique({
              where: { id: account.id },
            });
            expect(fetchedAccount?.tier).toBe(newTier);

            // Cleanup
            await db.account.delete({ where: { id: account.id } });
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
