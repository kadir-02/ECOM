import { Router } from 'express';
import { createShippingRate, deleteShippingRate, getAllShippingRates, updateShippingRate } from '../../controllers/shippingRate/shippingRate.controller';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';
import { authenticate } from '../../middlewares/authenticate';


const router = Router();

router.get('/', getAllShippingRates);
// router.use(authenticate,authorizeAdmin)
router.post('/', createShippingRate);
router.patch('/:id/', updateShippingRate);
router.delete('/:id/', deleteShippingRate);

export default router;