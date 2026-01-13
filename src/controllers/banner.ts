/**
 * Banner Controller
 * 
 * Handles HTTP requests for banner management including creation, updates,
 * deletion, retrieval, and dismissal of notification banners.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/jwtAuth';
import {
  createOrUpdateBanner,
  updateBanner,
  deleteBanner,
  deleteBannersByKey,
  getActiveBanners,
  dismissBanner,
} from '../services/notificationService';
import {
  createBannerSchema,
  updateBannerSchema,
} from '../validators/banner';
import logger from '../utils/logger';
import prisma from '../db/client';

/**
 * Create or update a banner (key-based upsert)
 * POST /api/banners
 */
export async function createBanner(
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

    // Validate request body
    const validationResult = createBannerSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const input = validationResult.data;

    // Create or update banner
    const banner = await createOrUpdateBanner(input);

    // Broadcast banner to connected clients via SSE
    const { sseService } = await import('../services/sseService');
    sseService.broadcastBanner(banner);

    logger.info('Banner created or updated', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      bannerId: banner.id,
      bannerKey: banner.key,
      bannerType: banner.type,
      accountId: banner.accountId,
    });

    res.status(201).json(banner);
  } catch (error) {
    logger.error('Error creating banner', { error });
    next(error);
  }
}

/**
 * List all banners (admin view)
 * GET /api/banners
 */
export async function listBanners(
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

    // Fetch all banners from database
    const banners = await prisma.banner.findMany({
      orderBy: [
        { type: 'asc' }, // error, info, warning (alphabetical)
        { createdAt: 'desc' },
      ],
    });

    logger.info('Admin listed all banners', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      bannerCount: banners.length,
    });

    res.status(200).json({
      banners,
      total: banners.length,
    });
  } catch (error) {
    logger.error('Error listing banners', { error });
    next(error);
  }
}

/**
 * Get banner by ID
 * GET /api/banners/:id
 */
export async function getBanner(
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

    const { id } = req.params;

    // Fetch banner by ID
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      res.status(404).json({
        error: 'Banner not found',
      });
      return;
    }

    logger.info('Admin retrieved banner', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      bannerId: id,
    });

    res.status(200).json(banner);
  } catch (error) {
    logger.error('Error retrieving banner', { error });
    next(error);
  }
}

/**
 * Update banner by ID
 * PUT /api/banners/:id
 */
export async function updateBannerById(
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

    const { id } = req.params;

    // Validate request body
    const validationResult = updateBannerSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const input = validationResult.data;

    // Update banner
    const banner = await updateBanner(id, input);

    // Broadcast updated banner to connected clients via SSE
    const { sseService } = await import('../services/sseService');
    sseService.broadcastBanner(banner);

    logger.info('Admin updated banner', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      bannerId: id,
    });

    res.status(200).json(banner);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({
        error: 'Banner not found',
      });
      return;
    }
    logger.error('Error updating banner', { error });
    next(error);
  }
}

/**
 * Delete banner by ID
 * DELETE /api/banners/:id
 */
export async function deleteBannerById(
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

    const { id } = req.params;

    // Delete banner
    await deleteBanner(id);

    // Broadcast banner removal to connected clients via SSE
    const { sseService } = await import('../services/sseService');
    sseService.broadcastBannerRemoval(id);

    logger.info('Admin deleted banner', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      bannerId: id,
    });

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      res.status(404).json({
        error: 'Banner not found',
      });
      return;
    }
    logger.error('Error deleting banner', { error });
    next(error);
  }
}

/**
 * Delete banners by key
 * DELETE /api/banners/key/:key
 */
export async function deleteBannersByKeyParam(
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

    const { key } = req.params;

    // Delete banners by key
    const count = await deleteBannersByKey(key);

    logger.info('Admin deleted banners by key', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      bannerKey: key,
      deletedCount: count,
    });

    res.status(200).json({
      success: true,
      message: `${count} banner(s) deleted successfully`,
      deletedCount: count,
    });
  } catch (error) {
    logger.error('Error deleting banners by key', { error });
    next(error);
  }
}

/**
 * Get active banners for current user
 * GET /api/banners/active
 */
export async function getActiveBannersForUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User may or may not be authenticated (optionalAuth middleware)
    const accountId = req.account?.id || null;
    const isAuthenticated = !!req.account;

    // Get active banners
    const banners = await getActiveBanners(accountId, isAuthenticated);

    logger.debug('User retrieved active banners', {
      accountId,
      isAuthenticated,
      bannerCount: banners.length,
    });

    res.status(200).json({
      banners,
      total: banners.length,
    });
  } catch (error) {
    logger.error('Error retrieving active banners', { error });
    next(error);
  }
}

/**
 * Dismiss a banner
 * POST /api/banners/:id/dismiss
 */
export async function dismissBannerById(
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

    const { id } = req.params;

    // Check if banner exists
    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      res.status(404).json({
        error: 'Banner not found',
      });
      return;
    }

    // Dismiss banner
    await dismissBanner(id, req.account.id);

    logger.info('User dismissed banner', {
      accountId: req.account.id,
      username: req.account.username,
      bannerId: id,
    });

    res.status(200).json({
      success: true,
      message: 'Banner dismissed successfully',
    });
  } catch (error) {
    // Handle unique constraint violation (already dismissed)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      res.status(200).json({
        success: true,
        message: 'Banner already dismissed',
      });
      return;
    }
    logger.error('Error dismissing banner', { error });
    next(error);
  }
}

/**
 * SSE endpoint for real-time banner and toast notifications
 * GET /api/sse
 */
export async function sseEndpoint(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // User may or may not be authenticated (optionalAuth middleware)
    const accountId = req.account?.id || null;
    const isAuthenticated = !!req.account;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial comment to establish connection
    res.write(': connected\n\n');

    // Import SSE service
    const { sseService } = await import('../services/sseService');

    // Register connection with SSE service
    sseService.registerConnection(accountId, res);

    logger.info('SSE connection established', {
      accountId,
      isAuthenticated,
      connectionCount: sseService.getConnectionCount(),
    });

    // Send initial banners to the client
    await sseService.sendInitialBanners(accountId, isAuthenticated, res);

    // Handle client disconnection
    req.on('close', () => {
      sseService.removeConnection(accountId, res);
      
      logger.info('SSE connection closed', {
        accountId,
        isAuthenticated,
        connectionCount: sseService.getConnectionCount(),
      });
    });
  } catch (error) {
    logger.error('Error in SSE endpoint', { error });
    next(error);
  }
}
