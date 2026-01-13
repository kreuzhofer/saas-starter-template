/**
 * Property-Based Tests for Tier Configuration Validation
 * 
 * Feature: account-tiers-and-limits, Property 1: Tier Configuration Consistency
 * Feature: account-tiers-and-limits, Property 2: Invalid Configuration Rejection
 * Validates: Requirements 1.1, 1.4, 1.5, 1.7
 * 
 * These tests verify that:
 * 1. All tiers must define the exact same set of feature names and limit names
 * 2. Invalid configurations are rejected with descriptive errors
 */

import * as fc from 'fast-check';
import {
  TierConfigSchema,
  AccountTierSchema,
  TierDefinitionSchema,
  ACCOUNT_TIERS,
  type AccountTier,
  type TierConfig,
  type TierDefinition,
} from '../../types/accountTier';
import {
  validateTierConfig,
  TierConfigError,
  loadTierConfig,
} from '../../config/tierConfig';

describe('Tier Configuration Property Tests', () => {
  /**
   * Property 1: Tier Configuration Consistency
   * 
   * For any valid tier configuration, all tiers must define the exact same
   * set of feature names and the exact same set of limit names.
   */
  describe('Property 1: Tier Configuration Consistency', () => {
    // Generator for valid feature names
    const featureNameArb = fc.string({ minLength: 1, maxLength: 30 })
      .filter(s => /^[a-z_][a-z0-9_]*$/.test(s));
    
    // Generator for valid limit names
    const limitNameArb = fc.string({ minLength: 1, maxLength: 30 })
      .filter(s => /^[a-z_][a-z0-9_]*$/.test(s));

    it('should accept configuration where all tiers have identical feature names', () => {
      fc.assert(
        fc.property(
          // Generate a set of feature names
          fc.array(featureNameArb, { minLength: 1, maxLength: 5 })
            .map(names => [...new Set(names)]) // Ensure unique names
            .filter(names => names.length >= 1),
          // Generate a set of limit names
          fc.array(limitNameArb, { minLength: 1, maxLength: 5 })
            .map(names => [...new Set(names)])
            .filter(names => names.length >= 1),
          (featureNames, limitNames) => {
            // Create a valid config where all tiers have the same features and limits
            const features: Record<string, boolean> = {};
            featureNames.forEach(name => { features[name] = false; });
            
            const limits: Record<string, number> = {};
            limitNames.forEach(name => { limits[name] = 100; });

            const config: TierConfig = {
              tiers: {
                starter: { displayName: 'Starter', features: { ...features }, limits: { ...limits } },
                pro: { displayName: 'Pro', features: { ...features }, limits: { ...limits } },
                business: { displayName: 'Business', features: { ...features }, limits: { ...limits } },
                enterprise: { displayName: 'Enterprise', features: { ...features }, limits: { ...limits } },
              },
            };

            // Property: Configuration with consistent features/limits should be valid
            expect(() => validateTierConfig(config)).not.toThrow();
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject configuration where tiers have different feature names', () => {
      fc.assert(
        fc.property(
          // Generate two different feature names
          featureNameArb,
          featureNameArb.filter(s => s !== 'feature_a'),
          (feature1, feature2) => {
            // Ensure they're different
            if (feature1 === feature2) return;

            const config = {
              tiers: {
                starter: { 
                  displayName: 'Starter', 
                  features: { [feature1]: false }, 
                  limits: { limit_a: 100 } 
                },
                pro: { 
                  displayName: 'Pro', 
                  features: { [feature2]: true }, // Different feature name
                  limits: { limit_a: 200 } 
                },
                business: { 
                  displayName: 'Business', 
                  features: { [feature1]: true }, 
                  limits: { limit_a: 500 } 
                },
                enterprise: { 
                  displayName: 'Enterprise', 
                  features: { [feature1]: true }, 
                  limits: { limit_a: -1 } 
                },
              },
            };

            // Property: Inconsistent feature names should fail validation
            expect(() => validateTierConfig(config)).toThrow(TierConfigError);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject configuration where tiers have different limit names', () => {
      fc.assert(
        fc.property(
          // Generate two different limit names
          limitNameArb,
          limitNameArb.filter(s => s !== 'limit_a'),
          (limit1, limit2) => {
            // Ensure they're different
            if (limit1 === limit2) return;

            const config = {
              tiers: {
                starter: { 
                  displayName: 'Starter', 
                  features: { feature_a: false }, 
                  limits: { [limit1]: 100 } 
                },
                pro: { 
                  displayName: 'Pro', 
                  features: { feature_a: true }, 
                  limits: { [limit2]: 200 } // Different limit name
                },
                business: { 
                  displayName: 'Business', 
                  features: { feature_a: true }, 
                  limits: { [limit1]: 500 } 
                },
                enterprise: { 
                  displayName: 'Enterprise', 
                  features: { feature_a: true }, 
                  limits: { [limit1]: -1 } 
                },
              },
            };

            // Property: Inconsistent limit names should fail validation
            expect(() => validateTierConfig(config)).toThrow(TierConfigError);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should verify the actual config file has consistent features across all tiers', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            // Load the actual configuration
            const config = loadTierConfig();
            
            // Get feature names from each tier
            const tierNames = Object.keys(config.tiers) as AccountTier[];
            const featureSets = tierNames.map(tier => 
              new Set(Object.keys(config.tiers[tier].features))
            );
            
            // Property: All tiers should have the same feature names
            const referenceFeatures = featureSets[0];
            for (let i = 1; i < featureSets.length; i++) {
              expect(featureSets[i].size).toBe(referenceFeatures.size);
              for (const feature of referenceFeatures) {
                expect(featureSets[i].has(feature)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should verify the actual config file has consistent limits across all tiers', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            // Load the actual configuration
            const config = loadTierConfig();
            
            // Get limit names from each tier
            const tierNames = Object.keys(config.tiers) as AccountTier[];
            const limitSets = tierNames.map(tier => 
              new Set(Object.keys(config.tiers[tier].limits))
            );
            
            // Property: All tiers should have the same limit names
            const referenceLimits = limitSets[0];
            for (let i = 1; i < limitSets.length; i++) {
              expect(limitSets[i].size).toBe(referenceLimits.size);
              for (const limit of referenceLimits) {
                expect(limitSets[i].has(limit)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 2: Invalid Configuration Rejection
   * 
   * For any tier configuration that is missing required tiers, has extra tiers,
   * or has inconsistent feature/limit names across tiers, loading the configuration
   * shall produce a validation error.
   */
  describe('Property 2: Invalid Configuration Rejection', () => {
    it('should reject configuration missing required tiers', () => {
      fc.assert(
        fc.property(
          // Pick a tier to remove
          fc.constantFrom<AccountTier>('starter', 'pro', 'business', 'enterprise'),
          (tierToRemove) => {
            const baseTier: TierDefinition = {
              displayName: 'Test',
              features: { feature_a: false },
              limits: { limit_a: 100 },
            };

            // Create config with one tier missing
            const tiers: Partial<Record<AccountTier, TierDefinition>> = {};
            for (const tier of ACCOUNT_TIERS) {
              if (tier !== tierToRemove) {
                tiers[tier] = { ...baseTier, displayName: tier };
              }
            }

            const config = { tiers };

            // Property: Missing required tier should fail validation
            expect(() => validateTierConfig(config)).toThrow(TierConfigError);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject configuration with extra unknown tiers', () => {
      fc.assert(
        fc.property(
          // Generate an unknown tier name
          fc.string({ minLength: 1, maxLength: 20 })
            .filter(s => !ACCOUNT_TIERS.includes(s as AccountTier) && /^[a-z_]+$/.test(s)),
          (extraTier) => {
            const baseTier: TierDefinition = {
              displayName: 'Test',
              features: { feature_a: false },
              limits: { limit_a: 100 },
            };

            // Create config with all required tiers plus an extra one
            const config = {
              tiers: {
                starter: { ...baseTier, displayName: 'Starter' },
                pro: { ...baseTier, displayName: 'Pro' },
                business: { ...baseTier, displayName: 'Business' },
                enterprise: { ...baseTier, displayName: 'Enterprise' },
                [extraTier]: { ...baseTier, displayName: 'Extra' },
              },
            };

            // Property: Extra unknown tier should fail validation
            expect(() => validateTierConfig(config)).toThrow(TierConfigError);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject configuration with invalid structure', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            // Missing tiers object
            {},
            // Tiers is not an object
            { tiers: 'not an object' },
            { tiers: [] },
            { tiers: null },
            // Tier definition missing displayName
            {
              tiers: {
                starter: { features: {}, limits: {} },
                pro: { displayName: 'Pro', features: {}, limits: {} },
                business: { displayName: 'Business', features: {}, limits: {} },
                enterprise: { displayName: 'Enterprise', features: {}, limits: {} },
              },
            },
            // Tier definition missing features
            {
              tiers: {
                starter: { displayName: 'Starter', limits: {} },
                pro: { displayName: 'Pro', features: {}, limits: {} },
                business: { displayName: 'Business', features: {}, limits: {} },
                enterprise: { displayName: 'Enterprise', features: {}, limits: {} },
              },
            },
            // Tier definition missing limits
            {
              tiers: {
                starter: { displayName: 'Starter', features: {} },
                pro: { displayName: 'Pro', features: {}, limits: {} },
                business: { displayName: 'Business', features: {}, limits: {} },
                enterprise: { displayName: 'Enterprise', features: {}, limits: {} },
              },
            },
            // Feature value is not boolean
            {
              tiers: {
                starter: { displayName: 'Starter', features: { f: 'not boolean' }, limits: { l: 1 } },
                pro: { displayName: 'Pro', features: { f: true }, limits: { l: 2 } },
                business: { displayName: 'Business', features: { f: true }, limits: { l: 3 } },
                enterprise: { displayName: 'Enterprise', features: { f: true }, limits: { l: -1 } },
              },
            },
            // Limit value is not number
            {
              tiers: {
                starter: { displayName: 'Starter', features: { f: false }, limits: { l: 'not number' } },
                pro: { displayName: 'Pro', features: { f: true }, limits: { l: 2 } },
                business: { displayName: 'Business', features: { f: true }, limits: { l: 3 } },
                enterprise: { displayName: 'Enterprise', features: { f: true }, limits: { l: -1 } },
              },
            },
          ),
          (invalidConfig) => {
            // Property: Invalid structure should fail validation
            expect(() => validateTierConfig(invalidConfig)).toThrow(TierConfigError);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should provide descriptive error messages for missing tiers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<AccountTier>('starter', 'pro', 'business', 'enterprise'),
          (missingTier) => {
            const baseTier: TierDefinition = {
              displayName: 'Test',
              features: { feature_a: false },
              limits: { limit_a: 100 },
            };

            const tiers: Partial<Record<AccountTier, TierDefinition>> = {};
            for (const tier of ACCOUNT_TIERS) {
              if (tier !== missingTier) {
                tiers[tier] = { ...baseTier, displayName: tier };
              }
            }

            try {
              validateTierConfig({ tiers });
              fail('Should have thrown TierConfigError');
            } catch (error) {
              // Property: Error message should mention the missing tier
              expect(error).toBeInstanceOf(TierConfigError);
              expect((error as TierConfigError).message).toContain(missingTier);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should provide descriptive error messages for inconsistent features', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            /^[a-z_]+$/.test(s) && 
            s !== '__proto__' && 
            s !== 'constructor' && 
            s !== 'prototype'
          ),
          (extraFeature) => {
            const config = {
              tiers: {
                starter: { 
                  displayName: 'Starter', 
                  features: { feature_a: false }, 
                  limits: { limit_a: 100 } 
                },
                pro: { 
                  displayName: 'Pro', 
                  features: { feature_a: true, [extraFeature]: true }, // Extra feature
                  limits: { limit_a: 200 } 
                },
                business: { 
                  displayName: 'Business', 
                  features: { feature_a: true }, 
                  limits: { limit_a: 500 } 
                },
                enterprise: { 
                  displayName: 'Enterprise', 
                  features: { feature_a: true }, 
                  limits: { limit_a: -1 } 
                },
              },
            };

            try {
              validateTierConfig(config);
              fail('Should have thrown TierConfigError');
            } catch (error) {
              // Property: Error message should mention inconsistent features
              expect(error).toBeInstanceOf(TierConfigError);
              expect((error as TierConfigError).message.toLowerCase()).toContain('feature');
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should provide descriptive error messages for inconsistent limits', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            /^[a-z_]+$/.test(s) && 
            s !== '__proto__' && 
            s !== 'constructor' && 
            s !== 'prototype'
          ),
          (extraLimit) => {
            const config = {
              tiers: {
                starter: { 
                  displayName: 'Starter', 
                  features: { feature_a: false }, 
                  limits: { limit_a: 100 } 
                },
                pro: { 
                  displayName: 'Pro', 
                  features: { feature_a: true }, 
                  limits: { limit_a: 200, [extraLimit]: 500 } // Extra limit
                },
                business: { 
                  displayName: 'Business', 
                  features: { feature_a: true }, 
                  limits: { limit_a: 500 } 
                },
                enterprise: { 
                  displayName: 'Enterprise', 
                  features: { feature_a: true }, 
                  limits: { limit_a: -1 } 
                },
              },
            };

            try {
              validateTierConfig(config);
              fail('Should have thrown TierConfigError');
            } catch (error) {
              // Property: Error message should mention inconsistent limits
              expect(error).toBeInstanceOf(TierConfigError);
              expect((error as TierConfigError).message.toLowerCase()).toContain('limit');
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Additional schema validation tests
   */
  describe('Individual schema component validation', () => {
    it('should validate AccountTier enum correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<AccountTier>('starter', 'pro', 'business', 'enterprise'),
          (validTier) => {
            const result = AccountTierSchema.safeParse(validTier);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject invalid AccountTier values', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !ACCOUNT_TIERS.includes(s as AccountTier)),
          (invalidTier) => {
            const result = AccountTierSchema.safeParse(invalidTier);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should validate TierDefinition with all required fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.dictionary(fc.string({ minLength: 1 }), fc.boolean()),
          fc.dictionary(fc.string({ minLength: 1 }), fc.integer()),
          (displayName, features, limits) => {
            const tierDef = {
              displayName,
              features,
              limits,
            };
            
            const result = TierDefinitionSchema.safeParse(tierDef);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should reject TierDefinition with empty displayName', () => {
      const result = TierDefinitionSchema.safeParse({
        displayName: '',
        features: {},
        limits: {},
      });
      expect(result.success).toBe(false);
    });

    it('should accept TierDefinition with empty features and limits', () => {
      const result = TierDefinitionSchema.safeParse({
        displayName: 'Test',
        features: {},
        limits: {},
      });
      expect(result.success).toBe(true);
    });
  });
});
