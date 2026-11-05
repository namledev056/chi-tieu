const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toISODate(new Date());
export const currentMonth = () => today().slice(0, 7);

function parseMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
}

export function shiftMonth(month: string, delta: number) {
  const { y, m } = parseMonth(month);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(month: string) {
  const { y, m } = parseMonth(month);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(month: string) {
  const { y, m } = parseMonth(month);
  return `Tháng ${m}/${y}`;
}

export function dayLabel(date: string) {
  const t = new Date();
  if (date === toISODate(t)) return "Hôm nay";
  t.setDate(t.getDate() - 1);
  if (date === toISODate(t)) return "Hôm qua";
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd}, ${pad(d)}/${pad(m)}`;
}

export const dayOfMonth = (date: string) => Number(date.slice(8, 10));

/** Nhãn ngắn cho nút chọn ngày: "Hôm nay", "Hôm qua", "02/11" */
export function shortDateLabel(date: string) {
  const t = new Date();
  if (date === toISODate(t)) return "Hôm nay";
  t.setDate(t.getDate() - 1);
  if (date === toISODate(t)) return "Hôm qua";
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export const monthParts = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
};
