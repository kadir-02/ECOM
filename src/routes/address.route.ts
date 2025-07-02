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
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = Router();

router.use(authenticate);

router.get('/', getUserAddresses);
router.post('/', createAddress);
router.get('/user/:userId',authenticate,authorizeAdmin, getUserAddressesForAdmin);
router.patch('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
