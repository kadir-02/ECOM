import { Router } from 'express';
import {
  applyAbandonedCartDiscount,
  getAbandonedCartDiscount
} from '../../controllers/Abandoned/abandoned.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.post('/apply-discount', authenticate, applyAbandonedCartDiscount);
router.get('/get-discount', authenticate, getAbandonedCartDiscount); // <--- New GET route

export default router;
