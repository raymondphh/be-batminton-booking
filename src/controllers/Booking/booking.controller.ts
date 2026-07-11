import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import {
  Booking,
  BookingStatus,
  BookingType,
  IBooking,
} from "@/models/Booking/Booking";
import { BookingSlotLock } from "@/models/Booking/BookingSlotLock";
import { Court, CourtType } from "@/models/Court/Court";
import { User } from "@/models/User";
import { TIME_SLOTS } from "@/config/timeSlots";
import { FIXED_DURATION_OPTIONS } from "@/config/fixedDurations";
import { getIO } from "@/config/socket";
import { logger } from "@/config/logger";

// Kiem tra cac khung gio co lien tiep nhau khong, dua theo vi tri trong TIME_SLOTS
const areConsecutive = (slots: string[]): boolean => {
  const indices = slots.map((s) => TIME_SLOTS.indexOf(s)).sort((a, b) => a - b);
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
};

const buildTimeRange = (slots: string[]) => {
  const sorted = [...slots].sort();
  const start = sorted[0];
  const lastSlotHour = parseInt(sorted[sorted.length - 1].split(":")[0], 10);
  const end = `${String(lastSlotHour + 1).padStart(2, "0")}:00`;
  return { start, end, hours: sorted.length };
};

const getTodayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Cong so thang vao 1 ngay (dinh dang YYYY-MM-DD), tu xu ly truong hop
 * ngay khong ton tai o thang dich (vi du 31/1 + 1 thang -> 28/2 hoac 29/2).
 */
const addMonthsToDateStr = (dateStr: string, months: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const targetMonthIndex = m - 1 + months;
  const targetYear = y + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    targetYear,
    targetMonth + 1,
    0,
  ).getDate();
  const targetDay = Math.min(d, lastDayOfTargetMonth);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
};

/**
 * Sinh danh sach cac ngay cu the trong 1 goi dang ky co dinh: bat dau tu startDate,
 * lap lai moi 7 ngay (cung thu trong tuan), cho den truoc ngay ket thuc (startDate + durationMonths).
 */
const generateWeeklyOccurrences = (
  startDateStr: string,
  durationMonths: number,
): string[] => {
  const endDateStr = addMonthsToDateStr(startDateStr, durationMonths);
  const occurrences: string[] = [];
  const current = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  while (current < end) {
    occurrences.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 7);
  }
  return occurrences;
};

/**
 * Bao cho tat ca client dang xem (san, ngay) nay biet danh sach khung gio moi nhat.
 * Boc try/catch: du socket co van de gi cung khong duoc lam API dat san bi loi theo.
 */
const emitSlotsUpdated = async (courtId: string, date: string) => {
  try {
    const locks = await BookingSlotLock.find({ court: courtId, date }).select(
      "time -_id",
    );
    const bookedSlots = locks.map((l) => l.time);
    getIO()
      .to(`slots:${courtId}:${date}`)
      .emit("slots:updated", { courtId, date, bookedSlots });
  } catch (err) {
    logger.warn(`Khong the emit slots:updated - ${err}`);
  }
};

/**
 * Bao cho nhan vien (phong "staff") va chinh khach hang do (phong "user:<id>")
 * biet 1 booking vua duoc tao/thay doi trang thai.
 */
const emitBookingUpdated = (
  booking: IBooking,
  event: "booking:new" | "booking:updated",
) => {
  try {
    getIO().to("staff").emit(event, { booking });
    getIO().to(`user:${booking.user.toString()}`).emit(event, { booking });
  } catch (err) {
    logger.warn(`Khong the emit ${event} - ${err}`);
  }
};

/**
 * GET /api/bookings/availability?courtId=&date=
 */
export const getAvailability = asyncHandler(
  async (req: Request, res: Response) => {
    const courtId = req.query.courtId as string;
    const date = req.query.date as string;

    const locks = await BookingSlotLock.find({ court: courtId, date }).select(
      "time -_id",
    );
    const bookedSlots = locks.map((l) => l.time);

    res
      .status(200)
      .json(
        new ApiResponse("Lay danh sach khung gio thanh cong", { bookedSlots }),
      );
  },
);

/**
 * POST /api/bookings - dat le (chi ap dung cho san vang lai)
 */
