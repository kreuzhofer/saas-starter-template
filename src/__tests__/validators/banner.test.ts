/**
 * Unit Tests for Banner Validators
 * 
 * Tests validation schemas for banner creation, updates, and toast notifications.
 * 
 * Requirements: 11.6
 */

import { describe, it, expect } from '@jest/globals';
import {
  createBannerSchema,
  updateBannerSchema,
  toastSchema,
} from '../../validators/banner';

describe('Banner Validators', () => {
  describe('createBannerSchema', () => {
    describe('Valid inputs', () => {
      it('should validate minimal valid banner', () => {
        const input = {
          type: 'info',
          message: 'Test message',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('info');
          expect(result.data.message).toBe('Test message');
          expect(result.data.dismissable).toBe(true); // default
          expect(result.data.audience).toBe('authenticated'); // default
        }
      });

      it('should validate banner with all optional fields', () => {
        const input = {
          key: 'test-key',
          accountId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'error',
          message: 'Test error message',
          dismissable: false,
          audience: 'all',
          link: {
            text: 'Click here',
            url: 'https://example.com',
            external: true,
            style: 'button',
          },
          backgroundColor: '#ff0000',
          textColor: '#ffffff',
          scheduledStart: '2025-01-15T10:00:00Z',
          scheduledEnd: '2025-01-20T10:00:00Z',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.key).toBe('test-key');
          expect(result.data.accountId).toBe('123e4567-e89b-12d3-a456-426614174000');
          expect(result.data.type).toBe('error');
          expect(result.data.dismissable).toBe(false);
          expect(result.data.audience).toBe('all');
          expect(result.data.link).toEqual({
            text: 'Click here',
            url: 'https://example.com',
            external: true,
            style: 'button',
          });
          expect(result.data.scheduledStart).toBeInstanceOf(Date);
          expect(result.data.scheduledEnd).toBeInstanceOf(Date);
        }
      });

      it('should validate banner with warning type', () => {
        const input = {
          type: 'warning',
          message: 'Warning message',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate banner with inline link style', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          link: {
            text: 'Learn more',
            url: 'https://example.com/learn',
            external: false,
            style: 'inline',
          },
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate banner with unauthenticated audience', () => {
        const input = {
          type: 'info',
          message: 'Welcome visitor',
          audience: 'unauthenticated',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid inputs - missing required fields', () => {
      it('should reject banner without type', () => {
        const input = {
          message: 'Test message',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('type');
        }
      });

      it('should reject banner without message', () => {
        const input = {
          type: 'info',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('message');
        }
      });

      it('should reject banner with empty message', () => {
        const input = {
          type: 'info',
          message: '',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required');
        }
      });
    });

    describe('Invalid inputs - wrong types', () => {
      it('should reject invalid banner type', () => {
        const input = {
          type: 'critical',
          message: 'Test message',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('error');
          expect(result.error.issues[0].message).toContain('warning');
          expect(result.error.issues[0].message).toContain('info');
        }
      });

      it('should reject invalid audience type', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          audience: 'everyone',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('authenticated');
        }
      });

      it('should reject invalid link style', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          link: {
            text: 'Click',
            url: 'https://example.com',
            external: true,
            style: 'large',
          },
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('inline');
          expect(result.error.issues[0].message).toContain('button');
        }
      });

      it('should reject non-boolean dismissable', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          dismissable: 'yes',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid UUID for accountId', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          accountId: 'not-a-uuid',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('UUID');
        }
      });
    });

    describe('Invalid inputs - invalid values', () => {
      it('should reject message exceeding 5000 characters', () => {
        const input = {
          type: 'info',
          message: 'a'.repeat(5001),
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('5000');
        }
      });

      it('should reject key exceeding 255 characters', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          key: 'a'.repeat(256),
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('255');
        }
      });

      it('should reject empty key', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          key: '',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('empty');
        }
      });

      it('should reject invalid link URL', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          link: {
            text: 'Click',
            url: 'not-a-url',
            external: true,
            style: 'button',
          },
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('URL');
        }
      });

      it('should reject link text exceeding 255 characters', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          link: {
            text: 'a'.repeat(256),
            url: 'https://example.com',
            external: true,
            style: 'button',
          },
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('255');
        }
      });

      it('should reject empty link text', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          link: {
            text: '',
            url: 'https://example.com',
            external: true,
            style: 'button',
          },
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('required');
        }
      });

      it('should reject backgroundColor exceeding 50 characters', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          backgroundColor: 'a'.repeat(51),
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('50');
        }
      });

      it('should reject textColor exceeding 50 characters', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          textColor: 'a'.repeat(51),
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('50');
        }
      });

      it('should reject invalid datetime format for scheduledStart', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          scheduledStart: 'not-a-date',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('datetime');
        }
      });

      it('should reject scheduledEnd before scheduledStart', () => {
        const input = {
          type: 'info',
          message: 'Test message',
          scheduledStart: '2025-01-20T10:00:00Z',
          scheduledEnd: '2025-01-15T10:00:00Z',
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('after');
        }
      });

      it('should reject scheduledStart more than 1 year in future', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 2);

        const input = {
          type: 'info',
          message: 'Test message',
          scheduledStart: futureDate.toISOString(),
        };

        const result = createBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('1 year');
        }
      });
    });
  });

  describe('updateBannerSchema', () => {
    describe('Valid inputs', () => {
      it('should validate update with single field', () => {
        const input = {
          message: 'Updated message',
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate update with multiple fields', () => {
        const input = {
          type: 'warning',
          message: 'Updated warning',
          dismissable: true,
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate update with null values to remove fields', () => {
        const input = {
          link: null,
          backgroundColor: null,
          textColor: null,
          scheduledStart: null,
          scheduledEnd: null,
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate empty update object', () => {
        const input = {};

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid inputs', () => {
      it('should reject invalid type', () => {
        const input = {
          type: 'critical',
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty message', () => {
        const input = {
          message: '',
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject message exceeding 5000 characters', () => {
        const input = {
          message: 'a'.repeat(5001),
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject scheduledEnd before scheduledStart', () => {
        const input = {
          scheduledStart: '2025-01-20T10:00:00Z',
          scheduledEnd: '2025-01-15T10:00:00Z',
        };

        const result = updateBannerSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('toastSchema', () => {
    describe('Valid inputs', () => {
      it('should validate minimal valid toast', () => {
        const input = {
          type: 'info',
          message: 'Toast message',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('info');
          expect(result.data.message).toBe('Toast message');
          expect(result.data.duration).toBe(5000); // default
        }
      });

      it('should validate toast with all fields', () => {
        const input = {
          accountId: '123e4567-e89b-12d3-a456-426614174000',
          type: 'success',
          message: 'Operation successful',
          duration: 3000,
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.accountId).toBe('123e4567-e89b-12d3-a456-426614174000');
          expect(result.data.type).toBe('success');
          expect(result.data.duration).toBe(3000);
        }
      });

      it('should validate toast with error type', () => {
        const input = {
          type: 'error',
          message: 'Error occurred',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate toast with warning type', () => {
        const input = {
          type: 'warning',
          message: 'Warning message',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid inputs', () => {
      it('should reject toast without type', () => {
        const input = {
          message: 'Toast message',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject toast without message', () => {
        const input = {
          type: 'info',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty message', () => {
        const input = {
          type: 'info',
          message: '',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid toast type', () => {
        const input = {
          type: 'critical',
          message: 'Toast message',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject message exceeding 500 characters', () => {
        const input = {
          type: 'info',
          message: 'a'.repeat(501),
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('500');
        }
      });

      it('should reject invalid UUID for accountId', () => {
        const input = {
          type: 'info',
          message: 'Toast message',
          accountId: 'not-a-uuid',
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('UUID');
        }
      });

      it('should reject negative duration', () => {
        const input = {
          type: 'info',
          message: 'Toast message',
          duration: -1000,
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('positive');
        }
      });

      it('should reject duration exceeding 30 seconds', () => {
        const input = {
          type: 'info',
          message: 'Toast message',
          duration: 31000,
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('30');
        }
      });

      it('should reject non-integer duration', () => {
        const input = {
          type: 'info',
          message: 'Toast message',
          duration: 5000.5,
        };

        const result = toastSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('integer');
        }
      });
    });
  });
});
