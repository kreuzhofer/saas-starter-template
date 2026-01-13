import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Check if admin account already exists
  const existingAdmin = await prisma.account.findUnique({
    where: { username: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('✓ Admin account already exists');
    console.log(`  Email: admin@example.com`);
    console.log(`  Role: ${existingAdmin.role}`);
    console.log(`  Active: ${existingAdmin.isActive}`);
    return;
  }

  // Create admin account
  console.log('Creating admin account...');
  
  const passwordHash = await bcrypt.hash('admin', 10);
  
  const admin = await prisma.account.create({
    data: {
      username: 'admin@example.com',
      passwordHash,
      role: 'admin',
      isActive: true, // Pre-activated for immediate use
      language: 'en',
    },
  });

  console.log('✓ Admin account created successfully');
  console.log(`  Email: admin@example.com`);
  console.log(`  Password: admin`);
  console.log(`  Role: ${admin.role}`);
  console.log(`  Active: ${admin.isActive}`);
  console.log('\n⚠️  IMPORTANT: Change the admin password immediately in production!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
