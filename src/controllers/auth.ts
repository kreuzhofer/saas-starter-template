import { Request, Response, NextFunction } from 'express';
import { register, login, refreshToken, verifyEmailConfirmationToken, deleteEmailConfirmationToken, requestPasswordReset, resetPassword, changePassword } from '../services/auth';
import prisma from '../db/client';
import logger from '../utils/logger';
import { z } from 'zod';
import { AuthRequest } from '../middleware/jwtAuth';

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const confirmEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const requestPasswordResetSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirmation: z.string().min(1, 'Password confirmation is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirmation: z.string().min(1, 'Password confirmation is required'),
});

/**
 * Register a new user account
 * POST /api/auth/register
 */
export async function registerUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          // Map Zod error messages to translation keys
          let message = err.message;
          if (err.message.includes('at least')) {
            const min = err.message.match(/\d+/)?.[0] || '8';
            message = req.t('messages.minLength', { ns: 'validation', field: fieldName, min });
          } else if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { username, password } = validationResult.data;

    // Get language from request (set by language detection middleware)
    const language = req.language || 'en';

    // Register user with language preference
    const result = await register(username, password, language);

    logger.info('User registered', {
      userId: result.id,
      username: result.username,
      language,
    });

    res.status(201).json({
      id: result.id,
      username: result.username,
      message: req.t('auth.emailNotConfirmed', { ns: 'errors' }),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Username already exists') {
        res.status(409).json({
          error: req.t('user.usernameAlreadyExists', { ns: 'errors' }),
        });
        return;
      }
      if (error.message === 'Password must be at least 8 characters') {
        res.status(400).json({
          error: req.t('validation.passwordTooShort', { ns: 'errors', min: 8 }),
        });
        return;
      }
      if (error.message === 'Username must be a valid email address') {
        res.status(400).json({
          error: req.t('validation.invalidEmailFormat', { ns: 'errors' }),
        });
        return;
      }
    }
    logger.error('Error registering user', { error });
    next(error);
  }
}

/**
 * Login with username and password
 * POST /api/auth/login
 */
export async function loginUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          // Map Zod error messages to translation keys
          let message = err.message;
          if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { username, password } = validationResult.data;

    // Login user
    const result = await login(username, password);

    logger.info('User logged in', {
      userId: result.account.id,
      username: result.account.username,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          error: req.t('auth.invalidCredentials', { ns: 'errors' }),
        });
        return;
      }
      if (error.message === 'Email confirmation required') {
        res.status(403).json({
          error: req.t('auth.emailConfirmationRequired', { ns: 'errors' }),
        });
        return;
      }
    }
    logger.error('Error logging in user', { error });
    next(error);
  }
}

/**
 * Refresh JWT token
 * POST /api/auth/refresh
 */
export async function refreshUserToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = refreshSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          let message = err.message;
          if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { token } = validationResult.data;

    // Refresh token
    const result = await refreshToken(token);

    logger.info('Token refreshed');

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      res.status(401).json({
        error: req.t('auth.invalidOrExpiredToken', { ns: 'errors' }),
      });
      return;
    }
    logger.error('Error refreshing token', { error });
    next(error);
  }
}

/**
 * Confirm email address with token
 * POST /api/auth/confirm-email
 */
export async function confirmEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = confirmEmailSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          let message = err.message;
          if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { token } = validationResult.data;

    // Verify email confirmation token
    const accountId = await verifyEmailConfirmationToken(token);

    if (!accountId) {
      res.status(400).json({
        error: req.t('auth.invalidOrExpiredConfirmationToken', { ns: 'errors' }),
      });
      return;
    }

    // Activate account by setting isActive = true
    await prisma.account.update({
      where: { id: accountId },
      data: { isActive: true },
    });

    // Delete used confirmation token
    await deleteEmailConfirmationToken(token);

    logger.info('Email confirmed and account activated', { accountId });

    // Return success response
    res.status(200).json({
      message: req.t('auth.emailConfirmedSuccess', { ns: 'errors' }),
    });
  } catch (error) {
    logger.error('Error confirming email', { error });
    next(error);
  }
}

