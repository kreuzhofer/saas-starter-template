import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/jwtAuth';
import {
  listAllUsers,
  getUserById,
  updateUserRole,
  updateUserEmail,
  updateUserTier,
  adminResetPassword,
  setUserPassword,
  activateUser,
  deactivateUser,
  deleteUser,
  SelfDeletionError,
  ActiveAccountDeletionError,
} from '../services/admin';
import logger from '../utils/logger';
import { ACCOUNT_ROLES } from '../types/account';
import { ACCOUNT_TIERS } from '../types/accountTier';
import { scheduler } from '../scheduler';
import { tierService } from '../services/tierService';
import { getLimitNames } from '../config/tierConfig';
import { ExecutionHistoryRepository } from '../scheduler/ExecutionHistoryRepository';

// Validation schemas
const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'account_owner', 'account_user'], {
    errorMap: () => ({ message: 'Role must be one of: admin, account_owner, account_user' }),
  }),
});

const updateUserTierSchema = z.object({
  tier: z.enum(['starter', 'pro', 'business', 'enterprise'], {
    errorMap: () => ({ message: 'Invalid tier. Must be one of: starter, pro, business, enterprise' }),
  }),
});

const updateUserEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const createOverrideSchema = z.object({
  limitName: z.string().min(1, 'Limit name is required'),
  value: z.number().int('Value must be an integer'),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * List all user accounts
 * GET /api/admin/users
 */
export async function listUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated (handled by authenticateToken middleware)
    if (!req.account) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    // Get all users
    const users = await listAllUsers();

    logger.info('Admin listed all users', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      userCount: users.length,
    });

    res.status(200).json({
      users,
      total: users.length,
    });
  } catch (error) {
    logger.error('Error listing users', { error });
    next(error);
  }
}

/**
 * Get specific user details by ID
 * GET /api/admin/users/:id
 */
export async function getUser(
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

    // Get user by ID
    const user = await getUserById(id);

    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    logger.info('Admin retrieved user details', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
    });

    res.status(200).json(user);
  } catch (error) {
    logger.error('Error retrieving user', { error });
    next(error);
  }
}

/**
 * Update user role
 * PATCH /api/admin/users/:id/role
 */
export async function updateRole(
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
    const validationResult = updateUserRoleSchema.safeParse(req.body);

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

    const { role } = validationResult.data;

    // Update user role with requesting admin ID for self-protection
    const updatedUser = await updateUserRole(id, role, req.account.id);

    logger.info('Admin updated user role', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      newRole: role,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
      if (error.message.startsWith('Invalid role')) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
      if (error.message.includes('Cannot change your own admin role')) {
        res.status(403).json({
          error: error.message,
        });
        return;
      }
    }
    logger.error('Error updating user role', { error });
    next(error);
  }
}

/**
 * Update user tier
 * PATCH /api/admin/users/:id/tier
 */
export async function updateTier(
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
    const validationResult = updateUserTierSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: validationResult.error.errors[0]?.message || 'Invalid tier. Must be one of: starter, pro, business, enterprise',
      });
      return;
    }

    const { tier } = validationResult.data;

    // Update user tier
    const updatedUser = await updateUserTier(id, tier);

    logger.info('Admin updated user tier', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      newTier: tier,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
      if (error.message.startsWith('Invalid tier')) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
    }
    logger.error('Error updating user tier', { error });
    next(error);
  }
}

/**
 * Update user email address
 * PATCH /api/admin/users/:id/email
 */
export async function updateEmail(
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
    const validationResult = updateUserEmailSchema.safeParse(req.body);

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

    const { email } = validationResult.data;

    // Update user email
    const updatedUser = await updateUserEmail(id, email);

    logger.info('Admin updated user email', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      newEmail: email,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
      if (error.message === 'Invalid email address format') {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
      if (error.message === 'Email address already in use') {
        res.status(409).json({
          error: error.message,
        });
        return;
      }
    }
    logger.error('Error updating user email', { error });
    next(error);
  }
}

/**
 * Reset user password (admin-initiated)
 * POST /api/admin/users/:id/reset-password
 */
export async function resetUserPassword(
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

    // Trigger password reset
    await adminResetPassword(id);

    logger.info('Admin initiated password reset', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
    });

    res.status(200).json({
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
      });
      return;
    }
    logger.error('Error resetting user password', { error });
    next(error);
  }
}

/**
 * Set user password directly (admin-initiated)
 * POST /api/admin/users/:id/set-password
 */
export async function setPassword(
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
    const validationResult = setPasswordSchema.safeParse(req.body);

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

    const { password } = validationResult.data;

    // Set user password directly
    const result = await setUserPassword(id, password);

    logger.info('Admin set user password directly', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
      if (error.message.includes('Password must be at least')) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }
    }
    logger.error('Error setting user password', { error });
    next(error);
  }
}

