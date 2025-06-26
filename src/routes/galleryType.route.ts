import express from 'express';
import {
  createGalleryType,
  getAllGalleryTypes,
  updateGalleryType,
  deleteGalleryType,
} from '../controllers/galleryType.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();
router.get('/', getAllGalleryTypes);
router.use(authenticate, authorizeAdmin);
router.post('/', createGalleryType);
router.patch('/:id', updateGalleryType);
router.delete('/:id', deleteGalleryType);
export default router;
