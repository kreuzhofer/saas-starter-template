import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { UserEditModal } from '../components/UserEditModal';
import { ScheduledTasksTab } from '../components/ScheduledTasksTab';
import { AdminBannerManager } from '../components/AdminBannerManager';
import { api } from '../api/client';
import type { AdminUserInfo, AccountRole, AccountTier } from '../types';
import { getRoleDisplayName, ACCOUNT_ROLES, getTierDisplayName, ACCOUNT_TIERS } from '../types';
import { getUserId } from '../utils/auth';
import { formatDateTime } from '../utils/formatting';
import { useTranslation } from 'react-i18next';

type AdminTab = 'users' | 'tasks' | 'banners';

export function Admin() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<AccountRole | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<AccountTier | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState<string | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  // Get current logged-in user's ID
  const currentUserId = getUserId();

  // Fetch users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Apply search and filter whenever users, searchTerm, roleFilter, or tierFilter changes
  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, tierFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(search)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(user => user.tier === tierFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as AccountRole | 'all');
  };

  const handleTierFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTierFilter(e.target.value as AccountTier | 'all');
  };

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString, i18n.language);
  };

  const showToast = async (message: string, type: 'success' | 'error') => {
    try {
      await api.sendToast({
        type: type === 'success' ? 'success' : 'error',
        message,
        duration: 5000,
      });
    } catch (err) {
      console.error('Failed to send toast:', err);
    }
  };

  const handleEditUser = (user: AdminUserInfo) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleRoleUpdate = async (userId: string, role: AccountRole) => {
    try {
      await api.updateUserRole(userId, { role });
      showToast(t('admin.toast.roleUpdated'), 'success');
      await loadUsers();
      handleCloseModal();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.roleUpdateFailed'), 'error');
      throw err;
    }
  };

  const handleTierUpdate = async (userId: string, tier: AccountTier) => {
    try {
      await api.updateUserTier(userId, { tier });
      showToast(t('admin.toast.tierUpdated', 'Tier updated successfully'), 'success');
      await loadUsers();
      // Update the selected user in the modal if it's open
      if (selectedUser && selectedUser.id === userId) {
        const updatedUsers = await api.listUsers();
        const updatedUser = updatedUsers.find(u => u.id === userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.tierUpdateFailed', 'Failed to update tier'), 'error');
      throw err;
    }
  };

  const handleEmailUpdate = async (userId: string, email: string) => {
    try {
      await api.updateUserEmail(userId, { email });
      showToast(t('admin.toast.emailUpdated'), 'success');
      await loadUsers();
      handleCloseModal();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.emailUpdateFailed'), 'error');
      throw err;
    }
  };

  const handlePasswordReset = async (userId: string) => {
    try {
      const response = await api.resetUserPassword(userId);
      showToast(response.message || t('admin.toast.passwordResetSent'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.passwordResetFailed'), 'error');
      throw err;
    }
  };

  const handlePasswordSet = async (userId: string, password: string) => {
    try {
      const response = await api.setUserPassword(userId, password);
      showToast(response.message || t('admin.toast.passwordUpdated'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.passwordSetFailed'), 'error');
      throw err;
    }
  };

  const handleActivateUser = async (userId: string) => {
    setIsTogglingStatus(userId);
    try {
      await api.activateUser(userId);
      showToast(t('admin.toast.userActivated'), 'success');
      await loadUsers();
      
      // Update the selected user in the modal if it's open
      if (selectedUser && selectedUser.id === userId) {
        const updatedUsers = await api.listUsers();
        const updatedUser = updatedUsers.find(u => u.id === userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.activateFailed'), 'error');
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    setIsTogglingStatus(userId);
    try {
      await api.deactivateUser(userId);
      showToast(t('admin.toast.userDeactivated'), 'success');
      await loadUsers();
      setShowDeactivateConfirm(null);
      
      // Update the selected user in the modal if it's open
      if (selectedUser && selectedUser.id === userId) {
        const updatedUsers = await api.listUsers();
        const updatedUser = updatedUsers.find(u => u.id === userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.deactivateFailed'), 'error');
      setShowDeactivateConfirm(null);
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      showToast(t('admin.toast.userDeleted', 'Account deleted successfully'), 'success');
      await loadUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('admin.toast.deleteFailed', 'Failed to delete account'), 'error');
      throw err; // Re-throw to keep the dialog open on failure
    }
  };

  const handleDeactivateClick = (userId: string) => {
    setShowDeactivateConfirm(userId);
  };

  const handleCancelDeactivate = () => {
    setShowDeactivateConfirm(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.heading')}</h1>
          <p className="text-gray-600">{t('admin.subheading')}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Scheduled Tasks
            </button>
            <button
              onClick={() => setActiveTab('banners')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'banners'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Banners
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* Search and Filter Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.search.label')}
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={t('admin.search.placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.roleFilter.label')}
              </label>
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={handleRoleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('admin.roleFilter.allRoles')}</option>
                {ACCOUNT_ROLES.map(role => (
                  <option key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <label htmlFor="tierFilter" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.tierFilter.label', 'Filter by Tier')}
              </label>
              <select
                id="tierFilter"
                value={tierFilter}
                onChange={handleTierFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('admin.tierFilter.allTiers', 'All Tiers')}</option>
                {ACCOUNT_TIERS.map(tier => (
                  <option key={tier} value={tier}>
                    {getTierDisplayName(tier)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* User List Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">{t('admin.loading')}</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium mb-2">{t('admin.error')}</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('common:actions.tryAgain')}
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">
                {searchTerm || roleFilter !== 'all' || tierFilter !== 'all'
                  ? t('admin.noResults')
                  : t('admin.noUsers')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.table.email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.table.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.table.tier', 'Tier')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.table.created')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'account_owner'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getRoleDisplayName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.tier === 'enterprise' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.tier === 'business'
                            ? 'bg-blue-100 text-blue-800'
                            : user.tier === 'pro'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getTierDisplayName(user.tier)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? t('common:status.active') : t('common:status.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            {t('admin.table.edit')}
                          </button>
                          {user.isActive ? (
                            // Show deactivate button only if not the current user
                            user.id !== currentUserId ? (
                              <button
                                onClick={() => handleDeactivateClick(user.id)}
                                disabled={isTogglingStatus === user.id}
                                className="text-red-600 hover:text-red-900 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                              >
                                {isTogglingStatus === user.id ? t('admin.table.deactivating') : t('admin.table.deactivate')}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs" title={t('admin.table.cannotDeactivateSelf')}>
                                {t('admin.table.self')}
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              disabled={isTogglingStatus === user.id}
                              className="text-green-600 hover:text-green-900 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              {isTogglingStatus === user.id ? t('admin.table.activating') : t('admin.table.activate')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

            {/* Results Summary */}
            {!loading && !error && (
              <div className="mt-4 text-sm text-gray-600">
                {t('admin.resultsSummary', { filtered: filteredUsers.length, total: users.length })}
              </div>
            )}
          </>
        )}

        {/* Scheduled Tasks Tab */}
        {activeTab === 'tasks' && <ScheduledTasksTab />}

        {/* Banners Tab */}
        {activeTab === 'banners' && <AdminBannerManager />}
      </main>

      <Footer />

      {/* User Edit Modal */}
      <UserEditModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onRoleUpdate={handleRoleUpdate}
        onTierUpdate={handleTierUpdate}
        onEmailUpdate={handleEmailUpdate}
        onPasswordReset={handlePasswordReset}
        onPasswordSet={handlePasswordSet}
        onActivate={handleActivateUser}
        onDeactivate={handleDeactivateUser}
        onDelete={handleDeleteUser}
      />

      {/* Deactivate Confirmation Dialog */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            {/* Warning Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('admin.deactivateConfirm.heading')}</h3>
              </div>
            </div>

            {/* Warning Body */}
            <div className="px-6 py-4">
              <p className="text-gray-700 leading-relaxed">
                {t('admin.deactivateConfirm.message')}
              </p>
            </div>

            {/* Warning Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleCancelDeactivate}
                disabled={isTogglingStatus === showDeactivateConfirm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {t('admin.deactivateConfirm.cancel')}
              </button>
              <button
                onClick={() => handleDeactivateUser(showDeactivateConfirm)}
                disabled={isTogglingStatus === showDeactivateConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isTogglingStatus === showDeactivateConfirm ? t('admin.deactivateConfirm.confirming') : t('admin.deactivateConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
