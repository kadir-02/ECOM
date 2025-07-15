import { Router } from 'express';
import {
  getAllAbandonedCartSettings,
  createAbandonedCartSetting,
  updateAbandonedCartSetting,
  deleteAbandonedCartSetting,
} from '../../controllers/Abandoned/abandonedCartSetting.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

router.get('/', getAllAbandonedCartSettings);

router.use(authenticate, authorizeAdmin)

router.post('/', createAbandonedCartSetting);
router.patch('/:id', updateAbandonedCartSetting);
router.delete('/:id', deleteAbandonedCartSetting);

export default router;
