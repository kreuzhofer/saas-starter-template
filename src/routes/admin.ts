import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/jwtAuth';
import {
  listUsers,
  getUser,
  updateRole,
  updateTier,
  updateEmail,
  resetUserPassword,
  setPassword,
  activateUserAccount,
  deactivateUserAccount,
  deleteUserAccount,
  listTaskStatuses,
  triggerTask,
  setTaskEnabled,
  getTaskLogs,
  getOverrides,
  createOverride,
  deleteOverride,
} from '../controllers/admin';

const router = Router();

// All admin routes require authentication and admin role
// Apply authenticateToken and requireRole('admin') to all routes

// GET /api/admin/users - List all users
router.get('/users', authenticateToken, requireRole('admin'), listUsers);

// GET /api/admin/users/:id - Get specific user details
router.get('/users/:id', authenticateToken, requireRole('admin'), getUser);

// PATCH /api/admin/users/:id/role - Update user role
router.patch('/users/:id/role', authenticateToken, requireRole('admin'), updateRole);

// PATCH /api/admin/users/:id/tier - Update user tier
router.patch('/users/:id/tier', authenticateToken, requireRole('admin'), updateTier);

// PATCH /api/admin/users/:id/email - Update user email
router.patch('/users/:id/email', authenticateToken, requireRole('admin'), updateEmail);

// POST /api/admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', authenticateToken, requireRole('admin'), resetUserPassword);

// POST /api/admin/users/:id/set-password - Set user password directly
router.post('/users/:id/set-password', authenticateToken, requireRole('admin'), setPassword);

// PATCH /api/admin/users/:id/activate - Activate user account
router.patch('/users/:id/activate', authenticateToken, requireRole('admin'), activateUserAccount);

// PATCH /api/admin/users/:id/deactivate - Deactivate user account
router.patch('/users/:id/deactivate', authenticateToken, requireRole('admin'), deactivateUserAccount);

// DELETE /api/admin/users/:id - Permanently delete user account
router.delete('/users/:id', authenticateToken, requireRole('admin'), deleteUserAccount);

// Override management endpoints
// GET /api/admin/users/:id/overrides - Get all overrides for a user
router.get('/users/:id/overrides', authenticateToken, requireRole('admin'), getOverrides);

// POST /api/admin/users/:id/overrides - Create or update an override
router.post('/users/:id/overrides', authenticateToken, requireRole('admin'), createOverride);

// DELETE /api/admin/users/:id/overrides/:limitName - Delete an override
router.delete('/users/:id/overrides/:limitName', authenticateToken, requireRole('admin'), deleteOverride);

// Task management endpoints
// GET /api/admin/tasks - List all task statuses
router.get('/tasks', authenticateToken, requireRole('admin'), listTaskStatuses);

// POST /api/admin/tasks/:name/trigger - Manually trigger task
router.post('/tasks/:name/trigger', authenticateToken, requireRole('admin'), triggerTask);

// PATCH /api/admin/tasks/:name/enable - Enable/disable task
router.patch('/tasks/:name/enable', authenticateToken, requireRole('admin'), setTaskEnabled);

// GET /api/admin/tasks/:name/logs - Get task execution logs
router.get('/tasks/:name/logs', authenticateToken, requireRole('admin'), getTaskLogs);

export default router;
