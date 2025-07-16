// src/routes/razorpayWebhookRoutes.ts

import express from 'express';
import { razorpayWebhookHandler } from '../controllers/razorpay.controller';
// import { razorpayWebhookHandler } from '../controllers/razorpayWebhookController';

const router = express.Router();

// Razorpay requires raw body for signature verification
router.post(
  '/',
  express.raw({ type: 'application/json' }),
  razorpayWebhookHandler
);

export default router;
