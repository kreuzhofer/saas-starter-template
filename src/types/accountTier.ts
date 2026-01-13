/**
 * Account Tier Type Definitions
 * 
 * Defines the tier system for feature gating and usage limits.
 * Tiers are defined in a static JSON configuration file.
 */

import { z } from 'zod';

/**
 * Valid account tiers in the system
 * - starter: Free tier with basic features and limited usage
 * - pro: Paid tier with more features and higher limits
 * - business: Business tier with advanced features and high limits
 * - enterprise: Enterprise tier with all features and unlimited usage
 */
export type AccountTier = 'starter' | 'pro' | 'business' | 'enterprise';

/**
 * Constant array of all valid account tiers
 * Used for validation and iteration
 */
export const ACCOUNT_TIERS: readonly AccountTier[] = [
  'starter',
  'pro',
  'business',
  'enterprise',
] as const;

/**
 * Type guard to check if a string is a valid AccountTier
 * 
 * @param tier - The string to validate
 * @returns True if the tier is valid, false otherwise
 */
export function isValidTier(tier: string): tier is AccountTier {
  return ACCOUNT_TIERS.includes(tier as AccountTier);
}

/**
 * Definition of a single tier including its display name, features, and limits
 */
export interface TierDefinition {
  /** Human-readable name for the tier */
  displayName: string;
  /** Map of feature names to boolean flags indicating availability */
  features: Record<string, boolean>;
  /** Map of limit names to numeric values (-1 indicates unlimited) */
  limits: Record<string, number>;
}

/**
 * Complete tier configuration containing all tier definitions
 */
export interface TierConfig {
  /** Map of tier names to their definitions */
  tiers: Record<AccountTier, TierDefinition>;
}

/**
 * Zod schema for validating AccountTier enum
 */
export const AccountTierSchema = z.enum(['starter', 'pro', 'business', 'enterprise']);

/**
 * Zod schema for validating TierDefinition
 */
export const TierDefinitionSchema = z.object({
  displayName: z.string().min(1),
  features: z.record(z.string(), z.boolean()),
  limits: z.record(z.string(), z.number()),
});

/**
 * Zod schema for validating TierConfig
 * Uses strict() to reject extra tiers beyond the four required ones
 */
export const TierConfigSchema = z.object({
  tiers: z.object({
    starter: TierDefinitionSchema,
    pro: TierDefinitionSchema,
    business: TierDefinitionSchema,
    enterprise: TierDefinitionSchema,
  }).strict(),
}).strict();

/**
 * Represents a limit override for an account
 */
export interface LimitOverrideInfo {
  /** The name of the limit being overridden */
  limitName: string;
  /** The override value */
  overrideValue: number;
  /** When the override expires (null for permanent) */
  expiresAt: Date | null;
  /** Whether this is a permanent override */
  isPermanent: boolean;
  /** Whether the override expires within 7 days */
  isExpiringSoon: boolean;
}
