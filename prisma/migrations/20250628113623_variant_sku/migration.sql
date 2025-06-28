/*
  Warnings:

  - A unique constraint covering the columns `[SKU]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `SKU` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "SKU" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_SKU_key" ON "ProductVariant"("SKU");
