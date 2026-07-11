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

router.use(authenticate);

router.get(
  "/availability",
  validate(availabilityQuerySchema),
  bookingController.getAvailability,
);

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
router.patch(
  "/:id/status",
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validate(updateBookingStatusSchema),
  bookingController.updateBookingStatus,
);

export default router;
