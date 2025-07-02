import express from 'express';
import {
  createCouponCode,
  deleteCouponCode,
  getAllCouponCodes,
  getCouponCodeById,
  getUserCouponCodes,
  redeemCouponCode,
} from '../controllers/coupon.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();

router.get('/', authenticate, getUserCouponCodes);

router.post('/redeem', authenticate, redeemCouponCode);

router.get('/discounts/:id', authenticate, getCouponCodeById);

router.post('/', authenticate, authorizeAdmin, createCouponCode);

router.delete('/discounts/:id', authenticate, authorizeAdmin, deleteCouponCode);

router.get('/discounts', authenticate, authorizeAdmin, getAllCouponCodes);


export default router;
