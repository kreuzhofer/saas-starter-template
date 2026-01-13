/**
 * Account Controller
 * 
 * Handles account-related operations including tier information retrieval.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/jwtAuth';
import { tierService } from '../services/tierService';
import logger from '../utils/logger';

/**
 * Get account tier information
 * GET /api/account/tier
 * 
 * Returns the current account's tier information including:
 * - Tier name and display name
 * - All features with their enabled/disabled status
 * - All limits with their values
 * - Current usage for each limit with percentage consumed
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export async function getAccountTier(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated
    if (!req.account) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    const accountId = req.account.id;

    // Get complete tier information
    const tierInfo = await tierService.getTierInfo(accountId);

    // Transform usage to array format for easier frontend consumption
    const limitsArray = Object.values(tierInfo.usage).map((usage) => ({
      name: usage.name,
      limit: usage.limit,
      current: usage.current,
      percentage: usage.percentage,
      isUnlimited: usage.isUnlimited,
    }));

    logger.info('Account tier information retrieved', {
      accountId,
      tier: tierInfo.tier,
    });

    res.status(200).json({
      tier: tierInfo.tier,
      displayName: tierInfo.displayName,
      features: tierInfo.features,
      limits: limitsArray,
    });
  } catch (error) {
    logger.error('Error retrieving account tier information', { 
      error,
      accountId: req.account?.id,
    });
    next(error);
  }
}
