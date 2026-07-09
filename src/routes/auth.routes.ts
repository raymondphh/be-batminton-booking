import { Router } from 'express';
import * as authController from '@/controllers/auth.controller';
import { validate } from '@/middlewares/validate.middleware';
import { authenticate } from '@/middlewares/auth.middleware';
import { registerSchema, loginSchema, changePasswordSchema } from '@/validations/auth.validation';
import { loginLimiter, registerLimiter, refreshLimiter } from '@/middlewares/rateLimit.middleware';

const router = Router();

// Cong khai - Dang ky CHI danh cho khach hang
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

// Cong khai - Dang nhap chung cho admin / manager / customer
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// Cong khai - Lam moi access token bang refresh token (cookie)
router.post('/refresh-token', refreshLimiter, authController.refreshToken);

// Cong khai - Dang xuat (xoa cookie + thu hoi refresh token)
router.post('/logout', authController.logout);

// Yeu cau dang nhap
router.get('/me', authenticate, authController.getMe);
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
