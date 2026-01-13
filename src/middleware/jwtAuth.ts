import { Request, Response, NextFunction } from 'express';
import { verifyJWT, JwtPayload } from '../services/auth';
import logger from '../utils/logger';
import { AccountRole } from '../types/account';

// Extend Express Request type to include account information
export interface AuthRequest extends Request {
  account?: {
    id: string;
    username: string;
    role: AccountRole;
  };
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header for protected routes
 * Returns 401 for missing or invalid tokens
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Extract token from Authorization header (Bearer <token>)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Check if token is present
  if (!token) {
    logger.warn('Authentication failure: Missing JWT token', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    // Verify and decode JWT token
    const payload: JwtPayload = verifyJWT(token);

    // Add account information to request object
    req.account = {
      id: payload.accountId,
      username: payload.username,
      role: payload.role,
    };

    // Log successful authentication at debug level
    logger.debug('JWT authentication successful', {
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (err) {
    logger.warn('Authentication failure: Invalid or expired JWT token', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
}

/**
 * Optional JWT Authentication Middleware
 * Attempts to authenticate but allows request to proceed even without valid token
 * Useful for public routes that may have enhanced functionality for authenticated users
 * 
 * Checks for token in:
 * 1. Authorization header (Bearer <token>)
 * 2. Query parameter (?token=<token>) - used for SSE connections
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Extract token from Authorization header (Bearer <token>) or query parameter
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const queryToken = req.query.token as string | undefined;
  const token = headerToken || queryToken;

  // If no token provided, continue without authentication
  if (!token) {
    logger.debug('Optional auth: No token provided, continuing without authentication', {
      path: req.path,
      method: req.method,
    });
    next();
    return;
  }

  try {
    // Verify and decode JWT token
    const payload: JwtPayload = verifyJWT(token);

    // Add account information to request object
    req.account = {
      id: payload.accountId,
      username: payload.username,
      role: payload.role,
    };

    logger.debug('Optional auth: JWT authentication successful', {
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role,
      path: req.path,
      method: req.method,
    });
  } catch (err) {
    // Token is invalid but we continue anyway for optional auth
    logger.debug('Optional auth: Invalid token, continuing without authentication', {
      path: req.path,
      method: req.method,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  next();
}

/**
 * Role-based Authorization Middleware Factory
 * Creates middleware that enforces specific role requirements for protected routes
 * 
 * @param allowedRoles - Array of roles that can access the route
 * @returns Express middleware function that checks user role
 * 
 * @example
 * // Admin-only route
 * router.get('/admin/users', authenticateToken, requireRole('admin'), listUsers);
 * 
 * // Admin or account_owner
 * router.post('/short-urls', authenticateToken, requireRole('admin', 'account_owner'), createShortUrl);
 */
export function requireRole(
  ...allowedRoles: AccountRole[]
): (req: AuthRequest, res: Response, next: NextFunction) => void {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated - this should never happen if authenticateToken runs first
    if (!req.account) {
      logger.warn('Authorization failure: Not authenticated', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        requiredRoles: allowedRoles,
        timestamp: new Date().toISOString(),
      });
      res.status(401).json({ error: 'Authentication required' });
      return; // Explicitly stop execution - do not proceed to next middleware
    }

    // Check if user has required role - MUST happen before any request validation
    // This prevents information leakage through validation errors
    if (!allowedRoles.includes(req.account.role)) {
      logger.warn('Authorization failure: Insufficient permissions', {
        accountId: req.account.id,
        username: req.account.username,
        userRole: req.account.role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return; // Explicitly stop execution - do not proceed to next middleware
    }

    // User is authenticated and has required role
    logger.debug('Authorization successful', {
      accountId: req.account.id,
      username: req.account.username,
      userRole: req.account.role,
      requiredRoles: allowedRoles,
      path: req.path,
      method: req.method,
    });

    next();
  };
}
