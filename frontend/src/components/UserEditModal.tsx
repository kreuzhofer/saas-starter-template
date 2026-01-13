import { useState, useEffect } from 'react';
import type { AdminUserInfo, AccountRole, AccountTier, LimitOverrideInfo } from '../types';
import { ACCOUNT_ROLES, getRoleDisplayName, ACCOUNT_TIERS, getTierDisplayName } from '../types';
import { getUserId } from '../utils/auth';
import { formatDateTime } from '../utils/formatting';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { PasswordInput } from './PasswordInput';

// Limit display names for better UX
const LIMIT_DISPLAY_NAMES: Record<string, string> = {
  short_urls_total: 'Total Short URLs',
  link_clicks_per_month: 'Link Clicks per Month',
  api_calls_per_day: 'API Calls per Day',
};

// Tier default limits (matching backend config)
const TIER_LIMITS: Record<AccountTier, Record<string, number>> = {
  starter: {
    short_urls_total: 10,
    link_clicks_per_month: 1000,
    api_calls_per_day: 0,
  },
  pro: {
    short_urls_total: 100,
    link_clicks_per_month: 50000,
    api_calls_per_day: 1000,
  },
  business: {
    short_urls_total: 1000,
    link_clicks_per_month: 500000,
    api_calls_per_day: 10000,
  },
  enterprise: {
    short_urls_total: -1,
    link_clicks_per_month: -1,
    api_calls_per_day: -1,
  },
};

interface UserEditModalProps {
  user: AdminUserInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onRoleUpdate: (userId: string, role: AccountRole) => Promise<void>;
  onTierUpdate: (userId: string, tier: AccountTier) => Promise<void>;
  onEmailUpdate: (userId: string, email: string) => Promise<void>;
  onPasswordReset: (userId: string) => Promise<void>;
  onPasswordSet: (userId: string, password: string) => Promise<void>;
  onActivate?: (userId: string) => Promise<void>;
  onDeactivate?: (userId: string) => Promise<void>;
  onDelete?: (userId: string) => Promise<void>;
}

