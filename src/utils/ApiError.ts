/**
 * Lop loi chuan hoa cho toan bo he thong.
 * Moi loi nghiep vu nen throw ApiError thay vi Error thuong,
 * de errorMiddleware co the tra ve response dong nhat.
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Yeu cau khong hop le', errors?: unknown) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Chua xac thuc') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Ban khong co quyen thuc hien hanh dong nay') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Khong tim thay tai nguyen') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Du lieu da ton tai') {
    return new ApiError(409, message);
  }
  static tooManyRequests(message = 'Qua nhieu yeu cau, vui long thu lai sau') {
    return new ApiError(429, message);
  }
  static internal(message = 'Loi he thong, vui long thu lai sau') {
    return new ApiError(500, message);
  }
}
