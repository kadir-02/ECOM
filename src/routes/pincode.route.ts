import { Router } from 'express';
import {
  checkAvailability,
  getPaginatedPincodes,
  createPincode,
  updatePincode,
  deletePincode,
  uploadCsvAndUpsertPincodes,
} from '../controllers/pincode.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';
import { uploadCsv } from '../upload/multerCsv';

const router = Router();

router.post('/check', checkAvailability); 
router.use(authenticate,authorizeAdmin)
router.get('/', getPaginatedPincodes);
router.post('/upload-csv', uploadCsv.single('file'), uploadCsvAndUpsertPincodes);
router.post('/', createPincode);
router.patch('/:id', updatePincode);
router.delete('/:id', deletePincode);

export default router;
