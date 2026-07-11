import { Schema, model, Document, Types } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum BookingType {
  CASUAL = "casual", // dat le 1 buoi
  FIXED = "fixed", // dang ky goi dai han, lap lai hang tuan
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userName: string; // snapshot ten khach hang tai thoi diem dat
  court: Types.ObjectId;
  courtName: string; // snapshot ten san
  courtType: string; // snapshot loai san ('fixed' | 'casual')
  bookingType: BookingType;
  date: string; // voi 'fixed': ngay bat dau (= startDate), giu de tuong thich hien thi chung
  slots: string[]; // vi du ["08:00","09:00","10:00"]
  startTime: string;
  endTime: string;
  hours: number;
  pricePerHour: number; // snapshot gia tai thoi diem dat
  totalPrice: number;
  // Cac field chi co gia tri khi bookingType = 'fixed'
  durationMonths?: 1 | 2 | 3 | 6 | 12;
  startDate?: string;
  endDate?: string;
  occurrenceDates?: string[]; // toan bo ngay cu the trong goi (moi tuan 1 ngay)
  discountPercent?: number;
  originalTotalPrice?: number; // gia truoc khi ap dung giam gia goi dai han
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
    bookingType: {
      type: String,
      enum: Object.values(BookingType),
      default: BookingType.CASUAL,
      index: true,
    },
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
    durationMonths: { type: Number, enum: [1, 2, 3, 6, 12] },
    startDate: { type: String },
    endDate: { type: String },
    occurrenceDates: { type: [String], default: undefined },
    discountPercent: { type: Number, default: 0 },
    originalTotalPrice: { type: Number },
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
