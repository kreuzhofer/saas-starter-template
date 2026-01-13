# Task Scheduler Framework

A general-purpose task scheduler for executing recurring background jobs in the backend application. The scheduler provides a robust foundation for tasks such as link health checks, analytics aggregation, database cleanups, and notification delivery.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Creating Tasks](#creating-tasks)
- [Schedule Formats](#schedule-formats)
- [Error Handling](#error-handling)
- [Task Management](#task-management)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Features

- ✅ **Flexible Scheduling**: Support for cron expressions and interval-based schedules
- ✅ **Error Isolation**: Task failures don't affect other tasks or the main application
- ✅ **Status Persistence**: Task execution status saved to database for monitoring
- ✅ **Manual Triggering**: Execute tasks on-demand for testing and debugging
- ✅ **Enable/Disable**: Control task execution without removing from registry
- ✅ **Graceful Shutdown**: Properly stops all tasks when application terminates
- ✅ **Comprehensive Logging**: Detailed logs for all scheduler operations
- ✅ **TypeScript Support**: Full type safety and IntelliSense support

## Quick Start

### 1. Create a Task

Create a new file in `src/tasks/` directory:

```typescript
// src/tasks/myTask.ts
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';

export const myTask: ScheduledTask = {
  name: 'my-task',
  schedule: '0 2 * * *', // Daily at 2 AM
  enabled: true,
  execute: async () => {
    logger.info('Starting my task');
    
    // Your task logic here
    await doSomething();
    
    logger.info('My task completed');
  },
  onError: (error) => {
    logger.error('My task failed', { error });
    // Optional: Send alert notification
  },
};
```

### 2. Register the Task

In `src/server.ts`, register your task with the scheduler:

```typescript
import { scheduler } from './scheduler';
import { myTask } from './tasks/myTask';

// After other initializations...
scheduler.registerTask(myTask);
await scheduler.start();
logger.info('Task scheduler started');
```

### 3. Done!

Your task will now execute automatically according to its schedule.

## Creating Tasks

### Task Structure

A task is defined using the `ScheduledTask` interface:

```typescript
interface ScheduledTask {
  name: string;                    // Unique task identifier
  schedule: string;                // Cron expression or interval
  enabled: boolean;                // Whether task should run
  execute: () => Promise<void>;    // Task execution function
  onError?: (error: Error) => void; // Optional error handler
}
```

### Task Properties

#### `name` (required)
- **Type**: `string`
- **Description**: Unique identifier for the task
- **Rules**: Must be unique across all registered tasks
- **Example**: `'link-health-check'`, `'analytics-aggregation'`

#### `schedule` (required)
- **Type**: `string`
- **Description**: When the task should run
- **Formats**: Cron expression or interval string
- **Examples**: `'0 2 * * *'`, `'every 1 hour'`

#### `enabled` (required)
- **Type**: `boolean`
- **Description**: Whether the task should execute on its schedule
- **Usage**: Set to `false` to temporarily disable a task

#### `execute` (required)
- **Type**: `() => Promise<void>`
- **Description**: Async function containing task logic
- **Rules**: Should be idempotent and handle errors gracefully

#### `onError` (optional)
- **Type**: `(error: Error) => void`
- **Description**: Called when task execution fails
- **Usage**: Log errors, send alerts, or perform cleanup

### Example Task with All Features

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import { sendAlert } from '../services/alerts';

export const comprehensiveTask: ScheduledTask = {
  name: 'comprehensive-task',
  schedule: '*/30 * * * *', // Every 30 minutes
  enabled: true,
  
  execute: async () => {
    logger.info('Starting comprehensive task');
    
    try {
      // Step 1: Fetch data
      const data = await fetchData();
      logger.debug('Data fetched', { count: data.length });
      
      // Step 2: Process data
      const results = await processData(data);
      logger.debug('Data processed', { results });
      
      // Step 3: Save results
      await saveResults(results);
      logger.info('Results saved successfully');
      
    } catch (error) {
      logger.error('Task execution failed', { error });
      throw error; // Re-throw to trigger onError handler
    }
    
    logger.info('Comprehensive task completed');
  },
  
  onError: async (error) => {
    logger.error('Comprehensive task failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    // Send alert to monitoring system
    await sendAlert({
      severity: 'high',
      message: `Task failed: ${error.message}`,
      task: 'comprehensive-task',
    });
  },
};
```

## Schedule Formats

The scheduler supports two schedule formats: **cron expressions** and **interval strings**.

### Cron Expressions

Standard 5-field cron format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday = 0)
│ │ │ │ │
* * * * *
```

#### Common Cron Patterns

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every minute | `* * * * *` | Runs every minute |
| Every 5 minutes | `*/5 * * * *` | Runs every 5 minutes |
| Every 15 minutes | `*/15 * * * *` | Runs every 15 minutes |
| Every 30 minutes | `*/30 * * * *` | Runs every 30 minutes |
| Every hour | `0 * * * *` | Runs at the start of every hour |
| Every 6 hours | `0 */6 * * *` | Runs every 6 hours |
| Daily at 2 AM | `0 2 * * *` | Runs once per day at 2:00 AM |
| Daily at noon | `0 12 * * *` | Runs once per day at 12:00 PM |
| Weekly on Sunday | `0 0 * * 0` | Runs every Sunday at midnight |
| Weekly on Monday | `0 0 * * 1` | Runs every Monday at midnight |
| Monthly on 1st | `0 0 1 * *` | Runs on the 1st of each month |
| Weekdays at 9 AM | `0 9 * * 1-5` | Runs Mon-Fri at 9:00 AM |

#### Cron Expression Examples

```typescript
// Every minute
schedule: '* * * * *'

// Every 10 minutes
schedule: '*/10 * * * *'

// Every hour at 30 minutes past
schedule: '30 * * * *'

// Daily at 3:30 AM
schedule: '30 3 * * *'

// Every Monday at 9 AM
schedule: '0 9 * * 1'

// First day of every month at midnight
schedule: '0 0 1 * *'

// Every 6 hours
schedule: '0 */6 * * *'

// Weekdays at 8 AM
schedule: '0 8 * * 1-5'
```

### Interval Strings

Human-readable interval format (converted to cron internally):

| Interval String | Equivalent Cron | Description |
|----------------|-----------------|-------------|
| `every 1 minute` | `* * * * *` | Every minute |
| `every 5 minutes` | `*/5 * * * *` | Every 5 minutes |
| `every 15 minutes` | `*/15 * * * *` | Every 15 minutes |
| `every 30 minutes` | `*/30 * * * *` | Every 30 minutes |
| `every 1 hour` | `0 * * * *` | Every hour |
| `every 2 hours` | `0 */2 * * *` | Every 2 hours |
| `every 6 hours` | `0 */6 * * *` | Every 6 hours |
| `every 12 hours` | `0 */12 * * *` | Every 12 hours |
| `every 1 day` | `0 0 * * *` | Daily at midnight |

#### Interval String Examples

```typescript
// Every minute
schedule: 'every 1 minute'

// Every 5 minutes
schedule: 'every 5 minutes'

// Every hour
schedule: 'every 1 hour'

// Every 6 hours
schedule: 'every 6 hours'

// Daily
schedule: 'every 1 day'
```

### Choosing a Schedule Format

- **Use cron expressions** when you need precise timing (e.g., "daily at 2 AM")
- **Use interval strings** for simple recurring intervals (e.g., "every 1 hour")
- Both formats are equally valid and performant

## Error Handling

The scheduler provides robust error handling to ensure task failures don't affect the application or other tasks.

### Automatic Error Handling

All task executions are wrapped in try-catch blocks:

```typescript
// This is handled automatically by the scheduler
try {
  await task.execute();
  // Status updated: success
} catch (error) {
  // Error logged automatically
  // Status updated: failure
  // onError handler called if provided
  // Other tasks continue running
}
```

### Custom Error Handlers

Provide an `onError` handler for custom error handling:

```typescript
export const myTask: ScheduledTask = {
  name: 'my-task',
  schedule: '0 * * * *',
  enabled: true,
  
  execute: async () => {
    // Task logic that might fail
    await riskyOperation();
  },
  
  onError: (error) => {
    // Custom error handling
    logger.error('Task failed', { 
      task: 'my-task',
      error: error.message,
      stack: error.stack 
    });
    
    // Send alert
    sendAlert('Task my-task failed: ' + error.message);
    
    // Update metrics
    metrics.increment('task.failures', { task: 'my-task' });
  },
};
```

### Error Handling Best Practices

1. **Log Errors**: Always log errors with context
2. **Don't Swallow Errors**: Let errors propagate to the scheduler
3. **Use onError**: Provide custom error handlers for critical tasks
4. **Monitor Failures**: Track task failures in your monitoring system
5. **Handle Partial Failures**: Design tasks to handle partial failures gracefully

### Error Handling Patterns

#### Pattern 1: Retry Logic

```typescript
execute: async () => {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      await performOperation();
      return; // Success
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error; // Final attempt failed
      }
      logger.warn(`Attempt ${attempts} failed, retrying...`);
      await sleep(1000 * attempts); // Exponential backoff
    }
  }
}
```

#### Pattern 2: Graceful Degradation

```typescript
execute: async () => {
  try {
    // Try primary operation
    await primaryOperation();
  } catch (error) {
    logger.warn('Primary operation failed, using fallback', { error });
    // Fall back to alternative
    await fallbackOperation();
  }
}
```

#### Pattern 3: Partial Success

```typescript
execute: async () => {
  const items = await fetchItems();
  const errors = [];
  
  for (const item of items) {
    try {
      await processItem(item);
    } catch (error) {
      errors.push({ item, error });
      logger.error('Failed to process item', { item, error });
    }
  }
  
  if (errors.length > 0) {
    logger.warn(`Processed ${items.length - errors.length}/${items.length} items`);
  }
}
```

## Task Management

### Manual Task Triggering

Execute a task immediately for testing or debugging:

```typescript
// Trigger a task manually
await scheduler.triggerTask('my-task');
```

This executes the task immediately without affecting its regular schedule.

### Enable/Disable Tasks

Control task execution at runtime:

```typescript
// Disable a task
await scheduler.setTaskEnabled('my-task', false);

// Enable a task
await scheduler.setTaskEnabled('my-task', true);
```

Disabled tasks remain registered but won't execute on their schedule.

### Get Task Status

Retrieve status for all registered tasks:

```typescript
const statuses = await scheduler.getTaskStatuses();

statuses.forEach(status => {
  console.log(`Task: ${status.taskName}`);
  console.log(`Enabled: ${status.enabled}`);
  console.log(`Last Run: ${status.lastRun}`);
  console.log(`Next Run: ${status.nextRun}`);
  console.log(`Last Result: ${status.lastResult}`);
  console.log(`Last Duration: ${status.lastDuration}ms`);
});
```

### Task Status Properties

```typescript
interface TaskStatus {
  taskName: string;           // Task name
  enabled: boolean;           // Whether task is enabled
  lastRun: Date | null;       // Last execution timestamp
  nextRun: Date | null;       // Next scheduled execution
  lastResult: 'success' | 'failure' | null;  // Last execution result
  lastError: string | null;   // Error message if failed
  lastDuration: number | null; // Execution duration in ms
}
```

## Configuration

The scheduler can be configured using environment variables.

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SCHEDULER_TIMEZONE` | string | `'UTC'` | Timezone for cron expressions |
| `SCHEDULER_SHUTDOWN_TIMEOUT_MS` | number | `5000` | Graceful shutdown timeout (ms) |
| `SCHEDULER_ENABLE_STATUS_PERSISTENCE` | boolean | `true` | Enable database persistence |

### Configuration Examples

```bash
# Use a specific timezone
SCHEDULER_TIMEZONE=America/New_York

# Increase shutdown timeout to 10 seconds
SCHEDULER_SHUTDOWN_TIMEOUT_MS=10000

# Disable status persistence (not recommended)
SCHEDULER_ENABLE_STATUS_PERSISTENCE=false
```

### Timezone Considerations

- **Default**: UTC (recommended for consistency)
- **Options**: Any valid IANA timezone (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`)
- **Impact**: Affects when cron expressions execute
- **Example**: `0 2 * * *` with `America/New_York` runs at 2 AM Eastern Time

### Shutdown Timeout

- **Purpose**: How long to wait for running tasks before forcing shutdown
- **Default**: 5000ms (5 seconds)
- **Recommendation**: Set based on your longest-running task
- **Example**: If tasks can take up to 30 seconds, set to `30000`

## API Reference

### Scheduler Methods

#### `registerTask(task: ScheduledTask): void`

Registers a task with the scheduler.

```typescript
scheduler.registerTask({
  name: 'my-task',
  schedule: '0 * * * *',
  enabled: true,
  execute: async () => { /* ... */ },
});
```

**Throws**: Error if task name already exists or configuration is invalid

#### `start(): Promise<void>`

Starts the scheduler and all enabled tasks.

```typescript
await scheduler.start();
```

**Note**: Call this once during application startup

#### `stop(): Promise<void>`

Stops the scheduler and all tasks gracefully.

```typescript
await scheduler.stop();
```

**Note**: Call this during application shutdown

#### `triggerTask(taskName: string): Promise<void>`

Manually executes a task immediately.

```typescript
await scheduler.triggerTask('my-task');
```

**Throws**: Error if task not found

#### `getTaskStatuses(): Promise<TaskStatus[]>`

Retrieves status for all registered tasks.

```typescript
const statuses = await scheduler.getTaskStatuses();
```

**Returns**: Array of task status objects

#### `setTaskEnabled(taskName: string, enabled: boolean): Promise<void>`

Enables or disables a task.

```typescript
await scheduler.setTaskEnabled('my-task', false); // Disable
await scheduler.setTaskEnabled('my-task', true);  // Enable
```

## Best Practices

### 1. Task Design

✅ **DO**:
- Keep tasks focused on a single responsibility
- Make tasks idempotent (safe to run multiple times)
- Handle errors gracefully
- Log important steps and outcomes
- Use descriptive task names

❌ **DON'T**:
- Create long-running tasks (> 5 minutes)
- Assume tasks run exactly on schedule
- Depend on execution order of different tasks
- Store state in memory between executions

### 2. Error Handling

✅ **DO**:
- Provide `onError` handlers for critical tasks
- Log errors with sufficient context
- Monitor task failures
- Design for partial failures

❌ **DON'T**:
- Swallow errors silently
- Let errors crash the application
- Retry indefinitely without backoff

### 3. Scheduling

✅ **DO**:
- Use UTC timezone for consistency
- Choose appropriate intervals (not too frequent)
- Consider system load and peak hours
- Test schedules before deploying

❌ **DON'T**:
- Schedule tasks too frequently (< 1 minute)
- Run heavy tasks during peak hours
- Overlap long-running tasks

### 4. Performance

✅ **DO**:
- Process data in batches
- Use database indexes for queries
- Implement pagination for large datasets
- Monitor task execution time

❌ **DON'T**:
- Load entire datasets into memory
- Perform N+1 queries
- Block the event loop with CPU-intensive work

### 5. Testing

✅ **DO**:
- Test task logic independently
- Use manual triggering for testing
- Test error scenarios
- Monitor task execution in staging

❌ **DON'T**:
- Test only in production
- Skip error case testing
- Assume tasks work without verification

## Examples

### Example 1: Database Cleanup Task

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import { db } from '../db/client';

export const databaseCleanupTask: ScheduledTask = {
  name: 'database-cleanup',
  schedule: '0 3 * * *', // Daily at 3 AM
  enabled: true,
  
  execute: async () => {
    logger.info('Starting database cleanup');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Delete old click events
    const result = await db.clickEvent.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo,
        },
      },
    });
    
    logger.info('Database cleanup completed', { 
      deletedRecords: result.count 
    });
  },
  
  onError: (error) => {
    logger.error('Database cleanup failed', { error });
  },
};
```

### Example 2: Analytics Aggregation Task

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import { aggregateAnalytics } from '../services/analytics';

export const analyticsAggregationTask: ScheduledTask = {
  name: 'analytics-aggregation',
  schedule: '0 */6 * * *', // Every 6 hours
  enabled: true,
  
  execute: async () => {
    logger.info('Starting analytics aggregation');
    
    const startTime = Date.now();
    
    // Aggregate hourly data
    await aggregateAnalytics('hourly');
    
    // Aggregate daily data
    await aggregateAnalytics('daily');
    
    const duration = Date.now() - startTime;
    logger.info('Analytics aggregation completed', { 
      durationMs: duration 
    });
  },
  
  onError: (error) => {
    logger.error('Analytics aggregation failed', { error });
    // Send alert to monitoring system
  },
};
```

