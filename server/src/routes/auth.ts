import { Router } from 'express';
import {
    register,
    login,
    getCurrentUser,
    sendVerificationCode,
    resetPassword,
    loginEmail,
    registerEmail
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-code', sendVerificationCode);
router.post('/login-email', loginEmail);
router.post('/register-email', registerEmail);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getCurrentUser);

export default router;
