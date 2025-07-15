import { Router } from 'express';
import * as analyticsTagController from '../../controllers/GoogleAnalytics/googleAnalytics.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

// Protect all routes with auth and admin check
router.get('/', analyticsTagController.getAllTags);

router.use(authenticate, authorizeAdmin);

// CRUD routes
router.post('/', analyticsTagController.createTag);
router.patch('/:id', analyticsTagController.updateTag);
router.delete('/:id', analyticsTagController.deleteTag);

export default router;
