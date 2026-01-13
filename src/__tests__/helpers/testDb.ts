import { PrismaClient } from '@prisma/client';
import prisma from '../../db/client';

/**
 * Track IDs of entities created during tests for selective cleanup
 */
const testEntityIds = {
  accounts: new Set<string>(),
  emailConfirmationTokens: new Set<string>(),
  passwordResetTokens: new Set<string>(),
  emailChangeTokens: new Set<string>(),
  scheduledTaskStatuses: new Set<string>(), // Track task names
  banners: new Set<string>(),
  bannerDismissals: new Set<string>(),
};

/**
 * Get or create a Prisma client instance for testing
 * In test mode, we use the same instance as the production code to ensure consistency
 */
export function getTestDb(): PrismaClient {
  return prisma;
}

/**
 * Generate a unique test task name with a consistent prefix
 * This ensures all test tasks can be identified and cleaned up
 * 
 * @param baseName - Optional base name for the task (will be sanitized)
 * @returns A unique test task name with the format: test-task-<timestamp>-<random>[-baseName]
 */
export function generateTestTaskName(baseName?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = baseName ? `-${baseName.replace(/[^a-zA-Z0-9-]/g, '')}` : '';
  return `test-task-${timestamp}-${random}${sanitized}`;
}

/**
 * Register an entity ID as test-created for later cleanup
 */
export function registerTestEntity(
  entityType: keyof typeof testEntityIds,
  id: string
): void {
  testEntityIds[entityType].add(id);
}

/**
 * Register an account by username for cleanup
 * Useful when accounts are created through API endpoints
 */
export async function registerTestAccountByUsername(
  username: string
): Promise<void> {
  const db = getTestDb();
  const account = await db.account.findUnique({
    where: { username },
  });
  
  if (account) {
    registerTestEntity('accounts', account.id);
  }
}

/**
 * Auto-register test accounts created through API endpoints
 * This finds accounts with test-like usernames and registers them for cleanup
 * 
 * IMPORTANT: Only matches accounts with very specific test patterns to avoid
 * accidentally deleting real user data
 */
