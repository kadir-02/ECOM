import { Router } from 'express';
import {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getUserAddressesForAdmin
} from '../controllers/address.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', getUserAddresses);
router.post('/', createAddress);
router.patch('/:userId', getUserAddressesForAdmin);
router.patch('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
