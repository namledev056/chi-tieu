import { expect, type Page } from "@playwright/test";

/** "45.000 ₫" — giống formatVND trong app. */
export const vnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;

/** Ký tự emoji (dùng để chắc chắn app không còn vẽ icon bằng emoji). */
export const EMOJI = /\p{Extended_Pictographic}/u;

export const nav = (page: Page, label: "Tổng quan" | "Giao dịch" | "Ngân sách" | "Cài đặt") =>
  page.getByRole("navigation", { name: "Điều hướng" }).getByRole("button", { name: label, exact: true });

/** Gõ số tiền bằng bàn phím số trên màn hình, như người dùng chạm. */
export async function typeAmount(page: Page, amount: number) {
  const sheet = page.getByRole("dialog");
  for (const d of String(amount)) {
    await sheet.getByRole("button", { name: d, exact: true }).click();
  }
}

export async function addTx(
  page: Page,
  { amount, category, note, type = "expense" }: { amount: number; category: string; note?: string; type?: "expense" | "income" },
) {
  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  const sheet = page.getByRole("dialog", { name: "Thêm giao dịch" });
  await expect(sheet).toBeVisible();
  if (type === "income") await sheet.getByRole("button", { name: "Khoản thu" }).click();
  await typeAmount(page, amount);
  await sheet.getByRole("radio", { name: category, exact: true }).click();
  if (note) await sheet.getByLabel("Ghi chú").fill(note);
  await sheet.getByRole("button", { name: type === "income" ? "Lưu khoản thu" : "Lưu khoản chi" }).click();
  await expect(sheet).toBeHidden();
}
