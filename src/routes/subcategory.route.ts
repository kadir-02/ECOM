import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';
import { uploadMemory } from '../upload/multerCloudinary';
import { createSubcategory, getSubcategoryByCategoryId, updateSubCategory } from '../controllers/CategoryControllers/SubCategories.controller';

const router = Router();

// // Public routes
router.get('/', getSubcategoryByCategoryId); 
router.patch('/:id', updateSubCategory);

// // Admin-only routes
router.use(authenticate, authorizeAdmin);

// // Accept both image and banner uploads
const fileUploadMiddleware = uploadMemory.fields([
  { name: 'image', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

router.post('/', fileUploadMiddleware, createSubcategory);
// router.patch('/:id', fileUploadMiddleware, updateSubcategory);
// router.delete('/:id', deleteSubcategory);
// router.patch('/deactivate/:id', softDeleteSubcategory);
// router.patch('/restore/:id', restoreSubcategory);
// router.get('/by-category/:categoryId', getSubcategoriesByCategoryId);

export default router;
