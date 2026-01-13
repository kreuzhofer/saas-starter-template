import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogout: () => void;
}

export function UserDropdown({ isOpen, onClose, isAdmin, onLogout }: UserDropdownProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      <div className="py-1">
        <Link
          to="/profile"
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          role="menuitem"
          onClick={onClose}
        >
          {t('nav.profile')}
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            role="menuitem"
            onClick={onClose}
          >
            {t('nav.admin')}
          </Link>
        )}
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          role="menuitem"
        >
          {t('nav.logout')}
        </button>
      </div>
    </div>
  );
}
