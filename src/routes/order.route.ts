import express from 'express';
import { createOrder, generateInvoicePDF, getAllUserOrdersForAdmin, getOrderById, getOrdersForAdmin, getSingleOrder, updateOrderStatus, userOrderHistory } from '../controllers/order.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();

router.get('/invoice', generateInvoicePDF);
router.get('/get-orders',authenticate,authorizeAdmin,getOrdersForAdmin)
router.get('/user-order',authenticate,authorizeAdmin,getAllUserOrdersForAdmin)
router.patch('/:orderId/status', authenticate, authorizeAdmin, updateOrderStatus);
router.post('/', authenticate, createOrder);
router.get('/history', authenticate, userOrderHistory);
router.get('/:id', authenticate, getOrderById);
router.get('/detail/:id', getSingleOrder);
export default router;
