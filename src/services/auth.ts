import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db/client';
import { config } from '../config';
import { sendEmailConfirmation, sendPasswordReset } from './email';
import { AccountRole, isValidRole } from '../types/account';

const SALT_ROUNDS = 10;

export interface JwtPayload {
  accountId: string;
  username: string;
  role: AccountRole;
  iat: number;
  exp: number;
}

export interface RegisterResult {
  id: string;
  username: string;
}

export interface LoginResult {
  token: string;
  account: {
    id: string;
    username: string;
  };
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for an account
 */
export function generateJWT(accountId: string, username: string, role: AccountRole): string {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      accountId,
      username,
      role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiration } as jwt.SignOptions
  );
}

/**
 * Verify and decode a JWT token
 * Validates the token signature and ensures the role is valid
 */
export function verifyJWT(token: string): JwtPayload {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // Validate that the role in the JWT is a valid AccountRole
    if (!payload.role || !isValidRole(payload.role)) {
      throw new Error('Invalid role in token');
    }
    
    return payload;
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid role in token') {
      throw err;
    }
    throw new Error('Invalid or expired token');
  }
}

/**
 * Register a new user account
 */
export async function register(username: string, password: string, language: string = 'en'): Promise<RegisterResult> {
  // Validate that username is a valid email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(username)) {
    throw new Error('Username must be a valid email address');
  }

  // Validate password requirements
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Check if username exists
  const existing = await prisma.account.findUnique({
    where: { username },
  });

  if (existing) {
    throw new Error('Username already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // All new registrations get account_owner role
  const role: AccountRole = 'account_owner';

  // Create pending account (isActive = false) with role and language preference
  const account = await prisma.account.create({
    data: {
      username,
      passwordHash,
      role,
      language,
      isActive: false,
    },
  });

  // Generate email confirmation token
  const token = await createEmailConfirmationToken(account.id);

  // Send confirmation email in user's preferred language
  await sendEmailConfirmation(username, token, language);

  return {
    id: account.id,
    username: account.username,
  };
}

/**
 * Login with username and password, returns JWT token
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  // Find account
  const account = await prisma.account.findUnique({
    where: { username },
  });

  if (!account) {
    throw new Error('Invalid credentials');
  }

  // Check if account is active
  if (!account.isActive) {
    throw new Error('Email confirmation required');
  }

  // Verify password
  const valid = await verifyPassword(password, account.passwordHash);

  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token with role
  const token = generateJWT(account.id, account.username, account.role as AccountRole);

  return {
    token,
    account: {
      id: account.id,
      username: account.username,
    },
  };
}

/**
 * Refresh a JWT token
 */
export async function refreshToken(oldToken: string): Promise<{ token: string }> {
  // Verify the old token
  const payload = verifyJWT(oldToken);

  // Generate new token with same payload including role
  const newToken = generateJWT(payload.accountId, payload.username, payload.role);

  return { token: newToken };
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Create an email confirmation token for an account
 * Token expires after 24 hours
 */
export async function createEmailConfirmationToken(accountId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

  await prisma.emailConfirmationToken.create({
    data: {
      accountId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify an email confirmation token and return the associated account ID
 * Returns null if token is invalid or expired
 */
export async function verifyEmailConfirmationToken(token: string): Promise<string | null> {
  const record = await prisma.emailConfirmationToken.findUnique({
    where: { token },
  });

  if (!record) {
    return null; // Token not found
  }

  if (record.expiresAt < new Date()) {
    return null; // Token expired
  }

  return record.accountId;
}

/**
 * Delete a specific email confirmation token
 */
export async function deleteEmailConfirmationToken(token: string): Promise<void> {
  await prisma.emailConfirmationToken.delete({
    where: { token },
  });
}

/**
 * Delete all email confirmation tokens for an account
 */
export async function deleteEmailConfirmationTokens(accountId: string): Promise<void> {
  await prisma.emailConfirmationToken.deleteMany({
    where: { accountId },
  });
}

/**
 * Create a password reset token for an account
 * Token expires after 1 hour
 */
export async function createPasswordResetToken(accountId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

  await prisma.passwordResetToken.create({
    data: {
      accountId,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify a password reset token and return the associated account ID
 * Returns null if token is invalid or expired
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) {
    return null; // Token not found
  }

  if (record.expiresAt < new Date()) {
    return null; // Token expired
  }

  return record.accountId;
}

/**
 * Delete a password reset token
 */
export async function deletePasswordResetToken(token: string): Promise<void> {
  await prisma.passwordResetToken.delete({
    where: { token },
  });
}

/**
 * Request a password reset for an account
 * Always returns success to prevent username enumeration
 */
export async function requestPasswordReset(username: string): Promise<{ success: boolean }> {
  // Find account by username (which is an email address)
  const account = await prisma.account.findUnique({
    where: { username },
  });

  // Always return success to prevent email enumeration
  if (!account) {
    return { success: true };
  }

  // Generate password reset token
  const token = await createPasswordResetToken(account.id);

  // Send password reset email in user's preferred language
  const language = account.language || 'en';
  await sendPasswordReset(username, token, language);

  return { success: true };
}

/**
 * Reset password with a password reset token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  passwordConfirmation: string
): Promise<{ success: boolean }> {
  // Validate that new password and confirmation match
  if (newPassword !== passwordConfirmation) {
    throw new Error('Password and confirmation do not match');
  }

  // Validate password requirements
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Verify password reset token
  const accountId = await verifyPasswordResetToken(token);

  if (!accountId) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password in database
  await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash },
  });

  // Delete used token
  await deletePasswordResetToken(token);

  return { success: true };
}

/**
 * Change password for an authenticated user
 */
export async function changePassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
  passwordConfirmation: string
): Promise<{ success: boolean }> {
  // Validate that new password and confirmation match
  if (newPassword !== passwordConfirmation) {
    throw new Error('Password and confirmation do not match');
  }

  // Validate password requirements
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // Get account
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Verify current password
  const valid = await verifyPassword(currentPassword, account.passwordHash);

  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password in database
  await prisma.account.update({
    where: { id: accountId },
    data: { passwordHash },
  });

  return { success: true };
}

/**
 * Create an email change token for an account
 * Token expires after 1 hour
 */
export async function createEmailChangeToken(
  accountId: string,
  newEmail: string
): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

  await prisma.emailChangeToken.create({
    data: {
      accountId,
      newEmail,
      token,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify an email change token and return the associated account ID and new email
 * Returns null if token is invalid or expired
 */
export async function verifyEmailChangeToken(
  token: string
): Promise<{ accountId: string; newEmail: string } | null> {
  const record = await prisma.emailChangeToken.findUnique({
    where: { token },
  });

  if (!record) {
    return null; // Token not found
  }

  if (record.expiresAt < new Date()) {
    return null; // Token expired
  }

  return {
    accountId: record.accountId,
    newEmail: record.newEmail,
  };
}

/**
 * Delete an email change token
 */
export async function deleteEmailChangeToken(token: string): Promise<void> {
  await prisma.emailChangeToken.delete({
    where: { token },
  });
}
