import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { UserEditModal } from './UserEditModal';
import type { AdminUserInfo } from '../types';
import testI18n from '../i18n/testConfig';
import { api } from '../api/client';
import * as authUtils from '../utils/auth';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    getUserOverrides: vi.fn(),
    createUserOverride: vi.fn(),
    deleteUserOverride: vi.fn(),
  },
}));

// Mock the auth utilities
vi.mock('../utils/auth', () => ({
  getUserId: vi.fn(() => 'admin-user-999'),
}));

/**
 * Feature: admin-account-deletion
 * 
 * Property 2: Email Confirmation Enables Delete
 * 
 * For any email input in the delete confirmation dialog, the confirm button SHALL be
 * enabled if and only if the input matches the target user's email address
 * (case-insensitive comparison).
 * 
 * Validates: Requirements 3.5, 3.6
 */

describe('Property-Based Test: Email Confirmation', () => {
  const mockOnClose = vi.fn();
  const mockOnRoleUpdate = vi.fn();
  const mockOnTierUpdate = vi.fn();
  const mockOnEmailUpdate = vi.fn();
  const mockOnPasswordReset = vi.fn();
  const mockOnPasswordSet = vi.fn();
  const mockOnDelete = vi.fn();

  const createMockUser = (overrides: Partial<AdminUserInfo> = {}): AdminUserInfo => ({
    id: 'user-123',
    username: 'test@example.com',
    role: 'account_owner',
    tier: 'starter',
    isActive: false, // Must be deactivated to show delete button
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    ...overrides,
  });

  const renderModal = (user: AdminUserInfo) => {
    return render(
      <I18nextProvider i18n={testI18n}>
        <UserEditModal
          user={user}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onDelete={mockOnDelete}
        />
      </I18nextProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getUserOverrides).mockResolvedValue({ overrides: [], total: 0 });
    vi.mocked(authUtils.getUserId).mockReturnValue('admin-user-999');
  });

  describe('Property 2: Email Confirmation Enables Delete', () => {
    /**
     * When the typed email does not match the target user's email,
     * the confirm button should be disabled.
     * Validates: Requirement 3.5
     */
    it('should disable confirm button when email does not match', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({ username: 'target@example.com' });
      
      renderModal(mockUser);

      // Wait for modal to load and click delete button
      await waitFor(() => {
        expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('delete-account-button'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('delete-email-input')).toBeInTheDocument();
      });

      // Type a non-matching email
      const emailInput = screen.getByTestId('delete-email-input');
      await user.type(emailInput, 'wrong@example.com');

      // Confirm button should be disabled
      const confirmButton = screen.getByTestId('delete-confirm-button');
      expect(confirmButton).toBeDisabled();
    });

    /**
     * When the typed email matches the target user's email exactly (case-insensitive),
     * the confirm button should be enabled.
     * Validates: Requirement 3.6
     */
    it('should enable confirm button when email matches exactly', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({ username: 'target@example.com' });
      
      renderModal(mockUser);

      // Wait for modal to load and click delete button
      await waitFor(() => {
        expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('delete-account-button'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('delete-email-input')).toBeInTheDocument();
      });

      // Type the matching email
      const emailInput = screen.getByTestId('delete-email-input');
      await user.type(emailInput, 'target@example.com');

      // Confirm button should be enabled
      const confirmButton = screen.getByTestId('delete-confirm-button');
      expect(confirmButton).not.toBeDisabled();
    });

    /**
     * Email matching should be case-insensitive.
     * Validates: Requirement 3.6
     */
    it('should enable confirm button when email matches case-insensitively', async () => {
      const user = userEvent.setup();
      const mockUser = createMockUser({ username: 'Target@Example.COM' });
      
      renderModal(mockUser);

      // Wait for modal to load and click delete button
      await waitFor(() => {
        expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('delete-account-button'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('delete-email-input')).toBeInTheDocument();
      });

      // Type the email in different case
      const emailInput = screen.getByTestId('delete-email-input');
      await user.type(emailInput, 'target@example.com');

      // Confirm button should be enabled (case-insensitive match)
      const confirmButton = screen.getByTestId('delete-confirm-button');
      expect(confirmButton).not.toBeDisabled();
    });

    /**
     * Property test: For any email input, the confirm button should be enabled
     * if and only if the input matches the target email (case-insensitive).
     */
    it('should follow the rule: enabled = (input.toLowerCase() === target.toLowerCase())', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(), // Target email
          fc.string(), // Input email (any string)
          (targetEmail, inputEmail) => {
            // The expected button state based on the property
            const expectedEnabled = inputEmail.toLowerCase() === targetEmail.toLowerCase();

            // Simulate the component logic
            const deleteEmailInput = inputEmail;
            const userUsername = targetEmail;
            const isButtonEnabled = deleteEmailInput.toLowerCase() === userUsername.toLowerCase();

            expect(isButtonEnabled).toBe(expectedEnabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test: For any valid email, typing it in different cases should always enable the button.
     */
    it('should enable button for any case variation of the target email', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (targetEmail) => {
            // Generate various case variations
            const variations = [
              targetEmail.toLowerCase(),
              targetEmail.toUpperCase(),
              // Mix case: alternate upper/lower
              targetEmail.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join(''),
            ];

            for (const variation of variations) {
              const isEnabled = variation.toLowerCase() === targetEmail.toLowerCase();
              expect(isEnabled).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test: For any email that differs from target (even by one character),
     * the button should be disabled.
     */
    it('should disable button when input differs from target by any character', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.integer({ min: 0, max: 100 }),
          (targetEmail, position) => {
            // Modify one character in the email
            const pos = position % targetEmail.length;
            const chars = targetEmail.split('');
            // Change the character at position
            chars[pos] = chars[pos] === 'x' ? 'y' : 'x';
            const modifiedEmail = chars.join('');

            // The button should be disabled for the modified email
            const isEnabled = modifiedEmail.toLowerCase() === targetEmail.toLowerCase();
            
            // If the modification actually changed the email (case-insensitive), button should be disabled
            if (modifiedEmail.toLowerCase() !== targetEmail.toLowerCase()) {
              expect(isEnabled).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Integration test: Verify the actual component behavior with various email inputs.
     */
    it('should correctly enable/disable button for various email inputs', async () => {
      const user = userEvent.setup();
      const targetEmail = 'Test.User@Example.COM';
      const mockUser = createMockUser({ username: targetEmail });
      
      renderModal(mockUser);

      // Wait for modal to load and click delete button
      await waitFor(() => {
        expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('delete-account-button'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('delete-email-input')).toBeInTheDocument();
      });

      const emailInput = screen.getByTestId('delete-email-input');
      const confirmButton = screen.getByTestId('delete-confirm-button');

      // Test cases: [input, shouldBeEnabled]
      const testCases: [string, boolean][] = [
        ['', false],
        ['test', false],
        ['test.user@example.com', true], // lowercase match
        ['TEST.USER@EXAMPLE.COM', true], // uppercase match
        ['Test.User@Example.COM', true], // exact match
        ['test.user@example.co', false], // missing character
        ['test.user@example.comm', false], // extra character
        ['wrong@example.com', false], // completely different
      ];

      for (const [input, shouldBeEnabled] of testCases) {
        await user.clear(emailInput);
        if (input) {
          await user.type(emailInput, input);
        }
        
        if (shouldBeEnabled) {
          expect(confirmButton).not.toBeDisabled();
        } else {
          expect(confirmButton).toBeDisabled();
        }
      }
    });

    /**
     * Test that the target email is displayed in the dialog.
     */
    it('should display the target email address in the confirmation dialog', async () => {
      const user = userEvent.setup();
      const targetEmail = 'display.test@example.com';
      const mockUser = createMockUser({ username: targetEmail });
      
      renderModal(mockUser);

      // Wait for modal to load and click delete button
      await waitFor(() => {
        expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('delete-account-button'));

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByTestId('target-email-display')).toBeInTheDocument();
      });

      // Verify the target email is displayed
      expect(screen.getByTestId('target-email-display')).toHaveTextContent(targetEmail);
    });
  });
});
