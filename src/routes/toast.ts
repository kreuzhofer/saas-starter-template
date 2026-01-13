/**
 * Toast Routes
 * 
 * Defines HTTP routes for toast notifications with appropriate authentication
 * and authorization middleware.
 */

import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/jwtAuth';
import { sendToast } from '../controllers/toast';

const router = Router();

// POST /api/toasts - Send toast notification (admin only)
router.post('/', authenticateToken, requireRole('admin'), sendToast);

export default router;
