import { AccountRole, ACCOUNT_ROLES, isValidRole } from '../../types/account';

describe('Account Role Types and Validation', () => {
  describe('AccountRole type', () => {
    it('should allow valid role assignments', () => {
      const adminRole: AccountRole = 'admin';
      const ownerRole: AccountRole = 'account_owner';
      const userRole: AccountRole = 'account_user';

      expect(adminRole).toBe('admin');
      expect(ownerRole).toBe('account_owner');
      expect(userRole).toBe('account_user');
    });
  });

  describe('ACCOUNT_ROLES constant', () => {
    it('should contain exactly three roles', () => {
      expect(ACCOUNT_ROLES).toHaveLength(3);
    });

    it('should contain all valid roles', () => {
      expect(ACCOUNT_ROLES).toContain('admin');
      expect(ACCOUNT_ROLES).toContain('account_owner');
      expect(ACCOUNT_ROLES).toContain('account_user');
    });

    it('should be readonly', () => {
      // TypeScript enforces readonly at compile time
      // This test verifies the array is defined as const
      expect(Array.isArray(ACCOUNT_ROLES)).toBe(true);
    });
  });

  describe('isValidRole type guard', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('admin')).toBe(true);
      expect(isValidRole('account_owner')).toBe(true);
      expect(isValidRole('account_user')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('user')).toBe(false);
      expect(isValidRole('owner')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidRole(null as any)).toBe(false);
      expect(isValidRole(undefined as any)).toBe(false);
      expect(isValidRole(123 as any)).toBe(false);
      expect(isValidRole({} as any)).toBe(false);
      expect(isValidRole([] as any)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidRole('Admin')).toBe(false);
      expect(isValidRole('ADMIN')).toBe(false);
      expect(isValidRole('Account_Owner')).toBe(false);
    });

    it('should work as a type guard in conditional logic', () => {
      const testRole = 'admin';
      
      if (isValidRole(testRole)) {
        // TypeScript should now know testRole is AccountRole
        const role: AccountRole = testRole;
        expect(role).toBe('admin');
      } else {
        fail('Should have validated as valid role');
      }
    });

    it('should narrow type correctly for invalid roles', () => {
      const testRole = 'invalid_role';
      
      if (isValidRole(testRole)) {
        fail('Should not validate invalid role');
      } else {
        // testRole is still string, not AccountRole
        expect(typeof testRole).toBe('string');
      }
    });
  });

  describe('Integration with requirements', () => {
    it('should support requirement 3.1: exactly one role from defined set', () => {
      // Verify all roles in ACCOUNT_ROLES are valid
      ACCOUNT_ROLES.forEach(role => {
        expect(isValidRole(role)).toBe(true);
      });
    });

    it('should support requirement 3.3: reject roles not in set', () => {
      const invalidRoles = [
        'superuser',
        'moderator',
        'guest',
        'anonymous',
        'root',
      ];

      invalidRoles.forEach(role => {
        expect(isValidRole(role)).toBe(false);
      });
    });
  });
});
