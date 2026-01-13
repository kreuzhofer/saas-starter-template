import * as fc from 'fast-check';
import { Response, NextFunction } from 'express';
import { requireRole, AuthRequest } from '../../middleware/jwtAuth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';
import { testEmailArbitrary } from '../helpers/testData';

/**
 * Feature: account-management, Property 6: Authorization failure responses
 * Validates: Requirements 5.2
 * 
 * For any account attempting to access a protected route without the required role,
 * the system should return HTTP status 403.
 */

describe('Property-Based Test: Authorization Failure Responses', () => {
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

  describe('403 Response for Mismatched Roles', () => {
    it('should return 403 for any authenticated user without the required role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-fail'),                  // Username
          async (userRole, requiredRole, accountId, username) => {
            // Skip cases where roles match (those should succeed, not fail)
            fc.pre(userRole !== requiredRole);

            // Create mock request with authenticated user
            const mockRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
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

            // Verify 403 response
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('403 Response for Multiple Required Roles', () => {
    it('should return 403 when user role is not in the set of required roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.subarray(ACCOUNT_ROLES as unknown as AccountRole[], { minLength: 1, maxLength: 3 }), // Required roles
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-fail'),                  // Username
          async (userRole, requiredRoles, accountId, username) => {
            // Skip cases where user has one of the required roles
            fc.pre(!requiredRoles.includes(userRole));

            // Create mock request with authenticated user
            const mockRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
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

            // Verify 403 response
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('403 Response Consistency Across Routes', () => {
    it('should return 403 consistently regardless of route path or HTTP method', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-fail'),                  // Username
          fc.constantFrom('/api/admin/users', '/api/short-urls', '/api/analytics', '/api/profile'), // Route path
          fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // HTTP method
          async (userRole, requiredRole, accountId, username, path, method) => {
            // Skip cases where roles match
            fc.pre(userRole !== requiredRole);

            // Create mock request with authenticated user
            const mockRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
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

            // Verify 403 response regardless of path/method
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
            expect(nextFunction).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('403 Response Error Message Format', () => {
    it('should always return the same error message format for authorization failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-fail'),                  // Username
          async (userRole, requiredRole, accountId, username) => {
            // Skip cases where roles match
            fc.pre(userRole !== requiredRole);

            // Create mock request with authenticated user
            const mockRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
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
            expect(errorResponse).toEqual({ error: 'Insufficient permissions' });
            expect(Object.keys(errorResponse)).toEqual(['error']);
            expect(typeof errorResponse.error).toBe('string');
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('403 Response Never Calls Next', () => {
    it('should never call next() when returning 403 for authorization failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-fail'),                  // Username
          async (userRole, requiredRole, accountId, username) => {
            // Skip cases where roles match
            fc.pre(userRole !== requiredRole);

            // Create mock request with authenticated user
            const mockRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
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

            // Verify next() is never called when 403 is returned
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(nextFunction).not.toHaveBeenCalled();
            expect((nextFunction as jest.Mock).mock.calls.length).toBe(0);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('403 Response for All Mismatched Role Pairs', () => {
    it('should return 403 for every possible combination where user role does not match required role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          testEmailArbitrary('auth-fail'),
          async (accountId, username) => {
            // Test all combinations where roles don't match
            for (const userRole of ACCOUNT_ROLES) {
              for (const requiredRole of ACCOUNT_ROLES) {
                // Only test mismatched roles
                if (userRole === requiredRole) continue;

                const mockRequest: Partial<AuthRequest> = {
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

                const middleware = requireRole(requiredRole);
                middleware(
                  mockRequest as AuthRequest,
                  mockResponse as Response,
                  nextFunction
                );

                // Verify 403 for this mismatched pair
                expect(statusMock).toHaveBeenCalledWith(403);
                expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
                expect(nextFunction).not.toHaveBeenCalled();
              }
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('403 Response Idempotence', () => {
    it('should return the same 403 response when called multiple times with the same mismatched roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('auth-fail'),                  // Username
          async (userRole, requiredRole, accountId, username) => {
            // Skip cases where roles match
            fc.pre(userRole !== requiredRole);

            const mockRequest: Partial<AuthRequest> = {
              account: {
                id: accountId,
                username: username,
                role: userRole,
              },
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
            expect(statusCodes).toEqual([403, 403, 403]);
            expect(errorMessages).toEqual([
              'Insufficient permissions',
              'Insufficient permissions',
              'Insufficient permissions'
            ]);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
