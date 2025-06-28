/*
  Warnings:

  - You are about to drop the column `oldPrice` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ProductVariant` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selling_price` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "oldPrice",
DROP COLUMN "price",
ADD COLUMN     "base_and_selling_price_difference_in_percent" DOUBLE PRECISION,
ADD COLUMN     "colour_code" TEXT,
ADD COLUMN     "created_by" INTEGER NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_new_arrival" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_selected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "low_stock_threshold" INTEGER,
ADD COLUMN     "selling_price" DOUBLE PRECISION NOT NULL;
