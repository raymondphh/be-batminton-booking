import { Router } from "express";
import * as bookingController from "@/controllers/Booking/booking.controller";
import { validate } from "@/middlewares/validate.middleware";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { UserRole } from "@/models/User";
import {
  createBookingSchema,
  bookingIdParamSchema,
  updateBookingStatusSchema,
  availabilityQuerySchema,
  listBookingsQuerySchema,
} from "@/validations/booking.validation";

const router = Router();

// CONG KHAI - khach chua dang nhap van xem duoc khung gio trong/da dat.
router.get(
  "/availability",
  validate(availabilityQuerySchema),
  bookingController.getAvailability,
);

// Tu day tro xuong BAT BUOC dang nhap
router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.CUSTOMER),
  validate(createBookingSchema),
  bookingController.createBooking,
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
