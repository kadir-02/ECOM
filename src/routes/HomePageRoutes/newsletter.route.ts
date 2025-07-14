import express from 'express';
import {
  subscribeNewsletter,
  getAllSubscribers,
} from '../../controllers/HomePageControllers/newletter.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeAdmin } from '../../middlewares/authorizaAdmin';

const router = express.Router();

router.post('/subscribe', subscribeNewsletter);
router.get('/',authenticate,authorizeAdmin, getAllSubscribers);

export default router;
