import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import courtRoutes from "./court.routes";
import bookingRoutes from "./booking.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res
    .status(200)
    .json({
      success: true,
      message: "API dang hoat dong",
      timestamp: new Date(),
    });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/courts", courtRoutes);
router.use("/bookings", bookingRoutes);

export default router;
