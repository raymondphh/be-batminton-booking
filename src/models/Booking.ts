import { Schema, model, Document, Types } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  court: Types.ObjectId;
  courtName: string;
  courtType: string;
  date: string;
  slots: string[];
  startTime: string;
  endTime: string;
  hours: number;
  pricePerHour: number;
  totalPrice: number;
  status: BookingStatus;
  notes: string;
  cancelledBy?: Types.ObjectId | null;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: { type: String, required: true },
    court: {
      type: Schema.Types.ObjectId,
      ref: "Court",
      required: true,
      index: true,
    },
    courtName: { type: String, required: true },
    courtType: { type: String, required: true },
    date: { type: String, required: true, index: true },
    slots: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Can chon it nhat 1 khung gio",
      },
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    hours: { type: Number, required: true, min: 1 },
    pricePerHour: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancelReason: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

bookingSchema.index({ court: 1, date: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

export const Booking = model<IBooking>("Booking", bookingSchema);
