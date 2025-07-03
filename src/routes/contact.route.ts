import express from 'express';
import {
  getContactRequests,
  getContactRequestById,
  markContactAsHandled,
  deleteContactRequest,
  createContactRequest
} from '../controllers/contact.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorizeAdmin } from '../middlewares/authorizaAdmin';

const router = express.Router();
router.post('/contact_form', createContactRequest);
router.use(authenticate)
router.get('/contact_form',authorizeAdmin, getContactRequests);
router.get('/contacts/:id',authorizeAdmin, getContactRequestById);
router.patch('/contact_form/:id',authorizeAdmin, markContactAsHandled);
router.delete('/contacts/:id', deleteContactRequest);

export default router;
