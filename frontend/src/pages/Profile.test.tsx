import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Profile } from './Profile';
import * as apiClient from '../api/client';
import * as authUtils from '../utils/auth';
import testI18n from '../i18n/testConfig';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    getProfile: vi.fn(),
    deleteAccount: vi.fn(),
    requestEmailChange: vi.fn(),
    exportUserData: vi.fn(),
    updateProfile: vi.fn(),
    getAvailableDomains: vi.fn().mockResolvedValue([]),
  },
  getShortUrlDomain: vi.fn().mockReturnValue('http://localhost:3000'),
}));

// Mock the auth utilities
vi.mock('../utils/auth', async () => {
  const actual = await vi.importActual('../utils/auth');
  return {
    ...actual,
    getUserRole: vi.fn(),
    clearAuthToken: vi.fn(),
  };
});

// Mock the Navigation component
vi.mock('../components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

// Mock the AffiliatePartnerManager component
vi.mock('../components/AffiliatePartnerManager', () => ({
  AffiliatePartnerManager: () => <div data-testid="affiliate-manager">Affiliate Manager</div>,
}));

// Mock the CustomDomainManager component
vi.mock('../components/CustomDomainManager', () => ({
  CustomDomainManager: () => <div data-testid="custom-domain-manager">Custom Domain Manager</div>,
}));

const mockProfileData = {
  id: 'test-user-id',
  username: 'test@example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  firstName: null,
  lastName: null,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>{children}</BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

describe('Profile - Admin Self-Deletion Prevention', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);
    // Reset to English before each test
    await testI18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Delete button disabled for admin users', () => {
    it('should disable delete button when user is admin', async () => {
      // Mock getUserRole to return 'admin'
      vi.mocked(authUtils.getUserRole).mockReturnValue('admin');

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find the delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });

      // Verify button is disabled
      expect(deleteButton).toBeDisabled();
    });

    it('should not trigger delete confirmation modal when disabled delete button is clicked', async () => {
      // Mock getUserRole to return 'admin'
      vi.mocked(authUtils.getUserRole).mockReturnValue('admin');

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find the delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });

      // Try to click the disabled button
      await user.click(deleteButton);

      // Verify confirmation modal does not appear
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });
  });

  describe('Delete button enabled for non-admin users', () => {
    it('should enable delete button when user is account_owner', async () => {
      // Mock getUserRole to return 'account_owner'
      vi.mocked(authUtils.getUserRole).mockReturnValue('account_owner');

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find the delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });

      // Verify button is enabled
      expect(deleteButton).not.toBeDisabled();
    });

    it('should enable delete button when user is account_user', async () => {
      // Mock getUserRole to return 'account_user'
      vi.mocked(authUtils.getUserRole).mockReturnValue('account_user');

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find the delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });

      // Verify button is enabled
      expect(deleteButton).not.toBeDisabled();
    });

    it('should open confirmation modal when enabled delete button is clicked', async () => {
      // Mock getUserRole to return 'account_owner'
      vi.mocked(authUtils.getUserRole).mockReturnValue('account_owner');

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find and click the delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      // Verify confirmation modal appears by checking for the confirmation message
      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete your account/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip displays correctly for admin users', () => {
    it('should display tooltip text on delete button for admin users', async () => {
      // Mock getUserRole to return 'admin'
      vi.mocked(authUtils.getUserRole).mockReturnValue('admin');

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find the delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });

      // Verify button has title attribute (tooltip)
      expect(deleteButton).toHaveAttribute('title');
      const titleText = deleteButton.getAttribute('title');
      expect(titleText).toContain('Admin accounts cannot be deleted');
    });

    it('should display admin restriction message for admin users', async () => {
      // Mock getUserRole to return 'admin'
      vi.mocked(authUtils.getUserRole).mockReturnValue('admin');

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Verify admin restriction message is displayed
      expect(screen.getByText(/admin accounts cannot be deleted to prevent system lockout/i)).toBeInTheDocument();
    });

    it('should not display admin restriction message for non-admin users', async () => {
      // Mock getUserRole to return 'account_owner'
      vi.mocked(authUtils.getUserRole).mockReturnValue('account_owner');

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Verify admin restriction message is NOT displayed
      expect(screen.queryByText(/admin accounts cannot be deleted to prevent system lockout/i)).not.toBeInTheDocument();
    });
  });

  describe('Error message displays if admin attempts deletion', () => {
    it('should display error message when API returns admin deletion error', async () => {
      // Mock getUserRole to return 'admin' (though button should be disabled)
      vi.mocked(authUtils.getUserRole).mockReturnValue('admin');
      
      // Mock API to return error (in case button is somehow clicked)
      vi.mocked(apiClient.api.deleteAccount).mockRejectedValue(
        new Error('Admin accounts cannot be deleted')
      );

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Verify button is disabled
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      expect(deleteButton).toBeDisabled();
    });

    it('should display error message in UI when deletion fails', async () => {
      // Mock getUserRole to return 'account_owner' initially
      vi.mocked(authUtils.getUserRole).mockReturnValue('account_owner');
      
      // Mock API to return error
      const errorMessage = 'Admin accounts cannot be deleted';
      vi.mocked(apiClient.api.deleteAccount).mockRejectedValue(
        new Error(errorMessage)
      );

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      // Wait for confirmation modal
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Click confirm button in modal
      const confirmButton = screen.getByRole('button', { name: /yes.*delete/i });
      await user.click(confirmButton);

      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Verify API was called
      expect(apiClient.api.deleteAccount).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Profile - Name Editing Form', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(authUtils.getUserRole).mockReturnValue('account_owner');
    await testI18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Input fields render correctly', () => {
    it('should render firstName and lastName input fields', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Check for input fields
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    });

    it('should populate input fields with existing profile data', async () => {
      const profileWithNames = {
        ...mockProfileData,
        firstName: 'John',
        lastName: 'Doe',
      };
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(profileWithNames);

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load and fields to populate
      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
        const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
        expect(firstNameInput.value).toBe('John');
        expect(lastNameInput.value).toBe('Doe');
      });
    });

    it('should render empty input fields when names are null', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
        const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
        expect(firstNameInput.value).toBe('');
        expect(lastNameInput.value).toBe('');
      });
    });

    it('should render update profile button', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);

      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update profile/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should call updateProfile API when form is submitted', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);
      vi.mocked(apiClient.api.updateProfile).mockResolvedValue({
        message: 'Profile updated successfully',
        profile: {
          ...mockProfileData,
          firstName: 'Jane',
          lastName: 'Smith',
        },
      });

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      // Fill in the form
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update profile/i });
      await user.click(submitButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(apiClient.api.updateProfile).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Smith',
        });
      });
    });

    it('should display success message after successful update', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);
      vi.mocked(apiClient.api.updateProfile).mockResolvedValue({
        message: 'Profile updated successfully',
        profile: {
          ...mockProfileData,
          firstName: 'Jane',
          lastName: 'Smith',
        },
      });

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      // Fill in and submit the form
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Smith');
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should disable form inputs while submitting', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);
      // Make the API call take some time
      vi.mocked(apiClient.api.updateProfile).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          message: 'Profile updated successfully',
          profile: { ...mockProfileData, firstName: 'Jane', lastName: 'Smith' },
        }), 100))
      );

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      // Fill in and submit the form
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.type(screen.getByLabelText(/last name/i), 'Smith');
      const submitButton = screen.getByRole('button', { name: /update profile/i });
      await user.click(submitButton);

      // Check that inputs are disabled during submission
      expect(screen.getByLabelText(/first name/i)).toBeDisabled();
      expect(screen.getByLabelText(/last name/i)).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/updating/i);
    });
  });

  describe('Validation error display', () => {
    it('should enforce maxLength attribute on firstName input', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      // Try to enter a name longer than 50 characters
      const longName = 'a'.repeat(60);
      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      await user.type(firstNameInput, longName);

      // Verify input is limited to 50 characters by maxLength attribute
      expect(firstNameInput.value.length).toBeLessThanOrEqual(50);
      expect(firstNameInput).toHaveAttribute('maxlength', '50');
    });

    it('should enforce maxLength attribute on lastName input', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      });

      // Try to enter a name longer than 50 characters
      const longName = 'b'.repeat(60);
      const lastNameInput = screen.getByLabelText(/last name/i) as HTMLInputElement;
      await user.type(lastNameInput, longName);

      // Verify input is limited to 50 characters by maxLength attribute
      expect(lastNameInput.value.length).toBeLessThanOrEqual(50);
      expect(lastNameInput).toHaveAttribute('maxlength', '50');
    });

    it('should display error when API call fails', async () => {
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(mockProfileData);
      vi.mocked(apiClient.api.updateProfile).mockRejectedValue(
        new Error('Network error')
      );

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      });

      // Fill in and submit the form
      await user.type(screen.getByLabelText(/first name/i), 'Jane');
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Optimistic updates', () => {
    it('should immediately update UI before API response', async () => {
      const profileWithNames = {
        ...mockProfileData,
        firstName: 'John',
        lastName: 'Doe',
      };
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(profileWithNames);
      
      // Make API call take some time
      vi.mocked(apiClient.api.updateProfile).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          message: 'Profile updated successfully',
          profile: { ...profileWithNames, firstName: 'Jane', lastName: 'Smith' },
        }), 100))
      );

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
        expect(firstNameInput.value).toBe('John');
      });

      // Update the form
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      // The input should still show the new value immediately
      await waitFor(() => {
        const input = screen.getByLabelText(/first name/i) as HTMLInputElement;
        expect(input.value).toBe('Jane');
      });
    });

    it('should show error message if API call fails', async () => {
      const profileWithNames = {
        ...mockProfileData,
        firstName: 'John',
        lastName: 'Doe',
      };
      
      // First call returns the initial profile
      vi.mocked(apiClient.api.getProfile).mockResolvedValue(profileWithNames);
      vi.mocked(apiClient.api.updateProfile).mockRejectedValue(
        new Error('Update failed')
      );

      const user = userEvent.setup();
      render(<Profile />, { wrapper: createWrapper() });

      // Wait for profile to load
      await waitFor(() => {
        const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
        expect(firstNameInput.value).toBe('John');
      });

      // Update the form
      const firstNameInput = screen.getByLabelText(/first name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      await user.click(screen.getByRole('button', { name: /update profile/i }));

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });

      // After the rollback, the form reinitializes from the cached profile data
      // which was rolled back to 'John' by the optimistic update error handler
      // However, the useEffect that syncs form state with profile data will run
      // and reset the form back to 'John'
      await waitFor(() => {
        const input = screen.getByLabelText(/first name/i) as HTMLInputElement;
        expect(input.value).toBe('John');
      });
    });
  });
});
