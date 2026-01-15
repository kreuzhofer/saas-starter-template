/**
 * Feature: persistent-task-execution-history, Property 2: Execution history ordered by start time
 * Validates: Requirements 1.5
 * 
 * For any task with multiple execution records, when querying execution history,
 * the records should be returned ordered by startedAt timestamp in descending order (most recent first).
 */

import * as fc from 'fast-check';
import { ExecutionHistoryRepository, ExecutionHistoryRecord } from '../../scheduler/ExecutionHistoryRepository';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';

const db = getTestDb();
const repository = new ExecutionHistoryRepository();

describe('Property-Based Test: Execution History Ordering', () => {
  afterEach(async () => {
    // Clean up test execution history records
    await db.taskExecutionHistory.deleteMany({
      where: {
        taskName: {
          startsWith: 'test-task-',
        },
      },
    });
  });

  afterAll(async () => {
    // Final cleanup of all test data
    await cleanupTestDb();
  });

  describe('Property 2: Execution history ordered by start time', () => {
    it('should return execution history ordered by startedAt descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.date({
              min: new Date('2000-01-01T00:00:00.000Z'),
              max: new Date('2099-12-31T23:59:59.999Z'),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (dates) => {
            // Filter out invalid dates (NaN)
            const validDates = dates.filter(date => !isNaN(date.getTime()));
            
            // Skip test if we don't have enough valid dates
            if (validDates.length < 2) {
              return;
            }
            
            // Generate unique task name for this test run
            const taskName = `test-task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            // Create execution records with random dates
            for (const date of validDates) {
              const record: ExecutionHistoryRecord = {
                taskName,
                startedAt: date,
                completedAt: new Date(date.getTime() + 1000),
                result: 'success',
                errorMessage: null,
                duration: 1000,
                capturedLogs: 'test log',
              };
              await repository.create(record);
            }
            
            // Query history
            const history = await repository.findByTaskName({
              taskName,
              limit: 100,
              offset: 0,
            });
            
            // Verify we got all records
            expect(history.length).toBe(validDates.length);
            
            // Verify descending order (most recent first)
            for (let i = 0; i < history.length - 1; i++) {
              expect(history[i].startedAt.getTime())
                .toBeGreaterThanOrEqual(history[i + 1].startedAt.getTime());
            }
            
            // Clean up this test's data
            await db.taskExecutionHistory.deleteMany({
              where: { taskName },
            });
          }
        ),
        { numRuns: 5 } // DB operations: 3-5 runs per property-tests.md guidelines
      );
    });
  });
});
