import { Router } from 'express';
import { createProductSpecification, getProductSpecifications, updateProductSpecification, deleteProductSpecification } from '../../controllers/ProductAndVariationControllers/productSpecification.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router({ mergeParams: true });

router.get('/:productId', getProductSpecifications);
router.use(authenticate,authorizeAdmin)
router.post('/', createProductSpecification);
router.patch('/:id', updateProductSpecification);
router.delete('/:id', deleteProductSpecification);

export default router;