### Example 3: Email Notification Task

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import { sendDailyReport } from '../services/email';
import { getActiveUsers } from '../services/users';

export const dailyReportTask: ScheduledTask = {
  name: 'daily-report',
  schedule: '0 8 * * *', // Daily at 8 AM
  enabled: true,
  
  execute: async () => {
    logger.info('Starting daily report generation');
    
    const users = await getActiveUsers();
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of users) {
      try {
        await sendDailyReport(user);
        successCount++;
      } catch (error) {
        logger.error('Failed to send report', { 
          userId: user.id, 
          error 
        });
        failureCount++;
      }
    }
    
    logger.info('Daily report task completed', { 
      total: users.length,
      success: successCount,
      failures: failureCount 
    });
  },
  
  onError: (error) => {
    logger.error('Daily report task failed', { error });
  },
};
```

### Example 4: API Health Check Task

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import axios from 'axios';

export const apiHealthCheckTask: ScheduledTask = {
  name: 'api-health-check',
  schedule: 'every 5 minutes',
  enabled: true,
  
  execute: async () => {
    const endpoints = [
      'https://api.example.com/health',
      'https://api.example.com/status',
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(endpoint, { timeout: 5000 });
        const duration = Date.now() - startTime;
        
        logger.debug('Health check passed', { 
          endpoint, 
          status: response.status,
          durationMs: duration 
        });
      } catch (error) {
        logger.error('Health check failed', { 
          endpoint, 
          error: error.message 
        });
        // Send alert for failed health check
      }
    }
  },
  
  onError: (error) => {
    logger.error('Health check task failed', { error });
  },
};
```

