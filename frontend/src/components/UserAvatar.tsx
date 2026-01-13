import React from 'react';

interface UserAvatarProps {
  firstName: string | null;
  lastName: string | null;
  onClick: () => void;
  isMenuOpen: boolean;
}

/**
 * Extract initials from first and last name
 * Returns null if either name is missing or empty
 * For multi-word names, uses only the first word
 */
export function getInitials(firstName: string | null, lastName: string | null): string | null {
  // Check if both names are provided and non-empty after trimming
  if (!firstName || !lastName) return null;
  
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  
  if (!trimmedFirst || !trimmedLast) return null;
  
  // Extract first word from each name (in case of multi-word names)
  const firstWord = trimmedFirst.split(/\s+/)[0];
  const lastWord = trimmedLast.split(/\s+/)[0];
  
  // Get first character and convert to uppercase
  const firstInitial = firstWord[0]?.toUpperCase() || '';
  const lastInitial = lastWord[0]?.toUpperCase() || '';
  
  // Return initials only if both are present
  return firstInitial && lastInitial ? `${firstInitial}${lastInitial}` : null;
}

/**
 * UserAvatar - Displays user initials or a placeholder icon
 * 
 * Shows user initials when both firstName and lastName are available,
 * otherwise displays a user icon placeholder.
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  firstName,
  lastName,
  onClick,
  isMenuOpen,
}) => {
  const initials = getInitials(firstName, lastName);

  return (
    <button
      onClick={onClick}
      className={`
        w-10 h-10 rounded-full flex items-center justify-center
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isMenuOpen 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }
      `}
      aria-label="User menu"
      aria-expanded={isMenuOpen}
      aria-haspopup="true"
      type="button"
    >
      {initials ? (
        <span className="text-sm font-semibold" aria-label={`User initials: ${initials}`}>
          {initials}
        </span>
      ) : (
        <svg 
          className="w-6 h-6" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};
