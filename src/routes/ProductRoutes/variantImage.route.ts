import { Router } from 'express';
import {
  createVariantImage,
  getAllVariantImages,
  getVariantImageById,
  updateVariantImage,
  deleteVariantImage,
  getAllVariantImagesForProduct,
} from '../../controllers/ProductAndVariationControllers/variantImage.controller';
import { uploadMemory } from '../../upload/multerCloudinary';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router({ mergeParams: true });

// Public routes

router.get('/all', getAllVariantImagesForProduct); // this comes before `/:id`
router.get('/', getAllVariantImages);
router.get('/:variantId', getVariantImageById);

// Admin-only routes
router.use(authenticate, authorizeAdmin);

router.post('/', uploadMemory.array('images', 5), createVariantImage);
router.patch('/:id', uploadMemory.array('images', 5), updateVariantImage);
router.delete('/:id', deleteVariantImage);

export default router;
