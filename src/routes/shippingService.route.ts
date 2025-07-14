import { Router } from 'express';
import {
  getAllShippingServices,
  createShippingService,
  updateShippingService,
} from '../controllers/shippingService.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = Router();

router.get('/', getAllShippingServices);
router.use(authenticate,authorizeAdmin)
router.post('/', createShippingService);
router.patch('/:id', updateShippingService);

export default router;
