/**
 * Tier Service
 * 
 * Provides methods for checking account features and limits based on tier configuration.
 * Handles feature gating, limit enforcement, and usage tracking for the account tier system.
 */

import prisma from '../db/client';
import { getTierConfig, getFeatureNames, getLimitNames } from '../config/tierConfig';
import { AccountTier, TierConfig, LimitOverrideInfo } from '../types/accountTier';

/**
 * Gets the start of the current billing period (first day of the month at midnight UTC)
 */
export function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Information about a specific limit including current usage
 */
export interface LimitUsageInfo {
  name: string;
  limit: number;
  current: number;
  percentage: number;
  isUnlimited: boolean;
}

/**
 * Complete tier information for an account
 */
export interface TierInfo {
  tier: AccountTier;
  displayName: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  usage: Record<string, LimitUsageInfo>;
}

/**
 * TierService class for managing account tier features and limits
 */
class TierService {
  private config: TierConfig;

  constructor() {
    this.config = getTierConfig();
  }

  /**
   * Gets the tier for an account from the database
   * @param accountId - The account ID
   * @returns The account's tier
   */
  private async getAccountTier(accountId: string): Promise<AccountTier> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { tier: true },
    });

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    return account.tier as AccountTier;
  }

  /**
   * Checks if an account has access to a specific feature
   * @param accountId - The account ID
   * @param featureName - The name of the feature to check
   * @returns True if the feature is enabled for the account's tier, false otherwise
   */
  async hasFeature(accountId: string, featureName: string): Promise<boolean> {
    const tier = await this.getAccountTier(accountId);
    const tierDefinition = this.config.tiers[tier];

    // Return false for unknown features (Requirement 3.3)
    // Use Object.hasOwn to avoid prototype chain issues (e.g., 'constructor', '__proto__')
    if (!Object.hasOwn(tierDefinition.features, featureName)) {
      return false;
    }

    return tierDefinition.features[featureName];
  }

  /**
   * Gets all features for an account's tier
   * @param accountId - The account ID
   * @returns A map of feature names to boolean values
   */
  async getFeatures(accountId: string): Promise<Record<string, boolean>> {
    const tier = await this.getAccountTier(accountId);
    const tierDefinition = this.config.tiers[tier];

    // Return a copy to prevent mutation
    return { ...tierDefinition.features };
  }

  /**
   * Gets all limits for an account's tier
   * @param accountId - The account ID
   * @returns A map of limit names to numeric values
   */
  async getLimits(accountId: string): Promise<Record<string, number>> {
    const tier = await this.getAccountTier(accountId);
    const tierDefinition = this.config.tiers[tier];

    // Return a copy to prevent mutation
    return { ...tierDefinition.limits };
  }

  /**
   * Gets the list of all feature names defined in the configuration
   * @returns Array of feature names
   */
  getFeatureNames(): string[] {
    return getFeatureNames();
  }

  /**
   * Gets the list of all limit names defined in the configuration
   * @returns Array of limit names
   */
  getLimitNames(): string[] {
    return getLimitNames();
  }

  /**
   * Gets the tier configuration
   * @returns The tier configuration
   */
  getConfig(): TierConfig {
    return this.config;
  }

  /**
   * Gets the current usage for a specific limit
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   * @returns The current usage value, or 0 if no record exists
   */
  async getUsage(accountId: string, limitName: string): Promise<number> {
    const periodStart = getCurrentPeriodStart();
    
    const usageRecord = await prisma.usageRecord.findUnique({
      where: {
        accountId_limitName_periodStart: {
          accountId,
          limitName,
          periodStart,
        },
      },
    });

    return usageRecord?.value ?? 0;
  }

  /**
   * Increments usage for a specific limit
   * Creates a new record if none exists for the current period
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   * @param amount - The amount to increment (default: 1)
   */
  async incrementUsage(accountId: string, limitName: string, amount: number = 1): Promise<void> {
    const periodStart = getCurrentPeriodStart();

    await prisma.usageRecord.upsert({
      where: {
        accountId_limitName_periodStart: {
          accountId,
          limitName,
          periodStart,
        },
      },
      create: {
        accountId,
        limitName,
        periodStart,
        value: amount,
      },
      update: {
        value: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Checks if an account has remaining capacity for a limit
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   * @param amount - The amount to check capacity for (default: 1)
   * @returns True if the account has capacity, false otherwise
   */
  async checkCapacity(accountId: string, limitName: string, amount: number = 1): Promise<boolean> {
    const limit = await this.getLimit(accountId, limitName);
    
    // -1 indicates unlimited
    if (limit === -1) {
      return true;
    }

    const currentUsage = await this.getUsage(accountId, limitName);
    return (currentUsage + amount) <= limit;
  }

  /**
   * Checks if an account can add more of a resource based on current count vs limit.
   * This is different from checkCapacity which uses usage tracking.
   * 
   * @param accountId - The account ID
   * @param limitName - The name of the limit to check
   * @param currentCount - The current count of resources
   * @returns True if more resources can be added, false otherwise
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async checkCountCapacity(
    accountId: string,
    limitName: string,
    currentCount: number
  ): Promise<boolean> {
    const limit = await this.getLimit(accountId, limitName);

    // -1 indicates unlimited (Requirement 4.4)
    if (limit === -1) {
      return true;
    }

    // 0 limit means no capacity (Requirement 4.5)
    if (limit === 0) {
      return false;
    }

    // Return true if currentCount < limit, false otherwise (Requirements 4.2, 4.3)
    return currentCount < limit;
  }

  /**
   * Resets usage for a specific limit by deleting the current period's record
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   */
  async resetUsage(accountId: string, limitName: string): Promise<void> {
    const periodStart = getCurrentPeriodStart();

    await prisma.usageRecord.deleteMany({
      where: {
        accountId,
        limitName,
        periodStart,
      },
    });
  }

  /**
   * Gets an active (non-expired) override for a specific limit
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   * @returns The override value if active, null otherwise
   */
  private async getActiveOverride(accountId: string, limitName: string): Promise<number | null> {
    const now = new Date();
    
    const override = await prisma.limitOverride.findUnique({
      where: {
        accountId_limitName: {
          accountId,
          limitName,
        },
      },
    });

    // No override exists
    if (!override) {
      return null;
    }

    // Check if override is expired
    if (override.expiresAt && override.expiresAt < now) {
      return null;
    }

    return override.overrideValue;
  }

  /**
   * Gets a specific limit value for an account, checking for active overrides first
   * @param accountId - The account ID
   * @param limitName - The name of the limit to get
   * @returns The limit value (override if active, tier default otherwise), or 0 for unknown limits
   */
  async getLimit(accountId: string, limitName: string): Promise<number> {
    // Check for active override first (Requirement 8.3)
    const overrideValue = await this.getActiveOverride(accountId, limitName);
    if (overrideValue !== null) {
      return overrideValue;
    }

    const tier = await this.getAccountTier(accountId);
    const tierDefinition = this.config.tiers[tier];

    // Return 0 for unknown limits (Requirement 4.3)
    // Use Object.hasOwn to avoid prototype chain issues (e.g., 'constructor', '__proto__')
    if (!Object.hasOwn(tierDefinition.limits, limitName)) {
      return 0;
    }

    return tierDefinition.limits[limitName];
  }

  /**
   * Gets the tier default limit value (ignoring overrides)
   * @param accountId - The account ID
   * @param limitName - The name of the limit to get
   * @returns The tier default limit value, or 0 for unknown limits
   */
  async getTierDefaultLimit(accountId: string, limitName: string): Promise<number> {
    const tier = await this.getAccountTier(accountId);
    const tierDefinition = this.config.tiers[tier];

    if (!Object.hasOwn(tierDefinition.limits, limitName)) {
      return 0;
    }

    return tierDefinition.limits[limitName];
  }

  /**
   * Gets all overrides for an account
   * @param accountId - The account ID
   * @returns Array of override information
   */
  async getOverrides(accountId: string): Promise<LimitOverrideInfo[]> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const overrides = await prisma.limitOverride.findMany({
      where: { accountId },
      orderBy: { limitName: 'asc' },
    });

    return overrides.map(override => ({
      limitName: override.limitName,
      overrideValue: override.overrideValue,
      expiresAt: override.expiresAt,
      isPermanent: override.expiresAt === null,
      isExpiringSoon: override.expiresAt !== null && 
                      override.expiresAt > now && 
                      override.expiresAt <= sevenDaysFromNow,
    }));
  }

  /**
   * Sets or updates an override for a specific limit
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   * @param value - The override value
   * @param expiresAt - Optional expiration date (null for permanent)
   */
  async setOverride(
    accountId: string, 
    limitName: string, 
    value: number, 
    expiresAt?: Date | null
  ): Promise<void> {
    await prisma.limitOverride.upsert({
      where: {
        accountId_limitName: {
          accountId,
          limitName,
        },
      },
      create: {
        accountId,
        limitName,
        overrideValue: value,
        expiresAt: expiresAt ?? null,
      },
      update: {
        overrideValue: value,
        expiresAt: expiresAt ?? null,
      },
    });
  }

  /**
   * Deletes an override for a specific limit
   * @param accountId - The account ID
   * @param limitName - The name of the limit
   */
  async deleteOverride(accountId: string, limitName: string): Promise<void> {
    await prisma.limitOverride.deleteMany({
      where: {
        accountId,
        limitName,
      },
    });
  }

  /**
   * Calculates the usage percentage for a given usage and limit
   * @param current - The current usage value
   * @param limit - The limit value (-1 indicates unlimited)
   * @returns The percentage of the limit consumed (0-100), or 0 if unlimited
   */
  calculateUsagePercentage(current: number, limit: number): number {
    // Return 0 for unlimited limits (Requirement 7.4)
    if (limit === -1) {
      return 0;
    }
    
    // Return 0 if limit is 0 to avoid division by zero
    if (limit === 0) {
      return current > 0 ? 100 : 0;
    }
    
    return (current / limit) * 100;
  }

  /**
   * Gets complete tier information for an account including usage
   * @param accountId - The account ID
   * @returns Complete tier information with features, limits, and usage
   */
  async getTierInfo(accountId: string): Promise<TierInfo> {
    const tier = await this.getAccountTier(accountId);
    const tierDefinition = this.config.tiers[tier];
    const features = { ...tierDefinition.features };
    const limits = { ...tierDefinition.limits };
    
    // Build usage information for each limit
    const usage: Record<string, LimitUsageInfo> = {};
    const limitNames = Object.keys(limits);
    
    for (const limitName of limitNames) {
      const current = await this.getUsage(accountId, limitName);
      const limit = limits[limitName];
      const isUnlimited = limit === -1;
      const percentage = this.calculateUsagePercentage(current, limit);
      
      usage[limitName] = {
        name: limitName,
        limit,
        current,
        percentage,
        isUnlimited,
      };
    }
    
    return {
      tier,
      displayName: tierDefinition.displayName,
      features,
      limits,
      usage,
    };
  }
}

// Export singleton instance
export const tierService = new TierService();

// Export class for testing
export { TierService };
