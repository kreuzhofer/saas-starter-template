/**
 * Banner Validation Schemas
 * 
 * Zod schemas for validating banner and toast inputs.
 */

import { z } from 'zod';

/**
 * Schema for banner link configuration
 */
const bannerLinkSchema = z.object({
  text: z
    .string()
    .min(1, 'Link text is required')
    .max(255, 'Link text must not exceed 255 characters'),
  url: z
    .string()
    .url('Link URL must be a valid URL')
    .max(2000, 'Link URL must not exceed 2000 characters'),
  external: z.boolean(),
  style: z.enum(['inline', 'button'], {
    errorMap: () => ({ message: 'Link style must be either "inline" or "button"' }),
  }),
});

/**
 * Schema for creating a new banner
 */
export const createBannerSchema = z
  .object({
    key: z
      .string()
      .min(1, 'Banner key must not be empty')
      .max(255, 'Banner key must not exceed 255 characters')
      .optional(),
    accountId: z
      .string()
      .uuid('Account ID must be a valid UUID')
      .optional(),
    type: z.enum(['error', 'warning', 'info'], {
      errorMap: () => ({ message: 'Banner type must be "error", "warning", or "info"' }),
    }),
    message: z
      .string()
      .min(1, 'Banner message is required')
      .max(5000, 'Banner message must not exceed 5000 characters'),
    dismissable: z
      .boolean()
      .optional()
      .default(true),
    audience: z
      .enum(['authenticated', 'unauthenticated', 'all'], {
        errorMap: () => ({ message: 'Audience must be "authenticated", "unauthenticated", or "all"' }),
      })
      .optional()
      .default('authenticated'),
    link: bannerLinkSchema.optional(),
    backgroundColor: z
      .string()
      .max(50, 'Background color must not exceed 50 characters')
      .optional(),
    textColor: z
      .string()
      .max(50, 'Text color must not exceed 50 characters')
      .optional(),
    scheduledStart: z
      .string()
      .datetime('Scheduled start must be a valid ISO 8601 datetime')
      .transform((val) => new Date(val))
      .optional(),
    scheduledEnd: z
      .string()
      .datetime('Scheduled end must be a valid ISO 8601 datetime')
      .transform((val) => new Date(val))
      .optional(),
  })
  .refine(
    (data) => {
      // If both scheduledStart and scheduledEnd are provided, end must be after start
      if (data.scheduledStart && data.scheduledEnd) {
        return data.scheduledEnd > data.scheduledStart;
      }
      return true;
    },
    {
      message: 'Scheduled end time must be after scheduled start time',
      path: ['scheduledEnd'],
    }
  )
  .refine(
    (data) => {
      // Dates cannot be more than 1 year in the future
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (data.scheduledStart && data.scheduledStart > oneYearFromNow) {
        return false;
      }
      if (data.scheduledEnd && data.scheduledEnd > oneYearFromNow) {
        return false;
      }
      return true;
    },
    {
      message: 'Scheduled dates cannot be more than 1 year in the future',
      path: ['scheduledStart'],
    }
  );

/**
 * Schema for updating an existing banner
 */
export const updateBannerSchema = z
  .object({
    type: z
      .enum(['error', 'warning', 'info'], {
        errorMap: () => ({ message: 'Banner type must be "error", "warning", or "info"' }),
      })
      .optional(),
    message: z
      .string()
      .min(1, 'Banner message is required')
      .max(5000, 'Banner message must not exceed 5000 characters')
      .optional(),
    dismissable: z.boolean().optional(),
    audience: z
      .enum(['authenticated', 'unauthenticated', 'all'], {
        errorMap: () => ({ message: 'Audience must be "authenticated", "unauthenticated", or "all"' }),
      })
      .optional(),
    link: bannerLinkSchema.nullable().optional(),
    backgroundColor: z
      .string()
      .max(50, 'Background color must not exceed 50 characters')
      .nullable()
      .optional(),
    textColor: z
      .string()
      .max(50, 'Text color must not exceed 50 characters')
      .nullable()
      .optional(),
    scheduledStart: z
      .string()
      .datetime('Scheduled start must be a valid ISO 8601 datetime')
      .transform((val) => new Date(val))
      .nullable()
      .optional(),
    scheduledEnd: z
      .string()
      .datetime('Scheduled end must be a valid ISO 8601 datetime')
      .transform((val) => new Date(val))
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // If both scheduledStart and scheduledEnd are provided, end must be after start
      if (data.scheduledStart && data.scheduledEnd) {
        return data.scheduledEnd > data.scheduledStart;
      }
      return true;
    },
    {
      message: 'Scheduled end time must be after scheduled start time',
      path: ['scheduledEnd'],
    }
  );

/**
 * Schema for toast notifications
 */
export const toastSchema = z.object({
  accountId: z
    .string()
    .uuid('Account ID must be a valid UUID')
    .optional(),
  type: z.enum(['error', 'warning', 'info', 'success'], {
    errorMap: () => ({ message: 'Toast type must be "error", "warning", "info", or "success"' }),
  }),
  message: z
    .string()
    .min(1, 'Toast message is required')
    .max(500, 'Toast message must not exceed 500 characters'),
  duration: z
    .number()
    .int('Duration must be an integer')
    .positive('Duration must be positive')
    .max(30000, 'Duration must not exceed 30 seconds')
    .optional()
    .default(5000),
});

/**
 * Type exports inferred from schemas
 */
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type ToastInput = z.infer<typeof toastSchema>;
