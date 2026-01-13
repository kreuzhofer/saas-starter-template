/**
 * Admin service for user management operations
 * Provides functions for admins to manage user accounts
 */

import prisma from '../db/client';
import { AccountRole, isValidRole } from '../types/account';
import { AccountTier, isValidTier } from '../types/accountTier';
import { createPasswordResetToken, hashPassword } from './auth';
import { sendPasswordReset } from './email';

/**
 * User information returned in admin user lists
 * Excludes sensitive data like password hashes
 */
export interface UserListItem {
  id: string;
  username: string;
  role: AccountRole;
  tier: AccountTier;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List all user accounts with role information
 * Excludes password hashes for security
 * 
 * @returns Array of all user accounts with public information
 */
export async function listAllUsers(): Promise<UserListItem[]> {
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Map to ensure type safety and explicit role casting
  return accounts.map(account => ({
    id: account.id,
    username: account.username,
    role: account.role as AccountRole,
    tier: account.tier as AccountTier,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }));
}

/**
 * Get a specific user account by ID
 * Excludes password hash for security
 * 
 * @param userId - The account ID to retrieve
 * @returns User account information or null if not found
 */
export async function getUserById(userId: string): Promise<UserListItem | null> {
  const account = await prisma.account.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
  });

  if (!account) {
    return null;
  }

  return {
    id: account.id,
    username: account.username,
    role: account.role as AccountRole,
    tier: account.tier as AccountTier,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

/**
 * Update a user's role
 * Validates the new role before persisting
 * Prevents admin from changing their own role to non-admin
 * 
 * @param userId - The account ID to update
 * @param newRole - The new role to assign
 * @param requestingAdminId - The ID of the admin making the request (optional for backward compatibility)
 * @returns Updated user information
 * @throws Error if role is invalid, user not found, or attempting self-demotion
 */
export async function updateUserRole(
  userId: string,
  newRole: string,
  requestingAdminId?: string
): Promise<UserListItem> {
  // Validate role
  if (!isValidRole(newRole)) {
    throw new Error(
      `Invalid role: ${newRole}. Must be one of: admin, account_owner, account_user`
    );
  }

  // Check if user exists
  const existingUser = await prisma.account.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Prevent admin from changing their own role to non-admin
  if (requestingAdminId && userId === requestingAdminId) {
    if (existingUser.role === 'admin' && newRole !== 'admin') {
      throw new Error('Cannot change your own admin role to a non-admin role');
    }
  }

  // Update role in database
  const updatedAccount = await prisma.account.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
  });

  return {
    id: updatedAccount.id,
    username: updatedAccount.username,
    role: updatedAccount.role as AccountRole,
    tier: updatedAccount.tier as AccountTier,
    isActive: updatedAccount.isActive,
    createdAt: updatedAccount.createdAt,
    updatedAt: updatedAccount.updatedAt,
  };
}

/**
 * Update a user's email address (username)
 * Validates email format before persisting
 * 
 * @param userId - The account ID to update
 * @param newEmail - The new email address
 * @returns Updated user information
 * @throws Error if email is invalid, already exists, or user not found
 */
export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<UserListItem> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    throw new Error('Invalid email address format');
  }

  // Check if user exists
  const existingUser = await prisma.account.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Check if new email is already in use by another account
  const emailInUse = await prisma.account.findUnique({
    where: { username: newEmail },
  });

  if (emailInUse && emailInUse.id !== userId) {
    throw new Error('Email address already in use');
  }

  // Update username (email) in database
  const updatedAccount = await prisma.account.update({
    where: { id: userId },
    data: { username: newEmail },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
  });

  return {
    id: updatedAccount.id,
    username: updatedAccount.username,
    role: updatedAccount.role as AccountRole,
    tier: updatedAccount.tier as AccountTier,
    isActive: updatedAccount.isActive,
    createdAt: updatedAccount.createdAt,
    updatedAt: updatedAccount.updatedAt,
  };
}

/**
 * Admin-initiated password reset for a user
 * Generates a password reset token and sends it to the user's email
 * 
 * @param userId - The account ID to reset password for
 * @returns Success status
 * @throws Error if user not found
 */
export async function adminResetPassword(userId: string): Promise<{ success: boolean }> {
  // Check if user exists
  const user = await prisma.account.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate password reset token
  const token = await createPasswordResetToken(user.id);

  // Send password reset email to user's email (username is the email)
  await sendPasswordReset(user.username, token);

  return { success: true };
}

/**
 * Set a new password for a user directly without email notification
 * Admin function to immediately update a user's password
 * 
 * @param userId - The account ID to set password for
 * @param newPassword - The new password to set
 * @returns Success status
 * @throws Error if password validation fails or user not found
 */
export async function setUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  // Validate password meets security requirements
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if user exists
  const user = await prisma.account.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword);

  // Update password in database
  await prisma.account.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Return success confirmation (no email sent)
  return {
    success: true,
    message: 'Password updated successfully',
  };
}

