import { Router } from 'express';
import {
  getAllStores,
  createStore,
  updateStore,
  deleteStore,
  uploadCsvAndUpsertStores,
} from '../../controllers/StoreAddress/store.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';
import { uploadCsv } from '../../upload/multerCsv';

const router = Router();

router.get('/', getAllStores);

router.use(authenticate, authorizeAdmin);

router.post('/', createStore);
router.patch('/:id', updateStore);
router.delete('/:id', deleteStore);

router.post('/csv-upload', uploadCsv.single('file'), uploadCsvAndUpsertStores);


export default router;
