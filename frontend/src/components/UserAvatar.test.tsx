import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserAvatar, getInitials } from './UserAvatar';

describe('UserAvatar', () => {
  describe('getInitials function', () => {
    it('should return initials for valid first and last names', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
      expect(getInitials('jane', 'smith')).toBe('JS');
      expect(getInitials('Alice', 'wonderland')).toBe('AW');
    });

    it('should return null when firstName is null', () => {
      expect(getInitials(null, 'Doe')).toBe(null);
    });

    it('should return null when lastName is null', () => {
      expect(getInitials('John', null)).toBe(null);
    });

    it('should return null when both names are null', () => {
      expect(getInitials(null, null)).toBe(null);
    });

    it('should return null when firstName is empty string', () => {
      expect(getInitials('', 'Doe')).toBe(null);
    });

    it('should return null when lastName is empty string', () => {
      expect(getInitials('John', '')).toBe(null);
    });

    it('should return null when firstName is only whitespace', () => {
      expect(getInitials('   ', 'Doe')).toBe(null);
      expect(getInitials('\t\n', 'Doe')).toBe(null);
    });

    it('should return null when lastName is only whitespace', () => {
      expect(getInitials('John', '   ')).toBe(null);
      expect(getInitials('John', '\t\n')).toBe(null);
    });

    it('should handle multi-word first names by using first word only', () => {
      expect(getInitials('Mary Jane', 'Watson')).toBe('MW');
      expect(getInitials('Jean-Luc', 'Picard')).toBe('JP');
    });

    it('should handle multi-word last names by using first word only', () => {
      expect(getInitials('John', 'von Neumann')).toBe('JV');
      expect(getInitials('Mary', 'de la Cruz')).toBe('MD');
    });

    it('should handle names with leading/trailing whitespace', () => {
      expect(getInitials('  John  ', '  Doe  ')).toBe('JD');
    });

    it('should handle special characters by taking first character', () => {
      expect(getInitials('Ñoño', 'Álvarez')).toBe('ÑÁ');
      expect(getInitials('Øyvind', 'Åse')).toBe('ØÅ');
    });

    it('should convert initials to uppercase', () => {
      expect(getInitials('john', 'doe')).toBe('JD');
      expect(getInitials('JOHN', 'DOE')).toBe('JD');
      expect(getInitials('JoHn', 'DoE')).toBe('JD');
    });
  });

  describe('Component rendering with initials', () => {
    it('should display initials when both names are provided', () => {
      const onClick = vi.fn();
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should not display MeepleIcon when initials are shown', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      // MeepleIcon renders an SVG, check it's not present
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('Component rendering with MeepleIcon', () => {
    it('should display MeepleIcon when firstName is null', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName={null}
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display MeepleIcon when lastName is null', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName="John"
          lastName={null}
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display MeepleIcon when both names are null', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName={null}
          lastName={null}
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display MeepleIcon when firstName is empty string', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName=""
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display MeepleIcon when lastName is empty string', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName="John"
          lastName=""
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display MeepleIcon when firstName is only whitespace', () => {
      const onClick = vi.fn();
      const { container } = render(
        <UserAvatar
          firstName="   "
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Click handler', () => {
    it('should call onClick when avatar is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when avatar with MeepleIcon is clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      
      render(
        <UserAvatar
          firstName={null}
          lastName={null}
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const onClick = vi.fn();
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      expect(button).toHaveAttribute('aria-label', 'User menu');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should update aria-expanded when menu is open', () => {
      const onClick = vi.fn();
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={true}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      
      // Tab to focus the button
      await user.tab();
      expect(button).toHaveFocus();
      
      // Press Enter to activate
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual state', () => {
    it('should apply different styles when menu is closed', () => {
      const onClick = vi.fn();
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={false}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      expect(button).toHaveClass('bg-gray-200');
      expect(button).toHaveClass('text-gray-700');
    });

    it('should apply different styles when menu is open', () => {
      const onClick = vi.fn();
      render(
        <UserAvatar
          firstName="John"
          lastName="Doe"
          onClick={onClick}
          isMenuOpen={true}
        />
      );

      const button = screen.getByRole('button', { name: /user menu/i });
      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('text-white');
    });
  });
});
