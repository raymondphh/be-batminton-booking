import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/utils/ApiResponse';
import { User, UserRole } from '@/models/User';
import { env } from '@/config/env';
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest
} from '@/services/token.service';

/**
 * POST /api/auth/register
 * Dang ky CHI danh cho khach hang. Du client co gui truong `role` len
 * cung bi bo qua hoan toan - luon force role = customer de tranh leo thang dac quyen.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('Email nay da duoc dang ky');
  }

  const user = await User.create({
    fullName,
    email,
    password,
    phone,
    role: UserRole.CUSTOMER // luon ep cung, khong tin du lieu tu client
  });

  const { accessToken, refreshToken } = await issueTokenPair(user, req);
  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json(
    new ApiResponse('Dang ky tai khoan khach hang thanh cong', {
      user,
      accessToken
    })
  );
});

/**
 * POST /api/auth/login
 * Dang nhap cho ca 3 vai tro: admin, manager, customer.
 * Co khoa tai khoan tam thoi sau nhieu lan sai mat khau (chong brute-force).
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('Email hoac mat khau khong dung');
  }

  if (user.isLocked()) {
    const minutesLeft = Math.ceil(((user.lockUntil as Date).getTime() - Date.now()) / 60000);
    throw ApiError.forbidden(
      `Tai khoan tam thoi bi khoa do dang nhap sai qua nhieu lan. Vui long thu lai sau ${minutesLeft} phut`
    );
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Tai khoan da bi vo hieu hoa, vui long lien he quan tri vien');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= env.maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + env.lockTimeMinutes * 60 * 1000);
      user.loginAttempts = 0;
    }
    await user.save();
    throw ApiError.unauthorized('Email hoac mat khau khong dung');
  }

  // Dang nhap thanh cong -> reset dem sai
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair(user, req);
  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json(
    new ApiResponse('Dang nhap thanh cong', {
      user,
      accessToken
    })
  );
});

/**
 * POST /api/auth/refresh-token
 * Doc refresh token tu httpOnly cookie, xoay vong va cap access token moi.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = getRefreshTokenFromRequest(req);

  if (!token) {
    throw ApiError.unauthorized('Khong tim thay refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken, user } = await rotateRefreshToken(token, req);
  setRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json(
    new ApiResponse('Lam moi token thanh cong', {
      user,
      accessToken
    })
  );
});

/**
 * POST /api/auth/logout
 * Thu hoi refresh token hien tai va xoa cookie.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = getRefreshTokenFromRequest(req);
  if (token) {
    await revokeRefreshToken(token);
  }
  clearRefreshTokenCookie(res);
  res.status(200).json(new ApiResponse('Dang xuat thanh cong'));
});

/**
 * GET /api/auth/me
 * Tra ve thong tin nguoi dung dang dang nhap (yeu cau da xac thuc).
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('Khong tim thay nguoi dung');
  res.status(200).json(new ApiResponse('Lay thong tin thanh cong', { user }));
});

/**
 * PATCH /api/auth/change-password
 * Doi mat khau: tang tokenVersion de thu hoi toan bo access/refresh token cu,
 * bat buoc dang nhap lai tren moi thiet bi.
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.id).select('+password');
  if (!user) throw ApiError.notFound('Khong tim thay nguoi dung');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Mat khau hien tai khong dung');
  }

  user.password = newPassword;
  user.tokenVersion += 1; // thu hoi toan bo token cu
  await user.save();

  clearRefreshTokenCookie(res);

  res.status(200).json(new ApiResponse('Doi mat khau thanh cong, vui long dang nhap lai'));
});
