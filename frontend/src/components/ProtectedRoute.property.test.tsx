import * as fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ACCOUNT_ROLES, type AccountRole } from '../types';
import * as authUtils from '../utils/auth';

/**
 * Feature: account-management, Property 16: Admin page access control
 * Validates: Requirements 10.2
 * 
 * For any account without the admin role attempting to access the admin page, 
 * the system should redirect or display an access denied message.
 */

describe('Property-Based Test: Admin Page Access Control', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Role-Based Access Control', () => {
    it('should grant access if and only if user role matches required role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          fc.emailAddress(),                  // Username
          async (userRole, requiredRole, accountId, username) => {
            // Create a valid JWT token with the user's role
            const mockToken = createMockJwt(accountId, username, userRole);
            
            // Mock the auth utilities
            vi.spyOn(authUtils, 'getAuthToken').mockReturnValue(mockToken);
            vi.spyOn(authUtils, 'isAuthenticated').mockReturnValue(true);
            vi.spyOn(authUtils, 'getUserRole').mockReturnValue(userRole);

            // Render the protected route
            const { container } = render(
              <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                  <Route path="/" element={<div data-testid="home">Home Page</div>} />
                  <Route path="/login" element={<div data-testid="login">Login Page</div>} />
                  <Route
                    path="/protected"
                    element={
                      <ProtectedRoute requiredRole={requiredRole}>
                        <div data-testid="protected-content">Protected Content</div>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </MemoryRouter>
            );

            // Verify access control behavior
            if (userRole === requiredRole) {
              // Access should be granted - protected content should be visible
              expect(container.querySelector('[data-testid="protected-content"]')).toBeTruthy();
              expect(container.querySelector('[data-testid="home"]')).toBeFalsy();
              expect(container.querySelector('[data-testid="login"]')).toBeFalsy();
            } else {
              // Access should be denied - should redirect to home
              expect(container.querySelector('[data-testid="protected-content"]')).toBeFalsy();
              expect(container.querySelector('[data-testid="home"]')).toBeTruthy();
              expect(container.querySelector('[data-testid="login"]')).toBeFalsy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Admin-Only Access', () => {
    it('should only allow admin role to access admin-protected routes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.uuid(),                          // Account ID
          fc.emailAddress(),                  // Username
          async (userRole, accountId, username) => {
            // Create a valid JWT token with the user's role
            const mockToken = createMockJwt(accountId, username, userRole);
            
            // Mock the auth utilities
            vi.spyOn(authUtils, 'getAuthToken').mockReturnValue(mockToken);
            vi.spyOn(authUtils, 'isAuthenticated').mockReturnValue(true);
            vi.spyOn(authUtils, 'getUserRole').mockReturnValue(userRole);

            // Render an admin-protected route
            const { container } = render(
              <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                  <Route path="/" element={<div data-testid="home">Home Page</div>} />
                  <Route path="/login" element={<div data-testid="login">Login Page</div>} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <div data-testid="admin-content">Admin Content</div>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </MemoryRouter>
            );

            // Verify admin-only access
            if (userRole === 'admin') {
              // Only admin should see admin content
              expect(container.querySelector('[data-testid="admin-content"]')).toBeTruthy();
              expect(container.querySelector('[data-testid="home"]')).toBeFalsy();
            } else {
              // Non-admin users should be redirected to home
              expect(container.querySelector('[data-testid="admin-content"]')).toBeFalsy();
              expect(container.querySelector('[data-testid="home"]')).toBeTruthy();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unauthenticated Access', () => {
    it('should redirect to login for any unauthenticated user regardless of required role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          async (requiredRole) => {
            // Mock unauthenticated state
            vi.spyOn(authUtils, 'getAuthToken').mockReturnValue(null);
            vi.spyOn(authUtils, 'isAuthenticated').mockReturnValue(false);
            vi.spyOn(authUtils, 'getUserRole').mockReturnValue(null);
            const clearAuthTokenSpy = vi.spyOn(authUtils, 'clearAuthToken');

            // Render the protected route
            const { container } = render(
              <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                  <Route path="/" element={<div data-testid="home">Home Page</div>} />
                  <Route path="/login" element={<div data-testid="login">Login Page</div>} />
                  <Route
                    path="/protected"
                    element={
                      <ProtectedRoute requiredRole={requiredRole}>
                        <div data-testid="protected-content">Protected Content</div>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </MemoryRouter>
            );

            // Verify unauthenticated users are redirected to login
            expect(container.querySelector('[data-testid="protected-content"]')).toBeFalsy();
            expect(container.querySelector('[data-testid="home"]')).toBeFalsy();
            expect(container.querySelector('[data-testid="login"]')).toBeTruthy();
            expect(clearAuthTokenSpy).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Access Control Consistency', () => {
    it('should apply same access control logic regardless of route path', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          fc.emailAddress(),                  // Username
          fc.constantFrom('/admin', '/settings', '/dashboard', '/profile'), // Route path
          async (userRole, requiredRole, accountId, username, routePath) => {
            // Create a valid JWT token with the user's role
            const mockToken = createMockJwt(accountId, username, userRole);
            
            // Mock the auth utilities
            vi.spyOn(authUtils, 'getAuthToken').mockReturnValue(mockToken);
            vi.spyOn(authUtils, 'isAuthenticated').mockReturnValue(true);
            vi.spyOn(authUtils, 'getUserRole').mockReturnValue(userRole);

            // Render the protected route
            const { container } = render(
              <MemoryRouter initialEntries={[routePath]}>
                <Routes>
                  <Route path="/" element={<div data-testid="home">Home Page</div>} />
                  <Route path="/login" element={<div data-testid="login">Login Page</div>} />
                  <Route
                    path={routePath}
                    element={
                      <ProtectedRoute requiredRole={requiredRole}>
                        <div data-testid="protected-content">Protected Content</div>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </MemoryRouter>
            );

            // Verify access control is consistent regardless of path
            const hasAccess = userRole === requiredRole;
            const protectedContentVisible = !!container.querySelector('[data-testid="protected-content"]');
            
            expect(protectedContentVisible).toBe(hasAccess);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Access Control Idempotence', () => {
    it('should produce the same result when rendering multiple times with the same inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ACCOUNT_ROLES), // User's role
          fc.constantFrom(...ACCOUNT_ROLES), // Required role
          fc.uuid(),                          // Account ID
          fc.emailAddress(),                  // Username
          async (userRole, requiredRole, accountId, username) => {
            // Create a valid JWT token with the user's role
            const mockToken = createMockJwt(accountId, username, userRole);
            
            // Mock the auth utilities
            vi.spyOn(authUtils, 'getAuthToken').mockReturnValue(mockToken);
            vi.spyOn(authUtils, 'isAuthenticated').mockReturnValue(true);
            vi.spyOn(authUtils, 'getUserRole').mockReturnValue(userRole);

            // Render the protected route multiple times
            const results: boolean[] = [];
            
            for (let i = 0; i < 3; i++) {
              const { container, unmount } = render(
                <MemoryRouter initialEntries={['/protected']}>
                  <Routes>
                    <Route path="/" element={<div data-testid="home">Home Page</div>} />
                    <Route path="/login" element={<div data-testid="login">Login Page</div>} />
                    <Route
                      path="/protected"
                      element={
                        <ProtectedRoute requiredRole={requiredRole}>
                          <div data-testid="protected-content">Protected Content</div>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </MemoryRouter>
              );

              const hasAccess = !!container.querySelector('[data-testid="protected-content"]');
              results.push(hasAccess);
              
              unmount();
            }

            // All results should be identical (idempotent)
            expect(results[0]).toBe(results[1]);
            expect(results[1]).toBe(results[2]);
            
            // Verify the result matches expected behavior
            const expectedAccess = userRole === requiredRole;
            expect(results[0]).toBe(expectedAccess);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Non-Admin Role Denial', () => {
    it('should deny access to admin routes for all non-admin roles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('account_owner', 'account_user'), // Non-admin roles
          fc.uuid(),                                         // Account ID
          fc.emailAddress(),                                 // Username
          async (nonAdminRole, accountId, username) => {
            // Create a valid JWT token with a non-admin role
            const mockToken = createMockJwt(accountId, username, nonAdminRole as AccountRole);
            
            // Mock the auth utilities
            vi.spyOn(authUtils, 'getAuthToken').mockReturnValue(mockToken);
            vi.spyOn(authUtils, 'isAuthenticated').mockReturnValue(true);
            vi.spyOn(authUtils, 'getUserRole').mockReturnValue(nonAdminRole as AccountRole);

            // Render an admin-protected route
            const { container } = render(
              <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                  <Route path="/" element={<div data-testid="home">Home Page</div>} />
                  <Route path="/login" element={<div data-testid="login">Login Page</div>} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <div data-testid="admin-content">Admin Content</div>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </MemoryRouter>
            );

            // Non-admin users should always be denied access to admin routes
            expect(container.querySelector('[data-testid="admin-content"]')).toBeFalsy();
            expect(container.querySelector('[data-testid="home"]')).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to create a mock JWT token
 * This creates a properly formatted JWT with the given payload
 */
function createMockJwt(accountId: string, username: string, role: AccountRole): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    accountId,
    username,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