export async function autoRegisterTestAccounts(): Promise<void> {
  const db = getTestDb();
  
  // Get the admin account ID to ensure we NEVER register it
  const adminAccount = await db.account.findUnique({
    where: { username: 'admin@example.com' },
    select: { id: true },
  });
  
  // Get all accounts except the admin
  const allAccounts = await db.account.findMany({
    where: {
      NOT: {
        username: 'admin@example.com',
      },
    },
    select: { id: true, username: true },
  });
  
  // Real user accounts that should NEVER be deleted
  const protectedAccounts = new Set([
    'admin@example.com',
  ]);
  
  // Filter for test accounts using regex patterns
  const testAccounts = allAccounts.filter(account => {
    const username = account.username;
    
    // Never delete protected accounts
    if (protectedAccounts.has(username)) {
      return false;
    }
    
    // Match simple test patterns (test@example.com, newemail@example.com, etc.)
    if (
      username === 'test@example.com' ||
      username === 'newemail@example.com' ||
      username === 'updated@example.com' ||
      username === 'newuser@example.com' ||
      username === 'testuser@example.com' ||
      username === 'logintest@example.com' ||
      username === 'testadmin@example.com' ||
      username === 'target@example.com' ||
      username === 'nonexistent@example.com' ||
      username === 'test-validation@example.com' ||
      username === 'test-delete@example.com' ||
      username === 'shopify-test@example.com' ||
      username === 'another@example.com' ||
      username === 'secure@example.com' ||
      username === 'langtest@example.com' ||
      username === 'admin@test.com' ||
      username === 'profile@example.com' ||
      username === 'changed@example.com' ||
      username === 'duplicate@example.com' ||
      username === 'existing@example.com' ||
      username === 'inactive@example.com' ||
      username === 'login@example.com' ||
      username === 'refresh@example.com' ||
      username === 'redirecttest@example.com'
    ) {
      return true;
    }
    
    // Match common test email patterns with numbers or hyphens
    if (
      username === 'user@example.com' ||
      username === 'first@example.com' ||
      username === 'second@example.com' ||
      username === 'old@example.com' ||
      username === 'new@example.com' ||
      /^test\d+@example\.com$/.test(username) ||
      /^user\d+@example\.com$/.test(username) ||
      /^other\d*@example\.com$/.test(username) ||
      /^customcode@example\.com$/.test(username) ||
      /^youtube@example\.com$/.test(username) ||
      /^domaintest@example\.com$/.test(username) ||
      /^health-test@example\.com$/.test(username) ||
      /^affiliate-test@example\.com$/.test(username) ||
      /^shopify-prop-test@example\.com$/.test(username) ||
      /^prop\d+-test@example\.com$/.test(username) ||
      /^test-link-health-prop\d+-\d+@example\.com$/.test(username) ||
      /^self-demotion-admin@example\.com$/.test(username) ||
      /^no-op-admin@example\.com$/.test(username) ||
      /^promote-admin@example\.com$/.test(username) ||
      /^promote-target@example\.com$/.test(username) ||
      /^deactivate-admin\d+@example\.com$/.test(username) ||
      /^deactivate-target\d+@example\.com$/.test(username) ||
      /test@example\.com$/.test(username) // Catch any username ending with "test@example.com"
    ) {
      return true;
    }
    
    // Match timestamp-based test patterns
    if (
      /^test-\d+/.test(username) ||
      /^test-[a-z]+-\d+/.test(username) ||  // test-confirm-123..., test-login-123..., etc.
      /^tier-svc-test-/.test(username) ||   // tier-svc-test-apply-1671@example.com
      /^custom-domain-test-/.test(username) || // custom-domain-test-abc-1234@example.com
      /^user-\d+/.test(username) ||
      /^admin-\d+/.test(username) ||
      /^testuser\d+@/.test(username) ||
      /^testadmin\d+@/.test(username) ||
      /^accountuser-\d+/.test(username) ||
      /^accountowner-\d+/.test(username) ||
      /^admin\d+-\d+/.test(username) ||
      /^user\d+-\d+/.test(username) ||
      /^owner-\d+/.test(username) ||
      /^manageduser-\d+/.test(username) ||
      /^regularuser-\d+/.test(username) ||
      /^otheruser-\d+/.test(username) ||
      /^anotheruser-\d+/.test(username) ||
      /^defaultrole-\d+/.test(username) ||
      /^invalidrole-\d+/.test(username) ||
      /^lifecycle-\d+/.test(username) ||
      /^newuser-\d+/.test(username) ||
      /^other-admin-\d+/.test(username) ||
      /^other-admin-delete-\d+/.test(username) ||
      /^updated-\d+/.test(username) ||
      /^test-task-\d+/.test(username) ||
      /^notification-test-/.test(username) ||
      /^notification-unit-test-/.test(username) ||
      /^banner-test-another-\d+/.test(username) ||
      /^another-\d+/.test(username) ||
      username === 'property-test@example.com'
    ) {
      return true;
    }
    
    // Match specific test patterns
    if (
      username.startsWith('testmixed') ||
      username.startsWith('testactive') ||
      username.startsWith('testinactive') ||
      username.startsWith('duplicate-') ||
      username.startsWith('login-test-') ||
      username.startsWith('refresh-test-') ||
      username.startsWith('inactive-test-')
    ) {
      return true;
    }
    
    // Match accounts with random special characters (property test generated)
    // If username contains mostly special characters before @, it's likely a test account
    const localPart = username.split('@')[0];
    if (localPart) {
      const alphanumericCount = (localPart.match(/[a-zA-Z0-9]/g) || []).length;
      const totalLength = localPart.length;
      // If less than 40% alphanumeric in local part, it's likely a random test account
      if (totalLength > 5 && alphanumericCount / totalLength < 0.4) {
        return true;
      }
    }
    
    return false;
  });
  
  // Register all found test accounts (but NEVER the admin account)
  testAccounts.forEach(account => {
    // Double-check: NEVER register the admin account
    if (adminAccount && account.id === adminAccount.id) {
      console.warn('WARNING: Attempted to register admin account for deletion - skipping');
      return;
    }
    registerTestEntity('accounts', account.id);
  });
}

/**
 * Auto-register test task statuses created during tests
 * Registers task statuses with test-like names
 * 
 * IMPORTANT: Only matches tasks with very specific test patterns
 */
export async function autoRegisterTestTaskStatuses(): Promise<void> {
  const db = getTestDb();
  
  // Get all tasks
  const allTasks = await db.scheduledTaskStatus.findMany({
    select: { taskName: true },
  });
  
  // Production tasks that should NEVER be deleted
  const productionTasks = new Set(['example-task', 'link-health-check']);
  
  // Filter for test tasks
  const testTasks = allTasks.filter(task => {
    const name = task.taskName;
    
    // Never delete production tasks
    if (productionTasks.has(name)) {
      return false;
    }
    
    // Match ANY task that starts with "test-task-" (catches all test task variations)
    if (name.startsWith('test-task-')) {
      return true;
    }
    
    // Match other test task patterns
    if (
      /^test-error-/.test(name) ||
      /^error-task-\d+$/.test(name) ||
      /^disabled-task-\d+$/.test(name) ||
      /^cancel-task-\d+-\d+$/.test(name) ||
      /^lifecycle-task-\d+$/.test(name) ||
      /^state-task-\d+$/.test(name) ||
      /^frequent-\d+$/.test(name) ||
      /^infrequent-\d+$/.test(name) ||
      /^manual-task-\d+$/.test(name) ||
      /^task-\d+-\d+$/.test(name) ||
      /^next-run-task-\d+$/.test(name) ||
      /^restart-task-\d+$/.test(name) ||
      /^persist-task-\d+$/.test(name) ||
      /^valid-task-\d+$/.test(name)
    ) {
      return true;
    }
    
    // Match tasks with mostly special characters (random test tasks from old property tests)
    // If the task name is short (< 30 chars) and contains mostly non-alphanumeric chars
    if (name.length < 30) {
      const alphanumericCount = (name.match(/[a-zA-Z0-9]/g) || []).length;
      const totalLength = name.length;
      // If less than 70% alphanumeric, it's likely a random test task
      // Production tasks like "example-task" and "link-health-check" are 100% alphanumeric (with hyphens)
      if (alphanumericCount / totalLength < 0.7) {
        return true;
      }
    }
    
    return false;
  });
  
  // Register all found test tasks
  testTasks.forEach(task => {
    registerTestEntity('scheduledTaskStatuses', task.taskName);
  });
}

