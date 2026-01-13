import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/jwtAuth';
import { verifyPassword, createEmailChangeToken } from '../services/auth';
import { sendEmailChangeConfirmation } from '../services/email';
import prisma from '../db/client';
import logger from '../utils/logger';

// Validation schemas
const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const confirmEmailChangeSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const updateLanguagePreferenceSchema = z.object({
  language: z.string().min(1, 'Language is required').refine(
    (lang) => ['en', 'de'].includes(lang),
    { message: 'Unsupported language' }
  ),
});

const updateProfileSchema = z.object({
  firstName: z.string().max(50, 'First name must be 50 characters or less').optional(),
  lastName: z.string().max(50, 'Last name must be 50 characters or less').optional(),
});

/**
 * Get user profile information
 * GET /api/profile
 */
export async function getProfile(
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

    // Get account details
    const account = await prisma.account.findUnique({
      where: { id: req.account.id },
      select: {
        id: true,
        username: true,
        language: true,
        isActive: true,
        createdAt: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!account) {
      res.status(404).json({
        error: 'Account not found',
      });
      return;
    }

    logger.info('Profile retrieved', {
      accountId: req.account.id,
      username: req.account.username,
    });

    res.status(200).json({
      id: account.id,
      username: account.username,
      language: account.language,
      isActive: account.isActive,
      createdAt: account.createdAt,
      firstName: account.firstName,
      lastName: account.lastName,
    });
  } catch (error) {
    logger.error('Error retrieving profile', { error });
    next(error);
  }
}

/**
 * Update user profile information
 * PATCH /api/profile
 */
export async function updateProfile(
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
    const validationResult = updateProfileSchema.safeParse(req.body);

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

    const { firstName, lastName } = validationResult.data;

    // Handle whitespace-only values as null
    const processedFirstName = firstName && firstName.trim() ? firstName.trim() : null;
    const processedLastName = lastName && lastName.trim() ? lastName.trim() : null;

    // Update profile
    const account = await prisma.account.update({
      where: { id: req.account.id },
      data: {
        firstName: processedFirstName,
        lastName: processedLastName,
      },
      select: {
        id: true,
        username: true,
        language: true,
        isActive: true,
        createdAt: true,
        firstName: true,
        lastName: true,
      },
    });

    logger.info('Profile updated', {
      accountId: req.account.id,
      username: req.account.username,
      firstName: processedFirstName,
      lastName: processedLastName,
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: {
        id: account.id,
        username: account.username,
        language: account.language,
        isActive: account.isActive,
        createdAt: account.createdAt,
        firstName: account.firstName,
        lastName: account.lastName,
      },
    });
  } catch (error) {
    logger.error('Error updating profile', { error });
    next(error);
  }
}

/**
 * Update language preference
 * PATCH /api/profile/language
 */
export async function updateLanguagePreference(
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
    const validationResult = updateLanguagePreferenceSchema.safeParse(req.body);

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

    const { language } = validationResult.data;

    // Update language preference
    const account = await prisma.account.update({
      where: { id: req.account.id },
      data: { language },
      select: {
        id: true,
        username: true,
        language: true,
      },
    });

    logger.info('Language preference updated', {
      accountId: req.account.id,
      username: req.account.username,
      language,
    });

    res.status(200).json({
      id: account.id,
      username: account.username,
      language: account.language,
      message: 'Language preference updated successfully',
    });
  } catch (error) {
    logger.error('Error updating language preference', { error });
    next(error);
  }
}

/**
 * Request email address change
 * POST /api/profile/request-email-change
 */
