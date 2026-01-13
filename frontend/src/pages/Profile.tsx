import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { api } from '../api/client';
import { clearAuthToken, getUserRole } from '../utils/auth';
import { formatLongDate } from '../utils/formatting';
import { useTranslation } from 'react-i18next';
import type { ProfileData, UpdateProfileRequest } from '../types';
import { PasswordInput } from '../components/PasswordInput';

export function Profile() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['pages', 'common']);
  const queryClient = useQueryClient();
  
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Check if user is admin (admins cannot delete their own accounts)
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // Email change form state
  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailChangeError, setEmailChangeError] = useState('');
  const [emailChangeSuccess, setEmailChangeSuccess] = useState('');
  const [isSubmittingEmailChange, setIsSubmittingEmailChange] = useState(false);

  // Profile name editing state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileUpdateError, setProfileUpdateError] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState('');
  
  // Fetch profile data with React Query
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize form fields when profile data loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
    }
  }, [profile]);

  // Profile update mutation with optimistic updates
  const profileMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => api.updateProfile(data),
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['profile'] });
      
      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData<ProfileData>(['profile']);
      
      // Optimistically update to the new value
      if (previousProfile) {
        queryClient.setQueryData<ProfileData>(['profile'], {
          ...previousProfile,
          firstName: newData.firstName !== undefined ? newData.firstName : previousProfile.firstName,
          lastName: newData.lastName !== undefined ? newData.lastName : previousProfile.lastName,
        });
      }
      
      return { previousProfile };
    },
    onError: (err, _newData, context) => {
      // Rollback on error
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile'], context.previousProfile);
      }
      setProfileUpdateError(err instanceof Error ? err.message : 'Failed to update profile');
    },
    onSuccess: (_response) => {
      setProfileUpdateSuccess('Profile updated successfully');
      setProfileUpdateError('');
      // Clear success message after 3 seconds
      setTimeout(() => setProfileUpdateSuccess(''), 3000);
    },
  });

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdateError('');
    setProfileUpdateSuccess('');

    // Validate field lengths
    if (firstName.length > 50) {
      setProfileUpdateError('First name must be 50 characters or less');
      return;
    }
    if (lastName.length > 50) {
      setProfileUpdateError('Last name must be 50 characters or less');
      return;
    }

    // Treat whitespace-only values as empty
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    profileMutation.mutate({
      firstName: trimmedFirstName || undefined,
      lastName: trimmedLastName || undefined,
    });
  };

  const handleEmailChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailChangeError('');
    setEmailChangeSuccess('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailChangeError(t('profile.accountActions.changeEmail.errors.invalidEmail'));
      return;
    }

    if (!emailChangePassword) {
      setEmailChangeError(t('profile.accountActions.changeEmail.errors.passwordRequired'));
      return;
    }

    setIsSubmittingEmailChange(true);

    try {
      const response = await api.requestEmailChange({
        newEmail,
        password: emailChangePassword,
      });
      setEmailChangeSuccess(response.message);
      setNewEmail('');
      setEmailChangePassword('');
      // Hide form after success
      setTimeout(() => {
        setShowEmailChangeForm(false);
        setEmailChangeSuccess('');
      }, 3000);
    } catch (err) {
      setEmailChangeError(err instanceof Error ? err.message : 'Failed to request email change');
    } finally {
      setIsSubmittingEmailChange(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      setIsExporting(true);
      setError('');
      const data = await api.exportUserData();
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Use timestamped filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `user-data-export-${timestamp}.json`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError('');
      await api.deleteAccount();
      
      // Clear token and redirect to welcome page
      clearAuthToken();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatLongDate(dateString, i18n.language);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8 flex-grow">
          <div className="text-center">{t('profile.loadingProfile')}</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8 flex-grow">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('profile.heading')}</h1>
          <p className="mt-2 text-gray-600">{t('profile.subheading')}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('profile.accountInfo.heading')}</h2>
          
          {/* Profile Update Form */}
          <form onSubmit={handleProfileUpdate} className="mb-6 pb-6 border-b border-gray-200">
            {profileUpdateSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {profileUpdateSuccess}
              </div>
            )}
            
            {profileUpdateError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {profileUpdateError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your first name"
                  disabled={profileMutation.isPending}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your last name"
                  disabled={profileMutation.isPending}
                />
              </div>

              <button
                type="submit"
                disabled={profileMutation.isPending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileMutation.isPending ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('profile.accountInfo.email')}</label>
              <p className="mt-1 text-lg text-gray-900">{profile?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('profile.accountInfo.accountCreated')}</label>
              <p className="mt-1 text-lg text-gray-900">
                {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('profile.accountActions.heading')}</h2>
          <div className="space-y-4">
            {/* Change Password */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{t('profile.accountActions.changePassword.title')}</h3>
                <p className="text-sm text-gray-600">{t('profile.accountActions.changePassword.description')}</p>
              </div>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t('profile.accountActions.changePassword.button')}
              </button>
            </div>

            {/* Change Email */}
            <div className="py-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t('profile.accountActions.changeEmail.title')}</h3>
                  <p className="text-sm text-gray-600">{t('profile.accountActions.changeEmail.description')}</p>
                </div>
                <button
                  onClick={() => setShowEmailChangeForm(!showEmailChangeForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {showEmailChangeForm ? t('profile.accountActions.changeEmail.cancel') : t('profile.accountActions.changeEmail.button')}
                </button>
              </div>

              {showEmailChangeForm && (
                <form onSubmit={handleEmailChangeSubmit} className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md">
                  {emailChangeSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                      {emailChangeSuccess}
                    </div>
                  )}
                  
                  {emailChangeError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {emailChangeError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.accountActions.changeEmail.newEmail')}
                    </label>
                    <input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('profile.accountActions.changeEmail.newEmailPlaceholder')}
                      disabled={isSubmittingEmailChange}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="emailChangePassword" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('profile.accountActions.changeEmail.currentPassword')}
                    </label>
                    <PasswordInput
                      id="emailChangePassword"
                      value={emailChangePassword}
                      onChange={(e) => setEmailChangePassword(e.target.value)}
                      placeholder={t('profile.accountActions.changeEmail.currentPasswordPlaceholder')}
                      disabled={isSubmittingEmailChange}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingEmailChange}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingEmailChange ? t('profile.accountActions.changeEmail.submitting') : t('profile.accountActions.changeEmail.submit')}
                  </button>
                  <p className="text-sm text-gray-600">
                    {t('profile.accountActions.changeEmail.note')}
                  </p>
                </form>
              )}
            </div>

            {/* Download Data */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{t('profile.accountActions.downloadData.title')}</h3>
                <p className="text-sm text-gray-600">{t('profile.accountActions.downloadData.description')}</p>
              </div>
              <button
                onClick={handleDownloadData}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? t('profile.accountActions.downloadData.downloading') : t('profile.accountActions.downloadData.button')}
              </button>
            </div>

            {/* Delete Account */}
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-900">{t('profile.accountActions.deleteAccount.title')}</h3>
                  <p className="text-sm text-red-600">
                    {isAdmin 
                      ? t('profile.accountActions.deleteAccount.adminRestriction', 'Admin accounts cannot be deleted to prevent system lockout.')
                      : t('profile.accountActions.deleteAccount.description')
                    }
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isAdmin}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                  title={isAdmin ? t('profile.accountActions.deleteAccount.adminTooltip', 'Admin accounts cannot be deleted') : ''}
                >
                  {t('profile.accountActions.deleteAccount.button')}
                </button>
              </div>
            </div>
          </div>
        </div>
          
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-red-900 mb-4">{t('profile.accountActions.deleteAccount.confirm.heading')}</h3>
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  {t('profile.accountActions.deleteAccount.confirm.message')}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    {t('profile.accountActions.deleteAccount.confirm.warning')}
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    <li>{t('profile.accountActions.deleteAccount.confirm.items.account')}</li>
                    <li>{t('profile.accountActions.deleteAccount.confirm.items.urls')}</li>
                    <li>{t('profile.accountActions.deleteAccount.confirm.items.clicks')}</li>
                    <li>{t('profile.accountActions.deleteAccount.confirm.items.conversions')}</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? t('profile.accountActions.deleteAccount.confirm.confirmingButton') : t('profile.accountActions.deleteAccount.confirm.confirmButton')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('profile.accountActions.deleteAccount.confirm.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
