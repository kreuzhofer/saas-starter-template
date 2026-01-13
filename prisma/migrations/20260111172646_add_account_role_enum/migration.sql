/*
  Warnings:

  - The `role` column on the `accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('admin', 'account_owner', 'account_user');

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "role",
ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'account_owner';

-- CreateIndex
CREATE INDEX "accounts_role_idx" ON "accounts"("role");