### Example 5: Data Synchronization Task

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';
import { syncWithExternalAPI } from '../services/sync';

export const dataSyncTask: ScheduledTask = {
  name: 'data-sync',
  schedule: '*/30 * * * *', // Every 30 minutes
  enabled: true,
  
  execute: async () => {
    logger.info('Starting data synchronization');
    
    try {
      const result = await syncWithExternalAPI();
      
      logger.info('Data synchronization completed', {
        recordsSynced: result.count,
        lastSyncId: result.lastId,
      });
    } catch (error) {
      // Check if it's a temporary network error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        logger.warn('Temporary sync failure, will retry next cycle', { 
          error: error.message 
        });
        // Don't throw - let it retry on next schedule
      } else {
        // Permanent error - throw to trigger onError
        throw error;
      }
    }
  },
  
  onError: (error) => {
    logger.error('Data sync task failed permanently', { error });
    // Send alert for permanent failure
  },
};
```

## Troubleshooting

### Task Not Executing

**Possible causes**:
1. Task is disabled (`enabled: false`)
2. Invalid cron expression
3. Scheduler not started
4. Task registration failed

**Solutions**:
- Check task status: `await scheduler.getTaskStatuses()`
- Verify cron expression using online validator
- Check logs for registration errors
- Manually trigger task to test: `await scheduler.triggerTask('task-name')`

### Task Failing Silently

**Possible causes**:
1. Error swallowed in task code
2. No error logging
3. Missing `onError` handler

**Solutions**:
- Add comprehensive logging
- Provide `onError` handler
- Check database for task status
- Review application logs

### Schedule Not Working as Expected

**Possible causes**:
1. Timezone mismatch
2. Incorrect cron expression
3. System clock issues

**Solutions**:
- Verify `SCHEDULER_TIMEZONE` setting
- Test cron expression with online tools
- Check system time: `date`
- Use UTC timezone for consistency

### Performance Issues

**Possible causes**:
1. Tasks running too frequently
2. Long-running tasks blocking
3. Database queries not optimized

**Solutions**:
- Increase task interval
- Optimize database queries
- Add indexes to database
- Process data in batches
- Monitor task execution time

## Additional Resources

- [node-cron Documentation](https://github.com/node-cron/node-cron)
- [Cron Expression Generator](https://crontab.guru/)
- [IANA Timezone Database](https://www.iana.org/time-zones)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs
3. Check task status in database
4. Consult the design document at `.kiro/specs/task-scheduler/design.md`
