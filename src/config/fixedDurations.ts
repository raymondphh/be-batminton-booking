export interface FixedDurationOption {
  months: 1 | 2 | 3 | 6 | 12;
  label: string;
  discountPercent: number; // hien tai khong ap dung khuyen mai, luon = 0
}

export const FIXED_DURATION_OPTIONS: FixedDurationOption[] = [
  { months: 1, label: "1 tháng", discountPercent: 0 },
  { months: 2, label: "2 tháng", discountPercent: 0 },
  { months: 3, label: "3 tháng", discountPercent: 0 },
  { months: 6, label: "6 tháng", discountPercent: 0 },
  { months: 12, label: "1 năm", discountPercent: 0 },
];
