import { Router } from 'express';
import * as adminController from '@/controllers/admin.controller';
import { validate } from '@/middlewares/validate.middleware';
import { authenticate, authorize } from '@/middlewares/auth.middleware';
import { UserRole } from '@/models/User';
import {
  createManagerSchema,
  userIdParamSchema,
  setUserStatusSchema
} from '@/validations/auth.validation';

const router = Router();

// Tat ca route trong file nay yeu cau: da dang nhap VA la ADMIN
router.use(authenticate, authorize(UserRole.ADMIN));

// Admin tao tai khoan cho Quan ly (manager)
router.post('/managers', validate(createManagerSchema), adminController.createManager);

// Admin xem danh sach nguoi dung (loc theo role, phan trang)
router.get('/users', adminController.listUsers);

// Admin khoa / mo khoa tai khoan
router.patch(
  '/users/:id/status',
  validate(setUserStatusSchema),
  adminController.setUserStatus
);

// Admin xoa tai khoan (manager hoac customer)
router.delete('/users/:id', validate(userIdParamSchema), adminController.deleteUser);

export default router;
