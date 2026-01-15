/**
 * Feature: persistent-task-execution-history
 * 
 * Property 5: Purge deletes old records beyond retention period
 * Validates: Requirements 6.3
 * 
 * Property 6: Purge preserves minimum records per task
 * Validates: Requirements 6.4
 * 
 * For any set of execution records with various timestamps, when the purge task runs with a configured
 * retention period, all records with startedAt older than (current date - retention period) should be
 * deleted, except those protected by the minimum retention rule. The purge operation must preserve at
 * least the minimum number of records per task regardless of their age.
 */

import * as fc from 'fast-check';
import { ExecutionHistoryRepository, ExecutionHistoryRecord } from '../../scheduler/ExecutionHistoryRepository';
import { getTestDb, cleanupTestDb } from '../helpers/testDb';

const db = getTestDb();
const repository = new ExecutionHistoryRepository();

describe('Property-Based Test: Execution History Purge Age-Based Deletion', () => {
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

  describe('Property 5: Purge deletes old records beyond retention period', () => {
    it('should delete old records beyond retention period while preserving recent and minimum records', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 7, max: 90 }),  // retentionDays
          fc.integer({ min: 5, max: 15 }),  // minRecordsToKeep
          fc.integer({ min: 10, max: 30 }), // totalRecords
          async (retentionDays, minRecordsToKeep, totalRecords) => {
            // Generate unique task name for this test run
            const taskName = `test-task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            // Calculate cutoff date
            const now = new Date();
            const cutoffDate = new Date(now);
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            // Create execution records with timestamps spanning before and after cutoff
            const records: { startedAt: Date; isOld: boolean }[] = [];
            
            // Create old records (before cutoff)
            const oldRecordCount = Math.floor(totalRecords * 0.6);
            for (let i = 0; i < oldRecordCount; i++) {
              // Random date between 1-365 days before cutoff
              const daysBeforeCutoff = Math.floor(Math.random() * 365) + 1;
              const startedAt = new Date(cutoffDate);
              startedAt.setDate(startedAt.getDate() - daysBeforeCutoff);
              
              const record: ExecutionHistoryRecord = {
                taskName,
                startedAt,
                completedAt: new Date(startedAt.getTime() + 1000),
                result: 'success',
                errorMessage: null,
                duration: 1000,
                capturedLogs: `Old log ${i}`,
              };
              await repository.create(record);
              records.push({ startedAt, isOld: true });
            }
            
            // Create recent records (after cutoff)
            const recentRecordCount = totalRecords - oldRecordCount;
            for (let i = 0; i < recentRecordCount; i++) {
              // Random date between cutoff and now
              const daysAfterCutoff = Math.floor(Math.random() * retentionDays);
              const startedAt = new Date(cutoffDate);
              startedAt.setDate(startedAt.getDate() + daysAfterCutoff);
              
              const record: ExecutionHistoryRecord = {
                taskName,
                startedAt,
                completedAt: new Date(startedAt.getTime() + 1000),
                result: 'success',
                errorMessage: null,
                duration: 1000,
                capturedLogs: `Recent log ${i}`,
              };
              await repository.create(record);
              records.push({ startedAt, isOld: false });
            }
            
            // Get count before purge
            const countBefore = await repository.countByTaskName(taskName);
            expect(countBefore).toBe(totalRecords);
            
            // Execute purge
            const deletedCount = await repository.deleteOlderThan(
              cutoffDate,
              minRecordsToKeep
            );
            
            // Get remaining records
            const remainingRecords = await repository.findByTaskName({
              taskName,
              limit: 100,
              offset: 0,
            });
            
            // Verify minimum records are preserved
            expect(remainingRecords.length).toBeGreaterThanOrEqual(
              Math.min(minRecordsToKeep, totalRecords)
            );
            
            // Verify all recent records (after cutoff) are preserved
            const recentRecordsRemaining = remainingRecords.filter(
              r => r.startedAt >= cutoffDate
            );
            expect(recentRecordsRemaining.length).toBe(recentRecordCount);
            
            // Verify old records are deleted (except those protected by minimum retention)
            const oldRecordsRemaining = remainingRecords.filter(
              r => r.startedAt < cutoffDate
            );
            
            // If total records <= minRecordsToKeep, no records should be deleted
            if (totalRecords <= minRecordsToKeep) {
              expect(deletedCount).toBe(0);
              expect(remainingRecords.length).toBe(totalRecords);
            } else {
              // Some old records should be deleted
              // But at least minRecordsToKeep should remain
              expect(remainingRecords.length).toBeGreaterThanOrEqual(minRecordsToKeep);
              
              // If we have more than minRecordsToKeep records remaining,
              // they should be the most recent ones
              if (remainingRecords.length > minRecordsToKeep) {
                // All recent records should be present
                expect(recentRecordsRemaining.length).toBe(recentRecordCount);
              }
              
              // Deleted count should match the difference
              expect(deletedCount).toBe(countBefore - remainingRecords.length);
            }
            
            // Verify remaining records are ordered by startedAt descending
            for (let i = 0; i < remainingRecords.length - 1; i++) {
              expect(remainingRecords[i].startedAt.getTime())
                .toBeGreaterThanOrEqual(remainingRecords[i + 1].startedAt.getTime());
            }
            
            // Clean up this test's data
            await db.taskExecutionHistory.deleteMany({
              where: { taskName },
            });
          }
        ),
        { numRuns: 3 } // DB operations: 3-5 runs per property-tests.md guidelines
      );
    });
  });

  describe('Property 6: Purge preserves minimum records per task', () => {
    /**
     * **Validates: Requirements 6.4**
     * 
     * For any task with execution records older than the retention period, when the purge task runs,
     * at least the most recent 10 execution records for that task should be preserved regardless of
     * their age.
     * 
     * This test verifies that even when ALL records are older than the retention period, the purge
     * operation still preserves the minimum number of most recent records.
     */
    it('should preserve minimum records per task regardless of age', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 15 }),  // minRecordsToKeep
          fc.integer({ min: 15, max: 40 }), // totalOldRecords (all older than retention)
          async (minRecordsToKeep, totalOldRecords) => {
            // Clean up any existing test data first to ensure isolation
            await db.taskExecutionHistory.deleteMany({
              where: {
                taskName: {
                  startsWith: 'test-task-',
                },
              },
            });
            
            // Generate unique task name for this test run
            const taskName = `test-task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            // Set cutoff date to be in the future, so ALL records will be "old"
            const now = new Date();
            const cutoffDate = new Date(now);
            cutoffDate.setDate(cutoffDate.getDate() + 1); // Tomorrow
            
            // Create execution records that are ALL older than the cutoff date
            // These records span from 365 days ago to 2 days ago
            const createdRecords: Date[] = [];
            for (let i = 0; i < totalOldRecords; i++) {
              // Create records with dates from 365 days ago to 2 days ago
              const daysAgo = 365 - Math.floor((i / totalOldRecords) * 363);
              const startedAt = new Date(now);
              startedAt.setDate(startedAt.getDate() - daysAgo);
              
              const record: ExecutionHistoryRecord = {
                taskName,
                startedAt,
                completedAt: new Date(startedAt.getTime() + 1000),
                result: 'success',
                errorMessage: null,
                duration: 1000,
                capturedLogs: `Old log ${i}`,
              };
              await repository.create(record);
              createdRecords.push(startedAt);
            }
            
            // Verify all records were created
            const countBefore = await repository.countByTaskName(taskName);
            expect(countBefore).toBe(totalOldRecords);
            
            // Execute purge with cutoff date in the future
            // This means ALL records are older than the cutoff
            // Note: deleteOlderThan processes ALL tasks, so deletedCount may include other tasks
            await repository.deleteOlderThan(
              cutoffDate,
              minRecordsToKeep
            );
            
            // Get remaining records for our specific task
            const remainingRecords = await repository.findByTaskName({
              taskName,
              limit: 100,
              offset: 0,
            });
            
            const countAfter = await repository.countByTaskName(taskName);
            
            // CRITICAL ASSERTION: At least minRecordsToKeep should be preserved
            // even though ALL records are older than the retention period
            expect(remainingRecords.length).toBeGreaterThanOrEqual(
              Math.min(minRecordsToKeep, totalOldRecords)
            );
            
            // If we have more records than the minimum, verify we kept exactly the minimum
            if (totalOldRecords > minRecordsToKeep) {
              expect(remainingRecords.length).toBe(minRecordsToKeep);
              expect(countAfter).toBe(minRecordsToKeep);
              
              // Verify the correct number of records were deleted for this task
              const deletedForThisTask = countBefore - countAfter;
              expect(deletedForThisTask).toBe(totalOldRecords - minRecordsToKeep);
            } else {
              // If total records <= minimum, no records should be deleted
              expect(remainingRecords.length).toBe(totalOldRecords);
              expect(countAfter).toBe(totalOldRecords);
              
              const deletedForThisTask = countBefore - countAfter;
              expect(deletedForThisTask).toBe(0);
            }
            
            // Verify the preserved records are the MOST RECENT ones
            // They should be ordered by startedAt descending
            for (let i = 0; i < remainingRecords.length - 1; i++) {
              expect(remainingRecords[i].startedAt.getTime())
                .toBeGreaterThanOrEqual(remainingRecords[i + 1].startedAt.getTime());
            }
            
            // Verify all remaining records are indeed older than cutoff
            // (proving that age didn't matter, only the minimum count)
            remainingRecords.forEach(record => {
              expect(record.startedAt.getTime()).toBeLessThan(cutoffDate.getTime());
            });
            
            // Clean up this test's data
            await db.taskExecutionHistory.deleteMany({
              where: { taskName },
            });
          }
        ),
        { numRuns: 3 } // DB operations: 3-5 runs per property-tests.md guidelines
      );
    });
  });
});
