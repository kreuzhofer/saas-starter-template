/**
 * Banner Routes
 * 
 * Defines HTTP routes for banner management with appropriate authentication
 * and authorization middleware.
 */

import { Router } from 'express';
import { authenticateToken, requireRole, optionalAuth } from '../middleware/jwtAuth';
import {
  createBanner,
  listBanners,
  getBanner,
  updateBannerById,
  deleteBannerById,
  deleteBannersByKeyParam,
  getActiveBannersForUser,
  dismissBannerById,
  sseEndpoint,
} from '../controllers/banner';

const router = Router();

// SSE endpoint (must come first to avoid route conflicts)
// GET /api/sse - Server-Sent Events endpoint for real-time notifications
// Uses optionalAuth to support both authenticated and unauthenticated users
router.get('/sse', optionalAuth, sseEndpoint);

// User routes (must come before parameterized routes to avoid conflicts)

// GET /api/banners/active - Get active banners for current user
// Uses optionalAuth to support both authenticated and unauthenticated users
router.get('/active', optionalAuth, getActiveBannersForUser);

// Admin-only routes (require authentication and admin role)

// GET /api/banners/all - List all banners (admin view)
router.get('/all', authenticateToken, requireRole('admin'), listBanners);

// POST /api/banners - Create or update banner (key-based upsert)
router.post('/', authenticateToken, requireRole('admin'), createBanner);

// DELETE /api/banners/key/:key - Delete banners by key (must come before /:id routes)
router.delete('/key/:key', authenticateToken, requireRole('admin'), deleteBannersByKeyParam);

// GET /api/banners/:id - Get banner by ID
router.get('/:id', authenticateToken, requireRole('admin'), getBanner);

// PUT /api/banners/:id - Update banner by ID
router.put('/:id', authenticateToken, requireRole('admin'), updateBannerById);

// DELETE /api/banners/:id - Delete banner by ID
router.delete('/:id', authenticateToken, requireRole('admin'), deleteBannerById);

// POST /api/banners/:id/dismiss - Dismiss a banner
// Requires authentication
router.post('/:id/dismiss', authenticateToken, dismissBannerById);

export default router;