/**
 * Auto-register test banners created during tests
 * Registers banners with test-like keys
 * 
 * IMPORTANT: This function is conservative to avoid deleting user-created banners.
 * Only banners with explicit test patterns in their keys are registered for deletion.
 * All test banners MUST use a key with one of the recognized prefixes.
 */
export async function autoRegisterTestBanners(): Promise<void> {
  const db = getTestDb();
  
  // Get the admin account ID to protect admin banners
  const adminAccount = await db.account.findUnique({
    where: { username: 'admin@example.com' },
    select: { id: true },
  });
  
  // Get all banners
  const allBanners = await db.banner.findMany({
    select: { id: true, key: true, accountId: true },
  });
  
  // Filter for test banners - match explicit test key patterns only
  const testBanners = allBanners.filter(banner => {
    const key = banner.key;
    const accountId = banner.accountId;
    
    // NEVER register banners belonging to the admin account
    if (adminAccount && accountId === adminAccount.id) {
      return false;
    }
    
    // Match banners with explicit test key patterns
    if (key && (
      key.startsWith('test-') ||
      key.startsWith('prop-test-') ||
      key.startsWith('unit-test-') ||
      key.startsWith('banner-api-test-') ||
      key.startsWith('banner-prop-test-') ||
      key.startsWith('banner-unit-test-') ||
      key.startsWith('custom-domain-error:')
    )) {
      return true;
    }
    
    return false;
  });
  
  // Register all found test banners
  testBanners.forEach(banner => {
    registerTestEntity('banners', banner.id);
  });
}

/**
 * Auto-register test users (tracked visitors) created during tests
 * Only registers users that interacted with test accounts' short URLs
 */
export async function autoRegisterTestUsers(): Promise<void> {
  const db = getTestDb();
  
  // Get all test account IDs
  const testAccountIds = Array.from(testEntityIds.accounts);
  
  if (testAccountIds.length === 0) {
    return; // No test accounts
  }
}

/**
 * Clean up only test-created data from the database
 * This preserves any pre-existing data like admin accounts and their related data
 */
export async function cleanupTestDb(): Promise<void> {
  const db = getTestDb();
  
  // Auto-register any test entities that were created through API endpoints or not tracked
  await autoRegisterTestAccounts();
  await autoRegisterTestTaskStatuses();
  await autoRegisterTestBanners();
  
  // Get test account IDs
  const testAccountIds = Array.from(testEntityIds.accounts);
  
  // Delete in order to respect foreign key constraints
  // We delete in this order: tokens -> accounts
  
  // Delete tokens belonging to test accounts
  if (testAccountIds.length > 0) {
    await db.emailConfirmationToken.deleteMany({
      where: { accountId: { in: testAccountIds } },
    });
    
    await db.passwordResetToken.deleteMany({
      where: { accountId: { in: testAccountIds } },
    });
    
    await db.emailChangeToken.deleteMany({
      where: { accountId: { in: testAccountIds } },
    });
  }
  
  // Finally delete test accounts (if they still exist)
  if (testAccountIds.length > 0) {
    // CRITICAL: Get the admin account ID to ensure we NEVER delete it
    const adminAccount = await db.account.findUnique({
      where: { username: 'admin@example.com' },
      select: { id: true },
    });
    
    // Filter out the admin account ID from the list of accounts to delete
    const safeAccountIds = adminAccount 
      ? testAccountIds.filter(id => id !== adminAccount.id)
      : testAccountIds;
    
    if (safeAccountIds.length > 0) {
      await db.account.deleteMany({
        where: { id: { in: safeAccountIds } },
      });
    }
  }
  
  // Delete test task statuses
  const testTaskNames = Array.from(testEntityIds.scheduledTaskStatuses);
  if (testTaskNames.length > 0) {
    await db.scheduledTaskStatus.deleteMany({
      where: { taskName: { in: testTaskNames } },
    });
  }
  
  // Delete test banners and dismissals
  const testBannerIds = Array.from(testEntityIds.banners);
  
  // Only delete explicitly tracked test banners
  // DO NOT delete global banners or admin banners - they may be production data
  if (testBannerIds.length > 0) {
    // Dismissals will be cascade deleted
    await db.banner.deleteMany({
      where: { id: { in: testBannerIds } },
    });
  }
  
  // Clear the tracking sets for the next test
  testEntityIds.accounts.clear();
  testEntityIds.emailConfirmationTokens.clear();
  testEntityIds.passwordResetTokens.clear();
  testEntityIds.emailChangeTokens.clear();
  testEntityIds.scheduledTaskStatuses.clear();
  testEntityIds.banners.clear();
  testEntityIds.bannerDismissals.clear();
}

/**
 * Disconnect from the database
 */
export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}
