/*
  Warnings:

  - You are about to drop the column `typeId` on the `GalleryItem` table. All the data in the column will be lost.
  - The primary key for the `GalleryType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `GalleryType` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GalleryItem" DROP CONSTRAINT "GalleryItem_typeId_fkey";

-- AlterTable
ALTER TABLE "GalleryItem" DROP COLUMN "typeId",
ADD COLUMN     "typeName" TEXT;

-- AlterTable
ALTER TABLE "GalleryType" DROP CONSTRAINT "GalleryType_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "GalleryType_pkey" PRIMARY KEY ("name");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_typeName_fkey" FOREIGN KEY ("typeName") REFERENCES "GalleryType"("name") ON DELETE SET NULL ON UPDATE CASCADE;
