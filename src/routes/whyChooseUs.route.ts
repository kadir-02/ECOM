import express from 'express';
import {
  createWhyChooseUsItem,
  getAllWhyChooseUsItems,
  getWhyChooseUsItemById,
  updateWhyChooseUsItem,
  deleteWhyChooseUsItem,
} from '../controllers/whyChooseUs.controller';

import { uploadMemory } from '../upload/multerCloudinary'; // adjust path if needed
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin'; // fixed typo here

const router = express.Router();

router.get('/', getAllWhyChooseUsItems);
router.get('/:id', getWhyChooseUsItemById);

// Protect routes below with authentication & admin authorization
router.use(authenticate, authorizeAdmin);

router.post('/', uploadMemory.single('image'), createWhyChooseUsItem);
router.patch('/:id', uploadMemory.single('image'), updateWhyChooseUsItem);
router.delete('/:id', deleteWhyChooseUsItem);

export default router;
