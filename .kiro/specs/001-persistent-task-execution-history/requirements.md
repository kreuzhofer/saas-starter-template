# Requirements Document

## Introduction

This feature adds persistent storage of task execution history with detailed logging capabilities to the existing scheduler framework. Currently, only the most recent execution status is stored in the ScheduledTaskStatus table, and historical execution data is lost when the application restarts. This enhancement will enable administrators to track task execution patterns over time, debug issues, audit task behavior, and view detailed logs from each execution.

## Glossary

- **Task_Scheduler**: The existing scheduler framework in `src/scheduler/` that manages scheduled task execution
- **Task_Execution**: A single run of a scheduled task, including its start time, end time, result, and logs
- **Execution_History**: The complete record of all past task executions stored in the database
- **Task_Logs**: Detailed log output captured during a task execution, including informational messages, warnings, and errors
- **Admin_Panel**: The frontend interface at `frontend/src/components/ScheduledTasksTab.tsx` where administrators view and manage tasks
- **ScheduledTaskStatus**: The existing database table that stores only the latest execution status for each task
- **TaskExecutionHistory**: The new database table that will store historical execution records with detailed logs

## Requirements

### Requirement 1: Persistent Task Execution History Storage

**User Story:** As an administrator, I want all task executions to be stored in a persistent database table, so that I can review historical execution data even after the application restarts.

#### Acceptance Criteria

1. WHEN a task execution completes, THE Task_Scheduler SHALL create a new record in the TaskExecutionHistory table
2. THE TaskExecutionHistory table SHALL store the task name, start time, end time, result status, error message (if any), and execution duration
3. WHEN the application restarts, THE Task_Scheduler SHALL preserve all historical execution records in the database
4. THE Task_Scheduler SHALL continue to update the ScheduledTaskStatus table with the latest execution for backward compatibility
5. WHEN querying execution history, THE Task_Scheduler SHALL return records ordered by execution start time in descending order

### Requirement 2: Detailed Log Capture and Storage

**User Story:** As an administrator, I want to see the actual log output from each task execution, so that I can understand what the task did and debug any issues.

#### Acceptance Criteria

1. WHEN a task begins execution, THE Task_Scheduler SHALL capture all log output generated during that execution
2. THE Task_Scheduler SHALL store captured logs as text in the TaskExecutionHistory record
3. WHEN a task logs messages at any level (debug, info, warn, error), THE Task_Scheduler SHALL include those messages in the captured logs
4. THE Task_Scheduler SHALL associate captured logs with the specific execution record
5. WHEN log capture fails, THE Task_Scheduler SHALL continue task execution and log the capture failure

### Requirement 3: Execution History API Endpoints

**User Story:** As an administrator, I want to query task execution history through API endpoints, so that the admin panel can display historical data.

#### Acceptance Criteria

1. WHEN an administrator requests execution history for a task, THE Admin_API SHALL return paginated execution records from the TaskExecutionHistory table
2. THE Admin_API SHALL accept a limit parameter to control the number of records returned (minimum 1, maximum 100, default 10)
3. THE Admin_API SHALL accept an offset parameter for pagination (default 0)
4. WHEN requesting execution history for a non-existent task, THE Admin_API SHALL return an empty array with a 200 status
5. THE Admin_API SHALL return execution records including task name, start time, end time, result, error message, duration, and captured logs

### Requirement 4: Admin Panel Execution History Display

**User Story:** As an administrator, I want to view execution history in the admin panel, so that I can see past executions beyond just the most recent one.

#### Acceptance Criteria

1. WHEN viewing task logs in the admin panel, THE Admin_Panel SHALL display a paginated list of historical executions
2. THE Admin_Panel SHALL show execution timestamp, result status, duration, and error message (if any) for each execution
3. WHEN an administrator clicks on a historical execution, THE Admin_Panel SHALL display the detailed logs for that execution
4. THE Admin_Panel SHALL provide pagination controls to navigate through execution history
5. WHEN no execution history exists for a task, THE Admin_Panel SHALL display a message indicating no history is available

### Requirement 5: Detailed Log Viewing

**User Story:** As an administrator, I want to view the detailed logs from any historical execution, so that I can understand what happened during that specific run.

#### Acceptance Criteria

1. WHEN viewing a historical execution, THE Admin_Panel SHALL display the captured logs in a readable format
2. THE Admin_Panel SHALL provide a copy-to-clipboard button for the log content
3. THE Admin_Panel SHALL preserve log formatting including line breaks and indentation
4. WHEN logs are empty or null, THE Admin_Panel SHALL display a message indicating no logs were captured
5. THE Admin_Panel SHALL display logs in a scrollable container with monospace font

### Requirement 6: Log Retention and Cleanup

**User Story:** As an administrator, I want to configure how long historical logs are retained in days, so that I can control database storage usage based on my needs.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a setting to configure the retention period for execution history in days (default 30 days)
2. THE Task_Scheduler SHALL create a daily scheduled task that purges execution records older than the configured retention period
3. WHEN the purge task runs, THE Task_Scheduler SHALL delete execution records where the startedAt timestamp is older than the retention period
4. THE Task_Scheduler SHALL preserve at least the most recent 10 executions for each task regardless of age
5. WHEN deleting old records, THE Task_Scheduler SHALL log the number of records deleted
6. THE purge task SHALL run daily at a configurable time (default 2:00 AM)
7. WHEN the retention period setting is changed, THE Task_Scheduler SHALL apply the new retention period on the next purge execution

### Requirement 7: Performance and Scalability

**User Story:** As a system administrator, I want execution history storage to have minimal performance impact, so that task execution is not slowed down.

#### Acceptance Criteria

1. WHEN storing execution history, THE Task_Scheduler SHALL perform database writes asynchronously
2. IF execution history storage fails, THE Task_Scheduler SHALL log the failure but continue normal operation
3. THE TaskExecutionHistory table SHALL have appropriate indexes on taskName and startedAt columns
4. WHEN querying execution history, THE Admin_API SHALL use indexed queries to ensure fast response times
5. THE Task_Scheduler SHALL limit captured log size to a maximum of 100KB per execution to prevent excessive storage

### Requirement 8: Backward Compatibility

**User Story:** As a developer, I want the new execution history feature to maintain backward compatibility, so that existing functionality continues to work.

#### Acceptance Criteria

1. THE Task_Scheduler SHALL continue to update the ScheduledTaskStatus table with the latest execution information
2. WHEN the TaskExecutionHistory table does not exist, THE Task_Scheduler SHALL continue to function using only ScheduledTaskStatus
3. THE existing task status API endpoints SHALL continue to return the same response format
4. THE Admin_Panel SHALL gracefully handle cases where execution history is not available
5. WHEN execution history is disabled via configuration, THE Task_Scheduler SHALL skip history storage without errors
