import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/utils/jwt";
import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { User, UserRole } from "@/models/User";

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
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized(
        "Khong tim thay access token",
        "ACCESS_TOKEN_MISSING",
      );
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized(
        "Access token khong hop le hoac da het han",
        "ACCESS_TOKEN_INVALID",
      );
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      throw ApiError.unauthorized("Tai khoan khong ton tai", "USER_NOT_FOUND");
    }
    if (!user.isActive) {
      throw ApiError.forbidden(
        "Tai khoan da bi vo hieu hoa",
        "ACCOUNT_INACTIVE",
      );
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      // Token duoc cap truoc khi doi mat khau / bi thu hoi -> tu choi
      throw ApiError.unauthorized(
        "Phien dang nhap da het hieu luc, vui long dang nhap lai",
        "SESSION_EXPIRED",
      );
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    next();
  },
);

/**
 * Middleware xac thuc TUY CHON: neu co header Authorization hop le, gan req.user
 * nhu authenticate binh thuong (de admin/manager xem duoc du lieu day du hon,
 * vi du san dang an). Neu KHONG co token (khach chua dang nhap), van cho request
 * di tiep binh thuong, khong throw 401 - dung cho cac route cong khai nhung muon
 * "biet" ai dang goi neu ho da dang nhap.
 */
export const optionalAuthenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // khach chua dang nhap, cho qua khong co req.user
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user && user.isActive && user.tokenVersion === payload.tokenVersion) {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      }
    } catch {
      // Token loi/het han -> coi nhu khach, khong chan request
    }

    next();
  },
);

/**
 * Middleware phan quyen: chi cho phep cac role duoc liet ke di tiep.
 * Dung sau middleware `authenticate`.
 * Vi du: authorize(UserRole.ADMIN) hoac authorize(UserRole.ADMIN, UserRole.MANAGER)
 */
export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Chua xac thuc", "UNAUTHENTICATED"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          "Ban khong co quyen truy cap tai nguyen nay",
          "INSUFFICIENT_PERMISSIONS",
        ),
      );
    }
    next();
  };
