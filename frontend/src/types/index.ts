export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response from the API
 * The role is included in the JWT token payload, not directly in the response
 * Use decodeJwt() from utils/auth to extract the role from the token
 */
export interface LoginResponse {
  token: string;
  account: {
    id: string;
    username: string;
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
}

export interface PasswordResetRequest {
  username: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  passwordConfirmation: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ProfileData {
  id: string;
  username: string;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface UpdateProfileResponse {
  message: string;
  profile: ProfileData;
}

export interface RequestEmailChangeRequest {
  newEmail: string;
  password: string;
}

export interface RequestEmailChangeResponse {
  message: string;
}

export interface ExportData {
  account: {
    id: string;
    username: string;
    createdAt: string;
    updatedAt: string;
  };
  exportedAt: string;
}

export type TimeRange = '7d' | '30d' | '1y';

/**
 * Account role type definitions and utilities
 * Matches backend role definitions for consistency
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
 * Human-readable display names for account roles
 * Used in UI components to show user-friendly role names
 */
export const ROLE_DISPLAY_NAMES: Record<AccountRole, string> = {
  admin: 'Administrator',
  account_owner: 'Account Owner',
  account_user: 'Account User',
};

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

/**
 * Get the display name for a role
 * 
 * @param role - The role to get the display name for
 * @returns The human-readable display name
 * 
 * @example
 * getRoleDisplayName('admin') // Returns 'Administrator'
 */
export function getRoleDisplayName(role: AccountRole): string {
  return ROLE_DISPLAY_NAMES[role];
}

/**
 * Valid account tiers in the system
 * - starter: Free tier with basic features and limited usage
 * - pro: Paid tier with more features and higher limits
 * - business: Business tier with advanced features and high limits
 * - enterprise: Enterprise tier with all features and unlimited usage
 */
export type AccountTier = 'starter' | 'pro' | 'business' | 'enterprise';

/**
 * Constant array of all valid account tiers
 * Used for validation and iteration
 */
export const ACCOUNT_TIERS: readonly AccountTier[] = [
  'starter',
  'pro',
  'business',
  'enterprise',
] as const;

/**
 * Human-readable display names for account tiers
 * Used in UI components to show user-friendly tier names
 */
export const TIER_DISPLAY_NAMES: Record<AccountTier, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

/**
 * Type guard to check if a string is a valid AccountTier
 * 
 * @param tier - The string to validate
 * @returns True if the tier is valid, false otherwise
 */
export function isValidTier(tier: string): tier is AccountTier {
  return ACCOUNT_TIERS.includes(tier as AccountTier);
}

/**
 * Get the display name for a tier
 * 
 * @param tier - The tier to get the display name for
 * @returns The human-readable display name
 */
export function getTierDisplayName(tier: AccountTier): string {
  return TIER_DISPLAY_NAMES[tier];
}

/**
 * Admin user information returned from admin endpoints
 * Includes role and tier information that is not exposed to non-admin users
 */
export interface AdminUserInfo {
  id: string;
  username: string;
  role: AccountRole;
  tier: AccountTier;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request to update a user's role (admin only)
 */
export interface UpdateUserRoleRequest {
  role: AccountRole;
}

/**
 * Request to update a user's tier (admin only)
 */
export interface UpdateUserTierRequest {
  tier: AccountTier;
}

/**
 * Request to update a user's email (admin only)
 */
export interface UpdateUserEmailRequest {
  email: string;
}

/**
 * Scheduled task status information
 */
export interface TaskStatus {
  taskName: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  lastResult: 'success' | 'failure' | null;
  lastError: string | null;
  lastDuration: number | null; // Duration in milliseconds
}

/**
 * Response from GET /api/admin/tasks
 */
export interface TaskStatusListResponse {
  tasks: TaskStatus[];
}

/**
 * Request to enable/disable a task
 */
export interface SetTaskEnabledRequest {
  enabled: boolean;
}

/**
 * Response from PATCH /api/admin/tasks/:name/enable
 */
export interface SetTaskEnabledResponse {
  success: boolean;
  task: TaskStatus;
}

/**
 * Response from POST /api/admin/tasks/:name/trigger
 */
export interface TriggerTaskResponse {
  success: boolean;
  message: string;
  executionTime: number; // Duration in milliseconds
}

/**
 * Task execution log entry
 */
export interface TaskLogEntry {
  timestamp: string;
  result: 'success' | 'failure';
  duration: number; // Duration in milliseconds
  error: string | null;
}

/**
 * Response from GET /api/admin/tasks/:name/logs
 */
export interface TaskLogsResponse {
  taskName: string;
  logs: TaskLogEntry[];
}

/**
 * Task execution history entry
 */
export interface ExecutionHistoryEntry {
  id: string;
  startedAt: string;
  completedAt: string;
  result: 'success' | 'failure';
  errorMessage: string | null;
  duration: number; // Duration in milliseconds
  capturedLogs: string | null;
}

/**
 * Response from GET /api/admin/tasks/:name/history
 */
export interface ExecutionHistoryResponse {
  taskName: string;
  executions: ExecutionHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Limit override information for admin UI
 */
export interface LimitOverrideInfo {
  limitName: string;
  overrideValue: number;
  expiresAt: string | null;
  isPermanent: boolean;
  isExpiringSoon: boolean;
}

/**
 * Response from GET /api/admin/users/:id/overrides
 */
export interface GetOverridesResponse {
  overrides: LimitOverrideInfo[];
  total: number;
}

/**
 * Request to create or update a limit override
 */
export interface CreateOverrideRequest {
  limitName: string;
  value: number;
  expiresAt?: string | null;
}

/**
 * Response from POST /api/admin/users/:id/overrides
 */
export interface CreateOverrideResponse {
  success: boolean;
  override: LimitOverrideInfo;
}

/**
 * Response from DELETE /api/admin/users/:id/overrides/:limitName
 */
export interface DeleteOverrideResponse {
  success: boolean;
  message: string;
}

/**
 * Limit display information for admin UI
 */
export interface LimitDisplayInfo {
  name: string;
  displayName: string;
  tierDefault: number;
  currentValue: number;
  override: LimitOverrideInfo | null;
  isUnlimited: boolean;
}

/**
 * Banner link configuration
 */
export interface BannerLink {
  text: string;
  url: string;
  external: boolean;
  style: 'inline' | 'button';
}

/**
 * Request to create a banner
 */
export interface CreateBannerInput {
  key?: string;
  accountId?: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  dismissable?: boolean;
  audience?: 'authenticated' | 'unauthenticated' | 'all';
  link?: BannerLink;
  backgroundColor?: string;
  textColor?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

/**
 * Request to update a banner
 */
export interface UpdateBannerInput {
  type?: 'error' | 'warning' | 'info';
  message?: string;
  dismissable?: boolean;
  audience?: 'authenticated' | 'unauthenticated' | 'all';
  link?: BannerLink | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}

/**
 * Banner data returned from API
 */
export interface BannerOutput {
  id: string;
  key?: string;
  accountId?: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  dismissable: boolean;
  audience: 'authenticated' | 'unauthenticated' | 'all';
  link?: BannerLink;
  backgroundColor?: string;
  textColor?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Toast notification input
 */
export interface ToastInput {
  accountId?: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  duration?: number;
}

/**
 * SSE message types
 */
export interface SSEMessage {
  type: 'banner' | 'toast' | 'banner_removed';
  data: BannerOutput | ToastInput | { bannerId: string };
}
