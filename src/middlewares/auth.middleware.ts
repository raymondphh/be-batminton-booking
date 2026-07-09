import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { asyncHandler } from '@/utils/asyncHandler';
import { User, UserRole } from '@/models/User';

// Mo rong kieu Request de gan thong tin user da xac thuc
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        tokenVersion: number;
      };
    }
  }
}

/**
 * Middleware xac thuc: doc access token tu header Authorization: Bearer <token>.
 * Kiem tra chu ky, han su dung, tai khoan con ton tai/active, va tokenVersion
 * (de ho tro thu hoi token khi doi mat khau / khoa tai khoan / logout-all).
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Khong tim thay access token');
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Access token khong hop le hoac da het han');
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw ApiError.unauthorized('Tai khoan khong ton tai');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('Tai khoan da bi vo hieu hoa');
  }
  if (user.tokenVersion !== payload.tokenVersion) {
    // Token duoc cap truoc khi doi mat khau / bi thu hoi -> tu choi
    throw ApiError.unauthorized('Phien dang nhap da het hieu luc, vui long dang nhap lai');
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion
  };

  next();
});

/**
 * Middleware phan quyen: chi cho phep cac role duoc liet ke di tiep.
 * Dung sau middleware `authenticate`.
 * Vi du: authorize(UserRole.ADMIN) hoac authorize(UserRole.ADMIN, UserRole.MANAGER)
 */
export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Chua xac thuc'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Ban khong co quyen truy cap tai nguyen nay'));
    }
    next();
  };
