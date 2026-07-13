import { Schema, model, Document, Types } from "mongoose";

export interface ICourt extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  pricePerHourFixed: number; // gia/gio khi khach chon dat kieu "co dinh"
  pricePerHourCasual: number; // gia/gio khi khach chon dat kieu "vang lai"
  image: string; // key icon MUI, vi du "sports_tennis" - xem src/config/courtIcons.tsx o FE
  isActive: boolean;
  createdBy: Types.ObjectId;
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
    pricePerHourFixed: {
      type: Number,
      required: [true, "Gia co dinh la bat buoc"],
      min: [0, "Gia khong duoc am"],
    },
    pricePerHourCasual: {
      type: Number,
      required: [true, "Gia vang lai la bat buoc"],
      min: [0, "Gia khong duoc am"],
    },
    image: {
      type: String,
      default: "sports_tennis",
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

courtSchema.index({ isActive: 1 });
courtSchema.index({ name: "text", description: "text" });

export const Court = model<ICourt>("Court", courtSchema);
