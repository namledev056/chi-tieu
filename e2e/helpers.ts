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

/** Các control nhìn thấy được có vùng chạm dưới 44px (tính cả phần mở rộng bằng ::before). */
export async function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, [role=radio], input:not([type=file]):not([type=date])")]
      .filter((el) => el.offsetParent !== null && !el.closest("[data-skip-target]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        // Chip và ô màu mở rộng vùng chạm bằng ::before
        const before = getComputedStyle(el, "::before");
        const extra = before.content !== "none" && before.position === "absolute" ? -parseFloat(before.top) * 2 || 0 : 0;
        return { label: el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName, h: r.height + extra };
      })
      .filter((t) => t.h < 44 - 0.5)
      .map((t) => `${t.label} (${Math.round(t.h)}px)`),
  );
}
