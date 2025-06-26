import express from 'express';
import {
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
} from '../../controllers/TestimonialController/testimonial.controller';
import { uploadMemory } from '../../upload/multerCloudinary';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = express.Router();

router.get('/', getAllTestimonials);
router.get('/:id', getTestimonialById);

router.use(authenticate, authorizeAdmin);
router.post('/', uploadMemory.single('image'), createTestimonial);
router.put('/:id', uploadMemory.single('image'), updateTestimonial);
router.delete('/:id', deleteTestimonial);

export default router;
