// Routes (aboutUsSection.routes.ts)
import { Router } from 'express';
import { createAboutUsSection, deleteAboutUsSection, getAllAboutUsSections, updateAboutUsSection } from '../../controllers/AboutUs/aboutUsSection.controller';
import { uploadMemory } from '../../upload/multerCloudinary';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

router.get('/', getAllAboutUsSections);
router.use(authenticate,authorizeAdmin)
router.post('/', uploadMemory.single('image'), createAboutUsSection);
router.patch('/:id', authenticate, uploadMemory.single('image'), updateAboutUsSection);
router.delete('/:id', deleteAboutUsSection);
export default router;
