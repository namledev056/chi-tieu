import { expect, test } from "@playwright/test";
import { addTx, nav, typeAmount, vnd } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("empty month shows guidance and an add-expense button", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /chưa có giao dịch nào/ })).toBeVisible();
  await page.getByRole("button", { name: "Thêm khoản chi" }).click();
  await expect(page.getByRole("dialog", { name: "Thêm giao dịch" })).toBeVisible();
});

test("adding expense and income updates the overview totals", async ({ page }) => {
  await addTx(page, { amount: 45000, category: "Ăn uống", note: "Phở" });
  await addTx(page, { amount: 10000000, category: "Lương", type: "income" });

  await expect(page.getByText("Đã chi tháng này")).toBeVisible();
  const stats = page.locator("section").filter({ hasText: "Thu" }).filter({ hasText: "Dư" });
  await expect(stats).toContainText(vnd(10000000));
  await expect(stats).toContainText(vnd(45000));
  await expect(stats).toContainText(`+${vnd(10000000 - 45000)}`);

  await expect(page.getByRole("button", { name: /Phở.*Ăn uống/ })).toContainText(`−${vnd(45000)}`);
});

test("Save is disabled without an amount; backspace works", async ({ page }) => {
  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  const sheet = page.getByRole("dialog", { name: "Thêm giao dịch" });
  const save = sheet.getByRole("button", { name: "Lưu khoản chi" });
  await expect(save).toBeDisabled();

  await typeAmount(page, 123);
  await expect(sheet).toContainText("123");
  await sheet.getByRole("button", { name: "Xóa một số" }).click();
  await expect(sheet.getByLabel("Số tiền")).toContainText("12");
  await expect(save).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("edit then delete a transaction", async ({ page }) => {
  await addTx(page, { amount: 30000, category: "Đi lại", note: "Grab" });

  await page.getByRole("button", { name: /Grab/ }).click();
  const sheet = page.getByRole("dialog", { name: "Sửa giao dịch" });
  await sheet.getByRole("button", { name: "0", exact: true }).click(); // 30000 → 300000
  await sheet.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("button", { name: /Grab/ })).toContainText(vnd(300000));

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Grab/ }).click();
  await page.getByRole("dialog", { name: "Sửa giao dịch" }).getByRole("button", { name: "Xóa", exact: true }).click();
  await expect(page.getByRole("heading", { name: /chưa có giao dịch nào/ })).toBeVisible();
});

test("filter by income/expense, by category, and search", async ({ page }) => {
  await addTx(page, { amount: 45000, category: "Ăn uống", note: "Phở bò" });
  await addTx(page, { amount: 200000, category: "Mua sắm", note: "Áo thun" });
  await addTx(page, { amount: 5000000, category: "Thưởng", type: "income" });

  await nav(page, "Giao dịch").click();
  const filters = page.getByRole("toolbar", { name: "Lọc" });
  const rows = page.locator("main").getByRole("button", { name: /₫$/ });
  await expect(rows).toHaveCount(3);

  await filters.getByRole("button", { name: "Thu", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(page.getByText("1 kết quả")).toBeVisible();

  await filters.getByRole("button", { name: "Mua sắm" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Áo thun");

  await filters.getByRole("button", { name: "Tất cả" }).click();
  await page.getByRole("button", { name: "Tìm" }).click();
  await page.getByLabel("Tìm giao dịch").fill("phở");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Phở bò");
});

test("data survives a page reload", async ({ page }) => {
  await addTx(page, { amount: 75000, category: "Giải trí", note: "Xem phim" });
  await page.reload();
  await expect(page.getByRole("button", { name: /Xem phim/ })).toContainText(vnd(75000));
});

test("pick another month then return to this month", async ({ page }) => {
  await addTx(page, { amount: 45000, category: "Ăn uống" });
  const picker = page.getByRole("button", { name: "Chọn tháng" });
  const original = await picker.textContent();

  await picker.click();
  const sheet = page.getByRole("dialog", { name: "Chọn tháng" });
  await sheet.getByRole("button", { name: "Năm trước" }).click();
  await sheet.getByRole("button", { name: /^Tháng 6/ }).click();
  await expect(picker).toContainText("Tháng 6");
  await expect(page.getByRole("heading", { name: /Tháng 6 chưa có giao dịch nào/ })).toBeVisible();

  await picker.click();
  await page.getByRole("dialog", { name: "Chọn tháng" }).getByRole("button", { name: "Về tháng này" }).click();
  await expect(picker).toHaveText(original!);

  // Esc closes the month picker
  await picker.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Chọn tháng" })).toBeHidden();
});
