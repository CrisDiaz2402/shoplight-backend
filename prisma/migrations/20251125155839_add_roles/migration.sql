-- CreateEnum
CREATE TYPE "Role" AS ENUM ('client', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'client';
