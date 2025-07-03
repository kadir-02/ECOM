import { Router } from 'express';
import {
  createCompanySettings,
  getAllCompanySettings,
  getCompanySettingsById,
  updateCompanySettings,
  deleteCompanySettings,
  upsertCompanySettings
} from '../../controllers/ComponySettingsControllers/companySettings.controller';

import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = Router();

// Public access
router.get('/', getAllCompanySettings);
router.get('/:id', getCompanySettingsById);

// Admin only
import { uploadMemory } from '../../upload/multerCloudinary';

router.post(
  '/',
  authenticate,
  authorizeAdmin,
  uploadMemory.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'facebook_icon', maxCount: 1 },
    { name: 'instagram_icon', maxCount: 1 },
    { name: 'twitter_icon', maxCount: 1 },
    { name: 'linkedin_icon', maxCount: 1 },
  ]),
  upsertCompanySettings
);

router.patch(
  '/:id',
  authenticate,
  authorizeAdmin,
  uploadMemory.single('logo'),
  updateCompanySettings
);
router.delete('/:id', authenticate, authorizeAdmin, deleteCompanySettings);

export default router;
