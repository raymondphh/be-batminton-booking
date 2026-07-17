import { Schema, model, Document, Types } from "mongoose";

export interface IPriceRule {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM" hoac "24:00"
  pricePerHourFixed: number; // gia/gio kieu "co dinh" trong khung gio nay
  pricePerHourCasual: number; // gia/gio kieu "vang lai" trong khung gio nay
}

export interface ICourtCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  priceRules: IPriceRule[]; // bang gia theo tung khung gio, moi khung co 2 muc gia
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const priceRuleSchema = new Schema<IPriceRule>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    pricePerHourFixed: { type: Number, required: true, min: 0 },
    pricePerHourCasual: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const courtCategorySchema = new Schema<ICourtCategory>(
  {
    name: {
      type: String,
      required: [true, "Ten loai san la bat buoc"],
      trim: true,
      minlength: 2,
      maxlength: 100,
      unique: true,
    },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    priceRules: {
      type: [priceRuleSchema],
      required: true,
      validate: {
        validator: (v: IPriceRule[]) => Array.isArray(v) && v.length > 0,
        message: "Can it nhat 1 khung gia theo gio",
      },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const CourtCategory = model<ICourtCategory>(
  "CourtCategory",
  courtCategorySchema,
);