/**
 * Activate user account
 * PATCH /api/admin/users/:id/activate
 */
export async function activateUserAccount(
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

    // Activate user account
    const updatedUser = await activateUser(id);

    logger.info('Admin activated user account', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
      });
      return;
    }
    logger.error('Error activating user account', { error });
    next(error);
  }
}

/**
 * Deactivate user account
 * PATCH /api/admin/users/:id/deactivate
 */
export async function deactivateUserAccount(
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

    // Deactivate user account with self-protection check
    const updatedUser = await deactivateUser(id, req.account.id);

    logger.info('Admin deactivated user account', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({
          error: error.message,
        });
        return;
      }
      if (error.message === 'Cannot deactivate your own account') {
        res.status(403).json({
          error: error.message,
        });
        return;
      }
    }
    logger.error('Error deactivating user account', { error });
    next(error);
  }
}

/**
 * List all scheduled task statuses
 * GET /api/admin/tasks
 */
export async function listTaskStatuses(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated (handled by authenticateToken middleware)
    if (!req.account) {
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    // Get all task statuses from scheduler
    const taskStatuses = await scheduler.getTaskStatuses();

    logger.info('Admin listed task statuses', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      taskCount: taskStatuses.length,
    });

    res.status(200).json({
      tasks: taskStatuses,
      total: taskStatuses.length,
    });
  } catch (error) {
    logger.error('Error listing task statuses', { error });
    next(error);
  }
}

/**
 * Manually trigger a task execution
 * POST /api/admin/tasks/:name/trigger
 */
export async function triggerTask(
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

    const { name } = req.params;

    // Trigger the task
    await scheduler.triggerTask(name);

    // Get the task status to retrieve execution time
    const statuses = await scheduler.getTaskStatuses();
    const taskStatus = statuses.find(s => s.taskName === name);
    const executionTime = taskStatus?.lastDuration || 0;

    logger.info('Admin manually triggered task', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      taskName: name,
      executionTime,
    });

    res.status(200).json({
      success: true,
      message: `Task '${name}' triggered successfully`,
      executionTime,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Task not found')) {
      res.status(404).json({
        error: error.message,
      });
      return;
    }
    logger.error('Error triggering task', { error });
    next(error);
  }
}

/**
 * Enable or disable a task
 * PATCH /api/admin/tasks/:name/enable
 */
