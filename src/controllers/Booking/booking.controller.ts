import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "@/utils/asyncHandler";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { Booking, BookingStatus, IBooking } from "@/models/Booking";
import { BookingSlotLock } from "@/models/BookingSlotLock";
import { Court } from "@/models/Court";
import { User } from "@/models/User";
import { TIME_SLOTS } from "@/config/timeSlots";
import { getIO } from "@/config/socket";
import { logger } from "@/config/logger";

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

    res
      .status(201)
      .json(
        new ApiResponse("Dat san thanh cong, cho nhan vien xac nhan", {
          booking,
        }),
      );
  },
);

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

    res
      .status(200)
      .json(
        new ApiResponse("Cap nhat trang thai don dat san thanh cong", {
          booking,
        }),
      );

    if (status === BookingStatus.CANCELLED) {
      await emitSlotsUpdated(booking.court.toString(), booking.date);
    }
    emitBookingUpdated(booking, "booking:updated");
  },
);

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

    await emitSlotsUpdated(booking.court.toString(), booking.date);
    emitBookingUpdated(booking, "booking:updated");
  },
);