export const createBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const { courtId, date, slots, notes } = req.body as {
      courtId: string;
      date: string;
      slots: string[];
      notes?: string;
    };

    const uniqueSlots = Array.from(new Set(slots));
    if (uniqueSlots.length !== slots.length) {
      throw ApiError.badRequest(
        "Danh sach khung gio bi trung lap",
        "DUPLICATE_SLOTS",
      );
    }
    if (!areConsecutive(uniqueSlots)) {
      throw ApiError.badRequest(
        "Cac khung gio phai lien tiep nhau",
        "SLOTS_NOT_CONSECUTIVE",
      );
    }

    const todayStr = getTodayStr();
    if (date < todayStr) {
      throw ApiError.badRequest(
        "Khong the dat san cho ngay da qua",
        "DATE_IN_PAST",
      );
    }
    if (date === todayStr) {
      const currentHour = new Date().getHours();
      const hasPastSlot = uniqueSlots.some(
        (s) => parseInt(s.split(":")[0], 10) <= currentHour,
      );
      if (hasPastSlot) {
        throw ApiError.badRequest(
          "Khong the dat khung gio da qua trong ngay hom nay",
          "SLOT_IN_PAST",
        );
      }
    }

    const court = await Court.findById(courtId);
    if (!court)
      throw ApiError.notFound("Khong tim thay san", "COURT_NOT_FOUND");
    if (!court.isActive)
      throw ApiError.badRequest(
        "San nay hien khong hoat dong",
        "COURT_INACTIVE",
      );
    if (court.type === CourtType.FIXED) {
      throw ApiError.badRequest(
        "San nay la san co dinh, vui long dang ky theo goi dai han (toi thieu 1 thang)",
        "COURT_REQUIRES_FIXED_PACKAGE",
      );
    }

    const user = await User.findById(req.user!.id);
    if (!user)
      throw ApiError.notFound("Khong tim thay nguoi dung", "USER_NOT_FOUND");

    const { start, end, hours } = buildTimeRange(uniqueSlots);
    const totalPrice = hours * court.pricePerHour;

    const session = await mongoose.startSession();
    let createdBookingId: mongoose.Types.ObjectId | undefined;

    try {
      await session.withTransaction(async () => {
        const [booking] = await Booking.create(
          [
            {
              user: user._id,
              userName: user.fullName,
              court: court._id,
              courtName: court.name,
              courtType: court.type,
              bookingType: BookingType.CASUAL,
              date,
              slots: uniqueSlots,
              startTime: start,
              endTime: end,
              hours,
              pricePerHour: court.pricePerHour,
              totalPrice,
              status: BookingStatus.PENDING,
              notes: notes || "",
            },
          ],
          { session },
        );

        try {
          await BookingSlotLock.insertMany(
            uniqueSlots.map((time) => ({
              court: court._id,
              date,
              time,
              booking: booking._id,
            })),
            { session, ordered: true },
          );
        } catch (err: unknown) {
          const mongoErr = err as { code?: number };
          if (mongoErr?.code === 11000) {
            throw ApiError.conflict(
              "Rat tiec, mot hoac nhieu khung gio ban chon vua duoc nguoi khac dat truoc. Vui long chon khung gio khac.",
              "SLOT_ALREADY_BOOKED",
            );
          }
          throw err;
        }

        createdBookingId = booking._id;
      });
    } finally {
      await session.endSession();
    }

    const booking = await Booking.findById(createdBookingId);

    await emitSlotsUpdated(courtId, date);
    if (booking) emitBookingUpdated(booking, "booking:new");

    res.status(201).json(
      new ApiResponse("Dat san thanh cong, cho nhan vien xac nhan", {
        booking,
      }),
    );
  },
);

/**
 * GET /api/bookings/fixed-durations
 */
export const getFixedDurationOptions = asyncHandler(
  async (_req: Request, res: Response) => {
    res.status(200).json(
      new ApiResponse("Lay danh sach goi co dinh thanh cong", {
        options: FIXED_DURATION_OPTIONS,
      }),
    );
  },
);

/**
 * POST /api/bookings/fixed - dang ky san co dinh theo goi dai han
 */
