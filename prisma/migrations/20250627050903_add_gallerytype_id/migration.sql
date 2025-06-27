/*
  Warnings:

  - You are about to drop the column `typeName` on the `GalleryItem` table. All the data in the column will be lost.
  - The primary key for the `GalleryType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[name]` on the table `GalleryType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "GalleryItem" DROP CONSTRAINT "GalleryItem_typeName_fkey";

-- AlterTable
ALTER TABLE "GalleryItem" DROP COLUMN "typeName",
ADD COLUMN     "typeId" INTEGER;

-- AlterTable
ALTER TABLE "GalleryType" DROP CONSTRAINT "GalleryType_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "GalleryType_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryType_name_key" ON "GalleryType"("name");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "GalleryType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
