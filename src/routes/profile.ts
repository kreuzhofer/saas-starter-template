import { Router } from 'express';
import { authenticateToken } from '../middleware/jwtAuth';
import { 
  getProfile,
  updateProfile,
  updateLanguagePreference,
  requestEmailChange, 
  confirmEmailChange, 
  exportUserData, 
  deleteAccount,
} from '../controllers/profile';

const router = Router();

// GET /api/profile - Get user profile information (requires authentication)
router.get('/', authenticateToken, getProfile);

// PATCH /api/profile - Update user profile information (requires authentication)
router.patch('/', authenticateToken, updateProfile);

// PATCH /api/profile/language - Update language preference (requires authentication)
router.patch('/language', authenticateToken, updateLanguagePreference);

// POST /api/profile/request-email-change - Request email address change (requires authentication)
router.post('/request-email-change', authenticateToken, requestEmailChange);

// POST /api/profile/confirm-email-change - Confirm email address change
router.post('/confirm-email-change', confirmEmailChange);

// GET /api/profile/export - Export all user data (requires authentication)
router.get('/export', authenticateToken, exportUserData);

// DELETE /api/profile - Delete user account and all associated data (requires authentication)
router.delete('/', authenticateToken, deleteAccount);

export default router;
