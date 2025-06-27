/*
  Warnings:

  - You are about to drop the column `typeId` on the `GalleryItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GalleryItem" DROP CONSTRAINT "GalleryItem_typeId_fkey";

-- AlterTable
ALTER TABLE "GalleryItem" DROP COLUMN "typeId",
ADD COLUMN     "section" TEXT;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_section_fkey" FOREIGN KEY ("section") REFERENCES "GalleryType"("name") ON DELETE SET NULL ON UPDATE CASCADE;
