import { Router } from 'express';
import { createProductSpecification, getProductSpecifications, updateProductSpecification, deleteProductSpecification } from '../../controllers/ProductAndVariationControllers/productSpecification.controller';

const router = Router();

router.get('/:productId', getProductSpecifications);
router.post('/', createProductSpecification);
router.patch('/:id', updateProductSpecification);
router.delete('/:id', deleteProductSpecification);

export default router;
