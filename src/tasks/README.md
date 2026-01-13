# Scheduled Tasks

This directory contains all scheduled tasks that run in the background.

## Creating a New Task

To create a new scheduled task:

1. Create a new file in this directory (e.g., `myTask.ts`)
2. Define a task using the `ScheduledTask` interface
3. Register the task with the scheduler in `server.ts`

### Example Task

```typescript
import { ScheduledTask } from '../scheduler/types';
import logger from '../utils/logger';

export const myTask: ScheduledTask = {
  name: 'my-task',
  schedule: '0 2 * * *', // Daily at 2 AM
  enabled: true,
  execute: async () => {
    logger.info('Starting my task');
    
    // Task implementation here
    
    logger.info('My task completed');
  },
  onError: (error) => {
    logger.error('My task failed', { error });
  },
};
```

### Schedule Formats

**Cron Expressions:**
- `* * * * *` - Every minute
- `0 * * * *` - Every hour
- `0 2 * * *` - Daily at 2 AM
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

**Interval Strings:**
- `every 1 minute`
- `every 5 minutes`
- `every 1 hour`
- `every 6 hours`
- `every 1 day`

### Registering Tasks

In `server.ts`:

```typescript
import { scheduler } from './scheduler';
import { myTask } from './tasks/myTask';

// After other initializations...
scheduler.registerTask(myTask);
await scheduler.start();
```

## Best Practices

1. **Error Handling**: Always provide an `onError` handler
2. **Logging**: Log task start, completion, and any important steps
3. **Idempotency**: Design tasks to be safely re-runnable
4. **Performance**: Keep tasks lightweight and efficient
5. **Testing**: Test task logic independently before scheduling