export async function requestEmailChange(
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
    const validationResult = requestEmailChangeSchema.safeParse(req.body);

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

    const { newEmail, password } = validationResult.data;

    // Get account
    const account = await prisma.account.findUnique({
      where: { id: req.account.id },
    });

    if (!account) {
      res.status(404).json({
        error: 'Account not found',
      });
      return;
    }

    // Verify password before generating token
    const valid = await verifyPassword(password, account.passwordHash);

    if (!valid) {
      res.status(401).json({
        error: 'Invalid password',
      });
      return;
    }

    // Check if new email is already in use
    const existingAccount = await prisma.account.findUnique({
      where: { username: newEmail },
    });

    if (existingAccount) {
      res.status(409).json({
        error: 'Email address already in use',
      });
      return;
    }

    // Generate email change token
    const token = await createEmailChangeToken(req.account.id, newEmail);

    // Send email change confirmation to new email address in user's preferred language
    const language = account.language || 'en';
    await sendEmailChangeConfirmation(newEmail, token, language);

    logger.info('Email change requested', {
      accountId: req.account.id,
      currentEmail: req.account.username,
      newEmail,
      language,
    });

    res.status(200).json({
      message: 'Email change confirmation sent. Please check your new email address to confirm the change.',
    });
  } catch (error) {
    logger.error('Error requesting email change', { error });
    next(error);
  }
}

/**
 * Confirm email address change
 * POST /api/profile/confirm-email-change
 */
export async function confirmEmailChange(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = confirmEmailChangeSchema.safeParse(req.body);

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

    const { token } = validationResult.data;

    // Verify email change token
    const { verifyEmailChangeToken, deleteEmailChangeToken } = await import('../services/auth');
    const result = await verifyEmailChangeToken(token);

    if (!result) {
      res.status(400).json({
        error: 'Invalid or expired email change token',
      });
      return;
    }

    const { accountId, newEmail } = result;

    // Check if new email is already in use (race condition check)
    const existingAccount = await prisma.account.findUnique({
      where: { username: newEmail },
    });

    if (existingAccount) {
      res.status(409).json({
        error: 'Email address already in use',
      });
      return;
    }

    // Update username (email address)
    await prisma.account.update({
      where: { id: accountId },
      data: { username: newEmail },
    });

    // Delete used token
    await deleteEmailChangeToken(token);

    logger.info('Email changed successfully', {
      accountId,
      newEmail,
    });

    // Note: JWT tokens are invalidated by the client after this response
    // The user will need to log in again with the new email address
    res.status(200).json({
      message: 'Email address changed successfully. Please log in again with your new email address.',
    });
  } catch (error) {
    logger.error('Error confirming email change', { error });
    next(error);
  }
}

/**
 * Export all user data
 * GET /api/profile/export
 */
export async function exportUserData(
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

    // Gather all user data
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        language: true,
        tier: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      res.status(404).json({
        error: 'Account not found',
      });
      return;
    }

    // Prepare export data
    const exportData = {
      account: {
        id: account.id,
        username: account.username,
        firstName: account.firstName,
        lastName: account.lastName,
        language: account.language,
        tier: account.tier,
        role: account.role,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      exportedAt: new Date().toISOString(),
    };

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user-data-export-${timestamp}.json`;

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info('User data exported', {
      accountId,
      username: req.account.username,
      timestamp,
    });

    // Return data without storing on server
    res.status(200).json(exportData);
  } catch (error) {
    logger.error('Error exporting user data', {
      error,
      accountId: req.account?.id,
      username: req.account?.username,
    });
    next(error);
  }
}

/**
 * Delete user account and all associated data
 * DELETE /api/profile
 */
export async function deleteAccount(
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
    const username = req.account.username;
    const role = req.account.role;

    // Prevent admin users from deleting their own accounts
    // This is a self-protection mechanism to prevent system lockout
    if (role === 'admin') {
      logger.warn('Admin self-deletion attempt blocked', {
        accountId,
        username,
        timestamp: new Date().toISOString(),
      });

      res.status(403).json({
        error: 'Admin accounts cannot be deleted. This restriction prevents accidental removal of system administrators.',
      });
      return;
    }

    // Delete account (cascade will delete all associated data)
    await prisma.account.delete({
      where: { id: accountId },
    });

    logger.info('Account deleted successfully', {
      accountId,
      username,
      timestamp: new Date().toISOString(),
    });

    // Note: JWT tokens are invalidated by the client after this response
    // All associated data has been permanently deleted via cascade
    res.status(200).json({
      message: 'Account and all associated data have been permanently deleted.',
    });
  } catch (error) {
    logger.error('Error deleting account', { 
      error,
      accountId: req.account?.id,
      username: req.account?.username,
    });
    next(error);
  }
}
