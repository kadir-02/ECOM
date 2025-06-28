import { Router } from 'express';
import { createProductImage, deleteProductImage, getProductImages, updateProductImage } from '../../controllers/ProductAndVariationControllers/productImage.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

router.get('/:productId', getProductImages);
router.use(authenticate,authorizeAdmin)
router.post('/', createProductImage);
router.put('/:id', updateProductImage);
router.delete('/:id', deleteProductImage);

export default router;