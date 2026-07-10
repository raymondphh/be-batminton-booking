import { z } from "zod";

export const createCourtSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Ten san qua ngan").max(100),
    description: z.string().trim().max(500).optional().default(""),
    type: z.enum(["fixed", "casual"], {
      required_error: "Loai san la bat buoc",
    }),
    pricePerHour: z
      .number({ required_error: "Gia thue la bat buoc" })
      .min(0, "Gia thue khong duoc am"),
    image: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateCourtSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID khong hop le"),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      type: z.enum(["fixed", "casual"]).optional(),
      pricePerHour: z.number().min(0, "Gia thue khong duoc am").optional(),
      image: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Can it nhat 1 truong de cap nhat",
    }),
});

export const courtIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID khong hop le"),
  }),
});
