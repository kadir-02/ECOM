import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { uploadMemory } from '../upload/multerCloudinary';
import { loginRateLimiter } from '../middlewares/loginRateLimiter';

const router = Router();

router.post('/register', uploadMemory.single('image'), register);
router.post('/login', login);

export default router;
