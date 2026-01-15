/**
 * Feature: persistent-task-execution-history, Property 4: API returns paginated history with complete data
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5
 * 
 * For any task with execution history, when querying the history API with limit and offset parameters,
 * the response should return the correct number of records (respecting the limit), skip the correct
 * number of records (respecting the offset), and each record should include all required fields
 * (taskName, startedAt, completedAt, result, errorMessage, duration, capturedLogs).
 */

import * as fc from 'fast-check';
import { ExecutionHistoryRepository, ExecutionHistoryRecord } from '../../scheduler/ExecutionHistoryRepository';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';

const db = getTestDb();
const repository = new ExecutionHistoryRepository();

describe('Property-Based Test: Execution History Pagination', () => {
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

  describe('Property 4: API returns paginated history with complete data', () => {
    it('should respect limit and offset parameters and return complete data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 30 }),  // totalRecords
          fc.integer({ min: 1, max: 15 }),  // limit
          fc.integer({ min: 0, max: 10 }),  // offset
          async (totalRecords, limit, offset) => {
            // Generate unique task name for this test run
            const taskName = `test-task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            // Create execution records with sequential timestamps
            const baseTime = Date.now();
            for (let i = 0; i < totalRecords; i++) {
              const startedAt = new Date(baseTime + i * 1000);
              const record: ExecutionHistoryRecord = {
                taskName,
                startedAt,
                completedAt: new Date(startedAt.getTime() + 500),
                result: i % 3 === 0 ? 'failure' : 'success',
                errorMessage: i % 3 === 0 ? `Error ${i}` : null,
                duration: 500,
                capturedLogs: `Log entry ${i}`,
              };
              await repository.create(record);
            }
            
            // Query with pagination
            const history = await repository.findByTaskName({
              taskName,
              limit,
              offset,
            });
            
            // Verify correct number of records returned
            const expectedCount = Math.min(limit, Math.max(0, totalRecords - offset));
            expect(history.length).toBe(expectedCount);
            
            // Verify all required fields are present in each record
            history.forEach(record => {
              // Requirement 3.5: Return execution records including all required fields
              
              // id field (from database)
              expect(record).toHaveProperty('id');
              expect(typeof record.id).toBe('string');
              
              // taskName field
              expect(record).toHaveProperty('taskName');
              expect(record.taskName).toBe(taskName);
              
              // startedAt field
              expect(record).toHaveProperty('startedAt');
              expect(record.startedAt).toBeInstanceOf(Date);
              
              // completedAt field
              expect(record).toHaveProperty('completedAt');
              expect(record.completedAt).toBeInstanceOf(Date);
              
              // result field
              expect(record).toHaveProperty('result');
              expect(['success', 'failure']).toContain(record.result);
              
              // errorMessage field (can be string or null)
              expect(record).toHaveProperty('errorMessage');
              
              // duration field
              expect(record).toHaveProperty('duration');
              expect(typeof record.duration).toBe('number');
              expect(record.duration).toBeGreaterThanOrEqual(0);
              
              // capturedLogs field (can be string or null)
              expect(record).toHaveProperty('capturedLogs');
              
              // createdAt field (from database)
              expect(record).toHaveProperty('createdAt');
              expect(record.createdAt).toBeInstanceOf(Date);
            });
            
            // Verify offset is respected (records are skipped correctly)
            if (offset > 0 && history.length > 0) {
              // Get all records without offset
              const allRecords = await repository.findByTaskName({
                taskName,
                limit: totalRecords,
                offset: 0,
              });
              
              // The first record in paginated result should match the record at offset position
              if (offset < allRecords.length) {
                expect(history[0].id).toBe(allRecords[offset].id);
              }
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
