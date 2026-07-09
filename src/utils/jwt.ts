import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';
import { UserRole } from '@/models/User';

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
  tokenVersion: number;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // id rieng cua refresh token (de doi chieu voi DB, cho phep thu hoi)
  tokenVersion: number;
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
    issuer: 'backend-auth-api',
    audience: 'backend-auth-client'
  } as SignOptions);
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
    issuer: 'backend-auth-api',
    audience: 'backend-auth-client'
  } as SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.jwtAccessSecret, {
    issuer: 'backend-auth-api',
    audience: 'backend-auth-client'
  }) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.jwtRefreshSecret, {
    issuer: 'backend-auth-api',
    audience: 'backend-auth-client'
  }) as RefreshTokenPayload;
};

/**
 * Chuyen chuoi thoi gian nhu "7d", "15m" thanh so mili-giay
 * de tinh expiresAt luu vao DB / cookie maxAge.
 */
export const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const unitMap: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return value * unitMap[unit];
};
