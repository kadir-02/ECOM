import { Router } from 'express';
import {
  getAllPaymentServices,
  createOrUpdatePaymentService,
} from '../../controllers/PaymentService/paymentService.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.get('/', authenticate, getAllPaymentServices);
router.post('/', authenticate, createOrUpdatePaymentService);

export default router;