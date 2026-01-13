/**
 * Property-Based Tests for TierService Feature and Limit Lookups
 * 
 * Feature: account-tiers-and-limits, Property 5: Feature Lookup Consistency
 * Feature: account-tiers-and-limits, Property 6: Limit Lookup Consistency
 * Validates: Requirements 3.2, 3.5, 4.2, 4.5
 * 
 * These tests verify that:
 * - For any account and feature name that exists in the configuration,
 *   hasFeature returns the boolean value defined for that feature in the account's tier
 * - For any account and limit name that exists in the configuration,
 *   getLimit returns the numeric value defined for that limit in the account's tier
 */

import * as fc from 'fast-check';
import { getTestDb, cleanupTestDb, registerTestEntity } from '../helpers/testDb';
import { hashPassword } from '../../services/auth';
import { tierService, getCurrentPeriodStart } from '../../services/tierService';
import { getTierConfig, getFeatureNames, getLimitNames } from '../../config/tierConfig';
import { AccountTier, ACCOUNT_TIERS } from '../../types/accountTier';

describe('TierService Property Tests', () => {
  const db = getTestDb();
  const config = getTierConfig();
  const featureNames = getFeatureNames();
  const limitNames = getLimitNames();

  afterAll(async () => {
    await cleanupTestDb();
  });

  // Generator for valid email addresses with unique identifiers
  const emailArb = fc.tuple(
    fc.string({ minLength: 3, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
    fc.integer({ min: 1000, max: 9999 })
  ).map(([name, num]) => `tier-svc-test-${name}-${num}@example.com`);

  // Generator for valid passwords
  const passwordArb = fc.string({ minLength: 8, maxLength: 20 })
    .filter(s => /[a-zA-Z]/.test(s) && /[0-9]/.test(s));

  // Generator for valid account tiers
  const tierArb = fc.constantFrom<AccountTier>('starter', 'pro', 'business', 'enterprise');

  // Generator for valid feature names from config
  const featureNameArb = fc.constantFrom(...featureNames);

  // Generator for valid limit names from config
  const limitNameArb = fc.constantFrom(...limitNames);

  // Generator for unknown feature names (not in config)
  const unknownFeatureArb = fc.string({ minLength: 5, maxLength: 20 })
    .filter(s => /^[a-z_][a-z0-9_]*$/.test(s) && !featureNames.includes(s));

  // Generator for unknown limit names (not in config)
  const unknownLimitArb = fc.string({ minLength: 5, maxLength: 20 })
    .filter(s => /^[a-z_][a-z0-9_]*$/.test(s) && !limitNames.includes(s));

  /**
   * Property 5: Feature Lookup Consistency
   * 
   * For any account and feature name that exists in the configuration,
   * hasFeature(accountId, featureName) shall return the boolean value
   * defined for that feature in the account's tier.
   */
  describe('Property 5: Feature Lookup Consistency', () => {
    it('should return the correct feature value for any tier and feature combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          featureNameArb,
          async (email, password, tier, featureName) => {
            const passwordHash = await hashPassword(password);
            
            // Create account with specific tier
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Get the expected value from config
              const expectedValue = config.tiers[tier].features[featureName];

              // Property: hasFeature should return the value from config
              const actualValue = await tierService.hasFeature(account.id, featureName);
              expect(actualValue).toBe(expectedValue);
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return false for unknown feature names', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          unknownFeatureArb,
          async (email, password, tier, unknownFeature) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Property: Unknown features should return false (Requirement 3.3)
              const result = await tierService.hasFeature(account.id, unknownFeature);
              expect(result).toBe(false);
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return all features correctly via getFeatures', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          async (email, password, tier) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Get all features
              const features = await tierService.getFeatures(account.id);
              const expectedFeatures = config.tiers[tier].features;

              // Property: getFeatures should return all features from config
              expect(Object.keys(features).sort()).toEqual(Object.keys(expectedFeatures).sort());
              
              // Each feature value should match
              for (const featureName of Object.keys(expectedFeatures)) {
                expect(features[featureName]).toBe(expectedFeatures[featureName]);
              }
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 6: Limit Lookup Consistency
   * 
   * For any account and limit name that exists in the configuration,
   * getLimit(accountId, limitName) shall return the numeric value
   * defined for that limit in the account's tier.
   */
  describe('Property 6: Limit Lookup Consistency', () => {
    it('should return the correct limit value for any tier and limit combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          async (email, password, tier, limitName) => {
            const passwordHash = await hashPassword(password);
            
            // Create account with specific tier
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Get the expected value from config
              const expectedValue = config.tiers[tier].limits[limitName];

              // Property: getLimit should return the value from config
              const actualValue = await tierService.getLimit(account.id, limitName);
              expect(actualValue).toBe(expectedValue);
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return 0 for unknown limit names', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          unknownLimitArb,
          async (email, password, tier, unknownLimit) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Property: Unknown limits should return 0 (Requirement 4.3)
              const result = await tierService.getLimit(account.id, unknownLimit);
              expect(result).toBe(0);
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return all limits correctly via getLimits', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          async (email, password, tier) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Get all limits
              const limits = await tierService.getLimits(account.id);
              const expectedLimits = config.tiers[tier].limits;

              // Property: getLimits should return all limits from config
              expect(Object.keys(limits).sort()).toEqual(Object.keys(expectedLimits).sort());
              
              // Each limit value should match
              for (const limitName of Object.keys(expectedLimits)) {
                expect(limits[limitName]).toBe(expectedLimits[limitName]);
              }
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should correctly identify unlimited limits (-1)', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          limitNameArb,
          async (email, password, limitName) => {
            const passwordHash = await hashPassword(password);
            
            // Create enterprise account (has unlimited limits)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'enterprise',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Get the limit value
              const limitValue = await tierService.getLimit(account.id, limitName);
              const expectedValue = config.tiers.enterprise.limits[limitName];

              // Property: Enterprise tier should have unlimited (-1) for all limits
              expect(limitValue).toBe(expectedValue);
              expect(limitValue).toBe(-1);
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Additional consistency tests
   */
  describe('Cross-tier consistency', () => {
    it('should return consistent results when tier changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          tierArb,
          featureNameArb,
          async (email, password, initialTier, newTier, featureName) => {
            const passwordHash = await hashPassword(password);
            
            // Create account with initial tier
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: initialTier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Verify initial feature value
              const initialValue = await tierService.hasFeature(account.id, featureName);
              expect(initialValue).toBe(config.tiers[initialTier].features[featureName]);

              // Update tier
              await db.account.update({
                where: { id: account.id },
                data: { tier: newTier },
              });

              // Property: Feature value should reflect the new tier
              const newValue = await tierService.hasFeature(account.id, featureName);
              expect(newValue).toBe(config.tiers[newTier].features[featureName]);
            } finally {
              // Cleanup
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 7: Usage Increment Idempotent Creation
   * 
   * For any account and limit name, calling incrementUsage shall succeed
   * regardless of whether a usage record already exists for the current period,
   * and the resulting usage value shall be the previous value plus the increment amount.
   * 
   * Validates: Requirements 5.3
   */
  describe('Property 7: Usage Increment Idempotent Creation', () => {
    it('should create record if none exists and increment correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          fc.integer({ min: 1, max: 100 }),
          async (email, password, tier, limitName, incrementAmount) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Get initial usage (should be 0 for new account)
              const initialUsage = await tierService.getUsage(account.id, limitName);
              expect(initialUsage).toBe(0);

              // Increment usage
              await tierService.incrementUsage(account.id, limitName, incrementAmount);

              // Property: Usage should be previous value + increment
              const newUsage = await tierService.getUsage(account.id, limitName);
              expect(newUsage).toBe(initialUsage + incrementAmount);
            } finally {
              // Cleanup usage records
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should increment existing record correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          async (email, password, tier, limitName, firstIncrement, secondIncrement) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // First increment
              await tierService.incrementUsage(account.id, limitName, firstIncrement);
              const afterFirst = await tierService.getUsage(account.id, limitName);
              expect(afterFirst).toBe(firstIncrement);

              // Second increment
              await tierService.incrementUsage(account.id, limitName, secondIncrement);
              
              // Property: Usage should be sum of both increments
              const afterSecond = await tierService.getUsage(account.id, limitName);
              expect(afterSecond).toBe(firstIncrement + secondIncrement);
            } finally {
              // Cleanup usage records
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 8: Capacity Check Correctness
   * 
   * For any account and limit name, checkCapacity(accountId, limitName) shall return
   * true if and only if the current usage is less than the tier's limit value
   * (or the limit is unlimited, indicated by -1).
   * 
   * Validates: Requirements 5.6
   */
  describe('Property 8: Capacity Check Correctness', () => {
    it('should return true when usage is below limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          limitNameArb,
          async (email, password, limitName) => {
            const passwordHash = await hashPassword(password);
            
            // Create starter account (has limited limits)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'starter',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const limit = config.tiers.starter.limits[limitName];
              
              // Skip if limit is 0 (no capacity at all)
              if (limit === 0) {
                const hasCapacity = await tierService.checkCapacity(account.id, limitName, 1);
                expect(hasCapacity).toBe(false);
                return;
              }

              // Property: With no usage, should have capacity
              const hasCapacity = await tierService.checkCapacity(account.id, limitName, 1);
              expect(hasCapacity).toBe(true);
            } finally {
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return false when usage equals or exceeds limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          async (email, password) => {
            const passwordHash = await hashPassword(password);
            
            // Create starter account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'starter',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Use short_urls_total which has limit of 10 for starter
              const limitName = 'short_urls_total';
              const limit = config.tiers.starter.limits[limitName];

              // Set usage to exactly the limit
              const periodStart = getCurrentPeriodStart();
              await db.usageRecord.create({
                data: {
                  accountId: account.id,
                  limitName,
                  value: limit,
                  periodStart,
                },
              });

              // Property: At limit, should not have capacity for more
              const hasCapacity = await tierService.checkCapacity(account.id, limitName, 1);
              expect(hasCapacity).toBe(false);
            } finally {
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should always return true for unlimited limits (-1)', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          limitNameArb,
          fc.integer({ min: 0, max: 1000000 }),
          async (email, password, limitName, currentUsage) => {
            const passwordHash = await hashPassword(password);
            
            // Create enterprise account (has unlimited limits)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'enterprise',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Set arbitrary usage
              if (currentUsage > 0) {
                const periodStart = getCurrentPeriodStart();
                await db.usageRecord.create({
                  data: {
                    accountId: account.id,
                    limitName,
                    value: currentUsage,
                    periodStart,
                  },
                });
              }

              // Property: Enterprise (unlimited) should always have capacity
              const hasCapacity = await tierService.checkCapacity(account.id, limitName, 1);
              expect(hasCapacity).toBe(true);
            } finally {
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 9: Period Reset Isolation
   * 
   * For any account with usage records, usage records from different periods
   * shall be independent—resetting or querying usage for one period shall not
   * affect other periods.
   * 
   * Validates: Requirements 5.7
   */
  describe('Property 9: Period Reset Isolation', () => {
    it('should only reset current period usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          async (email, password, tier, limitName, currentPeriodUsage, previousPeriodUsage) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const currentPeriodStart = getCurrentPeriodStart();
              
              // Create a previous period (last month)
              const previousPeriodStart = new Date(currentPeriodStart);
              previousPeriodStart.setUTCMonth(previousPeriodStart.getUTCMonth() - 1);

              // Create usage records for both periods
              await db.usageRecord.create({
                data: {
                  accountId: account.id,
                  limitName,
                  value: currentPeriodUsage,
                  periodStart: currentPeriodStart,
                },
              });

              await db.usageRecord.create({
                data: {
                  accountId: account.id,
                  limitName,
                  value: previousPeriodUsage,
                  periodStart: previousPeriodStart,
                },
              });

              // Reset current period usage
              await tierService.resetUsage(account.id, limitName);

              // Property: Current period should be reset (getUsage returns 0)
              const currentUsage = await tierService.getUsage(account.id, limitName);
              expect(currentUsage).toBe(0);

              // Property: Previous period should be unaffected
              const previousRecord = await db.usageRecord.findUnique({
                where: {
                  accountId_limitName_periodStart: {
                    accountId: account.id,
                    limitName,
                    periodStart: previousPeriodStart,
                  },
                },
              });
              expect(previousRecord).not.toBeNull();
              expect(previousRecord?.value).toBe(previousPeriodUsage);
            } finally {
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should query only current period usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          async (email, password, tier, limitName, currentPeriodUsage, previousPeriodUsage) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const currentPeriodStart = getCurrentPeriodStart();
              
              // Create a previous period (last month)
              const previousPeriodStart = new Date(currentPeriodStart);
              previousPeriodStart.setUTCMonth(previousPeriodStart.getUTCMonth() - 1);

              // Create usage record only for previous period
              await db.usageRecord.create({
                data: {
                  accountId: account.id,
                  limitName,
                  value: previousPeriodUsage,
                  periodStart: previousPeriodStart,
                },
              });

              // Property: getUsage should return 0 for current period (no record)
              const currentUsage = await tierService.getUsage(account.id, limitName);
              expect(currentUsage).toBe(0);

              // Now create current period record
              await db.usageRecord.create({
                data: {
                  accountId: account.id,
                  limitName,
                  value: currentPeriodUsage,
                  periodStart: currentPeriodStart,
                },
              });

              // Property: getUsage should return only current period value
              const updatedUsage = await tierService.getUsage(account.id, limitName);
              expect(updatedUsage).toBe(currentPeriodUsage);
            } finally {
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 3: Count Capacity Check Correctness (Custom Domains Feature Gating)
   * 
   * For any current count and limit value where limit >= 0, 
   * checkCountCapacity(accountId, limitName, currentCount) shall return true 
   * if and only if currentCount < limit. For limit = -1 (unlimited), it shall always return true.
   * 
   * Feature: custom-domains-feature-gating, Property 3: Count Capacity Check Correctness
   * Validates: Requirements 4.2, 4.3, 4.4, 4.5
   */
  describe('Property 3: Count Capacity Check Correctness', () => {
    it('should return true when currentCount < limit for positive limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          async (email, password) => {
            const passwordHash = await hashPassword(password);
            
            // Create business account (has custom_domains_total = 1)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'business',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const limitName = 'custom_domains_total';
              const limit = config.tiers.business.limits[limitName]; // 1
              
              // Property: currentCount (0) < limit (1) should return true
              const hasCapacity = await tierService.checkCountCapacity(account.id, limitName, 0);
              expect(hasCapacity).toBe(true);
            } finally {
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should return false when currentCount >= limit for positive limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fc.integer({ min: 1, max: 100 }),
          async (email, password, countAboveLimit) => {
            const passwordHash = await hashPassword(password);
            
            // Create business account (has custom_domains_total = 1)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'business',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const limitName = 'custom_domains_total';
              const limit = config.tiers.business.limits[limitName]; // 1
              
              // Property: currentCount >= limit should return false
              // Test at limit
              const atLimit = await tierService.checkCountCapacity(account.id, limitName, limit);
              expect(atLimit).toBe(false);
              
              // Test above limit
              const aboveLimit = await tierService.checkCountCapacity(account.id, limitName, limit + countAboveLimit);
              expect(aboveLimit).toBe(false);
            } finally {
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should always return true for unlimited limits (-1)', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          limitNameArb,
          fc.integer({ min: 0, max: 1000000 }),
          async (email, password, limitName, currentCount) => {
            const passwordHash = await hashPassword(password);
            
            // Create enterprise account (has unlimited limits)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'enterprise',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Property: Enterprise (unlimited, -1) should always return true
              const hasCapacity = await tierService.checkCountCapacity(account.id, limitName, currentCount);
              expect(hasCapacity).toBe(true);
            } finally {
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should always return false for zero limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fc.integer({ min: 0, max: 100 }),
          async (email, password, currentCount) => {
            const passwordHash = await hashPassword(password);
            
            // Create starter account (has custom_domains_total = 0)
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier: 'starter',
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const limitName = 'custom_domains_total';
              
              // Property: Zero limit should always return false
              const hasCapacity = await tierService.checkCountCapacity(account.id, limitName, currentCount);
              expect(hasCapacity).toBe(false);
            } finally {
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should correctly evaluate count vs limit for any valid combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          fc.integer({ min: 0, max: 100 }),
          async (email, password, tier, limitName, currentCount) => {
            const passwordHash = await hashPassword(password);
            
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              const limit = config.tiers[tier].limits[limitName];
              const hasCapacity = await tierService.checkCountCapacity(account.id, limitName, currentCount);
              
              // Property: The result should match the expected logic
              if (limit === -1) {
                // Unlimited: always true
                expect(hasCapacity).toBe(true);
              } else if (limit === 0) {
                // Zero limit: always false
                expect(hasCapacity).toBe(false);
              } else {
                // Positive limit: true iff currentCount < limit
                expect(hasCapacity).toBe(currentCount < limit);
              }
            } finally {
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 11: Usage Percentage Calculation
   * 
   * For any account and limit, the reported usage percentage shall equal
   * (currentUsage / limitValue) * 100, or 0 if the limit is unlimited.
   * 
   * Validates: Requirements 7.4
   */
  describe('Property 11: Usage Percentage Calculation', () => {
    it('should calculate percentage as (current / limit) * 100 for limited limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          async (currentUsage, limitValue) => {
            // Property: percentage = (current / limit) * 100
            const expectedPercentage = (currentUsage / limitValue) * 100;
            const actualPercentage = tierService.calculateUsagePercentage(currentUsage, limitValue);
            
            expect(actualPercentage).toBeCloseTo(expectedPercentage, 10);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return 0 percentage for unlimited limits (-1)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000000 }),
          async (currentUsage) => {
            // Property: unlimited limits (-1) should always return 0 percentage
            const percentage = tierService.calculateUsagePercentage(currentUsage, -1);
            expect(percentage).toBe(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle zero limit correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          async (currentUsage) => {
            // Property: zero limit with usage > 0 should return 100%, with usage = 0 should return 0%
            const percentage = tierService.calculateUsagePercentage(currentUsage, 0);
            
            if (currentUsage > 0) {
              expect(percentage).toBe(100);
            } else {
              expect(percentage).toBe(0);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return correct percentage via getTierInfo', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          tierArb,
          limitNameArb,
          fc.integer({ min: 0, max: 500 }),
          async (email, password, tier, limitName, usageValue) => {
            const passwordHash = await hashPassword(password);
            
            // Create account
            const account = await db.account.create({
              data: {
                username: email,
                passwordHash,
                isActive: true,
                tier,
              },
            });

            registerTestEntity('accounts', account.id);

            try {
              // Create usage record if usageValue > 0
              if (usageValue > 0) {
                const periodStart = getCurrentPeriodStart();
                await db.usageRecord.create({
                  data: {
                    accountId: account.id,
                    limitName,
                    value: usageValue,
                    periodStart,
                  },
                });
              }

              // Get tier info
              const tierInfo = await tierService.getTierInfo(account.id);
              const limitInfo = tierInfo.usage[limitName];
              const limitValue = config.tiers[tier].limits[limitName];

              // Property: percentage should match the formula
              const expectedPercentage = tierService.calculateUsagePercentage(usageValue, limitValue);
              expect(limitInfo.percentage).toBeCloseTo(expectedPercentage, 10);
              expect(limitInfo.current).toBe(usageValue);
              expect(limitInfo.limit).toBe(limitValue);
              expect(limitInfo.isUnlimited).toBe(limitValue === -1);
            } finally {
              await db.usageRecord.deleteMany({ where: { accountId: account.id } });
              await db.account.delete({ where: { id: account.id } });
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});