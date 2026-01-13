import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { UserEditModal } from './UserEditModal';
import type { AdminUserInfo } from '../types';
import testI18n from '../i18n/testConfig';

// Mock the auth utilities
vi.mock('../utils/auth', () => ({
  getUserId: vi.fn(() => 'different-user-999'), // Default: not editing own account
}));

describe('UserEditModal', () => {
  const mockUser: AdminUserInfo = {
    id: 'user-123',
    username: 'test@example.com',
    role: 'account_owner',
    tier: 'starter',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  };

  const mockOnClose = vi.fn();
  const mockOnRoleUpdate = vi.fn();
  const mockOnTierUpdate = vi.fn();
  const mockOnEmailUpdate = vi.fn();
  const mockOnPasswordReset = vi.fn();
  const mockOnPasswordSet = vi.fn();

  // Helper to wrap component with i18n provider
  const renderWithI18n = (component: React.ReactElement) => {
    return render(
      <I18nextProvider i18n={testI18n}>
        {component}
      </I18nextProvider>
    );
  };

  beforeEach(async () => {
    mockOnClose.mockClear();
    mockOnRoleUpdate.mockClear();
    mockOnTierUpdate.mockClear();
    mockOnEmailUpdate.mockClear();
    mockOnPasswordReset.mockClear();
    mockOnPasswordSet.mockClear();
    
    // Reset getUserId mock to default behavior
    const { getUserId } = await import('../utils/auth');
    vi.mocked(getUserId).mockReturnValue('different-user-999');
    
    // Reset to English before each test
    await testI18n.changeLanguage('en');
  });

  describe('Modal rendering with user information', () => {
    it('should render modal when isOpen is true and user is provided', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('User Information')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={false}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
    });

    it('should not render modal when user is null', () => {
      render(
        <UserEditModal
          user={null}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
    });

    it('should display user ID in user information section', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('should display user status as Active when isActive is true', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Active')).toHaveClass('text-green-600');
    });

    it('should display user status as Inactive when isActive is false', () => {
      const inactiveUser = { ...mockUser, isActive: false };
      render(
        <UserEditModal
          user={inactiveUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toHaveClass('text-red-600');
    });

    it('should display formatted creation date', () => {
      renderWithI18n(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      // formatDateTime includes time, so we check for the date part with a regex
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });

    it('should display current user email in email input', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should display current user role in role dropdown', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i) as HTMLSelectElement;
      expect(roleSelect.value).toBe('account_owner');
    });
  });

  describe('Role selection updates state', () => {
    it('should update selected role when dropdown value changes', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      expect((roleSelect as HTMLSelectElement).value).toBe('admin');
    });

    it('should show Update Role button when role is changed', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      expect(screen.getByRole('button', { name: /update role/i })).toBeInTheDocument();
    });

    it('should not show Update Role button when role is unchanged', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.queryByRole('button', { name: /update role/i })).not.toBeInTheDocument();
    });

    it('should call onRoleUpdate when Update Role button is clicked', async () => {
      const user = userEvent.setup();
      mockOnRoleUpdate.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Admin warning dialog should appear
      expect(screen.getByText(/grant admin access/i)).toBeInTheDocument();
      
      // Click confirm button in the warning dialog
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnRoleUpdate).toHaveBeenCalledWith('user-123', 'admin');
      });
    });

    it('should display all available roles in dropdown', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      const options = Array.from(roleSelect.querySelectorAll('option'));
      const optionValues = options.map(opt => opt.getAttribute('value'));

      expect(optionValues).toContain('admin');
      expect(optionValues).toContain('account_owner');
      expect(optionValues).toContain('account_user');
    });

    it('should disable role dropdown while role update is in progress', async () => {
      const user = userEvent.setup();
      let resolveRoleUpdate: () => void;
      const roleUpdatePromise = new Promise<void>((resolve) => {
        resolveRoleUpdate = resolve;
      });
      mockOnRoleUpdate.mockReturnValue(roleUpdatePromise);

      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Confirm the admin warning dialog
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(roleSelect).toBeDisabled();

      resolveRoleUpdate!();
      await waitFor(() => {
        expect(roleSelect).not.toBeDisabled();
      });
    });
  });

  describe('Email validation rejects invalid formats', () => {
    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(mockOnEmailUpdate).not.toHaveBeenCalled();
    });

    it('should show error for email without @ symbol', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalidemail.com');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      expect(mockOnEmailUpdate).not.toHaveBeenCalled();
    });

    it('should show error for email without domain', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'test@');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      expect(mockOnEmailUpdate).not.toHaveBeenCalled();
    });

    it('should show error for email without TLD', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'test@domain');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      expect(mockOnEmailUpdate).not.toHaveBeenCalled();
    });

    it('should accept valid email format', async () => {
      const user = userEvent.setup();
      mockOnEmailUpdate.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockOnEmailUpdate).toHaveBeenCalledWith('user-123', 'newemail@example.com');
      });
      expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
    });

    it('should display red border on email input when validation fails', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(emailInput).toHaveClass('border-red-500');
    });

    it('should clear error when user starts typing valid email', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();

      await user.type(emailInput, '@example.com');

      expect(screen.queryByText(/invalid email format/i)).not.toBeInTheDocument();
    });

    it('should show Update Email button only when email is changed', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.queryByRole('button', { name: /update email/i })).not.toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      expect(screen.getByRole('button', { name: /update email/i })).toBeInTheDocument();
    });

    it('should not show Update Email button when email has validation error', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid');

      const updateButton = screen.getByRole('button', { name: /update email/i });
      await user.click(updateButton);

      expect(screen.queryByRole('button', { name: /update email/i })).not.toBeInTheDocument();
    });
  });

  describe('Password reset shows confirmation dialog', () => {
    it('should show Send Password Reset Email button initially', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.getByRole('button', { name: /send password reset email/i })).toBeInTheDocument();
    });

    it('should show confirmation dialog when Send Password Reset Email button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const resetButton = screen.getByRole('button', { name: /send password reset email/i });
      await user.click(resetButton);

      expect(screen.getByText(/are you sure you want to reset this user's password/i)).toBeInTheDocument();
      expect(screen.getByText(/a password reset email will be sent to test@example.com/i)).toBeInTheDocument();
    });

    it('should show Confirm Reset and Cancel buttons in confirmation dialog', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const resetButton = screen.getByRole('button', { name: /send password reset email/i });
      await user.click(resetButton);

      expect(screen.getByRole('button', { name: /confirm reset/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call onPasswordReset when Confirm Reset is clicked', async () => {
      const user = userEvent.setup();
      mockOnPasswordReset.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const resetButton = screen.getByRole('button', { name: /send password reset email/i });
      await user.click(resetButton);

      const confirmButton = screen.getByRole('button', { name: /confirm reset/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnPasswordReset).toHaveBeenCalledWith('user-123');
      });
    });

    it('should hide confirmation dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const resetButton = screen.getByRole('button', { name: /send password reset email/i });
      await user.click(resetButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/are you sure you want to reset this user's password/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send password reset email/i })).toBeInTheDocument();
    });

    it('should hide confirmation dialog after successful password reset', async () => {
      const user = userEvent.setup();
      mockOnPasswordReset.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const resetButton = screen.getByRole('button', { name: /send password reset email/i });
      await user.click(resetButton);

      const confirmButton = screen.getByRole('button', { name: /confirm reset/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText(/are you sure you want to reset this user's password/i)).not.toBeInTheDocument();
      });
    });

    it('should disable buttons while password reset is in progress', async () => {
      const user = userEvent.setup();
      let resolvePasswordReset: () => void;
      const passwordResetPromise = new Promise<void>((resolve) => {
        resolvePasswordReset = resolve;
      });
      mockOnPasswordReset.mockReturnValue(passwordResetPromise);

      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const resetButton = screen.getByRole('button', { name: /send password reset email/i });
      await user.click(resetButton);

      const confirmButton = screen.getByRole('button', { name: /confirm reset/i });
      await user.click(confirmButton);

      expect(screen.getByRole('button', { name: /sending\.\.\./i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      resolvePasswordReset!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /sending\.\.\./i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const closeButton = screen.getByLabelText(/close modal/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button in footer is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const closeButtons = screen.getAllByRole('button', { name: /^close$/i });
      const footerCloseButton = closeButtons[closeButtons.length - 1];
      await user.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form state reset on user change', () => {
    it('should reset form fields when user prop changes', () => {
      const { rerender } = render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const newUser: AdminUserInfo = {
        id: 'user-456',
        username: 'another@example.com',
        role: 'admin',
        tier: 'pro',
        isActive: false,
        createdAt: '2024-02-20T14:00:00Z',
        updatedAt: '2024-02-20T14:00:00Z',
      };

      rerender(
        <UserEditModal
          user={newUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const roleSelect = screen.getByLabelText(/^role$/i) as HTMLSelectElement;

      expect(emailInput.value).toBe('another@example.com');
      expect(roleSelect.value).toBe('admin');
    });
  });

  describe('Self-protection UI elements', () => {
    it('should disable non-admin role options when editing own admin account', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('admin-user-123');

      const adminUser: AdminUserInfo = {
        id: 'admin-user-123',
        username: 'admin@example.com',
        role: 'admin',
        tier: 'enterprise',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role/i) as HTMLSelectElement;
      const options = Array.from(roleSelect.options);

      // Admin option should be enabled
      const adminOption = options.find(opt => opt.value === 'admin');
      expect(adminOption?.disabled).toBe(false);

      // Non-admin options should be disabled
      const accountOwnerOption = options.find(opt => opt.value === 'account_owner');
      const accountUserOption = options.find(opt => opt.value === 'account_user');
      expect(accountOwnerOption?.disabled).toBe(true);
      expect(accountUserOption?.disabled).toBe(true);
    });

    it('should show tooltip explaining restriction when editing own admin account', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('admin-user-123');

      const adminUser: AdminUserInfo = {
        id: 'admin-user-123',
        username: 'admin@example.com',
        role: 'admin',
        tier: 'enterprise',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      // Check for the warning message (not in the option text)
      expect(screen.getByText(/prevent accidental lockout from administrative functions/i)).toBeInTheDocument();
      expect(screen.getByText(/self-editing restricted/i)).toBeInTheDocument();
    });

    it('should display error message if self-demotion attempted via API', async () => {
      const { getUserId } = await import('../utils/auth');
      // Mock as a different user so the Update Role button appears
      vi.mocked(getUserId).mockReturnValue('different-user-456');

      const adminUser: AdminUserInfo = {
        id: 'admin-user-123',
        username: 'admin@example.com',
        role: 'admin',
        tier: 'enterprise',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const errorMessage = 'You cannot change your own role to prevent accidental lockout';
      mockOnRoleUpdate.mockRejectedValue(new Error(errorMessage));

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const user = userEvent.setup();
      const roleSelect = screen.getByLabelText(/^role/i);
      
      // Change role to trigger the update button
      await user.selectOptions(roleSelect, 'account_owner');
      
      const updateButton = screen.getByRole('button', { name: /update role/i });
      
      // Click the button - error will be caught and displayed by the component
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should not show self-protection UI when editing another user account', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const otherAdminUser: AdminUserInfo = {
        id: 'other-admin-456',
        username: 'other-admin@example.com',
        role: 'admin',
        tier: 'enterprise',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      render(
        <UserEditModal
          user={otherAdminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      // Should not show self-editing restriction
      expect(screen.queryByText(/self-editing restricted/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cannot change your own admin role/i)).not.toBeInTheDocument();

      // All role options should be enabled
      const roleSelect = screen.getByLabelText(/^role/i) as HTMLSelectElement;
      const options = Array.from(roleSelect.options);
      options.forEach(option => {
        expect(option.disabled).toBe(false);
      });
    });

    it('should hide deactivate button for own account', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('admin-user-123');

      const adminUser: AdminUserInfo = {
        id: 'admin-user-123',
        username: 'admin@example.com',
        role: 'admin',
        tier: 'enterprise',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      // Should show the account status section
      expect(screen.getByText('Account Status')).toBeInTheDocument();
      
      // Should show the restriction message in the label (using getAllByText to verify both instances)
      const restrictionMessages = screen.getAllByText(/cannot deactivate your own account/i);
      expect(restrictionMessages.length).toBeGreaterThan(0);

      // Should NOT show the deactivate button
      expect(screen.queryByRole('button', { name: /deactivate account/i })).not.toBeInTheDocument();

      // Should show the informational message instead
      expect(screen.getByText(/you cannot deactivate your own account to prevent accidental lockout from the system/i)).toBeInTheDocument();
    });

    it('should show deactivate button for other user accounts', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const otherUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={otherUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      // Should show the account status section
      expect(screen.getByText('Account Status')).toBeInTheDocument();
      
      // Should NOT show the restriction message
      expect(screen.queryByText(/cannot deactivate your own account/i)).not.toBeInTheDocument();

      // Should show the deactivate button
      expect(screen.getByRole('button', { name: /deactivate account/i })).toBeInTheDocument();

      // Should NOT show the informational message
      expect(screen.queryByText(/you cannot deactivate your own account to prevent accidental lockout from the system/i)).not.toBeInTheDocument();
    });

    it('should display tooltip text correctly for role editing restriction', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('admin-user-123');

      const adminUser: AdminUserInfo = {
        id: 'admin-user-123',
        username: 'admin@example.com',
        role: 'admin',
        tier: 'enterprise',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      // Check for the tooltip/warning message about role editing
      expect(screen.getByText(/you cannot change your own admin role to prevent accidental lockout from administrative functions/i)).toBeInTheDocument();
      
      // Check for the option text that includes the restriction
      const roleSelect = screen.getByLabelText(/^role/i) as HTMLSelectElement;
      const options = Array.from(roleSelect.options);
      
      // Find the account_owner option and check its text
      const accountOwnerOption = options.find(opt => opt.value === 'account_owner');
      expect(accountOwnerOption?.textContent).toContain('Cannot change your own admin role');
      
      // Find the account_user option and check its text
      const accountUserOption = options.find(opt => opt.value === 'account_user');
      expect(accountUserOption?.textContent).toContain('Cannot change your own admin role');
    });
  });

  describe('Admin role warning dialog', () => {
    it('should show warning dialog when admin role is selected', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Warning dialog should appear
      expect(screen.getByText(/grant admin access\?/i)).toBeInTheDocument();
      expect(screen.getByText(/you are about to grant administrator privileges/i)).toBeInTheDocument();
      expect(screen.getByText(/administrators have full system access/i)).toBeInTheDocument();
    });

    it('should proceed with role change when confirmation is clicked', async () => {
      const user = userEvent.setup();
      mockOnRoleUpdate.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Warning dialog should appear
      expect(screen.getByText(/grant admin access\?/i)).toBeInTheDocument();

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should call onRoleUpdate with admin role
      await waitFor(() => {
        expect(mockOnRoleUpdate).toHaveBeenCalledWith('user-123', 'admin');
      });

      // Dialog should be closed
      expect(screen.queryByText(/grant admin access\?/i)).not.toBeInTheDocument();
    });

    it('should abort role change when cancellation is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Warning dialog should appear
      expect(screen.getByText(/grant admin access\?/i)).toBeInTheDocument();

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should NOT call onRoleUpdate
      expect(mockOnRoleUpdate).not.toHaveBeenCalled();

      // Dialog should be closed
      expect(screen.queryByText(/grant admin access\?/i)).not.toBeInTheDocument();

      // Role should be reverted to original value
      expect((roleSelect as HTMLSelectElement).value).toBe('account_owner');
    });

    it('should not show warning dialog when changing to non-admin role', async () => {
      const user = userEvent.setup();
      mockOnRoleUpdate.mockResolvedValue(undefined);
      
      const adminUser: AdminUserInfo = {
        ...mockUser,
        role: 'admin',
        tier: 'enterprise',
      };

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'account_owner');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Warning dialog should NOT appear
      expect(screen.queryByText(/grant admin access\?/i)).not.toBeInTheDocument();

      // Should call onRoleUpdate directly
      await waitFor(() => {
        expect(mockOnRoleUpdate).toHaveBeenCalledWith('user-123', 'account_owner');
      });
    });

    it('should not show warning dialog when admin role is already selected', async () => {
      const adminUser: AdminUserInfo = {
        ...mockUser,
        role: 'admin',
        tier: 'enterprise',
      };

      render(
        <UserEditModal
          user={adminUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      // Role is already admin, so no update button should appear
      expect(screen.queryByRole('button', { name: /update role/i })).not.toBeInTheDocument();
    });

    it('should show both Confirm and Cancel buttons in warning dialog', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const roleSelect = screen.getByLabelText(/^role$/i);
      await user.selectOptions(roleSelect, 'admin');

      const updateButton = screen.getByRole('button', { name: /update role/i });
      await user.click(updateButton);

      // Both buttons should be present
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Activation and deactivation UI', () => {
    it('should render Deactivate Account button for active users (not own account)', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const activeUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={activeUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      expect(screen.getByRole('button', { name: /deactivate account/i })).toBeInTheDocument();
    });

    it('should render Activate Account button for inactive users', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const inactiveUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: false,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={inactiveUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      expect(screen.getByRole('button', { name: /activate account/i })).toBeInTheDocument();
    });

    it('should show confirmation dialog when Deactivate Account button is clicked', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const activeUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={activeUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const deactivateButton = screen.getByRole('button', { name: /deactivate account/i });
      await user.click(deactivateButton);

      expect(screen.getByText(/are you sure you want to deactivate this user/i)).toBeInTheDocument();
      expect(screen.getByText(/they will not be able to log in until their account is reactivated/i)).toBeInTheDocument();
    });

    it('should show Confirm Deactivate and Cancel buttons in confirmation dialog', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const activeUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={activeUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const deactivateButton = screen.getByRole('button', { name: /deactivate account/i });
      await user.click(deactivateButton);

      expect(screen.getByRole('button', { name: /confirm deactivate/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call onDeactivate when Confirm Deactivate is clicked', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const activeUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn().mockResolvedValue(undefined);

      render(
        <UserEditModal
          user={activeUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const deactivateButton = screen.getByRole('button', { name: /deactivate account/i });
      await user.click(deactivateButton);

      const confirmButton = screen.getByRole('button', { name: /confirm deactivate/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDeactivate).toHaveBeenCalledWith('other-user-456');
      });
    });

    it('should hide confirmation dialog when Cancel is clicked', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const activeUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={activeUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const deactivateButton = screen.getByRole('button', { name: /deactivate account/i });
      await user.click(deactivateButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText(/are you sure you want to deactivate this user/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deactivate account/i })).toBeInTheDocument();
    });

    it('should call onActivate when Activate Account button is clicked', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const inactiveUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: false,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      const mockOnActivate = vi.fn().mockResolvedValue(undefined);
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={inactiveUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const activateButton = screen.getByRole('button', { name: /activate account/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(mockOnActivate).toHaveBeenCalledWith('other-user-456');
      });
    });

    it('should disable buttons and show loading text while deactivation is in progress', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const activeUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      let resolveDeactivate: () => void;
      const deactivatePromise = new Promise<void>((resolve) => {
        resolveDeactivate = resolve;
      });

      const mockOnActivate = vi.fn();
      const mockOnDeactivate = vi.fn().mockReturnValue(deactivatePromise);

      render(
        <UserEditModal
          user={activeUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const deactivateButton = screen.getByRole('button', { name: /deactivate account/i });
      await user.click(deactivateButton);

      const confirmButton = screen.getByRole('button', { name: /confirm deactivate/i });
      await user.click(confirmButton);

      expect(screen.getByRole('button', { name: /deactivating\.\.\./i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      resolveDeactivate!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /deactivating\.\.\./i })).not.toBeInTheDocument();
      });
    });

    it('should disable button and show loading text while activation is in progress', async () => {
      const { getUserId } = await import('../utils/auth');
      vi.mocked(getUserId).mockReturnValue('current-admin-123');

      const inactiveUser: AdminUserInfo = {
        id: 'other-user-456',
        username: 'other@example.com',
        role: 'account_owner',
        tier: 'starter',
        isActive: false,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      let resolveActivate: () => void;
      const activatePromise = new Promise<void>((resolve) => {
        resolveActivate = resolve;
      });

      const mockOnActivate = vi.fn().mockReturnValue(activatePromise);
      const mockOnDeactivate = vi.fn();

      render(
        <UserEditModal
          user={inactiveUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
          onActivate={mockOnActivate}
          onDeactivate={mockOnDeactivate}
        />
      );

      const user = userEvent.setup();
      const activateButton = screen.getByRole('button', { name: /activate account/i });
      await user.click(activateButton);

      expect(screen.getByRole('button', { name: /activating\.\.\./i })).toBeDisabled();

      resolveActivate!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /activating\.\.\./i })).not.toBeInTheDocument();
      });
    });

    it('should not render activation/deactivation section when callbacks are not provided', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.queryByText('Account Status')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /activate account/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /deactivate account/i })).not.toBeInTheDocument();
    });
  });

  describe('Password management features', () => {
    it('should render Set New Password button', () => {
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      expect(screen.getByRole('button', { name: /set new password/i })).toBeInTheDocument();
    });

    it('should show password input form when Set New Password button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      expect(screen.getByPlaceholderText(/enter new password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^set password$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show password validation error for passwords less than 8 characters', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'short');

      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should show success indicator for valid password', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'validpassword123');

      expect(screen.getByText(/✓ password meets requirements/i)).toBeInTheDocument();
    });

    it('should disable Set Password button when password is invalid', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'short');

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      expect(submitButton).toBeDisabled();
    });

    it('should disable Set Password button when password is empty', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable Set Password button when password is valid', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'validpassword123');

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should call onPasswordSet with correct parameters when Set Password is clicked', async () => {
      const user = userEvent.setup();
      mockOnPasswordSet.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'validpassword123');

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnPasswordSet).toHaveBeenCalledWith('user-123', 'validpassword123');
      });
    });

    it('should hide password form after successful password set', async () => {
      const user = userEvent.setup();
      mockOnPasswordSet.mockResolvedValue(undefined);
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'validpassword123');

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/enter new password/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /set new password/i })).toBeInTheDocument();
      });
    });

    it('should clear password input and error when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'short');

      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByPlaceholderText(/enter new password/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /set new password/i })).toBeInTheDocument();
    });

    it('should show Setting... text while password is being set', async () => {
      const user = userEvent.setup();
      let resolvePasswordSet: () => void;
      const passwordSetPromise = new Promise<void>((resolve) => {
        resolvePasswordSet = resolve;
      });
      mockOnPasswordSet.mockReturnValue(passwordSetPromise);

      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'validpassword123');

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /setting\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /setting\.\.\./i })).toBeDisabled();

      resolvePasswordSet!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /setting\.\.\./i })).not.toBeInTheDocument();
      });
    });

    it('should disable all buttons while password is being set', async () => {
      const user = userEvent.setup();
      let resolvePasswordSet: () => void;
      const passwordSetPromise = new Promise<void>((resolve) => {
        resolvePasswordSet = resolve;
      });
      mockOnPasswordSet.mockReturnValue(passwordSetPromise);

      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'validpassword123');

      const submitButton = screen.getByRole('button', { name: /^set password$/i });
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /setting\.\.\./i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      resolvePasswordSet!();
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /setting\.\.\./i })).not.toBeInTheDocument();
      });
    });

    it('should show red border on password input when validation fails', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'short');

      expect(passwordInput).toHaveClass('border-red-500');
    });

    it('should clear validation error when user types valid password', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      const passwordInput = screen.getByPlaceholderText(/enter new password/i);
      await user.type(passwordInput, 'short');

      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, 'validpassword123');

      expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument();
      expect(screen.getByText(/✓ password meets requirements/i)).toBeInTheDocument();
    });

    it('should display informational message about direct password setting', async () => {
      const user = userEvent.setup();
      render(
        <UserEditModal
          user={mockUser}
          isOpen={true}
          onClose={mockOnClose}
          onRoleUpdate={mockOnRoleUpdate}
          onTierUpdate={mockOnTierUpdate}
          onEmailUpdate={mockOnEmailUpdate}
          onPasswordReset={mockOnPasswordReset}
          onPasswordSet={mockOnPasswordSet}
        />
      );

      const setPasswordButton = screen.getByRole('button', { name: /set new password/i });
      await user.click(setPasswordButton);

      expect(screen.getByText(/the password will be updated immediately without sending an email/i)).toBeInTheDocument();
    });
  });
});
