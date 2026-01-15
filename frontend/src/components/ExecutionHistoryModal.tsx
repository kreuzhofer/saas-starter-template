import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import type { ExecutionHistoryEntry } from '../types';

interface ExecutionHistoryModalProps {
  taskName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutionHistoryModal({ taskName, isOpen, onClose }: ExecutionHistoryModalProps) {
  const [executions, setExecutions] = useState<ExecutionHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistoryEntry | null>(null);
  const pageSize = 10;

  // Load execution history
  useEffect(() => {
    if (!isOpen) return;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const offset = (currentPage - 1) * pageSize;
        const response = await api.getTaskExecutionHistory(taskName, pageSize, offset);
        setExecutions(response.executions);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load execution history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen, taskName, currentPage]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setSelectedExecution(null);
      setExecutions([]);
      setTotal(0);
      setError(null);
    }
  }, [isOpen]);

  const totalPages = Math.ceil(total / pageSize);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleViewLogs = (execution: ExecutionHistoryEntry) => {
    setSelectedExecution(execution);
  };

  const handleBackToList = () => {
    setSelectedExecution(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(date);
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = milliseconds / 1000;
    if (seconds < 1) {
      return `${milliseconds}ms`;
    }
    return `${seconds.toFixed(2)}s`;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedExecution ? 'Execution Logs' : `Execution History: ${taskName}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {selectedExecution ? (
            // Log Viewer
            <div>
              <button
                onClick={handleBackToList}
                className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to History
              </button>

              {/* Execution Details */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Started:</span>
                    <span className="ml-2 text-gray-900">{formatTimestamp(selectedExecution.startedAt)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Completed:</span>
                    <span className="ml-2 text-gray-900">{formatTimestamp(selectedExecution.completedAt)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Result:</span>
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        selectedExecution.result === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedExecution.result === 'success' ? 'Success' : 'Failure'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Duration:</span>
                    <span className="ml-2 text-gray-900">{formatDuration(selectedExecution.duration)}</span>
                  </div>
                </div>
                {selectedExecution.errorMessage && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="font-medium text-red-700">Error:</span>
                    <p className="mt-1 text-sm text-red-900 font-mono bg-red-50 p-2 rounded">
                      {selectedExecution.errorMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Captured Logs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Captured Logs</h3>
                  {selectedExecution.capturedLogs && (
                    <button
                      onClick={() => copyToClipboard(selectedExecution.capturedLogs || '')}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  )}
                </div>
                {selectedExecution.capturedLogs ? (
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96">
                    {selectedExecution.capturedLogs}
                  </pre>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No logs were captured for this execution</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Execution History List
            <>
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading execution history...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-900 font-medium mb-2">Error loading execution history</p>
                  <p className="text-gray-600">{error}</p>
                </div>
              ) : executions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No execution history available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div
                      key={execution.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        execution.result === 'success'
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                      onClick={() => handleViewLogs(execution)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                execution.result === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {execution.result === 'success' ? 'Success' : 'Failure'}
                            </span>
                            <span className="text-sm text-gray-700 font-medium">
                              {formatTimestamp(execution.startedAt)}
                            </span>
                            <span className="text-sm text-gray-600">
                              Duration: {formatDuration(execution.duration)}
                            </span>
                          </div>
                          {execution.errorMessage && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-red-900">Error:</span>
                              <p className="text-xs text-red-800 mt-1 line-clamp-2">
                                {execution.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!selectedExecution && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
            {/* Pagination Info */}
            <div className="text-sm text-gray-600">
              {total > 0 ? (
                <>
                  Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} executions
                </>
              ) : (
                'No executions'
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
