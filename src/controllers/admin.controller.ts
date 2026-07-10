import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { User, UserRole } from "@/models/User";
import { revokeAllUserTokens } from "@/services/token.service";

export const createManager = asyncHandler(
  async (req: Request, res: Response) => {
    const { fullName, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw ApiError.conflict(
        "Email nay da duoc su dung",
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const manager = await User.create({
      fullName,
      email,
      password,
      phone,
      role: UserRole.MANAGER,
      createdBy: req.user!.id,
    });

    res
      .status(201)
      .json(
        new ApiResponse("Tao tai khoan quan ly thanh cong", { user: manager }),
      );
  },
);

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.query;
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt((req.query.limit as string) || "20", 10), 1),
    100,
  );

  const filter: Record<string, unknown> = {};
  if (role && Object.values(UserRole).includes(role as UserRole)) {
    filter.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse("Lay danh sach nguoi dung thanh cong", {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }),
  );
});

export const setUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body as { isActive: boolean };

    const user = await User.findById(id);
    if (!user)
      throw ApiError.notFound("Khong tim thay nguoi dung", "USER_NOT_FOUND");

    if (user.role === UserRole.ADMIN) {
      throw ApiError.forbidden(
        "Khong the thay doi trang thai cua tai khoan admin",
        "CANNOT_MODIFY_ADMIN",
      );
    }

    user.isActive = isActive;
    if (!isActive) {
      user.tokenVersion += 1;
      await revokeAllUserTokens(user._id.toString());
    }
    await user.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          isActive ? "Da mo khoa tai khoan" : "Da khoa tai khoan",
          { user },
        ),
      );
  },
);

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user)
    throw ApiError.notFound("Khong tim thay nguoi dung", "USER_NOT_FOUND");

  if (user.role === UserRole.ADMIN) {
    throw ApiError.forbidden(
      "Khong the xoa tai khoan admin",
      "CANNOT_DELETE_ADMIN",
    );
  }

  await user.deleteOne();
  await revokeAllUserTokens(id);

  res.status(200).json(new ApiResponse("Xoa nguoi dung thanh cong"));
});
