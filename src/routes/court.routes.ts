import { Router } from "express";
import * as courtController from "@/controllers/Courts/court.controller";
import { validate } from "@/middlewares/validate.middleware";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { UserRole } from "@/models/User";
import {
  createCourtSchema,
  updateCourtSchema,
  courtIdParamSchema,
} from "@/validations/court.validation";

const router = Router();

// Tat ca route san yeu cau da dang nhap (ca 3 vai tro deu xem duoc danh sach)
router.use(authenticate);

router.get("/", courtController.listCourts);
router.get("/:id", validate(courtIdParamSchema), courtController.getCourtById);

// Chi admin duoc tao / sua / xoa san
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
