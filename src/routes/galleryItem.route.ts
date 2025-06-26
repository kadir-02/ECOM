import express from 'express';
import {
  createGalleryItem,
  getAllGalleryItems,
  updateGalleryItem,
  deleteGalleryItem,
} from '../controllers/galleryItem.controller';
import { uploadMemory } from '../upload/multerCloudinary';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();
router.get('/', getAllGalleryItems);
router.post(
  '/',
  authenticate,
  authorizeAdmin,
  uploadMemory.single('image'),
  createGalleryItem
);
router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  uploadMemory.single('image'),
  updateGalleryItem
);
router.delete('/:id', authenticate, authorizeAdmin, deleteGalleryItem);

export default router;
