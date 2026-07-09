import rateLimit from 'express-rate-limit';

/**
 * Gioi han chung cho toan bo API: 300 request / 15 phut / IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Qua nhieu yeu cau, vui long thu lai sau' }
});

/**
 * Gioi han chat cho dang nhap: chong brute-force / do password.
 * 10 lan thu / 15 phut / IP (ket hop them khoa tai khoan theo email trong logic controller).
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Qua nhieu lan dang nhap that bai, vui long thu lai sau 15 phut' }
});

/**
 * Gioi han cho dang ky: chong tao hang loat tai khoan spam.
 * 5 lan / 60 phut / IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Qua nhieu yeu cau dang ky, vui long thu lai sau' }
});

/**
 * Gioi han cho refresh token endpoint.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Qua nhieu yeu cau, vui long thu lai sau' }
});
