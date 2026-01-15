# Implementation Plan: Persistent Task Execution History

## Overview

This implementation adds persistent storage of task execution history with detailed log capture to the existing scheduler framework. The implementation follows a layered approach: database schema, repository layer, log capture mechanism, scheduler integration, API endpoints, and finally the admin panel UI.

## Tasks

- [x] 1. Create database schema and migration
  - Create Prisma migration for TaskExecutionHistory model
  - Add model with fields: id, taskName, startedAt, completedAt, result, errorMessage, duration, capturedLogs, createdAt
  - Add composite index on (taskName, startedAt DESC)
  - Add index on startedAt for purge operations
  - Run migration to create table
  - _Requirements: 1.1, 1.2, 7.3_

- [x] 2. Implement ExecutionHistoryRepository
  - [x] 2.1 Create ExecutionHistoryRepository class with CRUD operations
    - Implement create() method to insert execution records
    - Implement findByTaskName() with pagination (limit, offset)
    - Implement countByTaskName() for total count
    - Implement deleteOlderThan() for purge operations with minimum retention
    - Add error handling and logging for all operations
    - _Requirements: 1.1, 1.2, 1.5, 3.1, 6.3, 6.4_

  - [x] 2.2 Write property test for execution history ordering
    - **Property 2: Execution history ordered by start time**
    - **Validates: Requirements 1.5**

  - [x] 2.3 Write property test for pagination correctness
    - **Property 4: API returns paginated history with complete data**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

  - [x] 2.4 Write property test for purge age-based deletion
    - **Property 5: Purge deletes old records beyond retention period**
    - **Validates: Requirements 6.3**

  - [x] 2.5 Write property test for purge minimum retention
    - **Property 6: Purge preserves minimum records per task**
    - **Validates: Requirements 6.4**

  - [x] 2.6 Write unit tests for edge cases
    - Test empty logs (null capturedLogs)
    - Test zero duration
    - Test non-existent task queries
    - Test database errors
    - _Requirements: 1.2, 3.4_

- [x] 3. Implement LogCaptureStream
  - [x] 3.1 Create custom Winston transport for log capture
    - Extend Winston Transport class
    - Implement log() method to capture log entries
    - Track cumulative log size with 100KB limit
    - Implement getFormattedLogs() to return captured logs as string
    - Implement clear() to reset captured logs
    - Add truncation message when size limit exceeded
    - _Requirements: 2.1, 2.2, 2.3, 7.5_

  - [x] 3.2 Write property test for log capture across all levels
    - **Property 3: Log capture includes all levels**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 3.3 Write property test for log size limiting
    - **Property 7: Log size limited to maximum**
    - **Validates: Requirements 7.5**

  - [x] 3.4 Write unit tests for log capture edge cases
    - Test empty log capture
    - Test log capture failure handling
    - Test truncation message format
    - _Requirements: 2.5, 7.5_

- [x] 4. Checkpoint - Ensure repository and log capture tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance TaskExecutor with history storage
  - [x] 5.1 Modify TaskExecutor to integrate log capture and history storage
    - Add ExecutionHistoryRepository dependency to constructor
    - Add configuration for history enabled/disabled
    - Create LogCaptureStream before task execution
    - Attach log capture stream to logger
    - Execute task with existing error handling
    - Store execution record in history (asynchronous, non-blocking)
    - Update ScheduledTaskStatus table (existing behavior)
    - Detach log capture stream after execution
    - Handle history storage failures gracefully
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 7.1, 7.2, 8.1_

  - [x] 5.2 Write property test for complete history record creation
    - **Property 1: Task execution creates complete history record**
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [x] 5.3 Write unit tests for TaskExecutor integration
    - Test successful task execution creates history
    - Test failed task execution creates history with error
    - Test history storage failure doesn't break task execution
    - Test log capture failure doesn't break task execution
    - Test backward compatibility (ScheduledTaskStatus still updated)
    - Test history disabled via configuration
    - _Requirements: 1.4, 2.5, 7.2, 8.1, 8.5_

- [x] 6. Add configuration for execution history
  - [x] 6.1 Add environment variables and configuration loading
    - Add TASK_HISTORY_ENABLED (default: true)
    - Add TASK_HISTORY_RETENTION_DAYS (default: 30)
    - Add TASK_HISTORY_MIN_RECORDS (default: 10)
    - Add TASK_HISTORY_PURGE_SCHEDULE (default: "0 2 * * *")
    - Add TASK_HISTORY_MAX_LOG_SIZE (default: 102400)
    - Load configuration in scheduler initialization
    - _Requirements: 6.1, 6.6, 7.5, 8.5_

  - [x] 6.2 Write unit tests for configuration loading
    - Test default values
    - Test custom values from environment
    - Test invalid values fallback to defaults
    - _Requirements: 6.1_

