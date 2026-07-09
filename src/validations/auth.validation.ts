import { z } from 'zod';

// Mat khau manh: it nhat 8 ky tu, co chu hoa, chu thuong, so va ky tu dac biet
const passwordSchema = z
  .string()
  .min(8, 'Mat khau phai co it nhat 8 ky tu')
  .max(72, 'Mat khau qua dai')
  .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
  .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu hoa')
  .regex(/[0-9]/, 'Mat khau phai co it nhat 1 chu so')
  .regex(/[^a-zA-Z0-9]/, 'Mat khau phai co it nhat 1 ky tu dac biet');

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Ho ten qua ngan').max(100),
    email: z.string().trim().email('Email khong hop le').toLowerCase(),
    password: passwordSchema,
    phone: z
      .string()
      .trim()
      .regex(/^(0|\+84)[0-9]{9,10}$/, 'So dien thoai khong hop le')
      .optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Email khong hop le').toLowerCase(),
    password: z.string().min(1, 'Mat khau la bat buoc')
  })
});

export const createManagerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Ho ten qua ngan').max(100),
    email: z.string().trim().email('Email khong hop le').toLowerCase(),
    password: passwordSchema,
    phone: z
      .string()
      .trim()
      .regex(/^(0|\+84)[0-9]{9,10}$/, 'So dien thoai khong hop le')
      .optional()
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID khong hop le')
  })
});

export const setUserStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID khong hop le')
  }),
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive la bat buoc' })
  })
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Mat khau hien tai la bat buoc'),
      newPassword: passwordSchema
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'Mat khau moi phai khac mat khau hien tai',
      path: ['newPassword']
    })
});
