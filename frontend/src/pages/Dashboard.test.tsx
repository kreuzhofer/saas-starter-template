import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { Dashboard } from './Dashboard';
import testI18n from '../i18n/testConfig';

// Mock the Navigation component
vi.mock('../components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

// Mock the Footer component
vi.mock('../components/Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={testI18n}>
      <BrowserRouter>{children}</BrowserRouter>
    </I18nextProvider>
  );
};

describe('Dashboard', () => {
  describe('Basic rendering', () => {
    it('should render the Dashboard page', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Check for main heading
      expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
    });

    it('should render Navigation component', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
    });

    it('should render Footer component', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render welcome message', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/welcome to your saas application dashboard/i)).toBeInTheDocument();
    });
  });

  describe('Placeholder cards', () => {
    it('should render Getting Started card', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/getting started/i)).toBeInTheDocument();
      expect(screen.getByText(/this is a placeholder card/i)).toBeInTheDocument();
    });

    it('should render Your Data card', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/your data/i)).toBeInTheDocument();
      expect(screen.getByText(/add components here to display user-specific data/i)).toBeInTheDocument();
    });

    it('should render Quick Actions card', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
      expect(screen.getByText(/add buttons and forms for common user actions/i)).toBeInTheDocument();
    });

    it('should render all three placeholder cards', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Check that we have all three card titles
      expect(screen.getByText(/getting started/i)).toBeInTheDocument();
      expect(screen.getByText(/your data/i)).toBeInTheDocument();
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });
  });

  describe('Developer note', () => {
    it('should render developer note section', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/developer note/i)).toBeInTheDocument();
    });

    it('should display template customization message', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/this is a placeholder dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/customize this page to build your application's main interface/i)).toBeInTheDocument();
    });

    it('should list included features', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      expect(screen.getByText(/included features/i)).toBeInTheDocument();
      expect(screen.getByText(/email-based authentication with jwt tokens/i)).toBeInTheDocument();
      expect(screen.getByText(/user profile management and account settings/i)).toBeInTheDocument();
      expect(screen.getByText(/admin panel for user and system management/i)).toBeInTheDocument();
      expect(screen.getByText(/tier-based subscription system with limits/i)).toBeInTheDocument();
      expect(screen.getByText(/banner and toast notification system/i)).toBeInTheDocument();
      expect(screen.getByText(/internationalization \(english and german\)/i)).toBeInTheDocument();
      expect(screen.getByText(/background task scheduler framework/i)).toBeInTheDocument();
    });
  });

  describe('Layout structure', () => {
    it('should have proper semantic HTML structure', () => {
      render(<Dashboard />, { wrapper: createWrapper() });
      
      // Check for main element
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      
      // Check for heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should apply responsive grid layout classes', () => {
      const { container } = render(<Dashboard />, { wrapper: createWrapper() });
      
      // Check for grid container with responsive classes
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });
});
