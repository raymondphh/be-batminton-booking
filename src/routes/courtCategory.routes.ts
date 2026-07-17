import { Router } from "express";
import * as courtCategoryController from "@/controllers/CourtCategories/courtCategory.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "@/middlewares/auth.middleware";
import { UserRole } from "@/models/User";
import {
  createCourtCategorySchema,
  updateCourtCategorySchema,
  courtCategoryIdParamSchema,
} from "@/validations/courtCategory.validation";

const router = Router();

router.get(
  "/",
  optionalAuthenticate,
  courtCategoryController.listCourtCategories,
);
router.get(
  "/:id",
  optionalAuthenticate,
  validate(courtCategoryIdParamSchema),
  courtCategoryController.getCourtCategoryById,
);

router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.ADMIN),
  validate(createCourtCategorySchema),
  courtCategoryController.createCourtCategory,
);
router.patch(
  "/:id",
  authorize(UserRole.ADMIN),
  validate(updateCourtCategorySchema),
  courtCategoryController.updateCourtCategory,
);
router.delete(
  "/:id",
  authorize(UserRole.ADMIN),
  validate(courtCategoryIdParamSchema),
  courtCategoryController.deleteCourtCategory,
);

export default router;
