import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCourtSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Ten san qua ngan").max(100),
    description: z.string().trim().max(500).optional().default(""),
    category: z.string().regex(objectIdRegex, "Loai san khong hop le"),
    image: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateCourtSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "ID khong hop le"),
  }),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      category: z
        .string()
        .regex(objectIdRegex, "Loai san khong hop le")
        .optional(),
      image: z.string().trim().max(100).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Can it nhat 1 truong de cap nhat",
    }),
});

export const courtIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "ID khong hop le"),
  }),
});
