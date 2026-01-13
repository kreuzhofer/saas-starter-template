import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import type { BannerOutput, CreateBannerInput, UpdateBannerInput, BannerLink } from '../types';

export function AdminBannerManager() {
  const [banners, setBanners] = useState<BannerOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateBannerInput>({
    type: 'info',
    message: '',
    dismissable: true,
    audience: 'authenticated',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Link configuration state
  const [hasLink, setHasLink] = useState(false);
  const [linkData, setLinkData] = useState<BannerLink>({
    text: '',
    url: '',
    external: false,
    style: 'inline',
  });

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load banners on mount
  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const data = await api.getAllBanners();
      setBanners(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load banners';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
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

  const openAddForm = () => {
    setEditingId(null);
    setFormData({
      type: 'info',
      message: '',
      dismissable: true,
      audience: 'authenticated',
    });
    setHasLink(false);
    setLinkData({
      text: '',
      url: '',
      external: false,
      style: 'inline',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Helper to convert ISO date to datetime-local format
  const toDateTimeLocal = (isoString: string | undefined): string | undefined => {
    if (!isoString) return undefined;
    const date = new Date(isoString);
    // Format: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const openEditForm = (banner: BannerOutput) => {
    setEditingId(banner.id);
    setFormData({
      type: banner.type,
      message: banner.message,
      dismissable: banner.dismissable,
      audience: banner.audience,
      key: banner.key,
      accountId: banner.accountId,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      scheduledStart: toDateTimeLocal(banner.scheduledStart),
      scheduledEnd: toDateTimeLocal(banner.scheduledEnd),
    });
    
    if (banner.link) {
      setHasLink(true);
      setLinkData(banner.link);
    } else {
      setHasLink(false);
      setLinkData({
        text: '',
        url: '',
        external: false,
        style: 'inline',
      });
    }
    
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError('');
  };

  const validateForm = (): boolean => {
    if (!formData.message.trim()) {
      setFormError('Message is required');
      return false;
    }

    if (formData.message.length > 5000) {
      setFormError('Message must be less than 5000 characters');
      return false;
    }

    if (hasLink) {
      if (!linkData.text.trim()) {
        setFormError('Link text is required when link is enabled');
        return false;
      }
      if (!linkData.url.trim()) {
        setFormError('Link URL is required when link is enabled');
        return false;
      }
      try {
        new URL(linkData.url);
      } catch {
        setFormError('Link URL must be a valid URL');
        return false;
      }
    }

    if (formData.scheduledStart && formData.scheduledEnd) {
      const start = new Date(formData.scheduledStart);
      const end = new Date(formData.scheduledEnd);
      if (end <= start) {
        setFormError('Scheduled end time must be after start time');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert datetime-local values to ISO 8601 format
      const scheduledStart = formData.scheduledStart 
        ? new Date(formData.scheduledStart).toISOString() 
        : undefined;
      const scheduledEnd = formData.scheduledEnd 
        ? new Date(formData.scheduledEnd).toISOString() 
        : undefined;

      const data: CreateBannerInput | UpdateBannerInput = {
        ...formData,
        scheduledStart,
        scheduledEnd,
        link: hasLink ? linkData : undefined,
      };

      if (editingId) {
        // Update existing banner
        const updated = await api.updateBanner(editingId, data);
        setBanners(banners.map(b => b.id === editingId ? updated : b));
        await showToast('Banner updated successfully', 'success');
      } else {
        // Create new banner
        const created = await api.createBanner(data as CreateBannerInput);
        setBanners([...banners, created]);
        await showToast('Banner created successfully', 'success');
      }

      closeForm();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save banner';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setDeletingId(id);

    try {
      await api.deleteBanner(id);
      setBanners(banners.filter(b => b.id !== id));
      await showToast('Banner deleted successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete banner';
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (banner: BannerOutput) => {
    if (window.confirm(`Are you sure you want to delete this ${banner.type} banner?`)) {
      handleDelete(banner.id);
    }
  };

  const getBannerTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Loading banners...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Banner Management</h2>
        <p className="text-gray-600">
          Create and manage notification banners for users
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={openAddForm}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
      >
        + Create Banner
      </button>

      {/* Banner List */}
      {banners.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No banners configured</p>
          <p className="text-sm text-gray-500 mt-2">
            Click "Create Banner" to get started
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded border ${getBannerTypeColor(banner.type)}`}>
                        {banner.type.toUpperCase()}
                      </span>
                      {banner.key && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200">
                          Key: {banner.key}
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded border border-purple-200">
                        {banner.audience}
                      </span>
                      {!banner.dismissable && (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded border border-orange-200">
                          Non-dismissable
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-900">{banner.message}</p>
                    
                    {banner.link && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Link:</span> {banner.link.text} → {banner.link.url}
                        {banner.link.external && ' (external)'}
                      </div>
                    )}
                    
                    {(banner.scheduledStart || banner.scheduledEnd) && (
                      <div className="text-sm text-gray-600">
                        {banner.scheduledStart && (
                          <div>
                            <span className="font-medium">Starts:</span> {new Date(banner.scheduledStart).toLocaleString()}
                          </div>
                        )}
                        {banner.scheduledEnd && (
                          <div>
                            <span className="font-medium">Ends:</span> {new Date(banner.scheduledEnd).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Created: {new Date(banner.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(banner)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-600"
                      disabled={deletingId === banner.id}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(banner)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-600"
                      disabled={deletingId === banner.id}
                    >
                      {deletingId === banner.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="p-6 sticky top-0 bg-white border-b border-gray-200 z-10 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                {editingId ? 'Edit Banner' : 'Create Banner'}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'error' | 'warning' | 'info' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter banner message..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.message.length} / 5000 characters
                  </p>
                </div>

                {/* Audience */}
                <div>
                  <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
                    Audience
                  </label>
                  <select
                    id="audience"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value as 'authenticated' | 'unauthenticated' | 'all' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  >
                    <option value="authenticated">Authenticated Users</option>
                    <option value="unauthenticated">Unauthenticated Users</option>
                    <option value="all">All Visitors</option>
                  </select>
                </div>

                {/* Dismissable */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="dismissable"
                    checked={formData.dismissable}
                    onChange={(e) => setFormData({ ...formData, dismissable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="dismissable" className="ml-2 block text-sm text-gray-700">
                    Allow users to dismiss this banner
                  </label>
                </div>

                {/* Key (optional) */}
                <div>
                  <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                    Key (optional)
                  </label>
                  <input
                    type="text"
                    id="key"
                    value={formData.key || ''}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value || undefined })}
                    placeholder="unique-banner-key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use a key to enable upsert behavior (update existing banner with same key)
                  </p>
                </div>

                {/* Link Configuration */}
                <div className="border-t pt-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="hasLink"
                      checked={hasLink}
                      onChange={(e) => setHasLink(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="hasLink" className="ml-2 block text-sm font-medium text-gray-700">
                      Add link to banner
                    </label>
                  </div>

                  {hasLink && (
                    <div className="space-y-3 pl-6">
                      <div>
                        <label htmlFor="linkText" className="block text-sm font-medium text-gray-700 mb-1">
                          Link Text *
                        </label>
                        <input
                          type="text"
                          id="linkText"
                          value={linkData.text}
                          onChange={(e) => setLinkData({ ...linkData, text: e.target.value })}
                          placeholder="Learn more"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label htmlFor="linkUrl" className="block text-sm font-medium text-gray-700 mb-1">
                          Link URL *
                        </label>
                        <input
                          type="url"
                          id="linkUrl"
                          value={linkData.url}
                          onChange={(e) => setLinkData({ ...linkData, url: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label htmlFor="linkStyle" className="block text-sm font-medium text-gray-700 mb-1">
                          Link Style
                        </label>
                        <select
                          id="linkStyle"
                          value={linkData.style}
                          onChange={(e) => setLinkData({ ...linkData, style: e.target.value as 'inline' | 'button' })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isSubmitting}
                        >
                          <option value="inline">Inline</option>
                          <option value="button">Button</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="linkExternal"
                          checked={linkData.external}
                          onChange={(e) => setLinkData({ ...linkData, external: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={isSubmitting}
                        />
                        <label htmlFor="linkExternal" className="ml-2 block text-sm text-gray-700">
                          Open in new tab (external link)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Colors */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Colors (optional)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="backgroundColor" className="block text-sm text-gray-700 mb-1">
                        Background Color
                      </label>
                      <input
                        type="text"
                        id="backgroundColor"
                        value={formData.backgroundColor || ''}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value || undefined })}
                        placeholder="#ffffff"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="textColor" className="block text-sm text-gray-700 mb-1">
                        Text Color
                      </label>
                      <input
                        type="text"
                        id="textColor"
                        value={formData.textColor || ''}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value || undefined })}
                        placeholder="#000000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Scheduling */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Scheduling (optional)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="scheduledStart" className="block text-sm text-gray-700 mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        id="scheduledStart"
                        value={formData.scheduledStart || ''}
                        onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value || undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="scheduledEnd" className="block text-sm text-gray-700 mb-1">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        id="scheduledEnd"
                        value={formData.scheduledEnd || ''}
                        onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value || undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