export function UserEditModal({
  user,
  isOpen,
  onClose,
  onRoleUpdate,
  onTierUpdate,
  onEmailUpdate,
  onPasswordReset,
  onPasswordSet,
  onActivate,
  onDeactivate,
  onDelete,
}: UserEditModalProps) {
  const [selectedRole, setSelectedRole] = useState<AccountRole>('account_owner');
  const [selectedTier, setSelectedTier] = useState<AccountTier>('starter');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [isSubmittingTier, setIsSubmittingTier] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  
  const { i18n } = useTranslation();
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  const [showSetPasswordForm, setShowSetPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [showAdminRoleWarning, setShowAdminRoleWarning] = useState(false);
  const [selfDemotionError, setSelfDemotionError] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Override management state
  const [overrides, setOverrides] = useState<LimitOverrideInfo[]>([]);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [isPermanent, setIsPermanent] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isDeletingOverride, setIsDeletingOverride] = useState<string | null>(null);

  // Get current logged-in user's ID
  const currentUserId = getUserId();
  const isEditingOwnAccount = user?.id === currentUserId;

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedTier(user.tier);
      setEmail(user.username);
      setEmailError('');
      setShowPasswordResetConfirm(false);
      setShowSetPasswordForm(false);
      setNewPassword('');
      setPasswordError('');
      setShowAdminRoleWarning(false);
      setSelfDemotionError(null);
      setShowDeactivateConfirm(false);
      setIsTogglingStatus(false);
      // Reset delete state
      setShowDeleteConfirm(false);
      setDeleteEmailInput('');
      setIsDeleting(false);
      // Reset override state
      setOverrides([]);
      setOverrideError(null);
      setEditingLimit(null);
      setOverrideValue('');
      setIsPermanent(true);
      setExpiresAt('');
      // Load overrides
      loadOverrides(user.id);
    }
  }, [user]);

  // Load overrides for the user
  const loadOverrides = async (userId: string) => {
    setIsLoadingOverrides(true);
    setOverrideError(null);
    try {
      const response = await api.getUserOverrides(userId);
      setOverrides(response.overrides);
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : 'Failed to load overrides');
    } finally {
      setIsLoadingOverrides(false);
    }
  };

  if (!isOpen || !user) {
    return null;
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleRoleDropdownChange = (newRole: AccountRole) => {
    setSelectedRole(newRole);
  };

  const handleRoleUpdateClick = () => {
    // If changing to admin role, show warning first
    if (selectedRole === 'admin' && selectedRole !== user.role) {
      setShowAdminRoleWarning(true);
    } else {
      handleRoleChange();
    }
  };

  const handleAdminRoleConfirm = () => {
    setShowAdminRoleWarning(false);
    handleRoleChange();
  };

  const handleAdminRoleCancel = () => {
    setShowAdminRoleWarning(false);
    // Revert role selection to original value
    setSelectedRole(user.role);
  };

  const handleRoleChange = async () => {
    if (selectedRole === user.role) {
      return; // No change
    }

    setIsSubmittingRole(true);
    setSelfDemotionError(null);
    try {
      await onRoleUpdate(user.id, selectedRole);
    } catch (error) {
      // Check if this is a self-demotion error
      if (error instanceof Error && error.message.includes('cannot change your own role')) {
        setSelfDemotionError(error.message);
      }
      // Don't re-throw - we've handled the error by setting the error state
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleTierDropdownChange = (newTier: AccountTier) => {
    setSelectedTier(newTier);
  };

  const handleTierChange = async () => {
    if (selectedTier === user.tier) {
      return; // No change
    }

    setIsSubmittingTier(true);
    try {
      await onTierUpdate(user.id, selectedTier);
    } catch (error) {
      // Error is handled by the parent component
    } finally {
      setIsSubmittingTier(false);
    }
  };

  const handleEmailChange = async () => {
    if (email === user.username) {
      return; // No change
    }

    if (!validateEmail(email)) {
      return;
    }

    setIsSubmittingEmail(true);
    try {
      await onEmailUpdate(user.id, email);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsResettingPassword(true);
    try {
      await onPasswordReset(user.id);
      setShowPasswordResetConfirm(false);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    if (value) {
      validatePassword(value);
    } else {
      setPasswordError('');
    }
  };

  const handleSetPassword = async () => {
    if (!validatePassword(newPassword)) {
      return;
    }

    setIsSettingPassword(true);
    try {
      await onPasswordSet(user.id, newPassword);
      setShowSetPasswordForm(false);
      setNewPassword('');
      setPasswordError('');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleActivate = async () => {
    if (!onActivate) return;
    
    setIsTogglingStatus(true);
    try {
      await onActivate(user.id);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDeactivate = async () => {
    if (!onDeactivate) return;
    
    setIsTogglingStatus(true);
    try {
      await onDeactivate(user.id);
      setShowDeactivateConfirm(false);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    if (deleteEmailInput.toLowerCase() !== user.username.toLowerCase()) return;
    
    setIsDeleting(true);
    try {
      await onDelete(user.id);
      setShowDeleteConfirm(false);
      setDeleteEmailInput('');
      onClose();
    } catch {
      // Keep dialog open on failure - error handling is done by parent
    } finally {
      setIsDeleting(false);
    }
  };

  // Override management handlers
  const getOverrideForLimit = (limitName: string): LimitOverrideInfo | null => {
    return overrides.find(o => o.limitName === limitName) || null;
  };

  const getTierDefaultForLimit = (limitName: string): number => {
    return TIER_LIMITS[user.tier]?.[limitName] ?? 0;
  };

  const formatLimitValue = (value: number): string => {
    if (value === -1) return 'Unlimited';
    return value.toLocaleString();
  };

  const startEditingOverride = (limitName: string) => {
    const existingOverride = getOverrideForLimit(limitName);
    setEditingLimit(limitName);
    if (existingOverride) {
      setOverrideValue(existingOverride.overrideValue.toString());
      setIsPermanent(existingOverride.isPermanent);
      if (existingOverride.expiresAt) {
        // Format date for date input (YYYY-MM-DD)
        const date = new Date(existingOverride.expiresAt);
        setExpiresAt(date.toISOString().slice(0, 10));
      } else {
        setExpiresAt('');
      }
    } else {
      const tierDefault = getTierDefaultForLimit(limitName);
      setOverrideValue(tierDefault === -1 ? '' : tierDefault.toString());
      setIsPermanent(true);
      setExpiresAt('');
    }
  };

  const cancelEditingOverride = () => {
    setEditingLimit(null);
    setOverrideValue('');
    setIsPermanent(true);
    setExpiresAt('');
    setOverrideError(null);
  };

  const handleSaveOverride = async () => {
    if (!editingLimit || !user) return;

    const value = parseInt(overrideValue, 10);
    if (isNaN(value) || value < -1) {
      setOverrideError('Please enter a valid number (-1 for unlimited, or 0 or greater)');
      return;
    }

    // Validate time-bound overrides have an expiration date
    if (!isPermanent && !expiresAt) {
      setOverrideError('Please provide an expiration date for time-bound overrides');
      return;
    }

    // Validate expiration date is in the future
    if (!isPermanent && expiresAt) {
      const today = new Date().toISOString().slice(0, 10);
      if (expiresAt < today) {
        setOverrideError('Expiration date must be in the future');
        return;
      }
    }

    setIsSavingOverride(true);
    setOverrideError(null);
    try {
      // Convert date to end of day (23:59:59.999)
      let expiresAtISO: string | null = null;
      if (!isPermanent && expiresAt) {
        const endOfDay = new Date(expiresAt + 'T23:59:59.999');
        expiresAtISO = endOfDay.toISOString();
      }

      await api.createUserOverride(user.id, {
        limitName: editingLimit,
        value,
        expiresAt: expiresAtISO,
      });
      await loadOverrides(user.id);
      cancelEditingOverride();
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : 'Failed to save override');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (limitName: string) => {
    if (!user) return;

    setIsDeletingOverride(limitName);
    setOverrideError(null);
    try {
      await api.deleteUserOverride(user.id, limitName);
      await loadOverrides(user.id);
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : 'Failed to delete override');
    } finally {
      setIsDeletingOverride(null);
    }
  };

  const formatExpirationDate = (expiresAt: string | null): string => {
    if (!expiresAt) return 'Permanent';
    const date = new Date(expiresAt);
    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverrideExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header - Sticky */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          {/* User Info Display */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">User Information</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">ID:</span>{' '}
                <span className="text-gray-900 font-mono">{user.id}</span>
              </p>
              <p>
                <span className="text-gray-600">Status:</span>{' '}
                <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
              <p>
                <span className="text-gray-600">Tier:</span>{' '}
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                  user.tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                  user.tier === 'business' ? 'bg-blue-100 text-blue-800' :
                  user.tier === 'pro' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getTierDisplayName(user.tier)}
                </span>
              </p>
              <p>
                <span className="text-gray-600">Created:</span>{' '}
                <span className="text-gray-900">
                  {formatDateTime(user.createdAt, i18n.language)}
                </span>
              </p>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
              {isEditingOwnAccount && user.role === 'admin' && (
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  (Self-editing restricted)
                </span>
              )}
            </label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => handleRoleDropdownChange(e.target.value as AccountRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmittingRole}
            >
              {ACCOUNT_ROLES.map((role) => (
                <option 
                  key={role} 
                  value={role}
                  disabled={isEditingOwnAccount && user.role === 'admin' && role !== 'admin'}
                >
                  {getRoleDisplayName(role)}
                  {isEditingOwnAccount && user.role === 'admin' && role !== 'admin' ? ' (Cannot change your own admin role)' : ''}
                </option>
              ))}
            </select>
            {isEditingOwnAccount && user.role === 'admin' && (
              <p className="mt-2 text-sm text-amber-600 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>You cannot change your own admin role to prevent accidental lockout from administrative functions.</span>
              </p>
            )}
            {selfDemotionError && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{selfDemotionError}</span>
                </p>
              </div>
            )}
            {selectedRole !== user.role && (
              <button
                onClick={handleRoleUpdateClick}
                disabled={isSubmittingRole}
                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingRole ? 'Updating...' : 'Update Role'}
              </button>
            )}
          </div>

          {/* Tier Selection */}
          <div>
            <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-2">
              Account Tier
            </label>
            <select
              id="tier"
              value={selectedTier}
              onChange={(e) => handleTierDropdownChange(e.target.value as AccountTier)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmittingTier}
            >
              {ACCOUNT_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {getTierDisplayName(tier)}
                </option>
              ))}
            </select>
            {selectedTier !== user.tier && (
              <button
                onClick={handleTierChange}
                disabled={isSubmittingTier}
                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingTier ? 'Updating...' : 'Update Tier'}
              </button>
            )}
          </div>

          {/* Limit Overrides Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limit Overrides
            </label>
            
            {isLoadingOverrides ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                Loading overrides...
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {overrideError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
                    <p className="text-sm text-red-800">{overrideError}</p>
                  </div>
                )}
                
                {Object.keys(LIMIT_DISPLAY_NAMES).map((limitName) => {
                  const override = getOverrideForLimit(limitName);
                  const tierDefault = getTierDefaultForLimit(limitName);
                  const isEditing = editingLimit === limitName;
                  const isExpired = override ? isOverrideExpired(override.expiresAt) : false;
                  
                  return (
                    <div 
                      key={limitName} 
                      className={`p-3 rounded-md border ${
                        override && !isExpired
                          ? override.isExpiringSoon
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {LIMIT_DISPLAY_NAMES[limitName]}
                        </span>
                        {!isEditing && (
                          <div className="flex items-center gap-2">
                            {override && !isExpired && (
                              <button
                                onClick={() => handleDeleteOverride(limitName)}
                                disabled={isDeletingOverride === limitName}
                                className="text-xs text-red-600 hover:text-red-800 disabled:text-gray-400"
                                title="Remove override"
                              >
                                {isDeletingOverride === limitName ? 'Removing...' : 'Clear'}
                              </button>
                            )}
                            <button
                              onClick={() => startEditingOverride(limitName)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              {override && !isExpired ? 'Edit' : 'Override'}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Override Value (-1 for unlimited)
                            </label>
                            <input
                              type="number"
                              value={overrideValue}
                              onChange={(e) => setOverrideValue(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              min="-1"
                            />
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="radio"
                                checked={isPermanent}
                                onChange={() => setIsPermanent(true)}
                                className="text-blue-600"
                              />
                              Permanent
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-600">
                              <input
                                type="radio"
                                checked={!isPermanent}
                                onChange={() => setIsPermanent(false)}
                                className="text-blue-600"
                              />
                              Time-bound
                            </label>
                          </div>
                          
                          {!isPermanent && (
                            <div>
                              <label htmlFor="expiresAt" className="block text-xs text-gray-600 mb-1">
                                Expires At (end of day)
                              </label>
                              <input
                                id="expiresAt"
                                type="date"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                min={new Date().toISOString().slice(0, 10)}
                              />
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={handleSaveOverride}
                              disabled={isSavingOverride}
                              className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                            >
                              {isSavingOverride ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditingOverride}
                              disabled={isSavingOverride}
                              className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Tier Default:</span>
                            <span className="text-gray-900">{formatLimitValue(tierDefault)}</span>
                          </div>
                          {override && !isExpired && (
                            <>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`font-medium ${override.isExpiringSoon ? 'text-amber-700' : 'text-blue-700'}`}>
                                  Override:
                                </span>
                                <span className={`font-medium ${override.isExpiringSoon ? 'text-amber-900' : 'text-blue-900'}`}>
                                  {formatLimitValue(override.overrideValue)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {override.isPermanent ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                      Permanent
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${
                                      override.isExpiringSoon 
                                        ? 'bg-amber-100 text-amber-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      Expires: {formatExpirationDate(override.expiresAt)}
                                      {override.isExpiringSoon && (
                                        <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                      )}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email Edit */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                emailError ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmittingEmail}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600">{emailError}</p>
            )}
            {email !== user.username && !emailError && (
              <button
                onClick={handleEmailChange}
                disabled={isSubmittingEmail}
                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingEmail ? 'Updating...' : 'Update Email'}
              </button>
            )}
          </div>

          {/* Password Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Management
            </label>
            
            {/* Send Password Reset Email */}
            <div className="mb-3">
              {!showPasswordResetConfirm ? (
                <button
                  onClick={() => setShowPasswordResetConfirm(true)}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Send Password Reset Email
                </button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    Are you sure you want to reset this user's password? A password reset email will be sent to {user.username}.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordReset}
                      disabled={isResettingPassword}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isResettingPassword ? 'Sending...' : 'Confirm Reset'}
                    </button>
                    <button
                      onClick={() => setShowPasswordResetConfirm(false)}
                      disabled={isResettingPassword}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Set New Password */}
            <div>
              {!showSetPasswordForm ? (
                <button
                  onClick={() => setShowSetPasswordForm(true)}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Set New Password
                </button>
              ) : (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <p className="text-sm text-purple-800 mb-3">
                    Set a new password for this user. The password will be updated immediately without sending an email.
                  </p>
                  <div className="mb-3">
                    <PasswordInput
                      value={newPassword}
                      onChange={handlePasswordInputChange}
                      placeholder="Enter new password"
                      error={passwordError}
                      disabled={isSettingPassword}
                    />
                    {newPassword && !passwordError && (
                      <p className="mt-1 text-sm text-green-600">✓ Password meets requirements</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSetPassword}
                      disabled={isSettingPassword || !newPassword || !!passwordError}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSettingPassword ? 'Setting...' : 'Set Password'}
                    </button>
                    <button
                      onClick={() => {
                        setShowSetPasswordForm(false);
                        setNewPassword('');
                        setPasswordError('');
                      }}
                      disabled={isSettingPassword}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Status Management */}
          {(onActivate || onDeactivate) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Status
                {isEditingOwnAccount && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    (Cannot deactivate your own account)
                  </span>
                )}
              </label>
              
              {user.isActive ? (
                // Deactivate button - hidden for own account
                isEditingOwnAccount ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <p className="text-sm text-gray-600 flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>You cannot deactivate your own account to prevent accidental lockout from the system.</span>
                    </p>
                  </div>
                ) : !showDeactivateConfirm ? (
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Deactivate Account
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-800 mb-3">
                      Are you sure you want to deactivate this user? They will not be able to log in until their account is reactivated.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeactivate}
                        disabled={isTogglingStatus}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {isTogglingStatus ? 'Deactivating...' : 'Confirm Deactivate'}
                      </button>
                      <button
                        onClick={() => setShowDeactivateConfirm(false)}
                        disabled={isTogglingStatus}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              ) : (
                // Activate button
                <button
                  onClick={handleActivate}
                  disabled={isTogglingStatus}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isTogglingStatus ? 'Activating...' : 'Activate Account'}
                </button>
              )}
            </div>
          )}

          {/* Danger Zone - Account Deletion */}
          {onDelete && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h3>
              
              {isEditingOwnAccount ? (
                // Cannot delete own account
                <p className="text-sm text-red-700">
                  You cannot delete your own account.
                </p>
              ) : user.isActive ? (
                // Account must be deactivated first
                <p className="text-sm text-red-700">
                  This account must be deactivated before it can be deleted.
                </p>
              ) : (
                // Show delete button for deactivated non-self accounts
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  data-testid="delete-account-button"
                >
                  Delete Account Permanently
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Admin Role Warning Dialog */}
      {showAdminRoleWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4">
            {/* Warning Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Grant Admin Access?</h3>
              </div>
            </div>

            {/* Warning Body */}
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">
                You are about to grant administrator privileges to this user. Administrators have full system access including user management and system configuration. Are you sure you want to proceed?
              </p>
            </div>

            {/* Warning Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleAdminRoleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminRoleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4">
            {/* Delete Confirmation Header */}
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-900">Delete Account Permanently</h3>
              </div>
            </div>

            {/* Delete Confirmation Body */}
            <div className="px-6 py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently delete the account and all associated data including short URLs, click events, and usage records.
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-700 mb-2">
                  To confirm deletion, please type the user's email address:
                </p>
                <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded-md text-gray-900 mb-3" data-testid="target-email-display">
                  {user.username}
                </p>
                <input
                  type="email"
                  value={deleteEmailInput}
                  onChange={(e) => setDeleteEmailInput(e.target.value)}
                  placeholder="Type email to confirm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  disabled={isDeleting}
                  data-testid="delete-email-input"
                />
              </div>
            </div>

            {/* Delete Confirmation Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteEmailInput('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors font-medium"
                data-testid="delete-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting || deleteEmailInput.toLowerCase() !== user.username.toLowerCase()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                data-testid="delete-confirm-button"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
