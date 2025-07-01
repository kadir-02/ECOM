import express from 'express';
import { createOrder, generateInvoicePDF, getOrderById, getOrdersForAdmin, getSingleOrder, getUserOrders, updateOrderStatus } from '../controllers/order.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();

router.get('/invoice', generateInvoicePDF);
router.patch('/:orderId/status', authenticate, authorizeAdmin, updateOrderStatus);
router.get('/get-orders',authenticate,authorizeAdmin,getOrdersForAdmin)
router.post('/', authenticate, createOrder);
router.get('/', authenticate, getUserOrders);
router.get('/:id', authenticate, getOrderById);
router.get('/detail/:id', authenticate, getSingleOrder);
export default router;
