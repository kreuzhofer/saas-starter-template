import * as fc from 'fast-check';
import { Response, NextFunction } from 'express';
import { requireRole, AuthRequest } from '../../middleware/jwtAuth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';
import { testEmailArbitrary } from '../helpers/testData';

/**
 * Feature: account-management, Property 7: Authentication requirement enforcement
 * Validates: Requirements 5.3
 * 
 * For any protected route accessed without authentication,
 * the system should return HTTP status 401.
 */

describe('Property-Based Test: Authentication Requirement Enforcement', () => {
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    
    nextFunction = jest.fn();
  });

  describe('401 Response for Unauthenticated Requests', () => {
    it('should return 401 for any protected route accessed without authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.constantFrom('/api/admin/users', '/api/short-urls', '/api/analytics', '/api/profile'), // Route path
          fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // HTTP method
          async (requiredRole, path, method) => {
            // Create mock request WITHOUT account (unauthenticated)
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: '127.0.0.1',
              path: path,
              method: method,
            };

            // Reset mocks for this iteration
            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            // Create middleware with required role
            const middleware = requireRole(requiredRole);
            middleware(
              mockRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            // Verify 401 response
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 Response for Multiple Required Roles', () => {
    it('should return 401 when accessing routes with multiple required roles without authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray(ACCOUNT_ROLES as unknown as AccountRole[], { minLength: 1, maxLength: 3 }), // Required roles
          fc.constantFrom('/api/admin/users', '/api/short-urls', '/api/analytics', '/api/profile'), // Route path
          fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // HTTP method
          async (requiredRoles, path, method) => {
            // Create mock request WITHOUT account (unauthenticated)
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: '127.0.0.1',
              path: path,
              method: method,
            };

            // Reset mocks for this iteration
            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            // Create middleware with required roles
            const middleware = requireRole(...requiredRoles);
            middleware(
              mockRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            // Verify 401 response
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 Response Consistency Across All Routes', () => {
    it('should return 401 consistently regardless of route path or HTTP method', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.string({ minLength: 1, maxLength: 50 }).map(s => `/api/${s}`), // Random API path
          fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'), // HTTP method
          async (requiredRole, path, method) => {
            // Create mock request WITHOUT account (unauthenticated)
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: '127.0.0.1',
              path: path,
              method: method,
            };

            // Reset mocks for this iteration
            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            // Create middleware with required role
            const middleware = requireRole(requiredRole);
            middleware(
              mockRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            // Verify 401 response regardless of path/method
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 Response Error Message Format', () => {
    it('should always return the same error message format for authentication failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          async (requiredRole) => {
            // Create mock request WITHOUT account (unauthenticated)
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            // Reset mocks for this iteration
            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            // Create middleware with required role
            const middleware = requireRole(requiredRole);
            middleware(
              mockRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            // Verify error message format is consistent
            expect(jsonMock).toHaveBeenCalledTimes(1);
            const errorResponse = jsonMock.mock.calls[0][0];
            
            // Check that response has exactly the expected structure
            expect(errorResponse).toEqual({ error: 'Authentication required' });
            expect(Object.keys(errorResponse)).toEqual(['error']);
            expect(typeof errorResponse.error).toBe('string');
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 Response Never Calls Next', () => {
    it('should never call next() when returning 401 for authentication failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          async (requiredRole) => {
            // Create mock request WITHOUT account (unauthenticated)
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            // Reset mocks for this iteration
            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            // Create middleware with required role
            const middleware = requireRole(requiredRole);
            middleware(
              mockRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            // Verify next() is never called when 401 is returned
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(nextFunction).not.toHaveBeenCalled();
            expect((nextFunction as jest.Mock).mock.calls.length).toBe(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 Response for All Possible Required Roles', () => {
    it('should return 401 for every possible required role when not authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(undefined), // No variation needed, just testing all roles
          async () => {
            // Test all possible required roles
            for (const requiredRole of ACCOUNT_ROLES) {
              const mockRequest: Partial<AuthRequest> = {
                account: undefined, // No authentication
                ip: '127.0.0.1',
                path: '/api/test',
                method: 'GET',
              };

              jsonMock.mockClear();
              statusMock.mockClear();
              (nextFunction as jest.Mock).mockClear();

              const middleware = requireRole(requiredRole);
              middleware(
                mockRequest as AuthRequest,
                mockResponse as Response,
                nextFunction
              );

              // Verify 401 for this required role
              expect(statusMock).toHaveBeenCalledWith(401);
              expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
              expect(nextFunction).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('401 Response Idempotence', () => {
    it('should return the same 401 response when called multiple times without authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          async (requiredRole) => {
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            const middleware = requireRole(requiredRole);

            // Call middleware multiple times
            const statusCodes: number[] = [];
            const errorMessages: string[] = [];
            
            for (let i = 0; i < 3; i++) {
              jsonMock.mockClear();
              statusMock.mockClear();
              (nextFunction as jest.Mock).mockClear();

              middleware(
                mockRequest as AuthRequest,
                mockResponse as Response,
                nextFunction
              );

              // Capture status code and error message
              statusCodes.push(statusMock.mock.calls[0][0]);
              errorMessages.push(jsonMock.mock.calls[0][0].error);
            }

            // All responses should be identical (idempotent)
            expect(statusCodes).toEqual([401, 401, 401]);
            expect(errorMessages).toEqual([
              'Authentication required',
              'Authentication required',
              'Authentication required'
            ]);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 vs 403 Distinction', () => {
    it('should return 401 for unauthenticated requests and 403 for authenticated but unauthorized requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-req'),     // Username
          async (userRole, requiredRole, accountId, username) => {
            // Skip cases where roles match (those should succeed)
            fc.pre(userRole !== requiredRole);

            // Test 1: Unauthenticated request should return 401
            const unauthenticatedRequest: Partial<AuthRequest> = {
              account: undefined,
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            const middleware = requireRole(requiredRole);
            middleware(
              unauthenticatedRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            const unauthenticatedStatus = statusMock.mock.calls[0][0];
            const unauthenticatedError = jsonMock.mock.calls[0][0].error;

            // Test 2: Authenticated but wrong role should return 403
            const authenticatedRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            middleware(
              authenticatedRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            const authenticatedStatus = statusMock.mock.calls[0][0];
            const authenticatedError = jsonMock.mock.calls[0][0].error;

            // Verify distinction between 401 and 403
            expect(unauthenticatedStatus).toBe(401);
            expect(unauthenticatedError).toBe('Authentication required');
            expect(authenticatedStatus).toBe(403);
            expect(authenticatedError).toBe('Insufficient permissions');
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('401 Response with Various IP Addresses', () => {
    it('should return 401 regardless of client IP address', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.ipV4(),                          // Random IPv4 address
          async (requiredRole, ipAddress) => {
            // Create mock request WITHOUT account (unauthenticated)
            const mockRequest: Partial<AuthRequest> = {
              account: undefined, // No authentication
              ip: ipAddress,
              path: '/api/test',
              method: 'GET',
            };

            // Reset mocks for this iteration
            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            // Create middleware with required role
            const middleware = requireRole(requiredRole);
            middleware(
              mockRequest as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            // Verify 401 response regardless of IP
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
