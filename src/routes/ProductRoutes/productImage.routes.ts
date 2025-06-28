import { Router } from 'express';
import { createProductImage, deleteProductImage } from '../../controllers/ProductAndVariationControllers/productImage.controller';

const router = Router();

router.post('/create', createProductImage);
router.delete('/:id', deleteProductImage);

export default router;
