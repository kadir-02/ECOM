import { Router } from 'express';
import {
  getAllTaxes,
  createTax,
  updateTax,
  deleteTax,
} from '../controllers/tax.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = Router();

router.get('/', getAllTaxes);
// router.use(authenticate,authorizeAdmin)
router.post('/', createTax);
router.patch('/:id/', updateTax);
router.delete('/:id/', deleteTax);

export default router;
