import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';

/**
 * Middleware validate body/query/params bang zod schema.
 * Neu khong hop le -> tra ve 400 kem chi tiet loi tung truong.
 */
export const validate =
  (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.body = parsed.body ?? req.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return next(ApiError.badRequest('Du lieu dau vao khong hop le', formatted));
      }
      next(err);
    }
  };
