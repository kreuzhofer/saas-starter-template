import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';

interface BurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export function BurgerMenu({ isOpen, onClose, isAdmin }: BurgerMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle outside click detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle link clicks - navigate and close menu
  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Slide-out menu */}
      <div
        ref={menuRef}
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="menu"
        aria-label="Mobile navigation menu"
        aria-hidden={!isOpen}
      >
        <nav className="flex flex-col h-full py-6">
          {/* Navigation links */}
          <div className="flex flex-col space-y-1 px-4">
            <Link
              to="/dashboard"
              onClick={handleLinkClick}
              className="px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              role="menuitem"
            >
              {t('nav.dashboard')}
            </Link>
            <Link
              to="/analytics"
              onClick={handleLinkClick}
              className="px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              role="menuitem"
            >
              {t('nav.analytics')}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={handleLinkClick}
                className="px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                role="menuitem"
              >
                {t('nav.admin')}
              </Link>
            )}
            <Link
              to="/profile"
              onClick={handleLinkClick}
              className="px-4 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              role="menuitem"
            >
              {t('nav.profile')}
            </Link>
          </div>

          {/* Language selector */}
          <div className="mt-6 px-4 border-t border-gray-200 pt-6">
            <LanguageSelector className="w-full" />
          </div>
        </nav>
      </div>
    </>
  );
}
