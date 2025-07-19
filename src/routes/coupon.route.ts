import express from 'express';
import {
  createCouponCode,
  deleteCouponCode,
  getAllCouponCodes,
  // getCouponCodeById,
  getUserCouponCodes,
  redeemCouponCode,
  updateCouponCode,
} from '../controllers/coupon.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();

router.post('/user-coupon', authenticate, getUserCouponCodes);

router.post('/redeem', authenticate, redeemCouponCode);

// router.get('/discounts/:id', authenticate, getCouponCodeById);
router.get('/discounts', authenticate, getAllCouponCodes);

router.post('/', authenticate, authorizeAdmin, createCouponCode);

router.patch('/update/:id', updateCouponCode);

router.delete('/discounts/:id', authenticate, authorizeAdmin, deleteCouponCode);


export default router;
