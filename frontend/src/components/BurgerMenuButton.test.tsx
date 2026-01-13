import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BurgerMenuButton } from './BurgerMenuButton';

describe('BurgerMenuButton', () => {
  it('renders hamburger icon when closed', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const button = screen.getByRole('button', { name: /open menu/i });
    expect(button).toBeInTheDocument();
  });

  it('renders X icon when open', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={true} onClick={onClick} />);
    
    const button = screen.getByRole('button', { name: /close menu/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label when closed', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Open menu');
  });

  it('has correct aria-label when open', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={true} onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Close menu');
  });

  it('has aria-expanded attribute set to false when closed', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded attribute set to true when open', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={true} onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('has aria-controls attribute', () => {
    const onClick = vi.fn();
    render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-controls', 'burger-menu');
  });

  it('renders three line elements for the icon', () => {
    const onClick = vi.fn();
    const { container } = render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const lines = container.querySelectorAll('span.bg-gray-700');
    expect(lines).toHaveLength(3);
  });

  it('applies transformation classes when open', () => {
    const onClick = vi.fn();
    const { container } = render(<BurgerMenuButton isOpen={true} onClick={onClick} />);
    
    const lines = container.querySelectorAll('span.bg-gray-700');
    
    // Top line should have rotation and translation
    expect(lines[0]).toHaveClass('rotate-45', 'translate-y-1.5');
    
    // Middle line should be hidden
    expect(lines[1]).toHaveClass('opacity-0');
    
    // Bottom line should have negative rotation and translation
    expect(lines[2]).toHaveClass('-rotate-45', '-translate-y-1.5');
  });

  it('does not apply transformation classes when closed', () => {
    const onClick = vi.fn();
    const { container } = render(<BurgerMenuButton isOpen={false} onClick={onClick} />);
    
    const lines = container.querySelectorAll('span.bg-gray-700');
    
    // Top line should not have transformation classes
    expect(lines[0]).not.toHaveClass('rotate-45');
    expect(lines[0]).not.toHaveClass('translate-y-1.5');
    
    // Middle line should be visible
    expect(lines[1]).toHaveClass('opacity-100');
    
    // Bottom line should not have transformation classes
    expect(lines[2]).not.toHaveClass('-rotate-45');
    expect(lines[2]).not.toHaveClass('-translate-y-1.5');
  });
});
