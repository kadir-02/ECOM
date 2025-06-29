import { Router } from 'express';
import {
  changePassword,
  deleteOwnAccount,
  getMe,
  restoreOwnAccount,
  softDeleteOwnAccount,
  updateOwnProfile
} from '../controllers/user.controller';

import { authenticate } from '../middlewares/authenticate';
import { uploadMemory } from '../upload/multerCloudinary';
import { getDiscountRules } from '../controllers/discount.controller';
import { getDashboard } from '../controllers/dashboard.controller';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';


const router = Router();

router.use(authenticate);

// User-specific routes
router.delete('/delete', deleteOwnAccount);
router.patch('/deactivate', softDeleteOwnAccount);
router.patch('/restore', restoreOwnAccount);
router.patch('/update', uploadMemory.single('image'), updateOwnProfile);
router.patch('/change-password', changePassword);
router.get('/details', getMe);
router.get('/discounts', getDiscountRules);

//admin dashboard
router.get('/dashboard',authorizeAdmin, getDashboard);
export default router;
