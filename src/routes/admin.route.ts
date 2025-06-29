import { Router } from 'express';
import {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  getAllUsers,
  // exportUsersToCsv,
  // exportProductsToCsv,
  // importProductsFromCSV,
  // exportVariantsToCSV,
  // importVariantsFromCSV,
  adminBroadcastNotification,
  getUserNotificationsByAdmin,
  deleteUserNotificationByAdmin,
  getAllAdmins,
} from '../controllers/admin.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';
import { upload } from '../upload/multer';
import { uploadCsv } from '../upload/multerCsv';
import { uploadMemory } from '../upload/multerCloudinary';
import { createDiscountRule, deleteDiscountRule } from '../controllers/discount.controller';
import { getDashboard } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate, authorizeAdmin);

// router.post('/create', upload.single('image'), createUserByAdmin);
router.post('/create', uploadMemory.single('image'), createUserByAdmin);
router.patch('/update/:id', uploadMemory.single('image'), updateUserByAdmin);
router.delete('/delete/:id', deleteUserByAdmin);
router.get('/userlist', getAllUsers);
router.get('/adminlist', getAllAdmins);
// router.get('/export/users', exportUsersToCsv);
// router.get('/export/products', exportProductsToCsv);
// router.get('/export/variants', exportVariantsToCSV);
// router.post('/import/variants', uploadCsv.single('file'), importVariantsFromCSV);
// router.post('/import/products', uploadCsv.single('file'), importProductsFromCSV);
router.post('/discounts', createDiscountRule);
router.delete('/discounts/:id', deleteDiscountRule);
// Admin notification routes
router.post('/notifications/broadcast', adminBroadcastNotification);
router.get('/notifications/user/:userId', getUserNotificationsByAdmin);
router.delete('/notifications/:id', deleteUserNotificationByAdmin);
export default router;