/**
 * Activate a user account
 * Sets the account's isActive status to true
 * 
 * @param userId - The account ID to activate
 * @returns Updated user information
 * @throws Error if user not found
 */
export async function activateUser(userId: string): Promise<UserListItem> {
  // Check if user exists
  const existingUser = await prisma.account.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Update isActive status to true
  const updatedAccount = await prisma.account.update({
    where: { id: userId },
    data: { isActive: true },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
  });

  return {
    id: updatedAccount.id,
    username: updatedAccount.username,
    role: updatedAccount.role as AccountRole,
    tier: updatedAccount.tier as AccountTier,
    isActive: updatedAccount.isActive,
    createdAt: updatedAccount.createdAt,
    updatedAt: updatedAccount.updatedAt,
  };
}

/**
 * Deactivate a user account
 * Sets the account's isActive status to false
 * Prevents admin from deactivating their own account
 * 
 * @param userId - The account ID to deactivate
 * @param requestingAdminId - The ID of the admin making the request
 * @returns Updated user information
 * @throws Error if user not found or attempting self-deactivation
 */
export async function deactivateUser(
  userId: string,
  requestingAdminId: string
): Promise<UserListItem> {
  // Prevent admin from deactivating their own account
  if (userId === requestingAdminId) {
    throw new Error('Cannot deactivate your own account');
  }

  // Check if user exists
  const existingUser = await prisma.account.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Update isActive status to false
  const updatedAccount = await prisma.account.update({
    where: { id: userId },
    data: { isActive: false },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
  });

  return {
    id: updatedAccount.id,
    username: updatedAccount.username,
    role: updatedAccount.role as AccountRole,
    tier: updatedAccount.tier as AccountTier,
    isActive: updatedAccount.isActive,
    createdAt: updatedAccount.createdAt,
    updatedAt: updatedAccount.updatedAt,
  };
}

/**
 * Update a user's account tier
 * Validates the new tier before persisting
 * 
 * @param userId - The account ID to update
 * @param newTier - The new tier to assign
 * @returns Updated user information
 * @throws Error if tier is invalid or user not found
 */
export async function updateUserTier(
  userId: string,
  newTier: string
): Promise<UserListItem> {
  // Validate tier
  if (!isValidTier(newTier)) {
    throw new Error(
      `Invalid tier. Must be one of: starter, pro, business, enterprise`
    );
  }

  // Check if user exists
  const existingUser = await prisma.account.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Update tier in database
  const updatedAccount = await prisma.account.update({
    where: { id: userId },
    data: { tier: newTier },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      // Explicitly exclude passwordHash
    },
  });

  return {
    id: updatedAccount.id,
    username: updatedAccount.username,
    role: updatedAccount.role as AccountRole,
    tier: updatedAccount.tier as AccountTier,
    isActive: updatedAccount.isActive,
    createdAt: updatedAccount.createdAt,
    updatedAt: updatedAccount.updatedAt,
  };
}

/**
 * Custom error class for self-deletion attempts
 */
export class SelfDeletionError extends Error {
  constructor(message: string = 'Cannot delete your own account') {
    super(message);
    this.name = 'SelfDeletionError';
  }
}

/**
 * Custom error class for active account deletion attempts
 */
export class ActiveAccountDeletionError extends Error {
  constructor(message: string = 'Cannot delete an active account. Deactivate the account first.') {
    super(message);
    this.name = 'ActiveAccountDeletionError';
  }
}

/**
 * Permanently delete a user account and all associated data
 * Requires the account to be deactivated first
 * Prevents admins from deleting their own accounts
 * 
 * @param userId - The account ID to delete
 * @param requestingAdminId - The ID of the admin making the request
 * @returns Success status and deleted user information
 * @throws SelfDeletionError if attempting to delete own account
 * @throws ActiveAccountDeletionError if account is still active
 * @throws Error if user not found
 */
export async function deleteUser(
  userId: string,
  requestingAdminId: string
): Promise<{ success: boolean; deletedUser: UserListItem }> {
  // Prevent self-deletion
  if (userId === requestingAdminId) {
    throw new SelfDeletionError();
  }

  // Check if user exists
  const existingUser = await prisma.account.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      tier: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  // Check if account is active - must be deactivated first
  if (existingUser.isActive) {
    throw new ActiveAccountDeletionError();
  }

  // Store user info before deletion for response
  const deletedUserInfo: UserListItem = {
    id: existingUser.id,
    username: existingUser.username,
    role: existingUser.role as AccountRole,
    tier: existingUser.tier as AccountTier,
    isActive: existingUser.isActive,
    createdAt: existingUser.createdAt,
    updatedAt: existingUser.updatedAt,
  };

  // Delete the account - Prisma cascade will handle related data
  // (ShortUrls, ClickEvents, LimitOverrides, UsageRecords, tokens, etc.)
  await prisma.account.delete({
    where: { id: userId },
  });

  return {
    success: true,
    deletedUser: deletedUserInfo,
  };
}
