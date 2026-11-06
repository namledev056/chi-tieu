import type { Dict } from "./i18n";

const pad = (n: number) => String(n).padStart(2, "0");

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toISODate(new Date());
export const currentMonth = () => today().slice(0, 7);

export function monthParts(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
}

export function shiftMonth(month: string, delta: number) {
  const { y, m } = monthParts(month);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(month: string) {
  const { y, m } = monthParts(month);
  return new Date(y, m, 0).getDate();
}

/** "Today", "Yesterday", or null for any other date. */
function relativeDay(date: string, t: Dict) {
  const d = new Date();
  if (date === toISODate(d)) return t.today;
  d.setDate(d.getDate() - 1);
  if (date === toISODate(d)) return t.yesterday;
  return null;
}

/** Day group heading: "Today", "Yesterday", "Thứ 3, 04/11" / "Tuesday, Nov 4". */
export function dayLabel(date: string, t: Dict) {
  const rel = relativeDay(date, t);
  if (rel) return rel;
  const [y, m, d] = date.split("-").map(Number);
  return t.dayLong(t.weekdays[new Date(y, m - 1, d).getDay()], d, m);
}

/** Short label for the date button: "Today", "Yesterday", "02/11" / "Nov 2". */
export function shortDateLabel(date: string, t: Dict) {
  const rel = relativeDay(date, t);
  if (rel) return rel;
  const [, m, d] = date.split("-").map(Number);
  return t.dayShort(d, m);
}
