import { Router } from 'express';
import {
  createSubcategory,
  getAllSubcategories,
  updateSubcategory,
  deleteSubcategory,
  restoreSubcategory,
  softDeleteSubcategory,
  getSubcategoryById,
  getSubcategoriesByCategoryId,
} from '../controllers/subcategory.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';
import { uploadMemory } from '../upload/multerCloudinary';

const router = Router();

// Public routes
router.get('/', getAllSubcategories);
router.get('/:id', getSubcategoryById); // Changed from slug to ID

// Admin-only routes
router.use(authenticate, authorizeAdmin);

// Accept both image and banner uploads
const fileUploadMiddleware = uploadMemory.fields([
  { name: 'image', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

router.post('/', fileUploadMiddleware, createSubcategory);
router.patch('/:id', fileUploadMiddleware, updateSubcategory);
router.delete('/:id', deleteSubcategory);
router.patch('/deactivate/:id', softDeleteSubcategory);
router.patch('/restore/:id', restoreSubcategory);
router.get('/by-category/:categoryId', getSubcategoriesByCategoryId);

export default router;
