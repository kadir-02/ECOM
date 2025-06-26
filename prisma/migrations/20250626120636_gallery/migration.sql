/*
  Warnings:

  - You are about to drop the column `category` on the `GalleryItem` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `GalleryItem` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `GalleryItem` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `GalleryItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `GalleryItem` table. All the data in the column will be lost.
  - Added the required column `image` to the `GalleryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequence_number` to the `GalleryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GalleryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GalleryItem" DROP COLUMN "category",
DROP COLUMN "description",
DROP COLUMN "imageUrl",
DROP COLUMN "publicId",
DROP COLUMN "title",
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sequence_number" TEXT NOT NULL,
ADD COLUMN     "typeId" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "GalleryType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "GalleryType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
