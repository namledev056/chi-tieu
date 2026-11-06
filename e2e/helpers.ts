import { expect, type Page } from "@playwright/test";

/** "45.000 ₫", same as formatVND in the app. */
export const vnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;

/** Emoji characters (to assert the app no longer draws icons with emoji). */
export const EMOJI = /\p{Extended_Pictographic}/u;

export const nav = (page: Page, label: "Tổng quan" | "Giao dịch" | "Ngân sách" | "Cài đặt") =>
  page.getByRole("navigation", { name: "Điều hướng" }).getByRole("button", { name: label, exact: true });

/** Type an amount on the on-screen keypad, like a user tapping. */
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

/** Visible controls with a touch target under 44px (including ::before extensions). */
export async function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, [role=radio], input:not([type=file]):not([type=date])")]
      .filter((el) => el.offsetParent !== null && !el.closest("[data-skip-target]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        // Chips and swatches extend their touch target with ::before
        const before = getComputedStyle(el, "::before");
        const extra = before.content !== "none" && before.position === "absolute" ? -parseFloat(before.top) * 2 || 0 : 0;
        return { label: el.getAttribute("aria-label") || el.textContent?.trim() || el.tagName, h: r.height + extra };
      })
      .filter((t) => t.h < 44 - 0.5)
      .map((t) => `${t.label} (${Math.round(t.h)}px)`),
  );
}
