import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { Court } from "@/models/Court/Court";
import { BookingSlotLock } from "@/models/Booking/BookingSlotLock";
import { UserRole } from "@/models/User";

export const getPublicCourtStats = asyncHandler(
  async (_req: Request, res: Response) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const currentSlot = `${String(now.getHours()).padStart(2, "0")}:00`;

    const activeCourts = await Court.find({ isActive: true }).select("_id");
    const totalCourts = activeCourts.length;

    const lockedCourtIds = await BookingSlotLock.find({
      date,
      time: currentSlot,
    }).distinct("court");
    const lockedSet = new Set(lockedCourtIds.map((id) => id.toString()));
    const availableNow = activeCourts.filter(
      (c) => !lockedSet.has(c._id.toString()),
    ).length;

    res.status(200).json(
      new ApiResponse("Lay thong ke san thanh cong", {
        totalCourts,
        availableNow,
        bookedNow: totalCourts - availableNow,
        currentSlot,
        date,
      }),
    );
  },
);

/**
 * GET /api/courts?search=&page=&limit=
 * CONG KHAI. Moi san gio co 2 muc gia (pricePerHourFixed, pricePerHourCasual),
 * khong con phan loai "san co dinh / san vang lai" rieng biet nua.
 */
export const listCourts = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;
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
  const {
    name,
    description,
    pricePerHourFixed,
    pricePerHourCasual,
    image,
    isActive,
  } = req.body;

  const court = await Court.create({
    name,
    description,
    pricePerHourFixed,
    pricePerHourCasual,
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
    "pricePerHourFixed",
    "pricePerHourCasual",
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