export async function setTaskEnabled(
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

    const { name } = req.params;
    const { enabled } = req.body;

    // Validate enabled parameter
    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        error: 'Invalid request body',
        details: [
          {
            field: 'enabled',
            message: 'enabled must be a boolean',
          },
        ],
      });
      return;
    }

    // Enable or disable the task
    await scheduler.setTaskEnabled(name, enabled);

    logger.info('Admin changed task enabled status', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      taskName: name,
      enabled,
    });

    res.status(200).json({
      message: `Task '${name}' ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Task not found')) {
      res.status(404).json({
        error: error.message,
      });
      return;
    }
    logger.error('Error setting task enabled status', { error });
    next(error);
  }
}

/**
 * Get task execution logs
 * GET /api/admin/tasks/:name/logs
 */
export async function getTaskLogs(
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

    const { name } = req.params;
    const limitParam = req.query.limit as string | undefined;

    // Parse and validate limit parameter
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Invalid limit parameter',
        details: [
          {
            field: 'limit',
            message: 'limit must be a number between 1 and 100',
          },
        ],
      });
      return;
    }

    // Check if task exists in the registry
    if (!scheduler.hasTask(name)) {
      res.status(404).json({
        error: `Task not found: ${name}`,
      });
      return;
    }

    // Get task statuses to find the specific task's execution history
    const taskStatuses = await scheduler.getTaskStatuses();
    const taskStatus = taskStatuses.find((t) => t.taskName === name);

    // Build logs array from current status
    // Note: Current implementation only stores the most recent execution
    // Future enhancement: Query TaskExecutionHistory table for full history
    const logs = [];
    if (taskStatus && taskStatus.lastRun) {
      logs.push({
        timestamp: taskStatus.lastRun,
        result: taskStatus.lastResult,
        duration: taskStatus.lastDuration,
        error: taskStatus.lastError,
      });
    }

    logger.info('Admin retrieved task logs', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      taskName: name,
      logCount: logs.length,
    });

    res.status(200).json({
      taskName: name,
      logs,
    });
  } catch (error) {
    logger.error('Error retrieving task logs', { error });
    next(error);
  }
}


/**
 * Get task execution history with pagination
 * GET /api/admin/tasks/:name/history
 */
export async function getTaskExecutionHistory(
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

    const { name } = req.params;
    const limitParam = req.query.limit as string | undefined;
    const offsetParam = req.query.offset as string | undefined;

    // Parse and validate limit parameter (1-100, default 10)
    let limit = 10;
    if (limitParam) {
      limit = parseInt(limitParam, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'limit must be between 1 and 100',
        });
        return;
      }
    }

    // Parse and validate offset parameter (non-negative, default 0)
    let offset = 0;
    if (offsetParam) {
      offset = parseInt(offsetParam, 10);
      if (isNaN(offset) || offset < 0) {
        res.status(400).json({
          error: 'offset must be non-negative',
        });
        return;
      }
    }

    // Create repository instance
    const historyRepository = new ExecutionHistoryRepository();

    // Query execution history
    const executions = await historyRepository.findByTaskName({
      taskName: name,
      limit,
      offset,
    });

    // Get total count
    const total = await historyRepository.countByTaskName(name);

    logger.info('Admin retrieved task execution history', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      taskName: name,
      executionCount: executions.length,
      total,
      limit,
      offset,
    });

    res.status(200).json({
      taskName: name,
      executions: executions.map(exec => ({
        id: exec.id,
        startedAt: exec.startedAt.toISOString(),
        completedAt: exec.completedAt.toISOString(),
        result: exec.result,
        errorMessage: exec.errorMessage,
        duration: exec.duration,
        capturedLogs: exec.capturedLogs,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error retrieving task execution history', { 
      error,
      taskName: req.params.name,
    });
    res.status(500).json({
      error: 'Failed to retrieve execution history',
    });
  }
}

/**
 * Get all limit overrides for a user
 * GET /api/admin/users/:id/overrides
 */
export async function getOverrides(
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

    // Check if user exists
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // Get all overrides for the user
    const overrides = await tierService.getOverrides(id);

    logger.info('Admin retrieved user overrides', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      overrideCount: overrides.length,
    });

    res.status(200).json({
      overrides,
      total: overrides.length,
    });
  } catch (error) {
    logger.error('Error retrieving user overrides', { error });
    next(error);
  }
}

/**
 * Create or update a limit override for a user
 * POST /api/admin/users/:id/overrides
 */
export async function createOverride(
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

    // Check if user exists
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // Validate request body
    const validationResult = createOverrideSchema.safeParse(req.body);

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

    const { limitName, value, expiresAt } = validationResult.data;

    // Validate limit name exists in configuration
    const validLimitNames = getLimitNames();
    if (!validLimitNames.includes(limitName)) {
      res.status(400).json({
        error: `Invalid limit name: ${limitName}. Valid limit names are: ${validLimitNames.join(', ')}`,
      });
      return;
    }

    // Set the override
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    await tierService.setOverride(id, limitName, value, expiresAtDate);

    // Get the updated overrides
    const overrides = await tierService.getOverrides(id);
    const createdOverride = overrides.find(o => o.limitName === limitName);

    logger.info('Admin created/updated user override', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      limitName,
      value,
      expiresAt: expiresAtDate?.toISOString() || 'permanent',
    });

    res.status(201).json({
      success: true,
      override: createdOverride,
    });
  } catch (error) {
    logger.error('Error creating user override', { error });
    next(error);
  }
}

/**
 * Delete a limit override for a user
 * DELETE /api/admin/users/:id/overrides/:limitName
 */
export async function deleteOverride(
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

    const { id, limitName } = req.params;

    // Check if user exists
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // Delete the override
    await tierService.deleteOverride(id, limitName);

    logger.info('Admin deleted user override', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      limitName,
    });

    res.status(200).json({
      success: true,
      message: `Override for '${limitName}' deleted successfully`,
    });
  } catch (error) {
    logger.error('Error deleting user override', { error });
    next(error);
  }
}

/**
 * Permanently delete a user account
 * DELETE /api/admin/users/:id
 */
export async function deleteUserAccount(
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

    // Delete user account with requesting admin ID for self-protection
    const result = await deleteUser(id, req.account.id);

    logger.info('Admin deleted user account', {
      adminId: req.account.id,
      adminUsername: req.account.username,
      targetUserId: id,
      deletedUsername: result.deletedUser.username,
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      deletedUser: result.deletedUser,
    });
  } catch (error) {
    if (error instanceof SelfDeletionError) {
      res.status(403).json({
        error: error.message,
      });
      return;
    }
    if (error instanceof ActiveAccountDeletionError) {
      res.status(400).json({
        error: error.message,
      });
      return;
    }
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        error: error.message,
      });
      return;
    }
    logger.error('Error deleting user account', { error });
    next(error);
  }
}
