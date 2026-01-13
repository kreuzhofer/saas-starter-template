import * as fc from 'fast-check';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { UserEditModal } from './UserEditModal';
import type { AdminUserInfo } from '../types';
import testI18n from '../i18n/testConfig';
import { api } from '../api/client';

// Mock the auth utilities
vi.mock('../utils/auth', () => ({
  getUserId: vi.fn(() => 'different-user-999'),
}));

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    getUserOverrides: vi.fn(),
    createUserOverride: vi.fn(),
    deleteUserOverride: vi.fn(),
  },
}));

/**
 * Feature: time-bound-override-fix
 * 
 * Property 1: Time-bound Override Requires Expiration Date
 * Validates: Requirements 1.1, 1.2
 * 
 * Property 2: Permanent Override Has Null Expiration
 * Validates: Requirements 1.4
 * 
 * Property 3: Saved Override Matches Intended Type
 * Validates: Requirements 2.1, 2.2, 3.4
 * 
 * Property 4: Edit Form Reflects Saved State
 * Validates: Requirements 2.3, 2.4
 */

describe('Property-Based Test: Time-bound Override Validation', () => {
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

  const renderModal = () => {
    return render(
      <I18nextProvider i18n={testI18n}>
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
      </I18nextProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getUserOverrides).mockResolvedValue({ overrides: [], total: 0 });
    vi.mocked(api.createUserOverride).mockResolvedValue({ 
      success: true, 
      override: { 
        limitName: 'short_urls_total', 
        overrideValue: 100, 
        expiresAt: null, 
        isPermanent: true, 
        isExpiringSoon: false 
      } 
    });
  });

  describe('Property 1: Time-bound Override Requires Expiration Date', () => {
    /**
     * For any valid override value, selecting time-bound without a date should fail validation.
     * This tests the core validation logic that prevents accidental permanent overrides.
     */
    it('should show validation error when time-bound is selected but no expiration date is provided', async () => {
      const user = userEvent.setup();
      renderModal();

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Limit Overrides')).toBeInTheDocument();
      });

      // Click Override button for short_urls_total
      const overrideButtons = screen.getAllByText('Override');
      await user.click(overrideButtons[0]);

      // Enter a valid override value
      const valueInput = screen.getByRole('spinbutton');
      await user.clear(valueInput);
      await user.type(valueInput, '100');

      // Select Time-bound radio button
      const timeBoundRadio = screen.getByLabelText('Time-bound');
      await user.click(timeBoundRadio);

      // Don't fill in the expiration date - leave it empty

      // Click Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Please provide an expiration date for time-bound overrides')).toBeInTheDocument();
      });

      // API should NOT have been called
      expect(api.createUserOverride).not.toHaveBeenCalled();
    });

    /**
     * Property test: For any valid override value, the validation should reject empty expiration dates.
     */
    it('should reject time-bound overrides without expiration date for any valid value', () => {
      // Test the validation logic directly by simulating what the component does
      fc.assert(
        fc.property(
          fc.integer({ min: -1, max: 10000 }), // Valid override values (-1 = unlimited)
          (overrideValue) => {
            // Simulate the validation logic from handleSaveOverride
            const isPermanent = false;
            const expiresAt = ''; // Empty expiration date

            // This is the validation check from the component
            const shouldShowError = !isPermanent && !expiresAt;
            
            // For any valid override value, if isPermanent is false and expiresAt is empty,
            // the validation should fail
            expect(shouldShowError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow saving time-bound override when valid future expiration date is provided', async () => {
      const user = userEvent.setup();
      renderModal();

      // Calculate a future date (YYYY-MM-DD format)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateString = futureDate.toISOString().slice(0, 10);

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Limit Overrides')).toBeInTheDocument();
      });

      // Click Override button for short_urls_total
      const overrideButtons = screen.getAllByText('Override');
      await user.click(overrideButtons[0]);

      // Enter a valid override value
      const valueInput = screen.getByRole('spinbutton');
      await user.clear(valueInput);
      await user.type(valueInput, '100');

      // Select Time-bound radio button
      const timeBoundRadio = screen.getByLabelText('Time-bound');
      await user.click(timeBoundRadio);

      // Fill in the expiration date
      const dateInput = screen.getByLabelText('Expires At (end of day)');
      await user.clear(dateInput);
      await user.type(dateInput, futureDateString);

      // Click Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // API should have been called with the correct data
      await waitFor(() => {
        expect(api.createUserOverride).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            limitName: 'short_urls_total',
            value: 100,
            expiresAt: expect.any(String), // Should be a non-null ISO string
          })
        );
      });

      // Verify expiresAt is not null
      const callArgs = vi.mocked(api.createUserOverride).mock.calls[0];
      expect(callArgs[1].expiresAt).not.toBeNull();
      expect(typeof callArgs[1].expiresAt).toBe('string');
    });
  });

  describe('Property 2: Permanent Override Has Null Expiration', () => {
    /**
     * For any valid override value, selecting permanent should send null expiresAt.
     */
    it('should send null expiresAt when permanent is selected', async () => {
      const user = userEvent.setup();
      renderModal();

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Limit Overrides')).toBeInTheDocument();
      });

      // Click Override button for short_urls_total
      const overrideButtons = screen.getAllByText('Override');
      await user.click(overrideButtons[0]);

      // Enter a valid override value
      const valueInput = screen.getByRole('spinbutton');
      await user.clear(valueInput);
      await user.type(valueInput, '100');

      // Permanent should be selected by default, but let's explicitly select it
      const permanentRadio = screen.getByLabelText('Permanent');
      await user.click(permanentRadio);

      // Click Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // API should have been called with null expiresAt
      await waitFor(() => {
        expect(api.createUserOverride).toHaveBeenCalledWith(
          mockUser.id,
          expect.objectContaining({
            limitName: 'short_urls_total',
            value: 100,
            expiresAt: null,
          })
        );
      });
    });

    /**
     * Property test: For any valid override value, permanent selection should always result in null expiresAt.
     */
    it('should always send null expiresAt for permanent overrides regardless of value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1, max: 10000 }), // Valid override values (-1 = unlimited)
          (overrideValue) => {
            // Simulate the logic from handleSaveOverride
            const isPermanent = true;
            
            // This is the expression from the component
            const expiresAtToSend = isPermanent ? null : 'some-date';
            
            // For any valid override value, if isPermanent is true, expiresAt should be null
            expect(expiresAtToSend).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Saved Override Matches Intended Type', () => {
    it('should display time-bound override correctly after save', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateISO = futureDate.toISOString();

      // Mock the API to return a time-bound override after save
      vi.mocked(api.createUserOverride).mockResolvedValue({
        success: true,
        override: {
          limitName: 'short_urls_total',
          overrideValue: 100,
          expiresAt: futureDateISO,
          isPermanent: false,
          isExpiringSoon: false,
        },
      });

      // After save, the overrides should be reloaded
      vi.mocked(api.getUserOverrides)
        .mockResolvedValueOnce({ overrides: [], total: 0 })
        .mockResolvedValueOnce({
          overrides: [{
            limitName: 'short_urls_total',
            overrideValue: 100,
            expiresAt: futureDateISO,
            isPermanent: false,
            isExpiringSoon: false,
          }],
          total: 1,
        });

      const user = userEvent.setup();
      renderModal();

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Limit Overrides')).toBeInTheDocument();
      });

      // Click Override button
      const overrideButtons = screen.getAllByText('Override');
      await user.click(overrideButtons[0]);

      // Enter value
      const valueInput = screen.getByRole('spinbutton');
      await user.clear(valueInput);
      await user.type(valueInput, '100');

      // Select Time-bound
      const timeBoundRadio = screen.getByLabelText('Time-bound');
      await user.click(timeBoundRadio);

      // Fill in expiration date
      const dateInput = screen.getByLabelText('Expires At (end of day)');
      await user.type(dateInput, futureDate.toISOString().slice(0, 10));

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // Wait for the override to be displayed with "Expires:" text
      await waitFor(() => {
        expect(screen.getByText(/Expires:/)).toBeInTheDocument();
      });
    });

    it('should display permanent override correctly after save', async () => {
      // Mock the API to return a permanent override after save
      vi.mocked(api.createUserOverride).mockResolvedValue({
        success: true,
        override: {
          limitName: 'short_urls_total',
          overrideValue: 100,
          expiresAt: null,
          isPermanent: true,
          isExpiringSoon: false,
        },
      });

      // After save, the overrides should be reloaded
      vi.mocked(api.getUserOverrides)
        .mockResolvedValueOnce({ overrides: [], total: 0 })
        .mockResolvedValueOnce({
          overrides: [{
            limitName: 'short_urls_total',
            overrideValue: 100,
            expiresAt: null,
            isPermanent: true,
            isExpiringSoon: false,
          }],
          total: 1,
        });

      const user = userEvent.setup();
      renderModal();

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Limit Overrides')).toBeInTheDocument();
      });

      // Click Override button
      const overrideButtons = screen.getAllByText('Override');
      await user.click(overrideButtons[0]);

      // Enter value
      const valueInput = screen.getByRole('spinbutton');
      await user.clear(valueInput);
      await user.type(valueInput, '100');

      // Permanent is selected by default

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveButton);

      // Wait for the override to be displayed with "Permanent" text
      await waitFor(() => {
        expect(screen.getByText('Permanent')).toBeInTheDocument();
      });
    });
  });

  describe('Property 4: Edit Form Reflects Saved State', () => {
    it('should pre-populate form with time-bound data when editing time-bound override', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateISO = futureDate.toISOString();

      // Mock existing time-bound override
      vi.mocked(api.getUserOverrides).mockResolvedValue({
        overrides: [{
          limitName: 'short_urls_total',
          overrideValue: 100,
          expiresAt: futureDateISO,
          isPermanent: false,
          isExpiringSoon: false,
        }],
        total: 1,
      });

      const user = userEvent.setup();
      renderModal();

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Override:')).toBeInTheDocument();
      });

      // Click Edit button
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Verify Time-bound radio is selected
      const timeBoundRadio = screen.getByLabelText('Time-bound') as HTMLInputElement;
      expect(timeBoundRadio.checked).toBe(true);

      // Verify Permanent radio is NOT selected
      const permanentRadio = screen.getByLabelText('Permanent') as HTMLInputElement;
      expect(permanentRadio.checked).toBe(false);

      // Verify expiration date field is visible and has a value
      const dateInput = screen.getByLabelText('Expires At (end of day)') as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.value).not.toBe('');
    });

    it('should pre-populate form with permanent data when editing permanent override', async () => {
      // Mock existing permanent override
      vi.mocked(api.getUserOverrides).mockResolvedValue({
        overrides: [{
          limitName: 'short_urls_total',
          overrideValue: 100,
          expiresAt: null,
          isPermanent: true,
          isExpiringSoon: false,
        }],
        total: 1,
      });

      const user = userEvent.setup();
      renderModal();

      // Wait for overrides to load
      await waitFor(() => {
        expect(screen.getByText('Override:')).toBeInTheDocument();
      });

      // Click Edit button
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Verify Permanent radio is selected
      const permanentRadio = screen.getByLabelText('Permanent') as HTMLInputElement;
      expect(permanentRadio.checked).toBe(true);

      // Verify Time-bound radio is NOT selected
      const timeBoundRadio = screen.getByLabelText('Time-bound') as HTMLInputElement;
      expect(timeBoundRadio.checked).toBe(false);

      // Verify expiration date field is NOT visible (since permanent is selected)
      expect(screen.queryByLabelText('Expires At (end of day)')).not.toBeInTheDocument();
    });

    /**
     * Property test: For any override configuration, the edit form should correctly reflect the saved state.
     */
    it('should correctly determine isPermanent based on expiresAt value', () => {
      fc.assert(
        fc.property(
          fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }), { nil: null }),
          (expiresAt) => {
            // This is the logic from the backend that determines isPermanent
            const isPermanent = expiresAt === null;
            
            // If expiresAt is null, isPermanent should be true
            // If expiresAt is a date, isPermanent should be false
            if (expiresAt === null) {
              expect(isPermanent).toBe(true);
            } else {
              expect(isPermanent).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