/**
 * Request password reset
 * POST /api/auth/request-password-reset
 */
export async function requestPasswordResetHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = requestPasswordResetSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          let message = err.message;
          if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { username } = validationResult.data;

    // Request password reset (always returns success to prevent enumeration)
    await requestPasswordReset(username);

    logger.info('Password reset requested', { username });

    // Always return 200 status to prevent username enumeration
    res.status(200).json({
      message: req.t('auth.passwordResetRequested', { ns: 'errors' }),
    });
  } catch (error) {
    logger.error('Error requesting password reset', { error });
    next(error);
  }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = resetPasswordSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          let message = err.message;
          if (err.message.includes('at least')) {
            const min = err.message.match(/\d+/)?.[0] || '8';
            message = req.t('messages.minLength', { ns: 'validation', field: fieldName, min });
          } else if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { token, newPassword, passwordConfirmation } = validationResult.data;

    // Reset password
    await resetPassword(token, newPassword, passwordConfirmation);

    logger.info('Password reset successfully');

    res.status(200).json({
      message: req.t('auth.passwordResetSuccess', { ns: 'errors' }),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid or expired reset token') {
        res.status(400).json({
          error: req.t('auth.invalidOrExpiredResetToken', { ns: 'errors' }),
        });
        return;
      }
      if (error.message === 'Password must be at least 8 characters') {
        res.status(400).json({
          error: req.t('validation.passwordTooShort', { ns: 'errors', min: 8 }),
        });
        return;
      }
      if (error.message === 'Password and confirmation do not match') {
        res.status(400).json({
          error: req.t('validation.passwordMismatch', { ns: 'errors' }),
        });
        return;
      }
    }
    logger.error('Error resetting password', { error });
    next(error);
  }
}

/**
 * Change password for authenticated user
 * PATCH /api/auth/change-password
 */
export async function changePasswordHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated
    if (!req.account) {
      res.status(401).json({
        error: req.t('auth.authenticationRequired', { ns: 'errors' }),
      });
      return;
    }

    // Validate request body
    const validationResult = changePasswordSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: req.t('validation.validationFailed', { ns: 'errors' }),
        details: validationResult.error.errors.map((err) => {
          const field = err.path.join('.');
          const fieldName = req.t(`fields.${field}`, { ns: 'validation', defaultValue: field });
          
          let message = err.message;
          if (err.message.includes('at least')) {
            const min = err.message.match(/\d+/)?.[0] || '8';
            message = req.t('messages.minLength', { ns: 'validation', field: fieldName, min });
          } else if (err.message.includes('required')) {
            message = req.t('messages.required', { ns: 'validation', field: fieldName });
          }
          
          return {
            field,
            message,
          };
        }),
      });
      return;
    }

    const { currentPassword, newPassword, passwordConfirmation } = validationResult.data;

    // Change password
    await changePassword(req.account.id, currentPassword, newPassword, passwordConfirmation);

    logger.info('Password changed successfully', {
      accountId: req.account.id,
      username: req.account.username,
    });

    res.status(200).json({
      message: req.t('auth.passwordChangedSuccess', { ns: 'errors' }),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Current password is incorrect') {
        res.status(401).json({
          error: req.t('auth.currentPasswordIncorrect', { ns: 'errors' }),
        });
        return;
      }
      if (error.message === 'Password must be at least 8 characters') {
        res.status(400).json({
          error: req.t('validation.passwordTooShort', { ns: 'errors', min: 8 }),
        });
        return;
      }
      if (error.message === 'Password and confirmation do not match') {
        res.status(400).json({
          error: req.t('validation.passwordMismatch', { ns: 'errors' }),
        });
        return;
      }
    }
    logger.error('Error changing password', { error });
    next(error);
  }
}
