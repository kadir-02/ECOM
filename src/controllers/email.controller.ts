// import { Request, Response } from 'express';
// import prisma from '../db/prisma';
// import { generateOTP } from '../utils/otp';
// import { sendOTPEmail } from '../email/mail';

// // 1. Request OTP for Email Verification
// export const requestEmailVerification = async (req: Request, res: Response) => {
//   const { email } = req.body;

//   if (!email) {
//     res.status(400).json({ message: 'Email is required' });
//     return;
//   }

//   const otp = generateOTP();
//   const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//   try {
//     await prisma.emailVerify.upsert({
//       where: { email },
//       update: {
//         veiryOTP: otp,
//         verifyOTPExpiry: expiry,
//         // No isVerified field in schema, so omit that
//       },
//       create: {
//         email,
//         veiryOTP: otp,
//         verifyOTPExpiry: expiry,
//       },
//     });

//     await sendOTPEmail(email, otp);

//     res.status(200).json({ message: 'OTP sent successfully for verification' });
//   } catch (error) {
//     console.error('OTP request error:', error);
//     res.status(500).json({ message: 'Failed to send OTP' });
//   }
// };

// // 2. Verify OTP
// export const verifyEmailOTP = async (req: Request, res: Response) => {
//   const { email, otp } = req.body;

//   if (!email || !otp) {
//     res.status(400).json({ message: 'Email and OTP are required' });
//     return;
//   }

//   try {
//     const record = await prisma.emailVerify.findUnique({ where: { email } });

//     if (
//       !record ||
//       record.veiryOTP !== otp ||
//       !record.verifyOTPExpiry ||
//       record.verifyOTPExpiry < new Date()
//     ) {
//       res.status(400).json({ message: 'Invalid or expired OTP' });
//       return;
//     }

//     // Since no isVerified field, just clear OTP fields after verification
//     await prisma.emailVerify.update({
//       where: { email },
//       data: {
//         veiryOTP: null,
//         verifyOTPExpiry: null,
//       },
//     });

//     res.status(200).json({ message: 'Email verified successfully' });
//   } catch (error) {
//     console.error('OTP verify error:', error);
//     res.status(500).json({ message: 'Failed to verify OTP' });
//   }
// };
