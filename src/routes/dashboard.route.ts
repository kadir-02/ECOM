import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';
import { getDashboard, getUserDashboardSections } from '../controllers/dashboard.controller';

const router = express.Router();

router.use(authenticate,authorizeAdmin)

router.post('/user/dashboard', getDashboard);
router.post('/user/dashboard-sections/', getUserDashboardSections);

export default router;