export const createFixedBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const { courtId, startDate, slots, durationMonths, notes } = req.body as {
      courtId: string;
      startDate: string;
      slots: string[];
      durationMonths: 1 | 2 | 3 | 6 | 12;
      notes?: string;
    };

    const uniqueSlots = Array.from(new Set(slots));
    if (uniqueSlots.length !== slots.length) {
      throw ApiError.badRequest(
        "Danh sach khung gio bi trung lap",
        "DUPLICATE_SLOTS",
      );
    }
    if (!areConsecutive(uniqueSlots)) {
      throw ApiError.badRequest(
        "Cac khung gio phai lien tiep nhau",
        "SLOTS_NOT_CONSECUTIVE",
      );
    }

    const todayStr = getTodayStr();
    if (startDate < todayStr) {
      throw ApiError.badRequest(
        "Ngay bat dau khong the o trong qua khu",
        "DATE_IN_PAST",
      );
    }
    if (startDate === todayStr) {
      const currentHour = new Date().getHours();
      const hasPastSlot = uniqueSlots.some(
        (s) => parseInt(s.split(":")[0], 10) <= currentHour,
      );
      if (hasPastSlot) {
        throw ApiError.badRequest(
          "Khong the dat khung gio da qua trong ngay hom nay",
          "SLOT_IN_PAST",
        );
      }
    }

    const court = await Court.findById(courtId);
    if (!court)
      throw ApiError.notFound("Khong tim thay san", "COURT_NOT_FOUND");
    if (!court.isActive)
      throw ApiError.badRequest(
        "San nay hien khong hoat dong",
        "COURT_INACTIVE",
      );
    if (court.type !== CourtType.FIXED) {
      throw ApiError.badRequest(
        "Chi san co dinh moi ho tro dang ky goi dai han. San vang lai vui long dat tung buoi.",
        "COURT_NOT_FIXED_TYPE",
      );
    }

    const user = await User.findById(req.user!.id);
    if (!user)
      throw ApiError.notFound("Khong tim thay nguoi dung", "USER_NOT_FOUND");

    const durationOption = FIXED_DURATION_OPTIONS.find(
      (o) => o.months === durationMonths,
    );
    if (!durationOption)
      throw ApiError.badRequest(
        "Thoi han goi khong hop le",
        "INVALID_DURATION",
      );

    const occurrenceDates = generateWeeklyOccurrences(
      startDate,
      durationMonths,
    );
    if (occurrenceDates.length === 0) {
      throw ApiError.badRequest(
        "Khong tinh duoc lich dang ky, vui long kiem tra lai ngay bat dau",
        "INVALID_SCHEDULE",
      );
    }

    const { start, end, hours } = buildTimeRange(uniqueSlots);
    const originalTotalPrice =
      hours * court.pricePerHour * occurrenceDates.length;
    const totalPrice = Math.round(
      originalTotalPrice * (1 - durationOption.discountPercent / 100),
    );

    const session = await mongoose.startSession();
    let createdBookingId: mongoose.Types.ObjectId | undefined;

    try {
      await session.withTransaction(async () => {
        const [booking] = await Booking.create(
          [
            {
              user: user._id,
              userName: user.fullName,
              court: court._id,
              courtName: court.name,
              courtType: court.type,
              bookingType: BookingType.FIXED,
              date: startDate,
              slots: uniqueSlots,
              startTime: start,
              endTime: end,
              hours,
              pricePerHour: court.pricePerHour,
              durationMonths,
              startDate,
              endDate: occurrenceDates[occurrenceDates.length - 1],
              occurrenceDates,
              discountPercent: durationOption.discountPercent,
              originalTotalPrice,
              totalPrice,
              status: BookingStatus.PENDING,
              notes: notes || "",
            },
          ],
          { session },
        );

        const lockDocs = occurrenceDates.flatMap((occDate) =>
          uniqueSlots.map((time) => ({
            court: court._id,
            date: occDate,
            time,
            booking: booking._id,
          })),
        );

        try {
          await BookingSlotLock.insertMany(lockDocs, {
            session,
            ordered: true,
          });
        } catch (err: unknown) {
          const mongoErr = err as { code?: number };
          if (mongoErr?.code === 11000) {
            throw ApiError.conflict(
              "Rat tiec, mot hoac nhieu buoi trong lich dang ky nay da bi trung voi lich khac. Vui long doi khung gio hoac ngay bat dau khac.",
              "SLOT_ALREADY_BOOKED",
            );
          }
          throw err;
        }

        createdBookingId = booking._id;
      });
    } finally {
      await session.endSession();
    }

    const booking = await Booking.findById(createdBookingId);

    for (const occDate of occurrenceDates) {
      await emitSlotsUpdated(courtId, occDate);
    }
    if (booking) emitBookingUpdated(booking, "booking:new");

    res
      .status(201)
      .json(
        new ApiResponse(
          "Dang ky san co dinh thanh cong, cho nhan vien xac nhan",
          { booking },
        ),
      );
  },
);

