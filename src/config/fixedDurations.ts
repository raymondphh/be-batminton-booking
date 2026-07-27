export interface FixedDurationOption {
  months: 1 | 3 | 6;
  label: string;
}

export const FIXED_DURATION_OPTIONS: FixedDurationOption[] = [
  { months: 1, label: "1 tháng" },
  { months: 3, label: "3 tháng" },
  { months: 6, label: "6 tháng" },
];
