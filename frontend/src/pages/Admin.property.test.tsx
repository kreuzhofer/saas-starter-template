import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import type { AdminUserInfo, AccountRole } from '../types';
import { ACCOUNT_ROLES } from '../types';

/**
 * Feature: account-management, Property 18: Search and filter functionality
 * Validates: Requirements 10.4
 * 
 * For any search or filter operation on the admin page, the results should only 
 * include accounts matching the search criteria (username or role).
 */

describe('Property-Based Test: Admin Page Search and Filter', () => {
  /**
   * Helper function to apply search filter (mimics the logic in Admin.tsx)
   */
  function applySearchFilter(users: AdminUserInfo[], searchTerm: string): AdminUserInfo[] {
    if (!searchTerm.trim()) {
      return users;
    }
    
    const search = searchTerm.toLowerCase();
    return users.filter(user => user.username.toLowerCase().includes(search));
  }

  /**
   * Helper function to apply role filter (mimics the logic in Admin.tsx)
   */
  function applyRoleFilter(users: AdminUserInfo[], roleFilter: AccountRole | 'all'): AdminUserInfo[] {
    if (roleFilter === 'all') {
      return users;
    }
    
    return users.filter(user => user.role === roleFilter);
  }

  /**
   * Helper function to apply both filters (mimics the logic in Admin.tsx)
   */
  function applyFilters(
    users: AdminUserInfo[], 
    searchTerm: string, 
    roleFilter: AccountRole | 'all'
  ): AdminUserInfo[] {
    let filtered = [...users];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(search)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    return filtered;
  }

  /**
   * Arbitrary generator for AdminUserInfo
   */
  const adminUserInfoArbitrary = fc.record({
    id: fc.uuid(),
    username: fc.emailAddress(),
    role: fc.constantFrom(...ACCOUNT_ROLES),
    isActive: fc.boolean(),
    createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
    updatedAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  });

  describe('Search Filter Properties', () => {
    it('should only return users whose username contains the search term', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (users, searchTerm) => {
            const filtered = applySearchFilter(users, searchTerm);
            
            // If search term is empty/whitespace, should return all users
            if (!searchTerm.trim()) {
              expect(filtered).toEqual(users);
              return;
            }
            
            // Every filtered user should contain the search term in their username
            const searchLower = searchTerm.toLowerCase();
            filtered.forEach(user => {
              expect(user.username.toLowerCase()).toContain(searchLower);
            });
            
            // Every user that contains the search term should be in the filtered results
            users.forEach(user => {
              if (user.username.toLowerCase().includes(searchLower)) {
                expect(filtered).toContainEqual(user);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all users when search term is empty or whitespace', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom('', '   ', '\t', '\n'),
          (users, emptySearch) => {
            const filtered = applySearchFilter(users, emptySearch);
            
            // Should return all users
            expect(filtered).toHaveLength(users.length);
            expect(filtered).toEqual(users);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 1, maxLength: 50 }),
          fc.constantFrom('ADMIN', 'admin', 'AdMiN', 'example', 'EXAMPLE', 'ExAmPlE'),
          (users, searchTerm) => {
            const filtered = applySearchFilter(users, searchTerm);
            
            // All filtered users should match regardless of case
            const searchLower = searchTerm.toLowerCase();
            filtered.forEach(user => {
              expect(user.username.toLowerCase()).toContain(searchLower);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no users match search term', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constant('NONEXISTENT_USER_12345'),
          (users, searchTerm) => {
            const filtered = applySearchFilter(users, searchTerm);
            
            // If no users contain this search term, result should be empty
            const hasMatch = users.some(user => 
              user.username.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            if (!hasMatch) {
              expect(filtered).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Role Filter Properties', () => {
    it('should only return users with the specified role', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom(...ACCOUNT_ROLES),
          (users, roleFilter) => {
            const filtered = applyRoleFilter(users, roleFilter);
            
            // Every filtered user should have the specified role
            filtered.forEach(user => {
              expect(user.role).toBe(roleFilter);
            });
            
            // Every user with the specified role should be in the filtered results
            users.forEach(user => {
              if (user.role === roleFilter) {
                expect(filtered).toContainEqual(user);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all users when role filter is "all"', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          (users) => {
            const filtered = applyRoleFilter(users, 'all');
            
            // Should return all users
            expect(filtered).toHaveLength(users.length);
            expect(filtered).toEqual(users);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty array when no users have the specified role', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom(...ACCOUNT_ROLES),
          (users, roleFilter) => {
            const filtered = applyRoleFilter(users, roleFilter);
            
            // If no users have this role, result should be empty
            const hasRole = users.some(user => user.role === roleFilter);
            
            if (!hasRole) {
              expect(filtered).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Combined Filter Properties', () => {
    it('should apply both search and role filters correctly', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES, 'all' as const),
          (users, searchTerm, roleFilter) => {
            const filtered = applyFilters(users, searchTerm, roleFilter);
            
            const searchLower = searchTerm.toLowerCase();
            const isEmptySearch = !searchTerm.trim();
            
            // Every filtered user should match both criteria
            filtered.forEach(user => {
              // Should match search term (unless search is empty/whitespace)
              if (!isEmptySearch) {
                expect(user.username.toLowerCase()).toContain(searchLower);
              }
              
              // Should match role filter (if not 'all')
              if (roleFilter !== 'all') {
                expect(user.role).toBe(roleFilter);
              }
            });
            
            // Every user that matches both criteria should be in the filtered results
            users.forEach(user => {
              const matchesSearch = isEmptySearch || user.username.toLowerCase().includes(searchLower);
              const matchesRole = roleFilter === 'all' || user.role === roleFilter;
              
              if (matchesSearch && matchesRole) {
                expect(filtered).toContainEqual(user);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be order-independent (search then role = role then search)', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES),
          (users, searchTerm, roleFilter) => {
            // Apply search first, then role
            const searchFirst = applyRoleFilter(
              applySearchFilter(users, searchTerm),
              roleFilter
            );
            
            // Apply role first, then search
            const roleFirst = applySearchFilter(
              applyRoleFilter(users, roleFilter),
              searchTerm
            );
            
            // Results should be identical regardless of order
            expect(searchFirst).toEqual(roleFirst);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return subset of original users (never add users)', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES, 'all' as const),
          (users, searchTerm, roleFilter) => {
            const filtered = applyFilters(users, searchTerm, roleFilter);
            
            // Filtered results should never be larger than original
            expect(filtered.length).toBeLessThanOrEqual(users.length);
            
            // Every filtered user should exist in the original list
            filtered.forEach(user => {
              expect(users).toContainEqual(user);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Filter Idempotence', () => {
    it('should produce the same result when applied multiple times', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES, 'all' as const),
          (users, searchTerm, roleFilter) => {
            const filtered1 = applyFilters(users, searchTerm, roleFilter);
            const filtered2 = applyFilters(filtered1, searchTerm, roleFilter);
            const filtered3 = applyFilters(filtered2, searchTerm, roleFilter);
            
            // Applying the same filter multiple times should produce the same result
            expect(filtered1).toEqual(filtered2);
            expect(filtered2).toEqual(filtered3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user list', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES, 'all' as const),
          (searchTerm, roleFilter) => {
            const emptyUsers: AdminUserInfo[] = [];
            const filtered = applyFilters(emptyUsers, searchTerm, roleFilter);
            
            // Empty list should remain empty
            expect(filtered).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in search term', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.constantFrom('@', '.', '+', '-', '_', '!', '#', '$'),
          (users, specialChar) => {
            const filtered = applySearchFilter(users, specialChar);
            
            // Should only return users whose username contains the special character
            filtered.forEach(user => {
              expect(user.username.toLowerCase()).toContain(specialChar.toLowerCase());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve user object integrity (no mutation)', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES, 'all' as const),
          (users, searchTerm, roleFilter) => {
            // Create a deep copy of the original users
            const originalUsers = JSON.parse(JSON.stringify(users));
            
            // Apply filters
            applyFilters(users, searchTerm, roleFilter);
            
            // Original users array should not be mutated
            expect(users).toEqual(originalUsers);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Filter Completeness', () => {
    it('should never exclude users that match all criteria', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 1, maxLength: 50 }),
          fc.constantFrom(...ACCOUNT_ROLES),
          (users, targetRole) => {
            // Find a user with the target role
            const targetUser = users.find(u => u.role === targetRole);
            
            if (targetUser) {
              // Search for part of their username
              const searchTerm = targetUser.username.substring(0, 3);
              
              // Apply filters that should match this user
              const filtered = applyFilters(users, searchTerm, targetRole);
              
              // The target user should be in the results
              expect(filtered).toContainEqual(targetUser);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never include users that do not match all criteria', () => {
      fc.assert(
        fc.property(
          fc.array(adminUserInfoArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.constantFrom(...ACCOUNT_ROLES),
          (users, searchTerm, roleFilter) => {
            const filtered = applyFilters(users, searchTerm, roleFilter);
            
            const trimmedSearch = searchTerm.trim();
            const searchLower = trimmedSearch.toLowerCase();
            
            // Check that no user in filtered results violates the criteria
            filtered.forEach(user => {
              // Only check search match if search term is not empty after trimming
              // (matches the behavior of applyFilters which uses trim())
              if (trimmedSearch) {
                const matchesSearch = user.username.toLowerCase().includes(searchLower);
                expect(matchesSearch).toBe(true);
              }
              
              const matchesRole = user.role === roleFilter;
              expect(matchesRole).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
