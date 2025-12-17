-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
