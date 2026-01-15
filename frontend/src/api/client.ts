import type { 
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ProfileData,
  UpdateProfileRequest,
  UpdateProfileResponse,
  RequestEmailChangeRequest,
  RequestEmailChangeResponse,
  ExportData,
  AdminUserInfo,
  UpdateUserRoleRequest,
  UpdateUserEmailRequest,
  UpdateUserTierRequest,
  TaskStatus,
  TaskStatusListResponse,
  SetTaskEnabledResponse,
  TriggerTaskResponse,
  TaskLogsResponse,
  ExecutionHistoryResponse,
  GetOverridesResponse,
  CreateOverrideRequest,
  CreateOverrideResponse,
  DeleteOverrideResponse,
  BannerOutput,
  CreateBannerInput,
  UpdateBannerInput,
  ToastInput
} from '../types';
import { getAuthToken, clearAuthToken } from '../utils/auth';
import i18n from '../i18n/config';

// Get API URL from runtime config (set by Docker) or build-time env var
const getApiBaseUrl = () => {
  // Check for runtime config (Docker deployment)
  if (typeof window !== 'undefined' && (window as any).ENV?.API_BASE_URL) {
    return (window as any).ENV.API_BASE_URL;
  }
  // Fall back to build-time env var
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
};

// Get API key from runtime config (set by Docker) or build-time env var
const getApiKey = () => {
  // Check for runtime config (Docker deployment)
  if (typeof window !== 'undefined' && (window as any).ENV?.API_KEY) {
    return (window as any).ENV.API_KEY;
  }
  // Fall back to build-time env var
  return import.meta.env.VITE_API_KEY || '';
};

const API_BASE_URL = getApiBaseUrl();
const API_KEY = getApiKey();

// Helper function to get headers with API key and JWT token
const getHeaders = (additionalHeaders: Record<string, string> = {}) => {
  const headers: Record<string, string> = {
    'X-API-Key': API_KEY,
    ...additionalHeaders,
  };

  // Add JWT token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Helper function to handle API responses with auth errors
async function handleResponse<T>(response: Response, skipAuthRedirect = false): Promise<T> {
  if (response.status === 401) {
    // Only redirect to login if we're not already on the login page
    if (!skipAuthRedirect && window.location.pathname !== '/login') {
      clearAuthToken();
      window.location.href = '/login';
    }
    
    const error = await response.json().catch(() => ({ 
      error: i18n.t('errors:auth.authenticationRequired') 
    }));
    throw new Error(error.error || i18n.t('errors:auth.authenticationRequired'));
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      error: i18n.t('errors:api.requestFailed') 
    }));
    
    // If there are validation details, format them into a readable message
    if (error.details && Array.isArray(error.details) && error.details.length > 0) {
      const detailMessages = error.details
        .map((d: any) => `${d.field ? d.field + ': ' : ''}${d.message}`)
        .join('. ');
      throw new Error(detailMessages);
    }
    
    throw new Error(error.error || i18n.t('errors:api.requestFailed'));
  }

  return response.json();
}

