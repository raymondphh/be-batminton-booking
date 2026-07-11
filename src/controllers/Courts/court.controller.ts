import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { Court } from "@/models/Court/Court";
import { UserRole } from "@/models/User";

export const listCourts = asyncHandler(async (req: Request, res: Response) => {
  const { type, search } = req.query;
  const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt((req.query.limit as string) || "50", 10), 1),
    100,
  );

  const filter: Record<string, unknown> = {};

  const isStaff =
    req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.MANAGER;
  if (!isStaff) {
    filter.isActive = true;
  } else if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  if (type === "fixed" || type === "casual") {
    filter.type = type;
  }

  if (search && typeof search === "string" && search.trim()) {
    filter.$text = { $search: search.trim() };
  }

  const [courts, total] = await Promise.all([
    Court.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Court.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse("Lay danh sach san thanh cong", {
      courts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }),
  );
});

export const getCourtById = asyncHandler(
  async (req: Request, res: Response) => {
    const court = await Court.findById(req.params.id);
    if (!court)
      throw ApiError.notFound("Khong tim thay san", "COURT_NOT_FOUND");

    const isStaff =
      req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.MANAGER;
    if (!court.isActive && !isStaff) {
      throw ApiError.notFound("Khong tim thay san", "COURT_NOT_FOUND");
    }

    res
      .status(200)
      .json(new ApiResponse("Lay thong tin san thanh cong", { court }));
  },
);

export const createCourt = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, type, pricePerHour, image, isActive } = req.body;

  const court = await Court.create({
    name,
    description,
    type,
    pricePerHour,
    image,
    isActive,
    createdBy: req.user!.id,
  });

  res.status(201).json(new ApiResponse("Tao san thanh cong", { court }));
});

export const updateCourt = asyncHandler(async (req: Request, res: Response) => {
  const court = await Court.findById(req.params.id);
  if (!court) throw ApiError.notFound("Khong tim thay san", "COURT_NOT_FOUND");

  const allowedFields = [
    "name",
    "description",
    "type",
    "pricePerHour",
    "image",
    "isActive",
  ] as const;
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (court as unknown as Record<string, unknown>)[field] = req.body[field];
    }
  }

  await court.save();

  res.status(200).json(new ApiResponse("Cap nhat san thanh cong", { court }));
});

export const deleteCourt = asyncHandler(async (req: Request, res: Response) => {
  const court = await Court.findById(req.params.id);
  if (!court) throw ApiError.notFound("Khong tim thay san", "COURT_NOT_FOUND");

  await court.deleteOne();

  res.status(200).json(new ApiResponse("Xoa san thanh cong"));
});
