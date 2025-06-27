import { Request, Response } from 'express';
import { generateOTP } from '../utils/otp';
import { sendOTPEmail } from '../email/mail';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
     res.status(404).json({ message: 'User not found' });
     return
  }

  const otp = generateOTP();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { email },
    data: { resetOTP: otp, resetOTPExpiry: expiry },
  });

  await sendOTPEmail(email, otp);

   res.status(200).json({ message: 'OTP sent successfully!' });
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.resetOTP !== otp || !user.resetOTPExpiry || user.resetOTPExpiry < new Date()) {
     res.status(400).json({ message: 'Invalid or expired OTP' });
     return
  }

   res.status(200).json({ message: 'OTP verified' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.resetOTP !== otp || !user.resetOTPExpiry || user.resetOTPExpiry < new Date()) {
     res.status(400).json({ message: 'Invalid or expired OTP' });
     return
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      resetOTP: null,
      resetOTPExpiry: null,
    },
  });

   res.status(200).json({ message: 'Password reset successfully' });
};
