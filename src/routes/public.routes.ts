import { Router } from "express";
import { getPublicCourtStats } from "@/controllers/Courts/court.controller";

const router = Router();

// KHONG gan middleware authenticate - route nay danh cho khach chua dang nhap
router.get("/court-stats", getPublicCourtStats);

export default router;
