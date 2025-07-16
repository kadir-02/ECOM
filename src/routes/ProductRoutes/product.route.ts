import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';
import { createProduct, deleteProduct, getProducts, getProductsFilter, toggleProductStatus, updateProduct, updateProductSequence } from '../../controllers/ProductAndVariationControllers/product.controller';
import productImageRoutes from './productImage.routes'
import productSpecRoutes from './productSpecification.route'
import variantRoutes from '../ProductRoutes/variant.route';
import { getBestSellingProducts, getNewArrivalProducts, getProductBySlug } from '../../controllers/ProductAndVariationControllers/productFilters.controller';

const router = Router({ mergeParams: true });

router.get('/', getProducts);
router.get('/filter', getProductsFilter);
router.use('/image/',productImageRoutes)
router.use('/spec/',productSpecRoutes)
router.use('/variant', variantRoutes);
router.get('/info/:slug', getProductBySlug);
router.get('/best-selling', getBestSellingProducts);
router.get('/newarrivals',getNewArrivalProducts)


router.use(authenticate, authorizeAdmin);

router.patch('/toggle/:id', toggleProductStatus);
router.post('/', createProduct);
router.patch('/update-sequence', updateProductSequence);
router.patch('/:id', updateProduct);
router.delete('/:id', deleteProduct);
// router.delete('/:id', deleteProduct);
// router.patch('/deactivate/:id', softDeleteProduct);
// router.patch('/restore/:id', restoreProduct);

export default router;
