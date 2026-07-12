import { Router } from "express";
import * as bookingController from "@/controllers/Booking/booking.controller";
import { validate } from "@/middlewares/validate.middleware";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { UserRole } from "@/models/User";
import {
  createBookingSchema,
  createFixedBookingSchema,
  bookingIdParamSchema,
  updateBookingStatusSchema,
  availabilityQuerySchema,
  listBookingsQuerySchema,
} from "@/validations/booking.validation";

const router = Router();

// CONG KHAI - khach chua dang nhap van xem duoc khung gio trong/da dat va cac goi co dinh,
// de xem lich truoc khi quyet dinh dang nhap dat san. Khong lo lo thong tin nhay cam
// (chi tra ve danh sach gio da bi khoa, khong tra ten khach/booking).
router.get(
  "/availability",
  validate(availabilityQuerySchema),
  bookingController.getAvailability,
);
router.get("/fixed-durations", bookingController.getFixedDurationOptions);

// Tu day tro xuong BAT BUOC dang nhap
router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.CUSTOMER),
  validate(createBookingSchema),
  bookingController.createBooking,
);
router.post(
  "/fixed",
  authorize(UserRole.CUSTOMER),
  validate(createFixedBookingSchema),
  bookingController.createFixedBooking,
);
router.get(
  "/me",
  authorize(UserRole.CUSTOMER),
  bookingController.listMyBookings,
);
router.patch(
  "/:id/cancel",
  authorize(UserRole.CUSTOMER),
  validate(bookingIdParamSchema),
  bookingController.cancelMyBooking,
);

router.get(
  "/",
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(listBookingsQuerySchema),
  bookingController.listAllBookings,
);
router.get(
  "/revenue/summary",
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  bookingController.getRevenueSummary,
);
router.get(
  "/revenue/report",
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  bookingController.getRevenueReport,
);
router.get(
  "/revenue/by-court",
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  bookingController.getRevenueByCourt,
);
router.patch(
  "/:id/status",
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

export default router;
