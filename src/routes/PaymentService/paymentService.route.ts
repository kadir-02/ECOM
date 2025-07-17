import { Router } from 'express';
import {
  getAllPaymentServices,
  createOrUpdatePaymentService,
  getPaymentServicesFrontend,
} from '../../controllers/PaymentService/paymentService.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();
router.get('/frontend',getPaymentServicesFrontend)
router.get('/', authenticate, getAllPaymentServices);
router.post('/', authenticate, createOrUpdatePaymentService);

export default router;