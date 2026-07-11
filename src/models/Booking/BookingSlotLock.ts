import { Schema, model, Document, Types } from "mongoose";

export interface IBookingSlotLock extends Document {
  _id: Types.ObjectId;
  court: Types.ObjectId;
  date: string;
  time: string;
  booking: Types.ObjectId;
  createdAt: Date;
}

const bookingSlotLockSchema = new Schema<IBookingSlotLock>(
  {
    court: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

bookingSlotLockSchema.index({ court: 1, date: 1, time: 1 }, { unique: true });

export const BookingSlotLock = model<IBookingSlotLock>(
  "BookingSlotLock",
  bookingSlotLockSchema,
);
