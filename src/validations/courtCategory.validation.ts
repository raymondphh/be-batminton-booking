import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeRegexWithMidnight = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

const priceRuleSchema = z
  .object({
    startTime: z
      .string()
      .regex(timeRegex, "Gio bat dau khong hop le (dinh dang HH:MM)"),
    endTime: z
      .string()
      .regex(
        timeRegexWithMidnight,
        "Gio ket thuc khong hop le (HH:MM hoac 24:00)",
      ),
    pricePerHourFixed: z.number().min(0, "Gia co dinh khong duoc am"),
    pricePerHourCasual: z.number().min(0, "Gia vang lai khong duoc am"),
  })
  .refine((r) => r.startTime < r.endTime, {
    message: "Gio bat dau phai truoc gio ket thuc",
    path: ["endTime"],
  });

export const createCourtCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Ten loai san qua ngan").max(100),
    description: z.string().trim().max(300).optional().default(""),
    priceRules: z
      .array(priceRuleSchema)
      .min(1, "Can it nhat 1 khung gia theo gio"),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateCourtCategorySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID khong hop le"),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(300).optional(),
      priceRules: z.array(priceRuleSchema).min(1).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Can it nhat 1 truong de cap nhat",
    }),
});

export const courtCategoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID khong hop le"),
  }),
});
