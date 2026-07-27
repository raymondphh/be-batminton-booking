import { Schema, model, Document, Types } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum BookingType {
  FIXED = "fixed", // dang ky goi dai han (1/3/6 thang), lap lai hang tuan
  CASUAL = "casual", // dat le 1 buoi
}

export interface IPriceBreakdownItem {
  time: string;
  price: number;
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userName: string;
  userEmail: string; // snapshot email tai thoi diem dat - dung de gui thong bao qua email
  court: Types.ObjectId;
  courtName: string;
  categoryName: string;
  bookingType: BookingType;
  date: string; // voi 'fixed': ngay bat dau (= startDate)
  slots: string[];
  startTime: string;
  endTime: string;
  hours: number;
  pricePerHour: number; // gia trung binh/gio - chi de hien thi
  totalPrice: number;
  priceBreakdown: IPriceBreakdownItem[]; // gia cho 1 lan/1 tuan (khong nhan theo so buoi)
  // Cac field chi co gia tri khi bookingType = 'fixed'
  durationMonths?: 1 | 3 | 6;
  startDate?: string;
  endDate?: string;
  occurrenceDates?: string[]; // toan bo ngay cu the trong goi (moi tuan 1 ngay)
  status: BookingStatus;
  notes: string;
  cancelledBy?: Types.ObjectId | null;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const priceBreakdownSchema = new Schema<IPriceBreakdownItem>(
  {
    time: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    court: {
      type: Schema.Types.ObjectId,
      ref: "Court",
      required: true,
      index: true,
    },
    courtName: { type: String, required: true },
    categoryName: { type: String, required: true },
    bookingType: {
      type: String,
      enum: Object.values(BookingType),
      required: true,
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
    priceBreakdown: { type: [priceBreakdownSchema], default: [] },
    durationMonths: { type: Number, enum: [1, 3, 6] },
    startDate: { type: String },
    endDate: { type: String },
    occurrenceDates: { type: [String], default: undefined },
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
