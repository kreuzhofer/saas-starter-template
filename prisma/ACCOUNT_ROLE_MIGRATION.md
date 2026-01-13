# Account Role Migration

This document describes the data migration for populating existing accounts with appropriate roles as part of the Role-Based Access Control (RBAC) implementation.

## Overview

The account role migration script (`migrate-account-roles.ts`) is a one-time data migration that:

1. Sets the role "admin" for the admin@example.com account
2. Sets the role "account_owner" for all other existing accounts
3. Verifies all accounts have valid roles after migration

## Requirements

This migration addresses the following requirements from the account management specification:

- **Requirement 9.1**: Set role "admin" for admin@example.com account
- **Requirement 9.2**: Set role "account_owner" for all other existing accounts
- **Requirement 9.3**: Verify all accounts have valid roles after migration

## Prerequisites

Before running the migration:

1. The database schema migration adding the `role` column must be completed
2. The role column should have a default value of "account_owner"
3. The role check constraint should be in place to enforce valid roles

## Running the Migration

### Using npm script (recommended)

```bash
npm run migrate:account-roles
```

### Using tsx directly

```bash
npx tsx prisma/migrate-account-roles.ts
```

### Using Docker

If running in a Docker environment:

```bash
docker compose exec app npm run migrate:account-roles
```

## What the Migration Does

### Step 1: Update Admin Account

The script updates the admin@example.com account to have the "admin" role:

```sql
UPDATE accounts 
SET role = 'admin' 
WHERE username = 'admin@example.com';
```

### Step 2: Update Other Accounts

All other accounts are set to "account_owner":

```sql
UPDATE accounts 
SET role = 'account_owner' 
WHERE username != 'admin@example.com';
```

### Step 3: Verification

The script verifies:

- Total account count
- Role distribution across all accounts
- No accounts have invalid roles
- Admin account has the correct role

## Expected Output

```
Starting account role migration...

Step 1: Setting admin role for admin@example.com...
✓ Updated 1 admin account(s)

Step 2: Setting account_owner role for all other accounts...
✓ Updated N account(s) to account_owner

Step 3: Verifying all accounts have valid roles...
Total accounts in database: N+1

Role distribution:
  admin: 1
  account_owner: N

✓ All N+1 account(s) have valid roles
✓ Admin account (admin@example.com) has correct role: admin

✓ Migration completed successfully!
```

## Error Handling

The migration script will fail and exit with an error if:

1. Any accounts have invalid roles (not in ['admin', 'account_owner', 'account_user'])
2. The admin account exists but doesn't have the admin role after migration
3. The total count of valid accounts doesn't match the total account count
4. Any database operation fails

## Testing

A test script is provided to verify the migration works correctly:

```bash
npm run test:account-role-migration
```

This test script:
1. Creates test accounts
2. Verifies role assignments
3. Checks role constraints
4. Validates the admin account

## Idempotency

The migration script is idempotent and can be run multiple times safely. Running it again will:

- Re-apply the admin role to admin@example.com (no change if already set)
- Re-apply account_owner to other accounts (no change if already set)
- Re-verify all accounts

## Rollback

If you need to rollback the migration:

1. The role column has a default value of "account_owner"
2. You can manually update roles using SQL if needed
3. The database constraint ensures only valid roles can be set

## Integration with Deployment

This migration should be run:

1. **After** the schema migration that adds the role column
2. **Before** deploying application code that enforces role-based access control
3. As part of the deployment pipeline for the RBAC feature

### Recommended Deployment Order

1. Deploy schema migration (adds role column with default)
2. Run data migration (this script)
3. Deploy application code with RBAC enforcement

## Monitoring

After running the migration, verify:

```sql
-- Check role distribution
SELECT role, COUNT(*) 
FROM accounts 
GROUP BY role;

-- Verify admin account
SELECT username, role 
FROM accounts 
WHERE username = 'admin@example.com';

-- Check for any invalid roles
SELECT username, role 
FROM accounts 
WHERE role NOT IN ('admin', 'account_owner', 'account_user');
```

## Troubleshooting

### Migration fails with "admin account has incorrect role"

- Verify the admin@example.com account exists in the database
- Check if there are any database triggers or constraints preventing the update
- Manually verify the account: `SELECT * FROM accounts WHERE username = 'admin@example.com';`

### Migration reports invalid roles

- Check if any accounts have NULL or empty role values
- Verify the role check constraint is properly applied
- Review any custom code that might be setting invalid roles

### Migration succeeds but verification fails

- Check database connection and permissions
- Verify Prisma client is properly generated
- Review database logs for any errors

## Related Files

- `prisma/migrate-account-roles.ts` - Main migration script
- `prisma/test-account-role-migration.ts` - Test script
- `prisma/schema.prisma` - Database schema with role column
- `prisma/migrations/20251203183754_add_role_to_account/migration.sql` - Schema migration

## Support

For issues or questions about this migration:

1. Check the account management specification in `.kiro/specs/account-management/`
2. Review the design document for RBAC implementation details
3. Verify the database schema matches the expected structure
