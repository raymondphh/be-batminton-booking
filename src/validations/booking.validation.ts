import { z } from "zod";
import { TIME_SLOTS } from "@/config/timeSlots";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createBookingSchema = z.object({
  body: z.object({
    courtId: z.string().regex(objectIdRegex, "ID san khong hop le"),
    date: z
      .string()
      .regex(dateRegex, "Ngay khong hop le (dinh dang YYYY-MM-DD)"),
    slots: z
      .array(
        z
          .string()
          .refine((s) => TIME_SLOTS.includes(s), {
            message: "Khung gio khong hop le",
          }),
      )
      .min(1, "Can chon it nhat 1 khung gio")
      .max(TIME_SLOTS.length, "So khung gio vuot qua gioi han"),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const createFixedBookingSchema = z.object({
  body: z.object({
    courtId: z.string().regex(objectIdRegex, "ID san khong hop le"),
    startDate: z
      .string()
      .regex(dateRegex, "Ngay bat dau khong hop le (dinh dang YYYY-MM-DD)"),
    slots: z
      .array(
        z
          .string()
          .refine((s) => TIME_SLOTS.includes(s), {
            message: "Khung gio khong hop le",
          }),
      )
      .min(1, "Can chon it nhat 1 khung gio")
      .max(TIME_SLOTS.length, "So khung gio vuot qua gioi han"),
    durationMonths: z.union(
      [z.literal(1), z.literal(2), z.literal(3), z.literal(6), z.literal(12)],
      {
        required_error: "Thoi han goi la bat buoc",
      },
    ),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "ID khong hop le"),
  }),
});

export const updateBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "ID khong hop le"),
  }),
  body: z.object({
    status: z.enum(["confirmed", "cancelled", "completed"], {
      required_error: "Trang thai la bat buoc",
    }),
    cancelReason: z.string().trim().max(300).optional(),
  }),
});

export const availabilityQuerySchema = z.object({
  query: z.object({
    courtId: z.string().regex(objectIdRegex, "ID san khong hop le"),
    date: z
      .string()
      .regex(dateRegex, "Ngay khong hop le (dinh dang YYYY-MM-DD)"),
  }),
});

export const listBookingsQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(["pending", "confirmed", "cancelled", "completed"])
      .optional(),
    date: z.string().regex(dateRegex).optional(),
    courtId: z.string().regex(objectIdRegex).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
