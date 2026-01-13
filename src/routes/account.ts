/**
 * Account Routes
 * 
 * Routes for account-related operations including tier information.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/jwtAuth';
import { getAccountTier } from '../controllers/account';

const router = Router();

// GET /api/account/tier - Get account tier information (requires authentication)
router.get('/tier', authenticateToken, getAccountTier);

export default router;
