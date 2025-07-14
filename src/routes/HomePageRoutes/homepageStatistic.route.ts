import { Router } from 'express';
import {
  getHomepageStatistics,
  createHomepageStatistic,
  updateHomepageStatistic,
  deleteHomepageStatistic,
} from '../../controllers/HomePageControllers/homepageStatistic.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();
router.get('/', getHomepageStatistics);
router.use(authenticate,authorizeAdmin)
router.post('/', createHomepageStatistic);
router.patch('/:id/', updateHomepageStatistic);
router.delete('/:id/', deleteHomepageStatistic);

export default router;
