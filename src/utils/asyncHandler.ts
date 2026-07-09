import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Boc cac ham controller bat dong bo, tu dong bat loi (Promise reject)
 * va chuyen cho errorMiddleware xu ly, tranh phai try/catch lap lai o moi noi.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
