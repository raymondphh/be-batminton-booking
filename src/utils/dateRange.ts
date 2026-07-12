// src/utils/dateRange.ts
const toDateStr = (d: Date): string => d.toISOString().slice(0, 10);

export const getStartOfToday = (): string => toDateStr(new Date());

/** Dau tuan tinh theo Thu Hai (chuan Viet Nam), khong phai Chu Nhat */
export const getStartOfWeek = (): string => {
  const now = new Date();
  const day = now.getDay(); // 0 = Chu Nhat, 1 = Thu Hai, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return toDateStr(monday);
};

export const getStartOfMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

export const getStartOfQuarter = (): string => {
  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3; // 0, 3, 6, 9
  return `${now.getFullYear()}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;
};

export const getStartOfYear = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};
