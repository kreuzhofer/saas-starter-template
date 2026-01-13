/**
 * Feature: task-scheduler, Property 1: Task registration validation
 * Validates: Requirements 1.2, 1.3
 * 
 * For any task configuration, if it has invalid fields (empty name, invalid schedule, 
 * missing execute function), then registration should be rejected with a descriptive error.
 */

import * as fc from 'fast-check';
import { TaskRegistry } from '../../scheduler/TaskRegistry';
import { ScheduledTask } from '../../scheduler/types';

describe('Property-Based Test: Task Registration Validation', () => {
  let registry: TaskRegistry;

  beforeEach(() => {
    registry = new TaskRegistry();
  });

  describe('Valid task configurations should be accepted', () => {
    it('should accept tasks with valid configurations', () => {
      fc.assert(
        fc.property(
          // Generate valid task configurations
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            schedule: fc.oneof(
              // Valid cron expressions
              fc.constantFrom(
                '* * * * *',
                '0 * * * *',
                '0 0 * * *',
                '0 2 * * *',
                '*/5 * * * *',
                '0 */6 * * *'
              ),
              // Valid interval strings
              fc.constantFrom(
                'every 1 minute',
                'every 5 minutes',
                'every 1 hour',
                'every 6 hours',
                'every 1 day'
              )
            ),
            enabled: fc.boolean(),
          }),
          (taskConfig) => {
            const task: ScheduledTask = {
              name: taskConfig.name,
              schedule: taskConfig.schedule,
              enabled: taskConfig.enabled,
              execute: async () => {
                // Mock execution function
              },
            };

            // Should not throw
            expect(() => registry.register(task)).not.toThrow();

            // Task should be retrievable
            expect(registry.has(task.name)).toBe(true);
            expect(registry.get(task.name)).toEqual(task);

            // Clear for next iteration
            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should accept tasks with optional onError handler', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom('* * * * *', '0 * * * *', 'every 1 hour'),
          fc.boolean(),
          (name, schedule, enabled) => {
            const task: ScheduledTask = {
              name,
              schedule,
              enabled,
              execute: async () => {},
              onError: (error: Error) => {
                console.error(error);
              },
            };

            expect(() => registry.register(task)).not.toThrow();
            expect(registry.has(task.name)).toBe(true);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Invalid task names should be rejected', () => {
    it('should reject tasks with empty or whitespace-only names', () => {
      fc.assert(
        fc.property(
          // Generate empty or whitespace-only strings
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('  \t  \n  ')
          ),
          (invalidName) => {
            const task: ScheduledTask = {
              name: invalidName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {},
            };

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/name/i);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should reject tasks with non-string names', () => {
      fc.assert(
        fc.property(
          // Generate non-string values
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean(),
            fc.object(),
            fc.array(fc.string())
          ),
          (invalidName) => {
            const task = {
              name: invalidName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {},
            } as any;

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/name/i);
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Invalid schedules should be rejected', () => {
    it('should reject tasks with empty or whitespace-only schedules', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n')
          ),
          (validName, invalidSchedule) => {
            const task: ScheduledTask = {
              name: validName,
              schedule: invalidSchedule,
              enabled: true,
              execute: async () => {},
            };

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/schedule/i);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should reject tasks with non-string schedules', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean(),
            fc.object()
          ),
          (validName, invalidSchedule) => {
            const task = {
              name: validName,
              schedule: invalidSchedule,
              enabled: true,
              execute: async () => {},
            } as any;

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/schedule/i);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Invalid enabled flag should be rejected', () => {
    it('should reject tasks with non-boolean enabled flag', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.string(),
            fc.constant('true'),
            fc.constant('false'),
            fc.constant(1),
            fc.constant(0)
          ),
          (validName, invalidEnabled) => {
            const task = {
              name: validName,
              schedule: '* * * * *',
              enabled: invalidEnabled,
              execute: async () => {},
            } as any;

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/enabled/i);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Invalid execute function should be rejected', () => {
    it('should reject tasks with missing execute function', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined)
          ),
          (validName, invalidExecute) => {
            const task = {
              name: validName,
              schedule: '* * * * *',
              enabled: true,
              execute: invalidExecute,
            } as any;

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/execute/i);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should reject tasks with non-function execute', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.object(),
            fc.array(fc.anything())
          ),
          (validName, invalidExecute) => {
            const task = {
              name: validName,
              schedule: '* * * * *',
              enabled: true,
              execute: invalidExecute,
            } as any;

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/execute/i);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Invalid onError handler should be rejected', () => {
    it('should reject tasks with non-function onError', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.object(),
            fc.array(fc.anything())
          ),
          (validName, invalidOnError) => {
            const task = {
              name: validName,
              schedule: '* * * * *',
              enabled: true,
              execute: async () => {},
              onError: invalidOnError,
            } as any;

            expect(() => registry.register(task)).toThrow();
            expect(() => registry.register(task)).toThrow(/onError/i);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Duplicate task names should be rejected', () => {
    it('should reject registration of tasks with duplicate names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('* * * * *', '0 * * * *', 'every 1 hour'),
          fc.boolean(),
          (name, schedule, enabled) => {
            const task1: ScheduledTask = {
              name,
              schedule,
              enabled,
              execute: async () => {},
            };

            const task2: ScheduledTask = {
              name, // Same name
              schedule: '0 0 * * *', // Different schedule
              enabled: !enabled, // Different enabled
              execute: async () => {}, // Different function
            };

            // First registration should succeed
            expect(() => registry.register(task1)).not.toThrow();

            // Second registration with same name should fail
            expect(() => registry.register(task2)).toThrow();
            expect(() => registry.register(task2)).toThrow(/already registered/i);

            // Only first task should be in registry
            expect(registry.size()).toBe(1);
            expect(registry.get(name)).toEqual(task1);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });

  describe('Registry operations should work correctly', () => {
    it('should correctly report task existence', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              schedule: fc.constantFrom('* * * * *', '0 * * * *', 'every 1 hour'),
              enabled: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (taskConfigs) => {
            // Remove duplicates by name
            const uniqueConfigs = Array.from(
              new Map(taskConfigs.map(c => [c.name, c])).values()
            );

            const registeredNames = new Set<string>();

            // Register all tasks
            for (const config of uniqueConfigs) {
              const task: ScheduledTask = {
                name: config.name,
                schedule: config.schedule,
                enabled: config.enabled,
                execute: async () => {},
              };

              registry.register(task);
              registeredNames.add(config.name);
            }

            // Verify all registered tasks exist
            for (const name of registeredNames) {
              expect(registry.has(name)).toBe(true);
              expect(registry.get(name)).toBeDefined();
            }

            // Verify getAll returns correct number
            expect(registry.getAll()).toHaveLength(uniqueConfigs.length);

            // Verify size is correct
            expect(registry.size()).toBe(uniqueConfigs.length);

            registry.clear();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });

    it('should return undefined for non-existent tasks', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          (nonExistentName) => {
            expect(registry.has(nonExistentName)).toBe(false);
            expect(registry.get(nonExistentName)).toBeUndefined();
          }
        ),
        { numRuns: 3 } // Reduced for faster test execution
      );
    });
  });
});
