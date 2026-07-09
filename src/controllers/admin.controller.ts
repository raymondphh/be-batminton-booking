import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { User, UserRole } from '@/models/User';
import { revokeAllUserTokens } from '@/services/token.service';

/**
 * POST /api/admin/managers
 * CHI admin duoc goi (route da gan middleware authorize(ADMIN)).
 * Tao tai khoan vai tro "manager" (quan ly). Role luon bi ep cung = MANAGER,
 * khong nhan tu client, de tranh admin/client vo tinh tao nham quyen khac.
 */
export const createManager = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('Email nay da duoc su dung');
  }

  const manager = await User.create({
    fullName,
    email,
    password,
    phone,
    role: UserRole.MANAGER,
    createdBy: req.user!.id
  });

  res.status(201).json(new ApiResponse('Tao tai khoan quan ly thanh cong', { user: manager }));
});

/**
 * GET /api/admin/users?role=&page=&limit=
 * Danh sach nguoi dung, co the loc theo role, phan trang.
 */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.query;
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 100);

  const filter: Record<string, unknown> = {};
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    filter.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  res.status(200).json(
    new ApiResponse('Lay danh sach nguoi dung thanh cong', {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  );
});

/**
 * PATCH /api/admin/users/:id/status
 * Khoa / mo khoa tai khoan (isActive). Khi khoa, thu hoi luon toan bo token.
 */
export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body as { isActive: boolean };

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('Khong tim thay nguoi dung');

  if (user.role === UserRole.ADMIN) {
    throw ApiError.forbidden('Khong the thay doi trang thai cua tai khoan admin');
  }

  user.isActive = isActive;
  if (!isActive) {
    user.tokenVersion += 1; // thu hoi token hien tai
    await revokeAllUserTokens(user._id.toString());
  }
  await user.save();

  res.status(200).json(
    new ApiResponse(isActive ? 'Da mo khoa tai khoan' : 'Da khoa tai khoan', { user })
  );
});

/**
 * DELETE /api/admin/users/:id
 * Xoa tai khoan quan ly hoac khach hang (khong cho xoa admin).
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('Khong tim thay nguoi dung');

  if (user.role === UserRole.ADMIN) {
    throw ApiError.forbidden('Khong the xoa tai khoan admin');
  }

  await user.deleteOne();
  await revokeAllUserTokens(id);

  res.status(200).json(new ApiResponse('Xoa nguoi dung thanh cong'));
});
