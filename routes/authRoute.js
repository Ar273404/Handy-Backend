import express from 'express';
import upload from '../utils/multer.js';
import { login, signup, userInfo } from '../Controllers/AuthController.js';
import verifyToken from '../Middleware/authMiddleware.js';


const router = express.Router();

router.post('/signup', upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'aadharCard', maxCount: 1 },
  ]), signup);

router.post('/login', login);

router.post('/users/me', verifyToken, userInfo);

export default router;