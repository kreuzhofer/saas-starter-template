import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminBannerManager } from './AdminBannerManager';
import { api } from '../api/client';
import type { BannerOutput } from '../types';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    getAllBanners: vi.fn(),
    createBanner: vi.fn(),
    updateBanner: vi.fn(),
    deleteBanner: vi.fn(),
    sendToast: vi.fn(),
  },
}));

describe('AdminBannerManager', () => {
  const mockBanners: BannerOutput[] = [
    {
      id: '1',
      type: 'info',
      message: 'Test info banner',
      dismissable: true,
      audience: 'authenticated',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      type: 'warning',
      message: 'Test warning banner',
      dismissable: false,
      audience: 'all',
      key: 'test-key',
      link: {
        text: 'Learn more',
        url: 'https://example.com',
        external: true,
        style: 'button',
      },
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(api.getAllBanners).mockImplementation(() => new Promise(() => {}));
    
    render(<AdminBannerManager />);
    
    expect(screen.getByText('Loading banners...')).toBeInTheDocument();
  });

  it('should load and display banners', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Test info banner')).toBeInTheDocument();
      expect(screen.getByText('Test warning banner')).toBeInTheDocument();
    });
  });

  it('should display error message when loading fails', async () => {
    vi.mocked(api.getAllBanners).mockRejectedValue(new Error('Failed to load'));
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  it('should show empty state when no banners exist', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('No banners configured')).toBeInTheDocument();
    });
  });

  it('should open create form when Create Banner button is clicked', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('+ Create Banner')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('+ Create Banner'));
    
    expect(screen.getByText('Create Banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Message *')).toBeInTheDocument();
  });

  it('should validate required fields on form submission', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    // Fill in message with whitespace only
    const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: '   ' } });
    
    // Try to submit
    const form = messageInput.closest('form')!;
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText('Message is required')).toBeInTheDocument();
    });
  });

  it('should validate link fields when link is enabled', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    // Fill in message
    const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    // Enable link
    const hasLinkCheckbox = screen.getByLabelText('Add link to banner');
    fireEvent.click(hasLinkCheckbox);
    
    // Try to submit without link text
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Link text is required when link is enabled')).toBeInTheDocument();
    });
  });

  it('should validate URL format for links', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    // Fill in message
    const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    // Enable link and fill invalid URL (one that will fail URL constructor)
    const hasLinkCheckbox = screen.getByLabelText('Add link to banner');
    fireEvent.click(hasLinkCheckbox);
    
    const linkTextInput = screen.getByLabelText('Link Text *') as HTMLInputElement;
    fireEvent.change(linkTextInput, { target: { value: 'Click here' } });
    
    const linkUrlInput = screen.getByLabelText('Link URL *') as HTMLInputElement;
    fireEvent.change(linkUrlInput, { target: { value: 'invalid url with spaces' } });
    
    // Try to submit
    const form = messageInput.closest('form')!;
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(screen.getByText('Link URL must be a valid URL')).toBeInTheDocument();
    });
  });

  it('should validate scheduled times', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    // Fill in message
    const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    // Set end time before start time
    const startInput = screen.getByLabelText('Start Time') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2024-01-02T10:00' } });
    
    const endInput = screen.getByLabelText('End Time') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '2024-01-01T10:00' } });
    
    // Try to submit
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Scheduled end time must be after start time')).toBeInTheDocument();
    });
  });

  it('should create a new banner successfully', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    const newBanner: BannerOutput = {
      id: '3',
      type: 'info',
      message: 'New banner',
      dismissable: true,
      audience: 'authenticated',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    };
    vi.mocked(api.createBanner).mockResolvedValue(newBanner);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    // Fill in form
    const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'New banner' } });
    
    // Submit
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(api.createBanner).toHaveBeenCalledWith({
        type: 'info',
        message: 'New banner',
        dismissable: true,
        audience: 'authenticated',
        link: undefined,
      });
    });
  });

  it('should open edit form with existing banner data', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Test warning banner')).toBeInTheDocument();
    });
    
    // Click edit on the warning banner
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[1]); // Second banner
    
    await waitFor(() => {
      expect(screen.getByText('Edit Banner')).toBeInTheDocument();
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
      expect(messageInput.value).toBe('Test warning banner');
      
      const typeSelect = screen.getByLabelText('Type *') as HTMLSelectElement;
      expect(typeSelect.value).toBe('warning');
      
      const keyInput = screen.getByLabelText('Key (optional)') as HTMLInputElement;
      expect(keyInput.value).toBe('test-key');
    });
  });

  it('should update an existing banner successfully', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
    const updatedBanner: BannerOutput = {
      ...mockBanners[0],
      message: 'Updated message',
    };
    vi.mocked(api.updateBanner).mockResolvedValue(updatedBanner);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Test info banner')).toBeInTheDocument();
    });
    
    // Click edit on first banner
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
      fireEvent.change(messageInput, { target: { value: 'Updated message' } });
    });
    
    // Submit
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(api.updateBanner).toHaveBeenCalledWith('1', expect.objectContaining({
        message: 'Updated message',
      }));
    });
  });

  it('should delete a banner after confirmation', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
    vi.mocked(api.deleteBanner).mockResolvedValue(undefined);
    
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Test info banner')).toBeInTheDocument();
    });
    
    // Click delete on first banner
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(api.deleteBanner).toHaveBeenCalledWith('1');
    });
    
    confirmSpy.mockRestore();
  });

  it('should not delete banner if confirmation is cancelled', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
    
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Test info banner')).toBeInTheDocument();
    });
    
    // Click delete on first banner
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(api.deleteBanner).not.toHaveBeenCalled();
    });
    
    confirmSpy.mockRestore();
  });

  it('should handle API errors during banner creation', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    vi.mocked(api.createBanner).mockRejectedValue(new Error('API Error'));
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    // Fill in form
    const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    // Submit
    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should display banner metadata correctly', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      // Check type badges
      expect(screen.getByText('INFO')).toBeInTheDocument();
      expect(screen.getByText('WARNING')).toBeInTheDocument();
      
      // Check key badge
      expect(screen.getByText('Key: test-key')).toBeInTheDocument();
      
      // Check audience badges
      expect(screen.getByText('authenticated')).toBeInTheDocument();
      expect(screen.getByText('all')).toBeInTheDocument();
      
      // Check non-dismissable badge
      expect(screen.getByText('Non-dismissable')).toBeInTheDocument();
      
      // Check link info
      expect(screen.getByText(/Learn more → https:\/\/example\.com/)).toBeInTheDocument();
    });
  });

  it('should close form when Cancel button is clicked', async () => {
    vi.mocked(api.getAllBanners).mockResolvedValue([]);
    
    render(<AdminBannerManager />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create Banner'));
    });
    
    expect(screen.getByText('Create Banner')).toBeInTheDocument();
    
    // Click cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Create Banner')).not.toBeInTheDocument();
    });
  });

  describe('Toast API integration', () => {
    it('should send toast via API when banner is created successfully', async () => {
      vi.mocked(api.getAllBanners).mockResolvedValue([]);
      const newBanner: BannerOutput = {
        id: '3',
        type: 'info',
        message: 'New banner',
        dismissable: true,
        audience: 'authenticated',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };
      vi.mocked(api.createBanner).mockResolvedValue(newBanner);
      vi.mocked(api.sendToast).mockResolvedValue(undefined);
      
      render(<AdminBannerManager />);
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Create Banner'));
      });
      
      // Fill in form
      const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
      fireEvent.change(messageInput, { target: { value: 'New banner' } });
      
      // Submit
      const saveButton = screen.getByRole('button', { name: 'Save' });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(api.sendToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Banner created successfully',
          duration: 5000,
        });
      });
    });

    it('should send toast via API when banner is updated successfully', async () => {
      vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
      const updatedBanner: BannerOutput = {
        ...mockBanners[0],
        message: 'Updated message',
      };
      vi.mocked(api.updateBanner).mockResolvedValue(updatedBanner);
      vi.mocked(api.sendToast).mockResolvedValue(undefined);
      
      render(<AdminBannerManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Test info banner')).toBeInTheDocument();
      });
      
      // Click edit on first banner
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      
      await waitFor(() => {
        const messageInput = screen.getByLabelText('Message *') as HTMLTextAreaElement;
        fireEvent.change(messageInput, { target: { value: 'Updated message' } });
      });
      
      // Submit
      const saveButton = screen.getByRole('button', { name: 'Save' });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(api.sendToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Banner updated successfully',
          duration: 5000,
        });
      });
    });

    it('should send toast via API when banner is deleted successfully', async () => {
      vi.mocked(api.getAllBanners).mockResolvedValue(mockBanners);
      vi.mocked(api.deleteBanner).mockResolvedValue(undefined);
      vi.mocked(api.sendToast).mockResolvedValue(undefined);
      
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<AdminBannerManager />);
      
      await waitFor(() => {
        expect(screen.getByText('Test info banner')).toBeInTheDocument();
      });
      
      // Click delete on first banner
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(api.sendToast).toHaveBeenCalledWith({
          type: 'success',
          message: 'Banner deleted successfully',
          duration: 5000,
        });
      });
      
      confirmSpy.mockRestore();
    });
  });
});
