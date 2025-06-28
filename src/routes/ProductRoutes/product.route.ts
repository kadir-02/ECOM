import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';
import { createProduct, getProducts, updateProductSequence } from '../../controllers/ProductAndVariationControllers/product.controller';
import productImageRoutes from './productImage.routes'
import productSpecRoutes from './productSpecification.route'

const router = Router({ mergeParams: true });

// Public routes
router.get('/', getProducts);
router.use('/image/',productImageRoutes)
router.use('/spec/',productSpecRoutes)
// router.get('/info/:slug', getProductBySlug);
// router.use('/:productId/variant', variantRoutes);
// router.get('/best-selling', getBestSellingProducts);

// Admin-only routes
router.use(authenticate, authorizeAdmin);

router.post('/', createProduct);
router.patch('/update-sequence', updateProductSequence);
// router.delete('/:id', deleteProduct);
// router.patch('/deactivate/:id', softDeleteProduct);
// router.patch('/restore/:id', restoreProduct);

export default router;
