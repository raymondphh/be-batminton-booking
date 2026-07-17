import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import courtRoutes from "./court.routes";
import bookingRoutes from "./booking.routes";
import publicRoutes from "./public.routes";
import courtCategoryRoutes from "./courtCategory.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API dang hoat dong",
    timestamp: new Date(),
  });
});

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/courts", courtRoutes);
router.use("/bookings", bookingRoutes);
router.use("/court-categories", courtCategoryRoutes);
export default router;
