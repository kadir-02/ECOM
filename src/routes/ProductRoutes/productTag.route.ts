import { Router } from 'express';
import {
  getAllProductTags,
  createProductTag,
  updateProductTag,
  deleteProductTag,
} from '../../controllers/ProductAndVariationControllers/productTag.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

router.get('/', getAllProductTags);
router.use(authenticate,authorizeAdmin)
router.post('/', createProductTag);
router.patch('/:id/', updateProductTag);
router.delete('/:id/', deleteProductTag);

export default router;
