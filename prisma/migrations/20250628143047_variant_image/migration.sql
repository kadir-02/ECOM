/*
  Warnings:

  - Added the required column `sequence_number` to the `VariantImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VariantImage" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sequence_number" INTEGER NOT NULL;
