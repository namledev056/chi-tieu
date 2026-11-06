import { expect, test } from "@playwright/test";
import { addTx, nav, vnd } from "./helpers";

test("set a limit, add to it, then set a new limit", async ({ page }) => {
  await page.goto("/");
  await addTx(page, { amount: 45000, category: "Ăn uống" });
  await nav(page, "Ngân sách").click();

  // Set the first limit
  await page.getByRole("button", { name: /^Ăn uống\s*Đặt$/ }).click();
  await page.getByLabel("Hạn mức Ăn uống").fill("2000000");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("Còn có thể chi")).toBeVisible();
  const row = page.getByRole("button", { name: /^Ăn uống/ });
  await expect(row).toContainText(`Còn ${vnd(2000000 - 45000)}`);

  // Add 500,000 on top of the existing limit
  await row.click();
  const add = page.getByLabel("Cộng thêm vào hạn mức Ăn uống");
  await add.fill("500000");
  await expect(add).toHaveValue("+500.000");
  await expect(page.getByText(`Hiện tại ${vnd(2000000)}`)).toContainText(vnd(2500000));
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(row).toContainText(`Còn ${vnd(2500000 - 45000)}`);

  // Saving an empty add-on changes nothing
  await row.click();
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(row).toContainText(`Còn ${vnd(2500000 - 45000)}`);

  // Switch to entering a new limit
  await row.click();
  await page.getByRole("button", { name: "Nhập mức mới" }).click();
  const set = page.getByLabel("Hạn mức Ăn uống");
  await expect(set).toHaveValue("2.500.000");
  await set.fill("40000");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(row).toContainText(`Vượt ${vnd(5000)}`);
  await expect(page.getByText("Đã vượt ngân sách")).toBeVisible();
});

test("removing a limit moves the category back to unset", async ({ page }) => {
  await page.goto("/");
  await nav(page, "Ngân sách").click();
  await page.getByRole("button", { name: /^Đi lại\s*Đặt$/ }).click();
  await page.getByLabel("Hạn mức Đi lại").fill("300000");
  await page.getByRole("button", { name: "Lưu" }).click();

  await page.getByRole("button", { name: /^Đi lại/ }).click();
  await page.getByRole("button", { name: "Bỏ" }).click();
  await expect(page.getByRole("button", { name: /^Đi lại\s*Đặt$/ })).toBeVisible();
});
