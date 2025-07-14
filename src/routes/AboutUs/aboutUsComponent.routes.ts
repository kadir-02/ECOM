import { Router } from 'express';
import {
  createComponent,
  deleteComponent,
  getComponentsBySection,
  updateComponent,
} from '../../controllers/AboutUs/aboutUsComponent.controller';
import { uploadMemory } from '../../upload/multerCloudinary';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

router.get('/', getComponentsBySection);

router.use(authenticate, authorizeAdmin);

router.post('/', uploadMemory.single('image'), createComponent);
router.patch('/:id', uploadMemory.single('image'), updateComponent);
router.delete('/:id', deleteComponent);

export default router;
