import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { ScheduledTasksTab } from './ScheduledTasksTab';
import type { TaskStatus, ExecutionHistoryResponse } from '../types';
import testI18n from '../i18n/testConfig';
import { api } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    getTaskStatuses: vi.fn(),
    setTaskEnabled: vi.fn(),
    triggerTask: vi.fn(),
    getTaskExecutionHistory: vi.fn(),
    sendToast: vi.fn(),
  },
}));

describe('ScheduledTasksTab', () => {
  const mockTasks: TaskStatus[] = [
    {
      taskName: 'example-task',
      enabled: true,
      lastRun: '2024-01-15T10:30:00Z',
      nextRun: '2024-01-15T11:30:00Z',
      lastResult: 'success',
      lastError: null,
      lastDuration: 1500,
    },
    {
      taskName: 'disabled-task',
      enabled: false,
      lastRun: '2024-01-14T10:30:00Z',
      nextRun: null,
      lastResult: 'failure',
      lastError: 'Task execution failed',
      lastDuration: 2500,
    },
    {
      taskName: 'never-run-task',
      enabled: true,
      lastRun: null,
      nextRun: '2024-01-16T10:30:00Z',
      lastResult: null,
      lastError: null,
      lastDuration: null,
    },
  ];

  const mockExecutionHistory: ExecutionHistoryResponse = {
    taskName: 'example-task',
    executions: [
      {
        id: '1',
        startedAt: '2024-01-15T10:30:00Z',
        completedAt: '2024-01-15T10:30:01.5Z',
        result: 'success',
        errorMessage: null,
        duration: 1500,
        capturedLogs: 'Task executed successfully',
      },
      {
        id: '2',
        startedAt: '2024-01-15T09:30:00Z',
        completedAt: '2024-01-15T09:30:02Z',
        result: 'failure',
        errorMessage: 'Connection timeout',
        duration: 2000,
        capturedLogs: 'Error: Connection timeout',
      },
    ],
    total: 2,
    limit: 10,
    offset: 0,
  };

  // Helper to wrap component with i18n provider
  const renderWithI18n = (component: React.ReactElement) => {
    return render(
      <I18nextProvider i18n={testI18n}>
        {component}
      </I18nextProvider>
    );
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await testI18n.changeLanguage('en');
    vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component renders with task data', () => {
    it('should render the component with task list', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('Scheduled Tasks')).toBeInTheDocument();
      });

      expect(screen.getByText('example-task')).toBeInTheDocument();
      expect(screen.getByText('disabled-task')).toBeInTheDocument();
      expect(screen.getByText('never-run-task')).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      renderWithI18n(<ScheduledTasksTab />);

      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });

    it('should display error state when API call fails', async () => {
      vi.mocked(api.getTaskStatuses).mockRejectedValue(new Error('Failed to load tasks'));

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('Error loading tasks')).toBeInTheDocument();
        expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
      });
    });

    it('should display empty state when no tasks exist', async () => {
      vi.mocked(api.getTaskStatuses).mockResolvedValue([]);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('No scheduled tasks found')).toBeInTheDocument();
      });
    });

    it('should display all task columns', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('Task Name')).toBeInTheDocument();
      });

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Last Run')).toBeInTheDocument();
      expect(screen.getByText('Next Run')).toBeInTheDocument();
      expect(screen.getByText('Result')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Enable/disable button functionality', () => {
    it('should display Disable button for enabled tasks', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        const disableButtons = screen.getAllByRole('button', { name: /disable/i });
        expect(disableButtons.length).toBeGreaterThan(0);
      });
    });

    it('should display Enable button for disabled tasks', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^enable$/i })).toBeInTheDocument();
      });
    });

    it('should call setTaskEnabled when Disable button is clicked', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[0], enabled: false };
      vi.mocked(api.setTaskEnabled).mockResolvedValue(updatedTask);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalledWith('example-task', false);
      });
    });

    it('should call setTaskEnabled when Enable button is clicked', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[1], enabled: true };
      vi.mocked(api.setTaskEnabled).mockResolvedValue(updatedTask);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('disabled-task')).toBeInTheDocument();
      });

      const enableButton = screen.getByRole('button', { name: /^enable$/i });
      await user.click(enableButton);

      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalledWith('disabled-task', true);
      });
    });

    it('should update UI after toggling task enabled state', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[0], enabled: false };
      vi.mocked(api.setTaskEnabled).mockResolvedValue(updatedTask);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        const enableButtons = screen.getAllByRole('button', { name: /^enable$/i });
        expect(enableButtons.length).toBeGreaterThan(0);
      });
    });

    it('should show error toast when toggle fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.setTaskEnabled).mockRejectedValue(new Error('Failed to toggle task'));

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalled();
      });
    });
  });

  describe('Manual trigger button functionality', () => {
    it('should display Trigger button for all tasks', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
        expect(triggerButtons).toHaveLength(3);
      });
    });

    it('should call triggerTask when Trigger button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.triggerTask).mockResolvedValue({
        success: true,
        message: 'Task executed successfully',
        executionTime: 1500,
      });
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      await waitFor(() => {
        expect(api.triggerTask).toHaveBeenCalledWith('example-task');
      });
    });

    it('should show loading state during task execution', async () => {
      const user = userEvent.setup();
      let resolveTrigger: (value: any) => void;
      const triggerPromise = new Promise((resolve) => {
        resolveTrigger = resolve;
      });
      vi.mocked(api.triggerTask).mockReturnValue(triggerPromise as any);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      expect(screen.getByRole('button', { name: /running\.\.\./i })).toBeInTheDocument();

      resolveTrigger!({
        success: true,
        message: 'Task executed successfully',
        executionTime: 1500,
      });
    });

    it('should display execution result in toast notification', async () => {
      const user = userEvent.setup();
      vi.mocked(api.triggerTask).mockResolvedValue({
        success: true,
        message: 'Task executed successfully',
        executionTime: 1500,
      });
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      await waitFor(() => {
        expect(api.triggerTask).toHaveBeenCalledWith('example-task');
      });
    });

    it('should refresh task status after completion', async () => {
      const user = userEvent.setup();
      vi.mocked(api.triggerTask).mockResolvedValue({
        success: true,
        message: 'Task executed successfully',
        executionTime: 1500,
      });
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      expect(api.getTaskStatuses).toHaveBeenCalledTimes(1);

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      await waitFor(() => {
        expect(api.getTaskStatuses).toHaveBeenCalledTimes(2);
      });
    });

    it('should show error toast when trigger fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.triggerTask).mockRejectedValue(new Error('Task execution failed'));

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      await waitFor(() => {
        expect(api.triggerTask).toHaveBeenCalled();
      });
    });
  });

  describe('View logs modal opening and display', () => {
    it('should display Logs button for all tasks', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
        expect(logsButtons).toHaveLength(3);
      });
    });

    it('should open execution history modal when Logs button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockResolvedValue(mockExecutionHistory);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Execution History: example-task')).toBeInTheDocument();
      });
    });

    it('should call getTaskExecutionHistory when modal opens', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockResolvedValue(mockExecutionHistory);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(api.getTaskExecutionHistory).toHaveBeenCalledWith('example-task', 10, 0);
      });
    });

    it('should display execution history with timestamps and results', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockResolvedValue(mockExecutionHistory);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        const successBadges = screen.getAllByText('Success');
        const failureBadges = screen.getAllByText('Failure');
        expect(successBadges.length).toBeGreaterThan(0);
        expect(failureBadges.length).toBeGreaterThan(0);
      });
    });

    it('should show error messages for failed executions', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockResolvedValue(mockExecutionHistory);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Connection timeout')).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockResolvedValue(mockExecutionHistory);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Execution History: example-task')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Execution History: example-task')).not.toBeInTheDocument();
      });
    });

    it('should show loading state while fetching execution history', async () => {
      const user = userEvent.setup();
      let resolveHistory: (value: any) => void;
      const historyPromise = new Promise((resolve) => {
        resolveHistory = resolve;
      });
      vi.mocked(api.getTaskExecutionHistory).mockReturnValue(historyPromise as any);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Loading execution history...')).toBeInTheDocument();
      });

      resolveHistory!(mockExecutionHistory);
    });

    it('should show error state when execution history fetch fails', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockRejectedValue(new Error('Failed to load execution history'));

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error loading execution history')).toBeInTheDocument();
        expect(screen.getByText('Failed to load execution history')).toBeInTheDocument();
      });
    });

    it('should show empty state when no execution history exists', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskExecutionHistory).mockResolvedValue({
        taskName: 'example-task',
        executions: [],
        total: 0,
        limit: 10,
        offset: 0,
      });

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const logsButtons = screen.getAllByRole('button', { name: /^logs$/i });
      await user.click(logsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('No execution history available')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh behavior', () => {
    it('should display last refresh timestamp', async () => {
      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText(/last refreshed:/i)).toBeInTheDocument();
      });
    });

    it('should update last refresh timestamp after manual refresh', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(api.getTaskStatuses).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error handling and toast notifications', () => {
    it('should send toast via API with success message', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[0], enabled: false };
      vi.mocked(api.setTaskEnabled).mockResolvedValue(updatedTask);
      vi.mocked(api.sendToast).mockResolvedValue(undefined);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.sendToast).toHaveBeenCalledWith({
          type: 'success',
          message: expect.stringContaining('disabled successfully'),
          duration: 5000,
        });
      });
    });

    it('should send toast via API with error message', async () => {
      const user = userEvent.setup();
      vi.mocked(api.setTaskEnabled).mockRejectedValue(new Error('Failed to toggle task'));
      vi.mocked(api.sendToast).mockResolvedValue(undefined);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.sendToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to toggle task',
          duration: 5000,
        });
      });
    });

    it('should send toast via API after triggering task', async () => {
      const user = userEvent.setup();
      vi.mocked(api.triggerTask).mockResolvedValue({
        success: true,
        message: 'Task executed successfully',
        executionTime: 1500,
      });
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);
      vi.mocked(api.sendToast).mockResolvedValue(undefined);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      await waitFor(() => {
        expect(api.sendToast).toHaveBeenCalledWith({
          type: 'success',
          message: expect.stringContaining('executed successfully'),
          duration: 5000,
        });
      });
    });

    it('should display toast notification with success message', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[0], enabled: false };
      vi.mocked(api.setTaskEnabled).mockResolvedValue(updatedTask);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalled();
      });
    });

    it('should display toast notification with error message', async () => {
      const user = userEvent.setup();
      vi.mocked(api.setTaskEnabled).mockRejectedValue(new Error('Failed to toggle task'));

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalled();
      });
    });

    it('should allow closing toast notification', async () => {
      const user = userEvent.setup();
      const updatedTask = { ...mockTasks[0], enabled: false };
      vi.mocked(api.setTaskEnabled).mockResolvedValue(updatedTask);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalled();
      });
    });
  });

  describe('Loading states during API calls', () => {
    it('should show loading indicator while toggling', async () => {
      const user = userEvent.setup();
      vi.mocked(api.setTaskEnabled).mockResolvedValue({ ...mockTasks[0], enabled: false });

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const disableButtons = screen.getAllByRole('button', { name: /disable/i });
      await user.click(disableButtons[0]);

      // Verify the API was called
      await waitFor(() => {
        expect(api.setTaskEnabled).toHaveBeenCalled();
      });
    });

    it('should show loading indicator while task is running', async () => {
      const user = userEvent.setup();
      vi.mocked(api.triggerTask).mockResolvedValue({
        success: true,
        message: 'Task executed successfully',
        executionTime: 1500,
      });
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);

      renderWithI18n(<ScheduledTasksTab />);

      await waitFor(() => {
        expect(screen.getByText('example-task')).toBeInTheDocument();
      });

      const triggerButtons = screen.getAllByRole('button', { name: /^trigger$/i });
      await user.click(triggerButtons[0]);

      // Verify the API was called
      await waitFor(() => {
        expect(api.triggerTask).toHaveBeenCalled();
      });
    });

    it('should disable refresh button while loading', async () => {
      vi.mocked(api.getTaskStatuses).mockResolvedValue(mockTasks);

      renderWithI18n(<ScheduledTasksTab />);

      // Wait for initial load to complete
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });
});
