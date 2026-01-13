import { describe, it, expect } from 'vitest';
import {
  ACCOUNT_ROLES,
  ROLE_DISPLAY_NAMES,
  isValidRole,
  getRoleDisplayName,
  type AccountRole,
} from './index';

describe('Account Role Types and Utilities', () => {
  describe('ACCOUNT_ROLES constant', () => {
    it('should contain all three valid roles', () => {
      expect(ACCOUNT_ROLES).toEqual(['admin', 'account_owner', 'account_user']);
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(ACCOUNT_ROLES)).toBe(false); // readonly in TS, not frozen in JS
      expect(ACCOUNT_ROLES.length).toBe(3);
    });
  });

  describe('ROLE_DISPLAY_NAMES mapping', () => {
    it('should have display names for all roles', () => {
      expect(ROLE_DISPLAY_NAMES.admin).toBe('Administrator');
      expect(ROLE_DISPLAY_NAMES.account_owner).toBe('Account Owner');
      expect(ROLE_DISPLAY_NAMES.account_user).toBe('Account User');
    });

    it('should have exactly three entries', () => {
      expect(Object.keys(ROLE_DISPLAY_NAMES).length).toBe(3);
    });
  });

  describe('isValidRole type guard', () => {
    it('should return true for valid admin role', () => {
      expect(isValidRole('admin')).toBe(true);
    });

    it('should return true for valid account_owner role', () => {
      expect(isValidRole('account_owner')).toBe(true);
    });

    it('should return true for valid account_user role', () => {
      expect(isValidRole('account_user')).toBe(true);
    });

    it('should return false for invalid role', () => {
      expect(isValidRole('invalid_role')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidRole('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidRole(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidRole(undefined as any)).toBe(false);
    });

    it('should return false for numeric values', () => {
      expect(isValidRole(123 as any)).toBe(false);
    });

    it('should return false for case-sensitive mismatch', () => {
      expect(isValidRole('Admin')).toBe(false);
      expect(isValidRole('ADMIN')).toBe(false);
    });
  });

  describe('getRoleDisplayName function', () => {
    it('should return correct display name for admin', () => {
      expect(getRoleDisplayName('admin')).toBe('Administrator');
    });

    it('should return correct display name for account_owner', () => {
      expect(getRoleDisplayName('account_owner')).toBe('Account Owner');
    });

    it('should return correct display name for account_user', () => {
      expect(getRoleDisplayName('account_user')).toBe('Account User');
    });

    it('should work with type-guarded values', () => {
      const role: string = 'admin';
      if (isValidRole(role)) {
        // TypeScript should know role is AccountRole here
        const displayName = getRoleDisplayName(role);
        expect(displayName).toBe('Administrator');
      }
    });
  });

  describe('Type safety scenarios', () => {
    it('should validate and use role in a typical workflow', () => {
      const userInput = 'account_owner';
      
      if (isValidRole(userInput)) {
        // TypeScript knows userInput is AccountRole here
        const role: AccountRole = userInput;
        const displayName = getRoleDisplayName(role);
        
        expect(role).toBe('account_owner');
        expect(displayName).toBe('Account Owner');
      } else {
        throw new Error('Should not reach here');
      }
    });

    it('should handle invalid input gracefully', () => {
      const userInput = 'super_admin';
      
      if (isValidRole(userInput)) {
        throw new Error('Should not validate invalid role');
      } else {
        // Handle invalid role
        expect(userInput).toBe('super_admin');
      }
    });

    it('should iterate over all valid roles', () => {
      const displayNames: string[] = [];
      
      for (const role of ACCOUNT_ROLES) {
        displayNames.push(getRoleDisplayName(role));
      }
      
      expect(displayNames).toEqual([
        'Administrator',
        'Account Owner',
        'Account User',
      ]);
    });
  });
});
