import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registerUser, loginUser, refreshUserToken, confirmEmail, requestPasswordResetHandler, resetPasswordHandler, changePasswordHandler } from '../controllers/auth';
import { authenticateToken } from '../middleware/jwtAuth';
import { config } from '../config';

const router = Router();

// Rate limiter for authentication endpoints
// Configurable via environment variables
const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// POST /api/auth/register - Register new user account
router.post('/register', authLimiter, registerUser);

// POST /api/auth/login - Login with username and password
router.post('/login', authLimiter, loginUser);

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authLimiter, refreshUserToken);

// POST /api/auth/confirm-email - Confirm email address
router.post('/confirm-email', confirmEmail);

// POST /api/auth/request-password-reset - Request password reset
router.post('/request-password-reset', authLimiter, requestPasswordResetHandler);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', authLimiter, resetPasswordHandler);

// PATCH /api/auth/change-password - Change password for authenticated user
router.patch('/change-password', authenticateToken, authLimiter, changePasswordHandler);

export default router;
