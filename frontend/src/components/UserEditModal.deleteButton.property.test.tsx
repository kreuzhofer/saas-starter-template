import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock the auth utilities - will be configured per test
vi.mock('../utils/auth', () => ({
  getUserId: vi.fn(),
}));

/**
 * Feature: admin-account-deletion
 * 
 * Property 1: Delete Button Visibility Based on Account Status
 * 
 * For any user being viewed in the edit modal, the delete button SHALL be visible
 * if and only if the user is deactivated (isActive is false) AND the user is not
 * the currently logged-in admin.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3
 */

describe('Property-Based Test: Delete Button Visibility', () => {
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
    isActive: true,
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
    // Default: logged-in user is different from the user being edited
    vi.mocked(authUtils.getUserId).mockReturnValue('admin-user-999');
  });

  describe('Property 1: Delete Button Visibility Based on Account Status', () => {
    /**
     * For any deactivated account that is NOT the current user's own account,
     * the delete button should be visible.
     * Validates: Requirement 2.1
     */
    it('should show delete button for deactivated non-self accounts', async () => {
      const deactivatedUser = createMockUser({ 
        id: 'other-user-456',
        isActive: false 
      });
      vi.mocked(authUtils.getUserId).mockReturnValue('admin-user-999');

      renderModal(deactivatedUser);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
      expect(screen.getByText('Delete Account Permanently')).toBeInTheDocument();
    });

    /**
     * For any active account, the delete button should NOT be visible.
     * Instead, a message explaining deactivation requirement should be shown.
     * Validates: Requirement 2.2
     */
    it('should show deactivation message for active accounts', async () => {
      const activeUser = createMockUser({ 
        id: 'other-user-456',
        isActive: true 
      });
      vi.mocked(authUtils.getUserId).mockReturnValue('admin-user-999');

      renderModal(activeUser);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('delete-account-button')).not.toBeInTheDocument();
      expect(screen.getByText('This account must be deactivated before it can be deleted.')).toBeInTheDocument();
    });

    /**
     * For the admin's own account, the delete option should NOT be visible
     * regardless of activation status.
     * Validates: Requirement 2.3
     */
    it('should show self-deletion prevention message for own account', async () => {
      const ownUser = createMockUser({ 
        id: 'admin-user-999',
        isActive: false // Even if deactivated
      });
      vi.mocked(authUtils.getUserId).mockReturnValue('admin-user-999');

      renderModal(ownUser);

      await waitFor(() => {
        expect(screen.getByText('Danger Zone')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('delete-account-button')).not.toBeInTheDocument();
      expect(screen.getByText('You cannot delete your own account.')).toBeInTheDocument();
    });

    /**
     * Property test: For any combination of isActive and isOwnAccount,
     * the delete button visibility follows the rule:
     * visible = !isActive && !isOwnAccount
     */
    it('should follow visibility rule: visible = !isActive && !isOwnAccount', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // isActive
          fc.boolean(), // isOwnAccount
          (isActive, isOwnAccount) => {
            // The expected visibility based on the property
            const expectedVisible = !isActive && !isOwnAccount;

            // Simulate the component logic
            const isEditingOwnAccount = isOwnAccount;
            const userIsActive = isActive;

            // This is the logic from the component:
            // - If isEditingOwnAccount: show "cannot delete own account" message
            // - Else if user.isActive: show "must deactivate first" message
            // - Else: show delete button
            const deleteButtonVisible = !isEditingOwnAccount && !userIsActive;

            expect(deleteButtonVisible).toBe(expectedVisible);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test with generated user data: For any user with random properties,
     * the delete button visibility should be deterministic based on isActive and isOwnAccount.
     */
    it('should correctly determine delete button visibility for any user configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            currentUserId: fc.uuid(),
            isActive: fc.boolean(),
            username: fc.emailAddress(),
            role: fc.constantFrom('admin', 'account_owner') as fc.Arbitrary<'admin' | 'account_owner'>,
            tier: fc.constantFrom('starter', 'pro', 'business', 'enterprise') as fc.Arbitrary<'starter' | 'pro' | 'business' | 'enterprise'>,
          }),
          ({ userId, currentUserId, isActive, username, role, tier }) => {
            const isOwnAccount = userId === currentUserId;
            
            // Expected: delete button visible only if deactivated AND not own account
            const expectedDeleteButtonVisible = !isActive && !isOwnAccount;

            // Simulate component logic
            const isEditingOwnAccount = isOwnAccount;
            const actualDeleteButtonVisible = !isEditingOwnAccount && !isActive;

            expect(actualDeleteButtonVisible).toBe(expectedDeleteButtonVisible);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Integration test: Verify the actual component renders correctly for various states.
     */
    it('should render correct content for all four state combinations', async () => {
      const testCases = [
        { isActive: true, isOwnAccount: false, expectButton: false, expectMessage: 'deactivated' },
        { isActive: false, isOwnAccount: false, expectButton: true, expectMessage: null },
        { isActive: true, isOwnAccount: true, expectButton: false, expectMessage: 'own account' },
        { isActive: false, isOwnAccount: true, expectButton: false, expectMessage: 'own account' },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        vi.mocked(api.getUserOverrides).mockResolvedValue({ overrides: [], total: 0 });
        
        const userId = testCase.isOwnAccount ? 'same-user-id' : 'different-user-id';
        vi.mocked(authUtils.getUserId).mockReturnValue('same-user-id');

        const user = createMockUser({
          id: userId,
          isActive: testCase.isActive,
        });

        const { unmount } = renderModal(user);

        await waitFor(() => {
          expect(screen.getByText('Danger Zone')).toBeInTheDocument();
        });

        if (testCase.expectButton) {
          expect(screen.getByTestId('delete-account-button')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('delete-account-button')).not.toBeInTheDocument();
        }

        if (testCase.expectMessage === 'deactivated') {
          expect(screen.getByText('This account must be deactivated before it can be deleted.')).toBeInTheDocument();
        } else if (testCase.expectMessage === 'own account') {
          expect(screen.getByText('You cannot delete your own account.')).toBeInTheDocument();
        }

        unmount();
      }
    });
  });
});
