/*
  Warnings:

  - You are about to drop the column `veiryOTP` on the `EmailVerify` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailVerify" DROP COLUMN "veiryOTP",
ADD COLUMN     "verifyOTP" TEXT;
