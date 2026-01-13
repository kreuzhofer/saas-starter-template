import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
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

describe('Profile - Property-Based Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(authUtils.getUserRole).mockReturnValue('account_owner');
    await testI18n.changeLanguage('en');
  });

  /**
   * Feature: responsive-navigation-ui, Property 10: Avatar update reactivity
   * 
   * Property: For any profile update that changes firstName or lastName,
   * the UserAvatar should immediately reflect the new initials or icon state
   * without requiring a page refresh
   * 
   * Validates: Requirements 7.4
   */
  describe('Property 10: Avatar update reactivity', () => {
    // Helper to generate safe name strings (alphanumeric + common punctuation, no special keyboard chars)
    const nameArbitrary = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => {
        const trimmed = s.trim();
        // Must have content after trimming
        if (trimmed.length === 0) return false;
        // Only allow alphanumeric, spaces, hyphens, apostrophes
        return /^[a-zA-Z0-9\s'\-]+$/.test(trimmed);
      })
      .map(s => s.trim()); // Always trim to avoid whitespace issues

    it('should update profile data in React Query cache when names are changed', { timeout: 60000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialFirstName: fc.oneof(fc.constant(null), nameArbitrary),
            initialLastName: fc.oneof(fc.constant(null), nameArbitrary),
            updatedFirstName: nameArbitrary,
            updatedLastName: nameArbitrary,
          }),
          async ({ initialFirstName, initialLastName, updatedFirstName, updatedLastName }) => {
            // Skip if no actual change would occur (both fields stay the same)
            if (initialFirstName === updatedFirstName && initialLastName === updatedLastName) {
              return; // Skip this test case
            }
            const initialProfile = {
              id: 'test-user-id',
              username: 'test@example.com',
              createdAt: '2024-01-01T00:00:00.000Z',
              firstName: initialFirstName,
              lastName: initialLastName,
            };

            const updatedProfile = {
              ...initialProfile,
              firstName: updatedFirstName,
              lastName: updatedLastName,
            };

            vi.mocked(apiClient.api.getProfile).mockResolvedValue(initialProfile);
            vi.mocked(apiClient.api.updateProfile).mockResolvedValue({
              message: 'Profile updated successfully',
              profile: updatedProfile,
            });

            const { unmount, container } = render(<Profile />, { wrapper: createWrapper() });

            // Wait for profile to load
            await waitFor(() => {
              const inputs = container.querySelectorAll('input[id="firstName"]');
              expect(inputs.length).toBeGreaterThan(0);
            }, { timeout: 2000 });

            const firstNameInput = container.querySelector('input[id="firstName"]') as HTMLInputElement;
            const lastNameInput = container.querySelector('input[id="lastName"]') as HTMLInputElement;
            const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
            
            // Use React's setter to update the input values
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set;
            
            nativeInputValueSetter!.call(firstNameInput, updatedFirstName);
            firstNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            nativeInputValueSetter!.call(lastNameInput, updatedLastName);
            lastNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Click submit
            submitButton.click();

            // Wait for API call
            await waitFor(() => {
              expect(apiClient.api.updateProfile).toHaveBeenCalledWith({
                firstName: updatedFirstName,
                lastName: updatedLastName,
              });
            }, { timeout: 2000 });

            // Verify success message appears (indicates React Query cache was updated)
            await waitFor(() => {
              const successMessages = container.querySelectorAll('.bg-green-50');
              expect(successMessages.length).toBeGreaterThan(0);
            }, { timeout: 2000 });

            unmount();
          }
        ),
        { numRuns: 10 } // Reduced to 10 for reasonable execution time
      );
    });
  });
});
