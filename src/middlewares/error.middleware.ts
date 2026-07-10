import { Request, Response, NextFunction } from "express";
import { ApiError } from "@/utils/ApiError";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  next(ApiError.notFound(`Khong tim thay duong dan: ${req.originalUrl}`));
};

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Loi he thong, vui long thu lai sau";
  let errorCode = "INTERNAL_ERROR";
  let errors: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    errors = err.errors;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
    errorCode = "VALIDATION_ERROR";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "ID khong hop le";
    errorCode = "INVALID_ID";
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = "Du lieu da ton tai (trung lap)";
    errorCode = "DUPLICATE_KEY";
  }

  if (statusCode >= 500) {
    logger.error(
      `${req.method} ${req.originalUrl} - ${err.message}\n${err.stack}`,
    );
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - [${errorCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    errorCode,
    message,
    ...(errors ? { errors } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
