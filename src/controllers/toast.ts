/**
 * Toast Controller
 * 
 * Handles HTTP requests for sending toast notifications via SSE.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/jwtAuth';
import { sseService } from '../services/sseService';
import { z } from 'zod';
import logger from '../utils/logger';

/**
 * Zod schema for toast input validation
 */
const toastSchema = z.object({
  accountId: z.string().uuid().optional(),
  type: z.enum(['error', 'warning', 'info', 'success']),
  message: z.string().min(1).max(5000),
  duration: z.number().int().min(1000).max(30000).optional().default(5000),
});

/**
 * Send a toast notification
 * POST /api/toasts
 */
export async function sendToast(
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
    const validationResult = toastSchema.safeParse(req.body);

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

    // If no accountId specified, send only to the requesting user
    const targetAccountId = input.accountId || req.account.id;

    // Send toast via SSE
    sseService.sendToast({
      accountId: targetAccountId,
      type: input.type as 'error' | 'warning' | 'info' | 'success',
      message: input.message,
      duration: input.duration,
    });

    logger.info('Toast notification sent', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      toastType: input.type,
      targetAccountId,
    });

    res.status(200).json({
      success: true,
      message: 'Toast notification sent successfully',
    });
  } catch (error) {
    logger.error('Error sending toast notification', { error });
    next(error);
  }
}
