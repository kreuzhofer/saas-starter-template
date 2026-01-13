import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { clearAuthToken, getUserRole } from '../utils/auth';
import { LanguageSelector } from './LanguageSelector';
import { BurgerMenuButton } from './BurgerMenuButton';
import { BurgerMenu } from './BurgerMenu';
import { UserAvatar } from './UserAvatar';
import { UserDropdown } from './UserDropdown';
import * as api from '../api/client';

export function Navigation() {
  const { t } = useTranslation();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Fetch user profile data
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleLogout = () => {
    clearAuthToken();
    window.location.href = '/';
  };

  const toggleBurgerMenu = () => {
    setIsBurgerMenuOpen(!isBurgerMenuOpen);
  };

  const closeBurgerMenu = () => {
    setIsBurgerMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const closeUserMenu = () => {
    setIsUserMenuOpen(false);
  };

  // Close all menus on viewport resize
  useEffect(() => {
    function handleResize() {
      setIsBurgerMenuOpen(false);
      setIsUserMenuOpen(false);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation support
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isBurgerMenuOpen) {
          setIsBurgerMenuOpen(false);
        }
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isBurgerMenuOpen, isUserMenuOpen]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Burger menu (mobile) and App name */}
          <div className="flex items-center gap-4">
            {/* Burger menu button - mobile only */}
            <div className="md:hidden">
              <BurgerMenuButton
                isOpen={isBurgerMenuOpen}
                onClick={toggleBurgerMenu}
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('app.name')}</h1>
          </div>

          {/* Center: Navigation links - desktop only */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {t('nav.dashboard')}
            </Link>
            <Link
              to="/analytics"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {t('nav.analytics')}
            </Link>
          </div>

          {/* Right side: Language selector (desktop) and User avatar */}
          <div className="flex items-center gap-4">
            {/* Language selector - desktop only */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            
            {/* User avatar - always visible */}
            <div className="relative">
              <UserAvatar
                firstName={profile?.firstName || null}
                lastName={profile?.lastName || null}
                onClick={toggleUserMenu}
                isMenuOpen={isUserMenuOpen}
              />
              <UserDropdown
                isOpen={isUserMenuOpen}
                onClose={closeUserMenu}
                isAdmin={isAdmin}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Burger menu - mobile only */}
      <BurgerMenu
        isOpen={isBurgerMenuOpen}
        onClose={closeBurgerMenu}
        isAdmin={isAdmin}
      />
    </nav>
  );
}
