/**
 * Tier Configuration Loader
 * 
 * Loads and validates the account tier configuration from the static JSON file.
 * Validates structure, required tiers, and consistent feature/limit names across tiers.
 */

import {
  TierConfig,
  TierConfigSchema,
  ACCOUNT_TIERS,
  AccountTier,
} from '../types/accountTier';
import tierConfigJson from './account-tiers.json';

/**
 * Error thrown when tier configuration is invalid
 */
export class TierConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TierConfigError';
  }
}

/**
 * Validates that all tiers have the same set of feature names
 * @param config - The tier configuration to validate
 * @throws TierConfigError if feature names are inconsistent
 */
function validateConsistentFeatures(config: TierConfig): void {
  const tiers = Object.keys(config.tiers) as AccountTier[];
  if (tiers.length === 0) return;

  const referenceFeatures = new Set(Object.keys(config.tiers[tiers[0]].features));
  
  for (const tier of tiers.slice(1)) {
    const tierFeatures = new Set(Object.keys(config.tiers[tier].features));
    
    // Check for missing features
    for (const feature of referenceFeatures) {
      if (!tierFeatures.has(feature)) {
        throw new TierConfigError(
          `Inconsistent features: tier "${tier}" is missing feature "${feature}" that exists in tier "${tiers[0]}"`
        );
      }
    }
    
    // Check for extra features
    for (const feature of tierFeatures) {
      if (!referenceFeatures.has(feature)) {
        throw new TierConfigError(
          `Inconsistent features: tier "${tier}" has extra feature "${feature}" not present in tier "${tiers[0]}"`
        );
      }
    }
  }
}

/**
 * Validates that all tiers have the same set of limit names
 * @param config - The tier configuration to validate
 * @throws TierConfigError if limit names are inconsistent
 */
function validateConsistentLimits(config: TierConfig): void {
  const tiers = Object.keys(config.tiers) as AccountTier[];
  if (tiers.length === 0) return;

  const referenceLimits = new Set(Object.keys(config.tiers[tiers[0]].limits));
  
  for (const tier of tiers.slice(1)) {
    const tierLimits = new Set(Object.keys(config.tiers[tier].limits));
    
    // Check for missing limits
    for (const limit of referenceLimits) {
      if (!tierLimits.has(limit)) {
        throw new TierConfigError(
          `Inconsistent limits: tier "${tier}" is missing limit "${limit}" that exists in tier "${tiers[0]}"`
        );
      }
    }
    
    // Check for extra limits
    for (const limit of tierLimits) {
      if (!referenceLimits.has(limit)) {
        throw new TierConfigError(
          `Inconsistent limits: tier "${tier}" has extra limit "${limit}" not present in tier "${tiers[0]}"`
        );
      }
    }
  }
}

/**
 * Validates that all required tiers are present
 * @param config - The tier configuration to validate
 * @throws TierConfigError if required tiers are missing or extra tiers exist
 */
function validateRequiredTiers(config: TierConfig): void {
  const configTiers = new Set(Object.keys(config.tiers));
  const requiredTiers = new Set(ACCOUNT_TIERS);
  
  // Check for missing tiers
  for (const tier of requiredTiers) {
    if (!configTiers.has(tier)) {
      throw new TierConfigError(
        `Missing required tier: "${tier}". Configuration must include all tiers: ${ACCOUNT_TIERS.join(', ')}`
      );
    }
  }
  
  // Check for extra tiers
  for (const tier of configTiers) {
    if (!requiredTiers.has(tier as AccountTier)) {
      throw new TierConfigError(
        `Unknown tier: "${tier}". Only these tiers are allowed: ${ACCOUNT_TIERS.join(', ')}`
      );
    }
  }
}

/**
 * Loads and validates the tier configuration
 * @returns The validated tier configuration
 * @throws TierConfigError if the configuration is invalid
 */
export function loadTierConfig(): TierConfig {
  // First, validate the basic structure using Zod
  const parseResult = TierConfigSchema.safeParse(tierConfigJson);
  
  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new TierConfigError(`Invalid tier configuration structure: ${errors}`);
  }
  
  const config = parseResult.data;
  
  // Validate required tiers
  validateRequiredTiers(config);
  
  // Validate consistent feature names across tiers
  validateConsistentFeatures(config);
  
  // Validate consistent limit names across tiers
  validateConsistentLimits(config);
  
  return config;
}

/**
 * Validates a tier configuration object (useful for testing)
 * @param config - The configuration object to validate
 * @returns The validated tier configuration
 * @throws TierConfigError if the configuration is invalid
 */
export function validateTierConfig(config: unknown): TierConfig {
  // First, validate the basic structure using Zod
  const parseResult = TierConfigSchema.safeParse(config);
  
  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new TierConfigError(`Invalid tier configuration structure: ${errors}`);
  }
  
  const validConfig = parseResult.data;
  
  // Validate required tiers
  validateRequiredTiers(validConfig);
  
  // Validate consistent feature names across tiers
  validateConsistentFeatures(validConfig);
  
  // Validate consistent limit names across tiers
  validateConsistentLimits(validConfig);
  
  return validConfig;
}

// Load and export the tier configuration singleton
let tierConfig: TierConfig | null = null;

/**
 * Gets the tier configuration, loading it if necessary
 * @returns The tier configuration
 * @throws TierConfigError if the configuration is invalid
 */
export function getTierConfig(): TierConfig {
  if (!tierConfig) {
    tierConfig = loadTierConfig();
  }
  return tierConfig;
}

/**
 * Gets the list of all feature names defined in the configuration
 * @returns Array of feature names
 */
export function getFeatureNames(): string[] {
  const config = getTierConfig();
  return Object.keys(config.tiers.starter.features);
}

/**
 * Gets the list of all limit names defined in the configuration
 * @returns Array of limit names
 */
export function getLimitNames(): string[] {
  const config = getTierConfig();
  return Object.keys(config.tiers.starter.limits);
}
