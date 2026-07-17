import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { CourtCategory } from "@/models/Court/CourtCategory";
import { Court } from "@/models/Court/Court";
import { UserRole } from "@/models/User";

export const listCourtCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const isStaff =
      req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.MANAGER;
    const filter = isStaff ? {} : { isActive: true };

    const categories = await CourtCategory.find(filter).sort({ createdAt: 1 });
    res
      .status(200)
      .json(
        new ApiResponse("Lay danh sach loai san thanh cong", { categories }),
      );
  },
);

export const getCourtCategoryById = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await CourtCategory.findById(req.params.id);
    if (!category)
      throw ApiError.notFound("Khong tim thay loai san", "CATEGORY_NOT_FOUND");
    res
      .status(200)
      .json(new ApiResponse("Lay thong tin loai san thanh cong", { category }));
  },
);

export const createCourtCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, description, priceRules, isActive } = req.body;

    const existing = await CourtCategory.findOne({ name });
    if (existing)
      throw ApiError.conflict(
        "Ten loai san nay da ton tai",
        "CATEGORY_NAME_EXISTS",
      );

    const category = await CourtCategory.create({
      name,
      description,
      priceRules,
      isActive,
      createdBy: req.user!.id,
    });

    res
      .status(201)
      .json(new ApiResponse("Tao loai san thanh cong", { category }));
  },
);

export const updateCourtCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await CourtCategory.findById(req.params.id);
    if (!category)
      throw ApiError.notFound("Khong tim thay loai san", "CATEGORY_NOT_FOUND");

    if (req.body.name && req.body.name !== category.name) {
      const existing = await CourtCategory.findOne({ name: req.body.name });
      if (existing)
        throw ApiError.conflict(
          "Ten loai san nay da ton tai",
          "CATEGORY_NAME_EXISTS",
        );
    }

    const allowedFields = [
      "name",
      "description",
      "priceRules",
      "isActive",
    ] as const;
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (category as unknown as Record<string, unknown>)[field] =
          req.body[field];
      }
    }

    await category.save();
    res
      .status(200)
      .json(new ApiResponse("Cap nhat loai san thanh cong", { category }));
  },
);

export const deleteCourtCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const category = await CourtCategory.findById(req.params.id);
    if (!category)
      throw ApiError.notFound("Khong tim thay loai san", "CATEGORY_NOT_FOUND");

    const inUse = await Court.countDocuments({ category: category._id });
    if (inUse > 0) {
      throw ApiError.badRequest(
        `Khong the xoa - dang co ${inUse} san dang su dung loai san nay`,
        "CATEGORY_IN_USE",
      );
    }

    await category.deleteOne();
    res.status(200).json(new ApiResponse("Xoa loai san thanh cong"));
  },
);
