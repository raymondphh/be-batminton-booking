import { Schema, model, Document, Types } from "mongoose";

export interface ICourt extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  category: Types.ObjectId; // ref CourtCategory - quyet dinh toan bo bang gia theo gio cua san nay
  image: string;
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
    description: { type: String, trim: true, maxlength: 500, default: "" },
    category: {
      type: Schema.Types.ObjectId,
      ref: "CourtCategory",
      required: [true, "Loai san la bat buoc"],
    },
    image: { type: String, default: "sports_tennis" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

courtSchema.index({ isActive: 1 });
courtSchema.index({ category: 1 });
courtSchema.index({ name: "text", description: "text" });

export const Court = model<ICourt>("Court", courtSchema);