/**
 * GET /api/bookings/me
 */
export const listMyBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const bookings = await Booking.find({ user: req.user!.id }).sort({
      createdAt: -1,
    });
    res
      .status(200)
      .json(new ApiResponse("Lay lich su dat san thanh cong", { bookings }));
  },
);

/**
 * GET /api/bookings?status=&date=&courtId=&page=&limit=
 */
export const listAllBookings = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, date, courtId } = req.query;
    const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt((req.query.limit as string) || "50", 10), 1),
      200,
    );

    const filter: Record<string, unknown> = {};
    if (status && typeof status === "string") filter.status = status;
    if (date && typeof date === "string") filter.date = date;
    if (courtId && typeof courtId === "string") filter.court = courtId;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json(
      new ApiResponse("Lay danh sach don dat san thanh cong", {
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  },
);

/**
 * PATCH /api/bookings/:id/status
 */
export const updateBookingStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, cancelReason } = req.body as {
      status: BookingStatus;
      cancelReason?: string;
    };

    const booking = await Booking.findById(id);
    if (!booking)
      throw ApiError.notFound(
        "Khong tim thay don dat san",
        "BOOKING_NOT_FOUND",
      );

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw ApiError.badRequest(
        "Don dat san nay da o trang thai cuoi, khong the thay doi",
        "BOOKING_ALREADY_FINALIZED",
      );
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        booking.status = status;
        if (status === BookingStatus.CANCELLED) {
          booking.cancelledBy = new mongoose.Types.ObjectId(req.user!.id);
          booking.cancelReason = cancelReason || "";
          await BookingSlotLock.deleteMany(
            { booking: booking._id },
            { session },
          );
        }
        await booking.save({ session });
      });
    } finally {
      await session.endSession();
    }

    res.status(200).json(
      new ApiResponse("Cap nhat trang thai don dat san thanh cong", {
        booking,
      }),
    );

    if (status === BookingStatus.CANCELLED) {
      const datesToNotify = booking.occurrenceDates?.length
        ? booking.occurrenceDates
        : [booking.date];
      for (const d of datesToNotify) {
        await emitSlotsUpdated(booking.court.toString(), d);
      }
    }
    emitBookingUpdated(booking, "booking:updated");
  },
);

/**
 * PATCH /api/bookings/:id/cancel
 */
export const cancelMyBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking)
      throw ApiError.notFound(
        "Khong tim thay don dat san",
        "BOOKING_NOT_FOUND",
      );

    if (booking.user.toString() !== req.user!.id) {
      throw ApiError.forbidden(
        "Ban khong co quyen huy don dat san nay",
        "FORBIDDEN",
      );
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw ApiError.badRequest(
        "Chi co the huy don dang cho xac nhan",
        "BOOKING_NOT_CANCELLABLE",
      );
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledBy = new mongoose.Types.ObjectId(req.user!.id);
        await BookingSlotLock.deleteMany({ booking: booking._id }, { session });
        await booking.save({ session });
      });
    } finally {
      await session.endSession();
    }

    res
      .status(200)
      .json(new ApiResponse("Huy don dat san thanh cong", { booking }));

    const datesToNotify = booking.occurrenceDates?.length
      ? booking.occurrenceDates
      : [booking.date];
    for (const d of datesToNotify) {
      await emitSlotsUpdated(booking.court.toString(), d);
    }
    emitBookingUpdated(booking, "booking:updated");
  },
);
