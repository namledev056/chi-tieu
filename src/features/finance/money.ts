const fmt = new Intl.NumberFormat("vi-VN");
const compact = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Số tiền luôn lưu dạng số nguyên VND. */
export const formatVND = (n: number) => `${fmt.format(n)} ₫`;
export const formatCompact = (n: number) => compact.format(n);

export function parseAmount(input: string): number {
  const digits = input.replace(/\D/g, "");
  if (!digits) return 0;
  return Math.min(Number(digits), 999_999_999_999);
}

/** Định dạng lại chuỗi khi người dùng gõ: "150000" -> "150.000" */
export function formatAmountInput(input: string): string {
  const n = parseAmount(input);
  return n ? fmt.format(n) : "";
}
