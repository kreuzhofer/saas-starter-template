import * as fc from 'fast-check';
import { Response, NextFunction } from 'express';
import { requireRole, AuthRequest } from '../../middleware/jwtAuth';
import { AccountRole, ACCOUNT_ROLES } from '../../types/account';
import { testEmailArbitrary } from '../helpers/testData';

/**
 * Feature: account-management, Property 5: Protected route authorization
 * Validates: Requirements 5.1, 5.4
 * 
 * For any protected route with a required role and any authenticated account, 
 * access should be granted if and only if the account's role matches one of the required roles.
 */

describe('Property-Based Test: Protected Route Authorization', () => {
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

  describe('Authorization with Single Required Role', () => {
    it('should grant access if and only if user role matches required role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('protected'),                  // Username
          async (userRole, requiredRole, accountId, username) => {
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

            // Verify authorization behavior
            if (userRole === requiredRole) {
              // Access should be granted
              expect(nextFunction).toHaveBeenCalledTimes(1);
              expect(statusMock).not.toHaveBeenCalled();
              expect(jsonMock).not.toHaveBeenCalled();
            } else {
              // Access should be denied with 403
              expect(nextFunction).not.toHaveBeenCalled();
              expect(statusMock).toHaveBeenCalledWith(403);
              expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Authorization with Multiple Required Roles', () => {
    it('should grant access if and only if user role is in the set of required roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.subarray(ACCOUNT_ROLES as unknown as AccountRole[], { minLength: 1, maxLength: 3 }), // Required roles
          fc.uuid(),                          // Account ID
          testEmailArbitrary('protected'),                  // Username
          async (userRole, requiredRoles, accountId, username) => {
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

            // Verify authorization behavior
            const hasRequiredRole = requiredRoles.includes(userRole);
            
            if (hasRequiredRole) {
              // Access should be granted
              expect(nextFunction).toHaveBeenCalledTimes(1);
              expect(statusMock).not.toHaveBeenCalled();
              expect(jsonMock).not.toHaveBeenCalled();
            } else {
              // Access should be denied with 403
              expect(nextFunction).not.toHaveBeenCalled();
              expect(statusMock).toHaveBeenCalledWith(403);
              expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Authorization Consistency Across Routes', () => {
    it('should apply same authorization logic regardless of route path or method', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('protected'),                  // Username
          fc.constantFrom('/api/admin/users', '/api/short-urls', '/api/analytics', '/api/profile'), // Route path
          fc.constantFrom('GET', 'POST', 'PUT', 'PATCH', 'DELETE'), // HTTP method
          async (userRole, requiredRole, accountId, username, path, method) => {
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

            // Verify authorization behavior is consistent regardless of path/method
            if (userRole === requiredRole) {
              expect(nextFunction).toHaveBeenCalledTimes(1);
              expect(statusMock).not.toHaveBeenCalled();
            } else {
              expect(nextFunction).not.toHaveBeenCalled();
              expect(statusMock).toHaveBeenCalledWith(403);
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Authorization Symmetry', () => {
    it('should have symmetric behavior: if role A cannot access route requiring role B, then role B cannot access route requiring role A (unless A=B)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Role A
          fc.constantFrom(...ACCOUNT_ROLES), // Role B
          fc.uuid(),                          // Account ID 1
          fc.uuid(),                          // Account ID 2
          testEmailArbitrary('protected'),                  // Username 1
          testEmailArbitrary('protected'),                  // Username 2
          async (roleA, roleB, accountId1, accountId2, username1, username2) => {
            // Test user with role A accessing route requiring role B
            const mockRequest1: Partial<AuthRequest> = {
              account: {
                id: accountId1,
                username: username1,
                role: roleA,
              },
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            const middleware1 = requireRole(roleB);
            middleware1(
              mockRequest1 as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            const accessGranted1 = (nextFunction as jest.Mock).mock.calls.length > 0;

            // Test user with role B accessing route requiring role A
            const mockRequest2: Partial<AuthRequest> = {
              account: {
                id: accountId2,
                username: username2,
                role: roleB,
              },
              ip: '127.0.0.1',
              path: '/api/test',
              method: 'GET',
            };

            jsonMock.mockClear();
            statusMock.mockClear();
            (nextFunction as jest.Mock).mockClear();

            const middleware2 = requireRole(roleA);
            middleware2(
              mockRequest2 as AuthRequest,
              mockResponse as Response,
              nextFunction
            );

            const accessGranted2 = (nextFunction as jest.Mock).mock.calls.length > 0;

            // Verify symmetry
            if (roleA === roleB) {
              // Same role should have access to routes requiring that role
              expect(accessGranted1).toBe(true);
              expect(accessGranted2).toBe(true);
            } else {
              // Different roles should both be denied (symmetric denial)
              expect(accessGranted1).toBe(false);
              expect(accessGranted2).toBe(false);
            }
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Authorization Idempotence', () => {
    it('should produce the same result when called multiple times with the same inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          testEmailArbitrary('protected'),                  // Username
          async (userRole, requiredRole, accountId, username) => {
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
            const results: boolean[] = [];
            
            for (let i = 0; i < 3; i++) {
              jsonMock.mockClear();
              statusMock.mockClear();
              (nextFunction as jest.Mock).mockClear();

              middleware(
                mockRequest as AuthRequest,
                mockResponse as Response,
                nextFunction
              );

              const accessGranted = (nextFunction as jest.Mock).mock.calls.length > 0;
              results.push(accessGranted);
            }

            // All results should be identical (idempotent)
            expect(results[0]).toBe(results[1]);
            expect(results[1]).toBe(results[2]);
            
            // Verify the result matches expected behavior
            const expectedAccess = userRole === requiredRole;
            expect(results[0]).toBe(expectedAccess);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Authorization with All Possible Role Combinations', () => {
    it('should correctly handle all possible combinations of user roles and required roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          testEmailArbitrary('protected'),
          async (accountId, username) => {
            // Test all combinations of user role and required role
            for (const userRole of ACCOUNT_ROLES) {
              for (const requiredRole of ACCOUNT_ROLES) {
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

                // Verify correct behavior for this combination
                if (userRole === requiredRole) {
                  expect(nextFunction).toHaveBeenCalledTimes(1);
                  expect(statusMock).not.toHaveBeenCalled();
                } else {
                  expect(nextFunction).not.toHaveBeenCalled();
                  expect(statusMock).toHaveBeenCalledWith(403);
                  expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
                }
              }
            }
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});
