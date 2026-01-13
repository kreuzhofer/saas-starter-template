import jwt from 'jsonwebtoken';
import { AccountRole } from '../../types/account';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Generate a test JWT token
 */
export function generateTestToken(payload: {
  accountId: string;
  username: string;
  role?: AccountRole;
}): string {
  return jwt.sign(
    {
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role || 'account_owner',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredToken(payload: {
  accountId: string;
  username: string;
  role?: AccountRole;
}): string {
  return jwt.sign(
    {
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role || 'account_owner',
    },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );
}

/**
 * Generate an invalid JWT token (wrong secret)
 */
export function generateInvalidToken(payload: {
  accountId: string;
  username: string;
  role?: AccountRole;
}): string {
  return jwt.sign(
    {
      accountId: payload.accountId,
      username: payload.username,
      role: payload.role || 'account_owner',
    },
    'wrong-secret',
    { expiresIn: '24h' }
  );
}

/**
 * Decode a JWT token without verification (for testing)
 */
export function decodeTestToken(token: string): any {
  return jwt.decode(token);
}
