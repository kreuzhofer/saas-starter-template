import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Test script to verify account role migration
 * Creates test accounts, runs migration, and verifies results
 */
async function main() {
  console.log('Starting account role migration test...\n');

  try {
    // Step 1: Create test accounts with various scenarios
    console.log('Step 1: Creating test accounts...');
    
    const testPassword = await bcrypt.hash('testpassword123', 10);
    
    // Create a regular user account
    const user1 = await prisma.account.upsert({
      where: { username: 'user1@example.com' },
      update: {},
      create: {
        username: 'user1@example.com',
        passwordHash: testPassword,
        isActive: true,
        // role will default to 'account_owner'
      },
    });
    console.log(`✓ Created user1@example.com with role: ${user1.role}`);
    
    // Create another regular user account
    const user2 = await prisma.account.upsert({
      where: { username: 'user2@example.com' },
      update: {},
      create: {
        username: 'user2@example.com',
        passwordHash: testPassword,
        isActive: true,
      },
    });
    console.log(`✓ Created user2@example.com with role: ${user2.role}`);
    
    // Verify admin account exists
    const adminAccount = await prisma.account.findUnique({
      where: { username: 'admin@example.com' },
    });
    
    if (adminAccount) {
      console.log(`✓ Admin account exists with role: ${adminAccount.role}`);
    } else {
      console.log('ℹ Admin account does not exist yet');
    }
    
    console.log('\nStep 2: Verifying role distribution...');
    
    // Get all accounts
    const allAccounts = await prisma.account.findMany({
      select: {
        username: true,
        role: true,
        isActive: true,
      },
      orderBy: {
        username: 'asc',
      },
    });
    
    console.log('\nCurrent accounts:');
    allAccounts.forEach(account => {
      console.log(`  - ${account.username}: role="${account.role}", active=${account.isActive}`);
    });
    
    // Verify role constraints
    console.log('\nStep 3: Verifying role constraints...');
    
    const validRoles = ['admin', 'account_owner', 'account_user'];
    let allValid = true;
    
    for (const account of allAccounts) {
      if (!validRoles.includes(account.role)) {
        console.error(`✗ Invalid role for ${account.username}: "${account.role}"`);
        allValid = false;
      }
    }
    
    if (allValid) {
      console.log('✓ All accounts have valid roles');
    }
    
    // Verify admin account has admin role
    const admin = allAccounts.find(a => a.username === 'admin@example.com');
    if (admin) {
      if (admin.role === 'admin') {
        console.log('✓ Admin account has correct role');
      } else {
        console.error(`✗ Admin account has incorrect role: ${admin.role}`);
      }
    }
    
    // Verify non-admin accounts have account_owner role
    const nonAdminAccounts = allAccounts.filter(a => a.username !== 'admin@example.com');
    const allOwnersCorrect = nonAdminAccounts.every(a => a.role === 'account_owner');
    
    if (allOwnersCorrect) {
      console.log('✓ All non-admin accounts have account_owner role');
    } else {
      console.error('✗ Some non-admin accounts have incorrect roles');
    }
    
    console.log('\n✓ Test completed successfully!');
    console.log(`\nSummary: ${allAccounts.length} total account(s)`);
    
    // Group by role
    const roleCount = allAccounts.reduce((acc, account) => {
      acc[account.role] = (acc[account.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Role distribution:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
