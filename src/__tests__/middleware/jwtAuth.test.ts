import { Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, requireRole, AuthRequest } from '../../middleware/jwtAuth';
import { generateTestToken, generateExpiredToken, generateInvalidToken } from '../helpers/testAuth';

describe('JWT Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const testAccountId = 'test-account-123';
  const testUsername = 'test@example.com';

  beforeEach(() => {
    // Reset mocks before each test
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      headers: {},
      query: {},
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'GET',
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    
    nextFunction = jest.fn();
  });

  describe('authenticateToken - Valid Token', () => {
    it('should authenticate request with valid token', () => {
      const validToken = generateTestToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.account).toBeDefined();
      expect(mockRequest.account?.id).toBe(testAccountId);
      expect(mockRequest.account?.username).toBe(testUsername);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should add account information to request object', () => {
      const validToken = generateTestToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.account).toEqual({
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      });
    });

    it('should call next() after successful authentication', () => {
      const validToken = generateTestToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('authenticateToken - Missing Token', () => {
    it('should return 401 when authorization header is missing', () => {
      mockRequest.headers = {};

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should return 401 when authorization header is empty', () => {
      mockRequest.headers = {
        authorization: '',
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer token is missing', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      const validToken = generateTestToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: validToken, // Missing "Bearer " prefix
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authenticateToken - Invalid Token', () => {
    it('should return 401 for malformed token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should return 401 for token with wrong signature', () => {
      const invalidToken = generateInvalidToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should return 401 for empty token string', () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('authenticateToken - Expired Token', () => {
    it('should return 401 for expired token', () => {
      const expiredToken = generateExpiredToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should not add account information for expired token', () => {
      const expiredToken = generateExpiredToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      authenticateToken(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.account).toBeUndefined();
    });
  });

  describe('optionalAuth - Valid Token', () => {
    it('should authenticate request with valid token', () => {
      const validToken = generateTestToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.account).toBeDefined();
      expect(mockRequest.account?.id).toBe(testAccountId);
      expect(mockRequest.account?.username).toBe(testUsername);
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should add account information to request object', () => {
      const validToken = generateTestToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.account).toEqual({
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      });
    });
  });

  describe('optionalAuth - Missing Token', () => {
    it('should continue without authentication when token is missing', () => {
      mockRequest.headers = {};

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should not return error when authorization header is missing', () => {
      mockRequest.headers = {};

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).not.toHaveBeenCalled();
      expect(jsonMock).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should continue without authentication when authorization header is empty', () => {
      mockRequest.headers = {
        authorization: '',
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.account).toBeUndefined();
    });
  });

  describe('optionalAuth - Invalid Token', () => {
    it('should continue without authentication for invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should continue without authentication for token with wrong signature', () => {
      const invalidToken = generateInvalidToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should not throw error for malformed token', () => {
      mockRequest.headers = {
        authorization: 'Bearer malformed.token',
      };

      expect(() => {
        optionalAuth(
          mockRequest as AuthRequest,
          mockResponse as Response,
          nextFunction
        );
      }).not.toThrow();

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('optionalAuth - Expired Token', () => {
    it('should continue without authentication for expired token', () => {
      const expiredToken = generateExpiredToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
      expect(mockRequest.account).toBeUndefined();
    });

    it('should not add account information for expired token', () => {
      const expiredToken = generateExpiredToken({ accountId: testAccountId, username: testUsername });
      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.account).toBeUndefined();
    });
  });
});

describe('requireRole Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const testAccountId = 'test-account-123';
  const testUsername = 'test@example.com';

  beforeEach(() => {
    // Reset mocks before each test
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      headers: {},
      ip: '127.0.0.1',
      path: '/api/admin/users',
      method: 'GET',
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    
    nextFunction = jest.fn();
  });

  describe('requireRole - Authenticated with Correct Role', () => {
    it('should allow access when user has required role', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'admin',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      };

      const middleware = requireRole('admin', 'account_owner');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow admin to access admin-only routes', () => {
      mockRequest.account = {
        id: testAccountId,
        username: 'admin@example.com',
        role: 'admin',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow account_owner to access owner routes', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      };

      const middleware = requireRole('account_owner', 'account_user');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('requireRole - Not Authenticated', () => {
    it('should return 401 when user is not authenticated', () => {
      mockRequest.account = undefined;

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when account object is missing', () => {
      // No account set on request
      const middleware = requireRole('admin', 'account_owner');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole - Authenticated with Wrong Role', () => {
    it('should return 403 when user does not have required role', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in allowed roles list', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_user',
      };

      const middleware = requireRole('admin', 'account_owner');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when account_owner tries to access admin route', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when account_user tries to access admin route', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_user',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('requireRole - Multiple Roles', () => {
    it('should accept first role in list', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'admin',
      };

      const middleware = requireRole('admin', 'account_owner', 'account_user');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept middle role in list', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_owner',
      };

      const middleware = requireRole('admin', 'account_owner', 'account_user');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should accept last role in list', () => {
      mockRequest.account = {
        id: testAccountId,
        username: testUsername,
        role: 'account_user',
      };

      const middleware = requireRole('admin', 'account_owner', 'account_user');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
