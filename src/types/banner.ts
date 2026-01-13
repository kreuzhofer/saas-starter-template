/**
 * Banner Type Definitions
 * 
 * Defines types for the notification banner system including banners,
 * toasts, and SSE messages for real-time delivery.
 */

/**
 * Valid banner types
 * - error: Critical issues requiring immediate attention
 * - warning: Important information that needs user awareness
 * - info: General informational messages
 */
export type BannerType = 'error' | 'warning' | 'info';

/**
 * Valid toast types (includes success in addition to banner types)
 * - error: Error notifications
 * - warning: Warning notifications
 * - info: Informational notifications
 * - success: Success confirmations
 */
export type ToastType = 'error' | 'warning' | 'info' | 'success';

/**
 * Valid banner audience types for global banners
 * - authenticated: Only shown to logged-in users
 * - unauthenticated: Only shown to visitors who are not logged in
 * - all: Shown to all visitors regardless of authentication status
 */
export type BannerAudience = 'authenticated' | 'unauthenticated' | 'all';

/**
 * Valid link styles
 * - inline: Link rendered inline with banner text
 * - button: Link rendered as a button within the banner
 */
export type LinkStyle = 'inline' | 'button';

/**
 * Constant arrays for validation
 */
export const BANNER_TYPES: readonly BannerType[] = ['error', 'warning', 'info'] as const;
export const TOAST_TYPES: readonly ToastType[] = ['error', 'warning', 'info', 'success'] as const;
export const BANNER_AUDIENCES: readonly BannerAudience[] = ['authenticated', 'unauthenticated', 'all'] as const;
export const LINK_STYLES: readonly LinkStyle[] = ['inline', 'button'] as const;

/**
 * Type guards
 */
export function isValidBannerType(type: string): type is BannerType {
  return BANNER_TYPES.includes(type as BannerType);
}

export function isValidToastType(type: string): type is ToastType {
  return TOAST_TYPES.includes(type as ToastType);
}

export function isValidBannerAudience(audience: string): audience is BannerAudience {
  return BANNER_AUDIENCES.includes(audience as BannerAudience);
}

export function isValidLinkStyle(style: string): style is LinkStyle {
  return LINK_STYLES.includes(style as LinkStyle);
}

/**
 * Link configuration for banners
 */
export interface BannerLink {
  /** Link text to display */
  text: string;
  /** URL to navigate to */
  url: string;
  /** Whether the link opens in a new tab */
  external: boolean;
  /** Visual style of the link */
  style: LinkStyle;
}

/**
 * Input for creating a new banner
 */
export interface CreateBannerInput {
  /** Optional unique key for upsert behavior */
  key?: string;
  /** Optional account ID for account-specific banners (null for global) */
  accountId?: string;
  /** Banner type (error, warning, info) */
  type: BannerType;
  /** Banner message text */
  message: string;
  /** Whether the banner can be dismissed by users */
  dismissable?: boolean;
  /** Target audience for global banners */
  audience?: BannerAudience;
  /** Optional link configuration */
  link?: BannerLink;
  /** Optional custom background color */
  backgroundColor?: string;
  /** Optional custom text color */
  textColor?: string;
  /** Optional scheduled start time */
  scheduledStart?: Date;
  /** Optional scheduled end time (expiration) */
  scheduledEnd?: Date;
}

/**
 * Input for updating an existing banner
 */
export interface UpdateBannerInput {
  /** Banner type (error, warning, info) */
  type?: BannerType;
  /** Banner message text */
  message?: string;
  /** Whether the banner can be dismissed by users */
  dismissable?: boolean;
  /** Target audience for global banners */
  audience?: BannerAudience;
  /** Optional link configuration (null to remove) */
  link?: BannerLink | null;
  /** Optional custom background color (null to remove) */
  backgroundColor?: string | null;
  /** Optional custom text color (null to remove) */
  textColor?: string | null;
  /** Optional scheduled start time (null to remove) */
  scheduledStart?: Date | null;
  /** Optional scheduled end time (null to remove) */
  scheduledEnd?: Date | null;
}

/**
 * Banner output returned from API
 */
export interface BannerOutput {
  /** Unique banner ID */
  id: string;
  /** Optional unique key */
  key?: string;
  /** Optional account ID (null for global banners) */
  accountId?: string;
  /** Banner type */
  type: BannerType;
  /** Banner message text */
  message: string;
  /** Whether the banner can be dismissed */
  dismissable: boolean;
  /** Target audience */
  audience: BannerAudience;
  /** Optional link configuration */
  link?: BannerLink;
  /** Optional custom background color */
  backgroundColor?: string;
  /** Optional custom text color */
  textColor?: string;
  /** Optional scheduled start time */
  scheduledStart?: Date;
  /** Optional scheduled end time */
  scheduledEnd?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Input for creating a toast notification
 */
export interface ToastInput {
  /** Optional account ID for account-specific toasts (null for all users) */
  accountId?: string;
  /** Toast type */
  type: ToastType;
  /** Toast message text */
  message: string;
  /** Display duration in milliseconds (default 5000) */
  duration?: number;
}

/**
 * SSE message types
 */
export type SSEMessageType = 'banner' | 'toast' | 'banner_removed';

/**
 * SSE message for real-time delivery
 */
export interface SSEMessage {
  /** Message type */
  type: SSEMessageType;
  /** Message payload */
  data: BannerOutput | ToastInput | { bannerId: string };
}
