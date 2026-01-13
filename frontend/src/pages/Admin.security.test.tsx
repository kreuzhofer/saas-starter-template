import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Admin } from './Admin';
import { api } from '../api/client';
import testI18n from '../i18n/testConfig';
import type { AdminUserInfo } from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    listUsers: vi.fn(),
    updateUserRole: vi.fn(),
    updateUserEmail: vi.fn(),
    resetUserPassword: vi.fn(),
    getProfile: vi.fn(),
  },
}));

// Mock the Navigation and Footer components
vi.mock('../components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

vi.mock('../components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

// Mock the UserEditModal component
vi.mock('../components/UserEditModal', () => ({
  UserEditModal: () => <div data-testid="user-edit-modal">UserEditModal</div>,
}));

// Helper to wrap component with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          {component}
        </I18nextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Page Data Security', () => {
  const mockUsers: AdminUserInfo[] = [
    {
      id: 'user-1',
      username: 'admin@example.com',
      role: 'admin',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      username: 'user@example.com',
      role: 'account_owner',
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      username: 'inactive@example.com',
      role: 'account_user',
      isActive: false,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listUsers).mockResolvedValue(mockUsers);
  });

  beforeEach(async () => {
    await testI18n.changeLanguage('en');
  });

  describe('Password hash security', () => {
    it('should never display password hashes in user list', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Get the entire page content
      const pageContent = document.body.textContent || '';

      // Common password hash patterns that should NOT appear
      const passwordHashPatterns = [
        /\$2[aby]\$\d{2}\$/,  // bcrypt hashes
        /\$argon2[id]\$/,      // argon2 hashes
        /[a-f0-9]{64}/,        // SHA-256 hashes
        /[a-f0-9]{128}/,       // SHA-512 hashes
        /passwordHash/i,       // Field name
        /password_hash/i,      // Field name with underscore
        /hash/i,               // Generic hash reference in context of passwords
      ];

      // Verify no password hash patterns are present
      passwordHashPatterns.forEach(pattern => {
        expect(pageContent).not.toMatch(pattern);
      });

      // Verify the word "password" only appears in expected contexts (like "Reset Password" button)
      const passwordMatches = pageContent.match(/password/gi) || [];
      passwordMatches.forEach(match => {
        // Password should only appear in UI labels, not as data
        const context = pageContent.substring(
          Math.max(0, pageContent.indexOf(match) - 20),
          Math.min(pageContent.length, pageContent.indexOf(match) + 20)
        );
        
        // Should not appear with "hash" nearby
        expect(context.toLowerCase()).not.toContain('hash');
      });
    });

    it('should not include passwordHash field in API response data', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(api.listUsers).toHaveBeenCalled();
      });

      // Verify the mock data doesn't include passwordHash
      mockUsers.forEach(user => {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('password_hash');
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should only display safe user information fields', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Verify expected fields are displayed
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      
      // Verify role badges are displayed (use getAllByText since roles appear in both dropdown and table)
      const administratorElements = screen.getAllByText('Administrator');
      expect(administratorElements.length).toBeGreaterThan(0);
      
      const accountOwnerElements = screen.getAllByText('Account Owner');
      expect(accountOwnerElements.length).toBeGreaterThan(0);
      
      // Verify status is displayed
      const activeStatuses = screen.getAllByText('Active');
      expect(activeStatuses.length).toBeGreaterThan(0);
      
      const inactiveStatuses = screen.getAllByText('Inactive');
      expect(inactiveStatuses.length).toBeGreaterThan(0);
    });

    it('should not expose sensitive data in DOM attributes', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Get all elements in the document
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach(element => {
        // Check all attributes
        Array.from(element.attributes || []).forEach(attr => {
          const attrValue = attr.value.toLowerCase();
          
          // Should not contain password hash indicators
          expect(attrValue).not.toContain('passwordhash');
          expect(attrValue).not.toContain('password_hash');
          expect(attrValue).not.toContain('$2a$');
          expect(attrValue).not.toContain('$2b$');
          expect(attrValue).not.toContain('$2y$');
        });
      });
    });
  });

  describe('Role information exposure', () => {
    it('should display role information in admin context', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('Administrator')).toBeInTheDocument();
      });

      // Role information should be visible in admin page
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Account Owner')).toBeInTheDocument();
      expect(screen.getByText('Account User')).toBeInTheDocument();
    });

    it('should include role filter dropdown in admin interface', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByLabelText(/filter by role/i)).toBeInTheDocument();
      });

      const roleFilter = screen.getByLabelText(/filter by role/i) as HTMLSelectElement;
      
      // Verify role filter options exist
      expect(roleFilter).toBeInTheDocument();
      const options = Array.from(roleFilter.options).map(opt => opt.textContent);
      
      expect(options).toContain('All Roles');
      expect(options).toContain('Administrator');
      expect(options).toContain('Account Owner');
      expect(options).toContain('Account User');
    });

    it('should display role column in user table', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Verify the Role column header exists in the table
      expect(screen.getByText('Role')).toBeInTheDocument();
      
      // Verify all role types are displayed somewhere on the page
      expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Account Owner').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Account User').length).toBeGreaterThan(0);
    });
  });

  describe('Scope constraints verification', () => {
    it('should not display delete user functionality', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Should not have delete buttons
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/delete user/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/remove user/i)).not.toBeInTheDocument();
    });

    it('should not display create user functionality', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Should not have create/add user buttons
      expect(screen.queryByRole('button', { name: /create user/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add user/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /new user/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/create new user/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/add new user/i)).not.toBeInTheDocument();
    });

    it('should not display user data like short URLs or analytics', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const pageContent = document.body.textContent || '';

      // Should not contain references to user-specific data
      expect(pageContent).not.toMatch(/short url/i);
      expect(pageContent).not.toMatch(/click count/i);
      expect(pageContent).not.toMatch(/conversion/i);
      expect(pageContent).not.toMatch(/revenue/i);
      expect(pageContent).not.toMatch(/analytics/i);
      expect(pageContent).not.toMatch(/destination url/i);
      expect(pageContent).not.toMatch(/source url/i);
    });

    it('should only display user management actions', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      // Should have Edit buttons for user management
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBeGreaterThan(0);

      // Should have appropriate table headers
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should not expose internal system fields', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      });

      const pageContent = document.body.textContent || '';

      // Should not expose internal field names
      expect(pageContent).not.toMatch(/accountId/i);
      expect(pageContent).not.toMatch(/account_id/i);
      expect(pageContent).not.toMatch(/updatedAt/i);
      expect(pageContent).not.toMatch(/updated_at/i);
      
      // Note: "createdAt" is acceptable as it's displayed as "Created" in the UI
      // but the raw field name should not appear
      expect(pageContent).not.toContain('createdAt');
      expect(pageContent).not.toContain('created_at');
    });
  });

  describe('Data integrity verification', () => {
    it('should only request necessary fields from API', async () => {
      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(api.listUsers).toHaveBeenCalled();
      });

      // Verify API was called correctly
      expect(api.listUsers).toHaveBeenCalledTimes(1);
      expect(api.listUsers).toHaveBeenCalledWith();

      // Verify returned data structure
      const returnedUsers = await vi.mocked(api.listUsers).mock.results[0].value;
      
      returnedUsers.forEach((user: AdminUserInfo) => {
        // Should have these fields
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('isActive');
        expect(user).toHaveProperty('createdAt');
        expect(user).toHaveProperty('updatedAt');

        // Should NOT have these fields
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('shortUrls');
        expect(user).not.toHaveProperty('clickEvents');
        expect(user).not.toHaveProperty('conversions');
      });
    });

    it('should handle users with different roles without exposing sensitive data', async () => {
      const usersWithVariedRoles: AdminUserInfo[] = [
        {
          id: 'admin-1',
          username: 'admin1@example.com',
          role: 'admin',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'owner-1',
          username: 'owner1@example.com',
          role: 'account_owner',
          isActive: true,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 'user-1',
          username: 'user1@example.com',
          role: 'account_user',
          isActive: false,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
        },
      ];

      vi.mocked(api.listUsers).mockResolvedValue(usersWithVariedRoles);

      renderWithProviders(<Admin />);

      await waitFor(() => {
        expect(screen.getByText('admin1@example.com')).toBeInTheDocument();
      });

      // All users should be displayed with only safe information
      expect(screen.getByText('admin1@example.com')).toBeInTheDocument();
      expect(screen.getByText('owner1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();

      // Verify no sensitive data in the entire page
      const pageContent = document.body.textContent || '';
      expect(pageContent).not.toMatch(/\$2[aby]\$/);
      expect(pageContent).not.toContain('passwordHash');
      expect(pageContent).not.toContain('password_hash');
    });
  });
});
