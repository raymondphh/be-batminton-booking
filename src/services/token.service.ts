import crypto from "crypto";
import { Response, Request } from "express";
import { IUser } from "@/models/User";
import { RefreshToken, hashToken } from "@/models/RefreshToken";
import {
  signAccessToken,
  signRefreshToken,
  parseDurationToMs,
  verifyRefreshToken,
} from "@/utils/jwt";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";

const REFRESH_COOKIE_NAME = "refreshToken";

/**
 * Cap phat cap access token + refresh token moi cho user, luu hash cua
 * refresh token vao DB (khong bao gio luu token goc) de co the thu hoi sau nay.
 */
export const issueTokenPair = async (user: IUser, req: Request) => {
  const jti = crypto.randomUUID();

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    jti,
    tokenVersion: user.tokenVersion,
  });

  const expiresAt = new Date(
    Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn),
  );

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    jti,
    userAgent: req.headers["user-agent"],
    ip: req.ip,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

/**
 * Xoay vong refresh token (refresh token rotation):
 * - Verify JWT hop le
 * - Doi chieu hash trong DB, dam bao chua bi thu hoi/het han
 * - Thu hoi token cu, cap token moi (neu token cu bi dung lai -> phat hien danh cap, thu hoi toan bo)
 */
export const rotateRefreshToken = async (rawToken: string, req: Request) => {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized(
      "Refresh token khong hop le hoac da het han",
      "REFRESH_TOKEN_INVALID",
    );
  }

  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ jti: payload.jti });

  if (!stored || stored.tokenHash !== tokenHash) {
    throw ApiError.unauthorized(
      "Refresh token khong hop le",
      "REFRESH_TOKEN_INVALID",
    );
  }

  if (stored.revoked) {
    await RefreshToken.updateMany(
      { user: stored.user, revoked: false },
      { revoked: true },
    );
    throw ApiError.unauthorized(
      "Phat hien su dung token bat thuong, vui long dang nhap lai",
      "REFRESH_TOKEN_REUSED",
    );
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized(
      "Refresh token da het han",
      "REFRESH_TOKEN_EXPIRED",
    );
  }

  const { User } = await import("@/models/User");
  const user = await User.findById(stored.user);

  if (!user || !user.isActive) {
    throw ApiError.unauthorized("Tai khoan khong hop le", "ACCOUNT_INACTIVE");
  }
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized(
      "Phien dang nhap da het hieu luc, vui long dang nhap lai",
      "SESSION_EXPIRED",
    );
  }

  stored.revoked = true;
  const { accessToken, refreshToken } = await issueTokenPair(user, req);
  stored.replacedByJti = JSON.parse(
    Buffer.from(refreshToken.split(".")[1], "base64").toString(),
  ).jti;
  await stored.save();

  return { accessToken, refreshToken, user };
};

export const revokeRefreshToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne({ tokenHash }, { revoked: true });
};

export const revokeAllUserTokens = async (userId: string) => {
  await RefreshToken.updateMany(
    { user: userId, revoked: false },
    { revoked: true },
  );
};

export const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd, // chi gui qua HTTPS o production
    sameSite: env.isProd ? "strict" : "lax",
    domain: env.isProd ? env.cookieDomain : undefined,
    path: "/api/auth",
    maxAge: parseDurationToMs(env.jwtRefreshExpiresIn),
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? "strict" : "lax",
    domain: env.isProd ? env.cookieDomain : undefined,
    path: "/api/auth",
  });
};

export const getRefreshTokenFromRequest = (
  req: Request,
): string | undefined => {
  return req.cookies?.[REFRESH_COOKIE_NAME];
};
