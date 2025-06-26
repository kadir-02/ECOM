/*
  Warnings:

  - You are about to drop the column `iconUrl` on the `WhyChooseUsItem` table. All the data in the column will be lost.
  - You are about to drop the column `mainTitle` on the `WhyChooseUsItem` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `WhyChooseUsItem` table. All the data in the column will be lost.
  - You are about to drop the column `subtitle` on the `WhyChooseUsItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `WhyChooseUsItem` table. All the data in the column will be lost.
  - Added the required column `heading` to the `WhyChooseUsItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence_number` to the `WhyChooseUsItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WhyChooseUsItem" DROP COLUMN "iconUrl",
DROP COLUMN "mainTitle",
DROP COLUMN "order",
DROP COLUMN "subtitle",
DROP COLUMN "title",
ADD COLUMN     "heading" TEXT NOT NULL,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sequence_number" TEXT NOT NULL;
