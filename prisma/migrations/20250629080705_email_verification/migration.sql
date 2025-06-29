-- CreateTable
CREATE TABLE "EmailVerify" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "veiryOTP" TEXT,
    "verifyOTPExpiry" TIMESTAMP(3),

    CONSTRAINT "EmailVerify_pkey" PRIMARY KEY ("id")
);
