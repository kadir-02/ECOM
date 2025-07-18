import { Router } from 'express';
import {
  applyAbandonedCartDiscount,
  getAbandonedCartDiscount,
  getUsersSpecificAbandonedItems
} from '../../controllers/Abandoned/abandoned.controller';
import { authenticate } from '../../middlewares/authenticate';
import { testAbandonedcontroller } from '../../controllers/Abandoned/testAbandonedcontroller';

const router = Router();

router.get('/get', testAbandonedcontroller); 
router.post('/apply-discount', authenticate, applyAbandonedCartDiscount);
router.get('/get-discount', authenticate, getAbandonedCartDiscount); 
router.get('/items', authenticate, getUsersSpecificAbandonedItems); 

export default router;
