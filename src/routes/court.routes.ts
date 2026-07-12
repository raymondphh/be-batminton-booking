import { Router } from "express";
import * as courtController from "@/controllers/Courts/court.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "@/middlewares/auth.middleware";
import { UserRole } from "@/models/User";
import {
  createCourtSchema,
  updateCourtSchema,
  courtIdParamSchema,
} from "@/validations/court.validation";

const router = Router();

// CONG KHAI - khach chua dang nhap van xem duoc danh sach san (chi thay san dang hoat dong).
// Dung optionalAuthenticate de admin/manager DA dang nhap van xem duoc ca san dang an.
router.get("/", optionalAuthenticate, courtController.listCourts);
router.get(
  "/:id",
  optionalAuthenticate,
  validate(courtIdParamSchema),
  courtController.getCourtById,
);

// Tu day tro xuong BAT BUOC dang nhap
router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.ADMIN),
  validate(createCourtSchema),
  courtController.createCourt,
);
router.patch(
  "/:id",
  authorize(UserRole.ADMIN),
  validate(updateCourtSchema),
  courtController.updateCourt,
);
router.delete(
  "/:id",
  authorize(UserRole.ADMIN),
  validate(courtIdParamSchema),
  courtController.deleteCourt,
);

export default router;
