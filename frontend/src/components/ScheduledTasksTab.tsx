import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { TaskStatus } from '../types';
import { useTranslation } from 'react-i18next';
import { ExecutionHistoryModal } from './ExecutionHistoryModal';

export function ScheduledTasksTab() {
  const { i18n } = useTranslation(['pages', 'common']);
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTaskStatuses();
      setTasks(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTasks();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadTasks]);

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

  const handleToggleEnabled = async (taskName: string, currentEnabled: boolean) => {
    setTogglingTask(taskName);
    try {
      const updatedTask = await api.setTaskEnabled(taskName, !currentEnabled);
      
      // Update the task in the list
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.taskName === taskName ? updatedTask : task
        )
      );
      
      showToast(
        !currentEnabled 
          ? `Task "${taskName}" enabled successfully`
          : `Task "${taskName}" disabled successfully`,
        'success'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to toggle task',
        'error'
      );
    } finally {
      setTogglingTask(null);
    }
  };

  const handleTriggerTask = async (taskName: string) => {
    setTriggeringTask(taskName);
    try {
      const result = await api.triggerTask(taskName);
      
      showToast(
        `Task "${taskName}" executed successfully in ${(result.executionTime / 1000).toFixed(2)}s`,
        'success'
      );
      
      // Refresh task list to show updated status
      await loadTasks();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to trigger task',
        'error'
      );
    } finally {
      setTriggeringTask(null);
    }
  };

  const handleViewLogs = (taskName: string) => {
    setSelectedTaskForHistory(taskName);
  };

  const handleCloseHistoryModal = () => {
    setSelectedTaskForHistory(null);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  const formatDuration = (milliseconds: number | null) => {
    if (milliseconds === null) return '-';
    
    const seconds = milliseconds / 1000;
    if (seconds < 1) {
      return `${milliseconds}ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  const formatLastRefresh = () => {
    return new Intl.DateTimeFormat(i18n.language, {
      timeStyle: 'medium',
    }).format(lastRefresh);
  };

  return (
    <div>
      {/* Header with refresh button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scheduled Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">
            Last refreshed: {formatLastRefresh()}
          </p>
        </div>
        <button
          onClick={loadTasks}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Task list table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading && tasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mb-2">Error loading tasks</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadTasks}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No scheduled tasks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map(task => (
                  <tr key={task.taskName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.taskName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {task.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(task.lastRun)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(task.nextRun)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.lastResult ? (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.lastResult === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {task.lastResult === 'success' ? 'Success' : 'Failure'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(task.lastDuration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEnabled(task.taskName, task.enabled)}
                          disabled={togglingTask === task.taskName}
                          className={`px-3 py-1 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${
                            task.enabled
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100'
                              : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                          }`}
                        >
                          {togglingTask === task.taskName
                            ? '...'
                            : task.enabled
                            ? 'Disable'
                            : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleTriggerTask(task.taskName)}
                          disabled={triggeringTask === task.taskName}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {triggeringTask === task.taskName ? 'Running...' : 'Trigger'}
                        </button>
                        <button
                          onClick={() => handleViewLogs(task.taskName)}
                          className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
                        >
                          Logs
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution History Modal */}
      <ExecutionHistoryModal
        taskName={selectedTaskForHistory || ''}
        isOpen={selectedTaskForHistory !== null}
        onClose={handleCloseHistoryModal}
      />
    </div>
  );
}
