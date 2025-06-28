import { Router } from 'express';
import {
  createVariant,
  getAllVariants,
  getVariantById,
  updateVariant,
  deleteVariant,
  restoreVariant,
  softDeleteVariant,
  getVariantsByProduct,
} from '../../controllers/ProductAndVariationControllers/variant.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';
import variantImageRoutes from '../ProductRoutes/variantImage.route';



const router = Router({ mergeParams: true });


// Public or authenticated routes
router.get('/', getAllVariants);
router.get('/:id', getVariantById);
router.get('/product/:productId', getVariantsByProduct);
router.use('/images/:variantId', variantImageRoutes);

// Admin-only routes
router.use(authenticate,authorizeAdmin)

router.post('/:productId', createVariant);
router.patch('/:id', updateVariant);
router.delete('/:id', deleteVariant);
router.patch('/deactivate/:id', softDeleteVariant);
router.patch('/restore/:id', restoreVariant);

export default router;
