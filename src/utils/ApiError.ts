export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string; // ma loi rieng, on dinh, de FE switch-case thay vi parse message
  public isOperational: boolean;
  public errors?: unknown;

  constructor(
    statusCode: number,
    message: string,
    errorCode = "ERROR",
    errors?: unknown,
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(
    message = "Yeu cau khong hop le",
    errorCode = "BAD_REQUEST",
    errors?: unknown,
  ) {
    return new ApiError(400, message, errorCode, errors);
  }
  static unauthorized(message = "Chua xac thuc", errorCode = "UNAUTHORIZED") {
    return new ApiError(401, message, errorCode);
  }
  static forbidden(
    message = "Ban khong co quyen thuc hien hanh dong nay",
    errorCode = "FORBIDDEN",
  ) {
    return new ApiError(403, message, errorCode);
  }
  static notFound(
    message = "Khong tim thay tai nguyen",
    errorCode = "NOT_FOUND",
  ) {
    return new ApiError(404, message, errorCode);
  }
  static conflict(message = "Du lieu da ton tai", errorCode = "CONFLICT") {
    return new ApiError(409, message, errorCode);
  }
  static tooManyRequests(
    message = "Qua nhieu yeu cau, vui long thu lai sau",
    errorCode = "TOO_MANY_REQUESTS",
  ) {
    return new ApiError(429, message, errorCode);
  }
  static internal(
    message = "Loi he thong, vui long thu lai sau",
    errorCode = "INTERNAL_ERROR",
  ) {
    return new ApiError(500, message, errorCode);
  }
}
