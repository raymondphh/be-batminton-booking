import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { User, UserRole } from "@/models/User";
import { env } from "@/config/env";
import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
} from "@/services/token.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict(
      "Email nay da duoc dang ky",
      "EMAIL_ALREADY_EXISTS",
    );
  }

  const user = await User.create({
    fullName,
    email,
    password,
    phone,
    role: UserRole.CUSTOMER,
  });

  const { accessToken, refreshToken } = await issueTokenPair(user, req);
  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json(
    new ApiResponse("Dang ky tai khoan khach hang thanh cong", {
      user,
      accessToken,
    }),
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw ApiError.unauthorized(
      "Email hoac mat khau khong dung",
      "INVALID_CREDENTIALS",
    );
  }

  if (user.isLocked()) {
    const minutesLeft = Math.ceil(
      ((user.lockUntil as Date).getTime() - Date.now()) / 60000,
    );
    throw ApiError.forbidden(
      `Tai khoan tam thoi bi khoa do dang nhap sai qua nhieu lan. Vui long thu lai sau ${minutesLeft} phut`,
      "ACCOUNT_LOCKED",
    );
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      "Tai khoan da bi vo hieu hoa, vui long lien he quan tri vien",
      "ACCOUNT_INACTIVE",
    );
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;
    let lockedNow = false;
    if (user.loginAttempts >= env.maxLoginAttempts) {
      user.lockUntil = new Date(Date.now() + env.lockTimeMinutes * 60 * 1000);
      user.loginAttempts = 0;
      lockedNow = true;
    }
    await user.save();

    if (lockedNow) {
      throw ApiError.forbidden(
        `Sai mat khau qua ${env.maxLoginAttempts} lan. Tai khoan bi khoa tam thoi trong ${env.lockTimeMinutes} phut`,
        "ACCOUNT_LOCKED",
      );
    }
    throw ApiError.unauthorized(
      "Email hoac mat khau khong dung",
      "INVALID_CREDENTIALS",
    );
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair(user, req);
  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json(
    new ApiResponse("Dang nhap thanh cong", {
      user,
      accessToken,
    }),
  );
});

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = getRefreshTokenFromRequest(req);

    if (!token) {
      throw ApiError.unauthorized(
        "Khong tim thay refresh token",
        "REFRESH_TOKEN_MISSING",
      );
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await rotateRefreshToken(token, req);
    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json(
      new ApiResponse("Lam moi token thanh cong", {
        user,
        accessToken,
      }),
    );
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = getRefreshTokenFromRequest(req);
  if (token) {
    await revokeRefreshToken(token);
  }
  clearRefreshTokenCookie(res);
  res.status(200).json(new ApiResponse("Dang xuat thanh cong"));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user)
    throw ApiError.notFound("Khong tim thay nguoi dung", "USER_NOT_FOUND");
  res.status(200).json(new ApiResponse("Lay thong tin thanh cong", { user }));
});

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!.id).select("+password");
    if (!user)
      throw ApiError.notFound("Khong tim thay nguoi dung", "USER_NOT_FOUND");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest(
        "Mat khau hien tai khong dung",
        "INVALID_CURRENT_PASSWORD",
      );
    }

    user.password = newPassword;
    user.tokenVersion += 1;
    await user.save();

    clearRefreshTokenCookie(res);

    res
      .status(200)
      .json(new ApiResponse("Doi mat khau thanh cong, vui long dang nhap lai"));
  },
);
