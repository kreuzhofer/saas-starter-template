/**
 * Account role type definitions and validation utilities
 * Defines the three valid account roles and provides type-safe validation
 */

/**
 * Valid account roles in the system
 * - admin: Full system access including user management
 * - account_owner: Standard user with full access to their own resources
 * - account_user: Reserved for future enterprise features with limited permissions
 */
export type AccountRole = 'admin' | 'account_owner' | 'account_user';

/**
 * Constant array of all valid account roles
 * Used for validation and iteration
 */
export const ACCOUNT_ROLES: readonly AccountRole[] = [
  'admin',
  'account_owner',
  'account_user',
] as const;

/**
 * Type guard to check if a string is a valid AccountRole
 * 
 * @param role - The string to validate
 * @returns True if the role is valid, false otherwise
 * 
 * @example
 * if (isValidRole(userInput)) {
 *   // TypeScript now knows userInput is AccountRole
 *   const role: AccountRole = userInput;
 * }
 */
export function isValidRole(role: string): role is AccountRole {
  return ACCOUNT_ROLES.includes(role as AccountRole);
}