- [x] 7. Implement history purge scheduled task
  - [x] 7.1 Create purge task for cleaning old execution history
    - Register new scheduled task "task-history-purge"
    - Use configured purge schedule (default: 2 AM daily)
    - Calculate cutoff date based on retention period
    - Call deleteOlderThan() with cutoff date and minimum records
    - Log number of records deleted
    - Handle errors gracefully
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.2 Write unit tests for purge task
    - Test purge task is registered
    - Test purge deletes old records
    - Test purge preserves minimum records
    - Test purge logs deletion count
    - Test purge handles errors
    - _Requirements: 6.2, 6.5_

- [x] 8. Checkpoint - Ensure scheduler integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add API endpoint for execution history
  - [x] 9.1 Implement GET /api/admin/tasks/:name/history endpoint
    - Add route in admin routes
    - Implement getTaskExecutionHistory controller
    - Validate limit parameter (1-100, default 10)
    - Validate offset parameter (non-negative, default 0)
    - Query ExecutionHistoryRepository with pagination
    - Return response with executions array, total, limit, offset
    - Handle non-existent tasks (return empty array with 200)
    - Handle database errors (return 500)
    - Add authentication check (admin only)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 9.2 Write unit tests for API endpoint
    - Test successful history retrieval
    - Test pagination parameters
    - Test limit validation (min, max, default)
    - Test offset validation
    - Test non-existent task returns empty array
    - Test authentication required
    - Test database error handling
    - Test response format matches specification
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.3_

- [x] 10. Update frontend API client
  - [x] 10.1 Add getTaskExecutionHistory method to API client
    - Add TypeScript interface for ExecutionHistoryEntry
    - Add TypeScript interface for ExecutionHistoryResponse
    - Implement getTaskExecutionHistory(taskName, limit, offset) method
    - Handle API errors and return typed responses
    - _Requirements: 3.1, 3.5_

  - [x] 10.2 Write unit tests for API client method
    - Test successful API call
    - Test parameter passing
    - Test error handling
    - _Requirements: 3.1_

- [x] 11. Implement ExecutionHistoryModal component
  - [x] 11.1 Create modal component for displaying execution history
    - Create ExecutionHistoryModal.tsx component
    - Use createPortal for modal rendering
    - Display paginated list of executions
    - Show timestamp, result, duration, error message for each execution
    - Implement pagination controls (previous/next, page numbers)
    - Add loading state while fetching history
    - Add error state for API failures
    - Add empty state when no history exists
    - Implement click handler to view detailed logs
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 11.2 Write unit tests for ExecutionHistoryModal
    - Test modal renders with execution data
    - Test pagination controls work correctly
    - Test loading state displays
    - Test error state displays
    - Test empty state displays
    - Test click handler opens log viewer
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 12. Implement ExecutionLogViewer component
  - [x] 12.1 Create component for displaying detailed execution logs
    - Log viewer integrated into ExecutionHistoryModal component
    - Display logs in scrollable container with monospace font
    - Preserve log formatting (line breaks, indentation)
    - Add copy-to-clipboard button
    - Handle empty/null logs with appropriate message
    - Add back button to return to history list
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 12.2 Write unit tests for ExecutionLogViewer
    - Test logs display correctly
    - Test copy-to-clipboard functionality
    - Test empty logs message
    - Test formatting preservation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Integrate execution history into ScheduledTasksTab
  - [x] 13.1 Update ScheduledTasksTab to use ExecutionHistoryModal
    - Import ExecutionHistoryModal component
    - Replace existing inline logs modal with ExecutionHistoryModal
    - Update "Logs" button to open ExecutionHistoryModal
    - Remove old getTaskLogs API call and related state
    - Pass task name to modal
    - Handle modal open/close state
    - Maintain existing functionality (task list, enable/disable, trigger)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 13.2 Update ScheduledTasksTab tests for ExecutionHistoryModal integration
    - Update mock to use getTaskExecutionHistory instead of getTaskLogs
    - Test logs button opens execution history modal
    - Test modal displays execution history
    - Test existing functionality still works
    - _Requirements: 4.1, 8.4_

- [x] 14. Final checkpoint - Run full test suite
  - Run backend tests: `npm test -- --runInBand > /tmp/test-output.log 2>&1`
  - Run frontend tests: `cd frontend && npm test`
  - Verify all tests pass
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Update documentation
  - Update scheduler framework documentation with execution history feature
  - Document new environment variables
  - Document new API endpoint
  - Add examples of querying execution history
  - Document log retention and purge behavior
  - _Requirements: 6.1, 6.6_

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100 iterations
- Unit tests validate specific examples and edge cases
- History storage is asynchronous and non-blocking to avoid performance impact
- Backward compatibility is maintained throughout - existing functionality continues unchanged
- **Backend implementation (tasks 1-9) is complete**
- **Frontend API client and modal components (tasks 10-12) are complete**
- **Remaining work: Integrate ExecutionHistoryModal into ScheduledTasksTab (task 13), run final tests (task 14), and update documentation (task 15)**
