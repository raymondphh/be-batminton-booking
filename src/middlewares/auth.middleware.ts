import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/utils/jwt";
import { ApiError } from "@/utils/ApiError";
import { asyncHandler } from "@/utils/asyncHandler";
import { User, UserRole } from "@/models/User";

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
