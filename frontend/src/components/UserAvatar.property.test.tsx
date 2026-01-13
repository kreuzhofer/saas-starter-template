import * as fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getInitials, UserAvatar } from './UserAvatar';

/**
 * Feature: responsive-navigation-ui, Property 3: Initials extraction correctness
 * Validates: Requirements 3.1, 3.3, 3.4, 3.5
 * 
 * For any valid firstName and lastName pair, the initials should be exactly two 
 * uppercase characters: the first character of firstName followed by the first 
 * character of lastName.
 */

describe('Property-Based Test: Initials Extraction Correctness', () => {
  describe('Property 3: Initials extraction correctness', () => {
    it('should return exactly two uppercase characters for any non-empty firstName and lastName', () => {
      fc.assert(
        fc.property(
          // Generate non-empty strings with at least one non-whitespace character
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (firstName, lastName) => {
            const initials = getInitials(firstName, lastName);
            
            // Should return a string
            expect(initials).not.toBeNull();
            expect(typeof initials).toBe('string');
            
            // Should be exactly 2 characters
            expect(initials).toHaveLength(2);
            
            // Both characters should be uppercase
            expect(initials).toBe(initials!.toUpperCase());
            
            // First character should match first character of firstName (after trimming and taking first word)
            const firstWord = firstName.trim().split(/\s+/)[0];
            expect(initials![0]).toBe(firstWord[0].toUpperCase());
            
            // Second character should match first character of lastName (after trimming and taking first word)
            const lastWord = lastName.trim().split(/\s+/)[0];
            expect(initials![1]).toBe(lastWord[0].toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for any null or empty firstName', () => {
      fc.assert(
        fc.property(
          // Generate null, empty string, or whitespace-only strings
          fc.constantFrom(null, '', '   ', '\t', '\n', '  \t\n  '),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (firstName, lastName) => {
            const initials = getInitials(firstName, lastName);
            expect(initials).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for any null or empty lastName', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          // Generate null, empty string, or whitespace-only strings
          fc.constantFrom(null, '', '   ', '\t', '\n', '  \t\n  '),
          (firstName, lastName) => {
            const initials = getInitials(firstName, lastName);
            expect(initials).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multi-word names by using only the first word', () => {
      fc.assert(
        fc.property(
          // Generate names with multiple words
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 2, maxLength: 5 }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 2, maxLength: 5 }),
          (firstNameWords, lastNameWords) => {
            const firstName = firstNameWords.join(' ');
            const lastName = lastNameWords.join(' ');
            
            const initials = getInitials(firstName, lastName);
            
            expect(initials).not.toBeNull();
            expect(initials).toHaveLength(2);
            
            // Should use first word only
            const firstWord = firstNameWords[0].trim();
            const lastWord = lastNameWords[0].trim();
            
            expect(initials![0]).toBe(firstWord[0].toUpperCase());
            expect(initials![1]).toBe(lastWord[0].toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle names with leading/trailing whitespace', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n   '),
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n   '),
          (firstName, lastName, leadingWhitespace, trailingWhitespace) => {
            const paddedFirstName = leadingWhitespace + firstName + trailingWhitespace;
            const paddedLastName = leadingWhitespace + lastName + trailingWhitespace;
            
            const initials = getInitials(paddedFirstName, paddedLastName);
            
            expect(initials).not.toBeNull();
            expect(initials).toHaveLength(2);
            
            // Should produce same result as trimmed names
            const trimmedInitials = getInitials(firstName.trim(), lastName.trim());
            expect(initials).toBe(trimmedInitials);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always convert to uppercase regardless of input case', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (firstName, lastName) => {
            // Test with various case combinations
            const lowerInitials = getInitials(firstName.toLowerCase(), lastName.toLowerCase());
            const upperInitials = getInitials(firstName.toUpperCase(), lastName.toUpperCase());
            const mixedInitials = getInitials(firstName, lastName);
            
            // All should produce the same uppercase result
            expect(lowerInitials).not.toBeNull();
            expect(upperInitials).not.toBeNull();
            expect(mixedInitials).not.toBeNull();
            
            expect(lowerInitials).toBe(upperInitials);
            expect(lowerInitials).toBe(mixedInitials);
            
            // All should be uppercase
            expect(lowerInitials).toBe(lowerInitials!.toUpperCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - calling multiple times with same input produces same result', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (firstName, lastName) => {
            const result1 = getInitials(firstName, lastName);
            const result2 = getInitials(firstName, lastName);
            const result3 = getInitials(firstName, lastName);
            
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters and unicode correctly', () => {
      // Test with specific unicode examples
      const unicodeNames = [
        ['Ñoño', 'Álvarez'],
        ['Øyvind', 'Åse'],
        ['José', 'García'],
        ['François', 'Müller'],
        ['Владимир', 'Петров'],
        ['李', '明'],
        ['محمد', 'علي'],
      ];

      unicodeNames.forEach(([firstName, lastName]) => {
        const initials = getInitials(firstName, lastName);
        
        expect(initials).not.toBeNull();
        expect(initials).toHaveLength(2);
        
        // Should extract first character from each name
        const firstWord = firstName.trim().split(/\s+/)[0];
        const lastWord = lastName.trim().split(/\s+/)[0];
        
        expect(initials![0]).toBe(firstWord[0].toUpperCase());
        expect(initials![1]).toBe(lastWord[0].toUpperCase());
      });
    });
  });
});

/**
 * Feature: responsive-navigation-ui, Property 2: User avatar display logic
 * Validates: Requirements 3.1, 4.1, 4.2
 * 
 * For any user profile data, the UserAvatar should display initials if and only if 
 * both firstName and lastName are non-empty strings, otherwise it should display 
 * the meeple icon.
 */

describe('Property-Based Test: Avatar Display Logic', () => {
  describe('Property 2: User avatar display logic', () => {
    it('should display initials if and only if both names are non-empty', () => {
      fc.assert(
        fc.property(
          // Generate combinations of null, empty, whitespace, and valid strings
          fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.constant('   '),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          (firstName, lastName) => {
            const onClick = vi.fn();
            const { container, unmount } = render(
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            const hasInitials = firstName && firstName.trim().length > 0 && 
                               lastName && lastName.trim().length > 0;

            if (hasInitials) {
              // Should display initials (text content)
              const initials = getInitials(firstName, lastName);
              expect(screen.queryByText(initials!)).toBeInTheDocument();
              
              // Should NOT display MeepleIcon (SVG)
              const svg = container.querySelector('svg');
              expect(svg).not.toBeInTheDocument();
            } else {
              // Should display MeepleIcon (SVG)
              const svg = container.querySelector('svg');
              expect(svg).toBeInTheDocument();
              
              // Should NOT display initials text
              const button = screen.getByRole('button');
              const textContent = button.textContent;
              // Text content should be empty or just whitespace (no initials)
              expect(textContent?.trim()).toBe('');
            }

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always display exactly one visual element (initials OR icon)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          (firstName, lastName) => {
            const onClick = vi.fn();
            const { container, unmount } = render(
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            const svg = container.querySelector('svg');
            const button = screen.getByRole('button');
            const hasTextContent = button.textContent && button.textContent.trim().length > 0;

            // Should have exactly one: either SVG or text content, never both, never neither
            const hasSvg = svg !== null;
            const hasText = hasTextContent === true;

            // XOR: exactly one should be true
            expect(hasSvg !== hasText).toBe(true);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic - same inputs always produce same display', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          fc.oneof(
            fc.constant(null),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ),
          (firstName, lastName) => {
            const onClick = vi.fn();
            
            // Render first time
            const { container: container1, unmount: unmount1 } = render(
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            const hasSvg1 = container1.querySelector('svg') !== null;
            const button1 = screen.getAllByRole('button')[0];
            const hasText1 = button1.textContent && button1.textContent.trim().length > 0;

            unmount1();

            // Render second time with same inputs
            const { container: container2, unmount: unmount2 } = render(
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            const hasSvg2 = container2.querySelector('svg') !== null;
            const button2 = screen.getByRole('button');
            const hasText2 = button2.textContent && button2.textContent.trim().length > 0;

            // Should produce same result
            expect(hasSvg1).toBe(hasSvg2);
            expect(hasText1).toBe(hasText2);

            unmount2();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should transition between initials and icon when names change', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (firstName, lastName) => {
            const onClick = vi.fn();
            
            // Start with valid names (should show initials)
            const { container, rerender, unmount } = render(
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            // Should show initials
            let svg = container.querySelector('svg');
            expect(svg).not.toBeInTheDocument();
            
            const initials = getInitials(firstName, lastName);
            expect(screen.queryByText(initials!)).toBeInTheDocument();

            // Change to null names (should show icon)
            rerender(
              <UserAvatar
                firstName={null}
                lastName={null}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            // Should now show icon
            svg = container.querySelector('svg');
            expect(svg).toBeInTheDocument();
            expect(screen.queryByText(initials!)).not.toBeInTheDocument();

            // Change back to valid names (should show initials again)
            rerender(
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                onClick={onClick}
                isMenuOpen={false}
              />
            );

            // Should show initials again
            svg = container.querySelector('svg');
            expect(svg).not.toBeInTheDocument();
            expect(screen.queryByText(initials!)).toBeInTheDocument();

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
