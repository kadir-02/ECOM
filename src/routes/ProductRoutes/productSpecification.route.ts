import { Router } from 'express';
import { createProductSpecification, getProductSpecifications, updateProductSpecification, deleteProductSpecification } from '../../controllers/ProductAndVariationControllers/productSpecification.controller';

const router = Router();

router.post('/', createProductSpecification);
router.get('/:productId', getProductSpecifications);
router.put('/:id', updateProductSpecification);
router.delete('/:id', deleteProductSpecification);

export default router;
