import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  refreshToken,
  JwtPayload,
} from '../../services/auth';
import jwt from 'jsonwebtoken';

describe('Authentication Utilities', () => {
  const testAccountId = 'test-account-123';
  const testUsername = 'test@example.com';
  const testPassword = 'testPassword123';

  describe('Password Hashing', () => {
    it('should hash a password using bcrypt', async () => {
      const hash = await hashPassword(testPassword);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(0);
      // Bcrypt hashes start with $2b$ or $2a$
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(100);
      const hash = await hashPassword(longPassword);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password against hash', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword(testPassword, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword('wrongPassword', hash);
      
      expect(isValid).toBe(false);
    });

    it('should reject empty password when hash is not empty', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await verifyPassword('', hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle case-sensitive password verification', async () => {
      const hash = await hashPassword('Password123');
      const isValid = await verifyPassword('password123', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate a valid JWT token', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include accountId and username in token payload', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const decoded = jwt.decode(token) as JwtPayload;
      
      expect(decoded.accountId).toBe(testAccountId);
      expect(decoded.username).toBe(testUsername);
    });

    it('should include role in token payload', () => {
      const token = generateJWT(testAccountId, testUsername, 'admin');
      const decoded = jwt.decode(token) as JwtPayload;
      
      expect(decoded.role).toBe('admin');
    });

    it('should include expiration time in token', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const decoded = jwt.decode(token) as JwtPayload;
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should include issued at time in token', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const decoded = jwt.decode(token) as JwtPayload;
      
      expect(decoded.iat).toBeDefined();
      expect(decoded.iat).toBeLessThanOrEqual(Date.now() / 1000);
    });

    it('should generate different tokens for different accounts', () => {
      const token1 = generateJWT('account-1', 'user1@example.com', 'account_owner');
      const token2 = generateJWT('account-2', 'user2@example.com', 'account_owner');
      
      expect(token1).not.toBe(token2);
      
      const decoded1 = jwt.decode(token1) as JwtPayload;
      const decoded2 = jwt.decode(token2) as JwtPayload;
      
      expect(decoded1.accountId).toBe('account-1');
      expect(decoded2.accountId).toBe('account-2');
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify and decode a valid token', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const payload = verifyJWT(token);
      
      expect(payload).toBeDefined();
      expect(payload.accountId).toBe(testAccountId);
      expect(payload.username).toBe(testUsername);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyJWT(invalidToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => verifyJWT(malformedToken)).toThrow('Invalid or expired token');
    });

    it('should throw error for token with wrong signature', () => {
      // Generate token with different secret
      const wrongToken = jwt.sign(
        { accountId: testAccountId, username: testUsername },
        'wrong-secret',
        { expiresIn: '24h' }
      );
      
      expect(() => verifyJWT(wrongToken)).toThrow('Invalid or expired token');
    });

    it('should extract correct payload from token', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const payload = verifyJWT(token);
      
      expect(payload.accountId).toBe(testAccountId);
      expect(payload.username).toBe(testUsername);
      expect(payload.role).toBe('account_owner');
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.exp).toBe('number');
    });

    it('should throw error for token with invalid role', () => {
      // Create a token with an invalid role using jwt.sign directly
      const tokenWithInvalidRole = jwt.sign(
        { accountId: testAccountId, username: testUsername, role: 'superadmin' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      
      expect(() => verifyJWT(tokenWithInvalidRole)).toThrow('Invalid role in token');
    });

    it('should throw error for token with missing role', () => {
      // Create a token without a role field
      const tokenWithoutRole = jwt.sign(
        { accountId: testAccountId, username: testUsername },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      
      expect(() => verifyJWT(tokenWithoutRole)).toThrow('Invalid role in token');
    });
  });

  describe('Token Expiration Handling', () => {
    it('should reject expired token', () => {
      // Generate token that expires immediately
      const expiredToken = jwt.sign(
        { accountId: testAccountId, username: testUsername },
        process.env.JWT_SECRET!,
        { expiresIn: '0s' }
      );
      
      // Wait a bit to ensure expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => verifyJWT(expiredToken)).toThrow('Invalid or expired token');
          resolve(undefined);
        }, 100);
      });
    });

    it('should accept token that has not expired', () => {
      // Use generateJWT to create a valid token with proper secret
      const validToken = generateJWT(testAccountId, testUsername, 'account_owner');
      
      const payload = verifyJWT(validToken);
      expect(payload.accountId).toBe(testAccountId);
      expect(payload.username).toBe(testUsername);
    });

    it('should have expiration time in the future for newly generated tokens', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const payload = verifyJWT(token);
      
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
    });

    it('should calculate correct expiration duration', () => {
      const token = generateJWT(testAccountId, testUsername, 'account_owner');
      const payload = verifyJWT(token);
      
      const duration = payload.exp - payload.iat;
      // Default is 24h = 86400 seconds
      expect(duration).toBe(86400);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token and preserve role', async () => {
      const originalToken = generateJWT(testAccountId, testUsername, 'admin');
      const originalPayload = verifyJWT(originalToken);
      
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1100)); // Need 1+ second for JWT exp/iat to differ
      
      const result = await refreshToken(originalToken);
      
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      
      const newPayload = verifyJWT(result.token);
      expect(newPayload.accountId).toBe(originalPayload.accountId);
      expect(newPayload.username).toBe(originalPayload.username);
      expect(newPayload.role).toBe(originalPayload.role);
      expect(newPayload.role).toBe('admin');
    });

    it('should refresh token and preserve account_owner role', async () => {
      const originalToken = generateJWT(testAccountId, testUsername, 'account_owner');
      const originalPayload = verifyJWT(originalToken);
      
      const result = await refreshToken(originalToken);
      
      const newPayload = verifyJWT(result.token);
      expect(newPayload.role).toBe('account_owner');
      expect(newPayload.role).toBe(originalPayload.role);
    });

    it('should refresh token and preserve account_user role', async () => {
      const originalToken = generateJWT(testAccountId, testUsername, 'account_user');
      const originalPayload = verifyJWT(originalToken);
      
      const result = await refreshToken(originalToken);
      
      const newPayload = verifyJWT(result.token);
      expect(newPayload.role).toBe('account_user');
      expect(newPayload.role).toBe(originalPayload.role);
    });

    it('should generate new expiration time on refresh', async () => {
      const originalToken = generateJWT(testAccountId, testUsername, 'account_owner');
      const originalPayload = verifyJWT(originalToken);
      
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1100)); // Need 1+ second for JWT exp/iat to differ
      
      const result = await refreshToken(originalToken);
      const newPayload = verifyJWT(result.token);
      
      expect(newPayload.exp).toBeGreaterThan(originalPayload.exp);
      expect(newPayload.iat).toBeGreaterThan(originalPayload.iat);
    });

    it('should throw error when refreshing invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(refreshToken(invalidToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error when refreshing token with invalid role', async () => {
      const tokenWithInvalidRole = jwt.sign(
        { accountId: testAccountId, username: testUsername, role: 'superadmin' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      
      await expect(refreshToken(tokenWithInvalidRole)).rejects.toThrow('Invalid role in token');
    });
  });
});
