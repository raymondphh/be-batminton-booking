import { Schema, model, Document, Types } from "mongoose";

export enum CourtType {
  FIXED = "fixed", // san co dinh - thue dai han
  CASUAL = "casual", // san vang lai - dat tung lan
}

export interface ICourt extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  type: CourtType;
  pricePerHour: number;
  image: string; // emoji hoac URL anh, FE tu quyet dinh cach hien thi
  isActive: boolean;
  createdBy: Types.ObjectId; // admin nao tao san nay
  createdAt: Date;
  updatedAt: Date;
}

const courtSchema = new Schema<ICourt>(
  {
    name: {
      type: String,
      required: [true, "Ten san la bat buoc"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    type: {
      type: String,
      enum: Object.values(CourtType),
      required: true,
      default: CourtType.CASUAL,
    },
    pricePerHour: {
      type: Number,
      required: [true, "Gia thue theo gio la bat buoc"],
      min: [0, "Gia thue khong duoc am"],
    },
    image: {
      type: String,
      default: "🏸",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

courtSchema.index({ type: 1 });
courtSchema.index({ isActive: 1 });
courtSchema.index({ name: "text", description: "text" }); // ho tro tim kiem full-text

export const Court = model<ICourt>("Court", courtSchema);