export const api = {
  // Authentication endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<LoginResponse>(response, true);
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<RegisterResponse>(response, true);
  },

  async confirmEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/confirm-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    return handleResponse<{ message: string }>(response, true);
  },

  async requestPasswordReset(data: PasswordResetRequest): Promise<PasswordResetResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<PasswordResetResponse>(response, true);
  },

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<ResetPasswordResponse>(response, true);
  },

  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<ChangePasswordResponse>(response);
  },

  // Profile endpoints
  async getProfile(): Promise<ProfileData> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: getHeaders(),
    });
    return handleResponse<ProfileData>(response);
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<UpdateProfileResponse>(response);
  },

  async requestEmailChange(data: RequestEmailChangeRequest): Promise<RequestEmailChangeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/profile/request-email-change`, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<RequestEmailChangeResponse>(response);
  },

  async confirmEmailChange(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/profile/confirm-email-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    return handleResponse<{ message: string }>(response, true);
  },

  async exportUserData(): Promise<ExportData> {
    const response = await fetch(`${API_BASE_URL}/api/profile/export`, {
      headers: getHeaders(),
    });
    return handleResponse<ExportData>(response);
  },

  async deleteAccount(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },

  // Admin endpoints
  async listUsers(): Promise<AdminUserInfo[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: getHeaders(),
    });
    const data = await handleResponse<{ users: AdminUserInfo[]; total: number }>(response);
    return data.users;
  },

  async getUserById(id: string): Promise<AdminUserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse<AdminUserInfo>(response);
  },

  async updateUserRole(id: string, data: UpdateUserRoleRequest): Promise<AdminUserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<AdminUserInfo>(response);
  },

  async updateUserTier(id: string, data: UpdateUserTierRequest): Promise<AdminUserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/tier`, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<AdminUserInfo>(response);
  },

  async updateUserEmail(id: string, data: UpdateUserEmailRequest): Promise<AdminUserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/email`, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<AdminUserInfo>(response);
  },

  async resetUserPassword(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },

  async setUserPassword(id: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/set-password`, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ password }),
    });
    return handleResponse<{ message: string }>(response);
  },

  async activateUser(id: string): Promise<AdminUserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/activate`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<AdminUserInfo>(response);
  },

  async deactivateUser(id: string): Promise<AdminUserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/deactivate`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    return handleResponse<AdminUserInfo>(response);
  },

  // Task management endpoints
  async getTaskStatuses(): Promise<TaskStatus[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin/tasks`, {
      headers: getHeaders(),
    });
    const data = await handleResponse<TaskStatusListResponse>(response);
    return data.tasks;
  },

  async setTaskEnabled(taskName: string, enabled: boolean): Promise<TaskStatus> {
    const response = await fetch(`${API_BASE_URL}/api/admin/tasks/${encodeURIComponent(taskName)}/enable`, {
      method: 'PATCH',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ enabled }),
    });
    const data = await handleResponse<SetTaskEnabledResponse>(response);
    return data.task;
  },

  async triggerTask(taskName: string): Promise<TriggerTaskResponse> {
    const response = await fetch(`${API_BASE_URL}/api/admin/tasks/${encodeURIComponent(taskName)}/trigger`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse<TriggerTaskResponse>(response);
  },

  async getTaskLogs(taskName: string, limit?: number): Promise<TaskLogsResponse> {
    const url = new URL(`${API_BASE_URL}/api/admin/tasks/${encodeURIComponent(taskName)}/logs`);
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    });
    return handleResponse<TaskLogsResponse>(response);
  },

  async getTaskExecutionHistory(taskName: string, limit?: number, offset?: number): Promise<ExecutionHistoryResponse> {
    const url = new URL(`${API_BASE_URL}/api/admin/tasks/${encodeURIComponent(taskName)}/history`);
    if (limit !== undefined) {
      url.searchParams.set('limit', limit.toString());
    }
    if (offset !== undefined) {
      url.searchParams.set('offset', offset.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    });
    return handleResponse<ExecutionHistoryResponse>(response);
  },

  // Override management endpoints
  async getUserOverrides(userId: string): Promise<GetOverridesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/overrides`, {
      headers: getHeaders(),
    });
    return handleResponse<GetOverridesResponse>(response);
  },

  async createUserOverride(userId: string, data: CreateOverrideRequest): Promise<CreateOverrideResponse> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/overrides`, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<CreateOverrideResponse>(response);
  },

  async deleteUserOverride(userId: string, limitName: string): Promise<DeleteOverrideResponse> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/overrides/${encodeURIComponent(limitName)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<DeleteOverrideResponse>(response);
  },

  // Admin account deletion endpoint
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  },

  // Banner endpoints
  async createBanner(data: CreateBannerInput): Promise<BannerOutput> {
    const response = await fetch(`${API_BASE_URL}/api/banners`, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<BannerOutput>(response);
  },

  async updateBanner(id: string, data: UpdateBannerInput): Promise<BannerOutput> {
    const response = await fetch(`${API_BASE_URL}/api/banners/${id}`, {
      method: 'PUT',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    return handleResponse<BannerOutput>(response);
  },

  async deleteBanner(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/banners/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
      throw new Error(i18n.t('errors:auth.authenticationRequired'));
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: 'Failed to delete banner' 
      }));
      throw new Error(error.error || 'Failed to delete banner');
    }
  },

  async deleteBannersByKey(key: string): Promise<{ deleted: number }> {
    const response = await fetch(`${API_BASE_URL}/api/banners/key/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse<{ deleted: number }>(response);
  },

  async getActiveBanners(): Promise<BannerOutput[]> {
    const response = await fetch(`${API_BASE_URL}/api/banners/active`, {
      headers: getHeaders(),
    });
    const data = await handleResponse<{ banners: BannerOutput[]; total: number }>(response);
    return data.banners;
  },

  async getAllBanners(): Promise<BannerOutput[]> {
    const response = await fetch(`${API_BASE_URL}/api/banners/all`, {
      headers: getHeaders(),
    });
    const data = await handleResponse<{ banners: BannerOutput[]; total: number }>(response);
    return data.banners;
  },

  async dismissBanner(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/banners/${id}/dismiss`, {
      method: 'POST',
      headers: getHeaders(),
    });
    
    if (response.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
      throw new Error(i18n.t('errors:auth.authenticationRequired'));
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: 'Failed to dismiss banner' 
      }));
      throw new Error(error.error || 'Failed to dismiss banner');
    }
  },

  async sendToast(data: ToastInput): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/toasts`, {
      method: 'POST',
      headers: getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(data),
    });
    
    if (response.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
      throw new Error(i18n.t('errors:auth.authenticationRequired'));
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: 'Failed to send toast' 
      }));
      throw new Error(error.error || 'Failed to send toast');
    }
  },
};

// Re-export getProfile for backward compatibility with tests
export const getProfile = api.getProfile.bind(api);
