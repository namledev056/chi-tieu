import { expect, test } from "@playwright/test";
import { nav } from "./helpers";

test("switching to English in Settings translates the app and persists", async ({ page }) => {
  await page.goto("/");
  await nav(page, "Cài đặt").click();
  await page.getByRole("group", { name: "Ngôn ngữ" }).getByRole("button", { name: "English" }).click();

  const navBar = page.getByRole("navigation", { name: "Navigation" });
  await expect(navBar.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Expense categories" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.reload();
  await expect(page.getByRole("navigation", { name: "Navigation" })).toBeVisible();
  await navBar.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^No transactions in / })).toBeVisible();

  await page.getByRole("button", { name: "Add transaction" }).click();
  const sheet = page.getByRole("dialog", { name: "Add transaction" });
  await expect(sheet.getByRole("button", { name: "Save expense" })).toBeVisible();
});

test.describe("English browser", () => {
  test.use({ locale: "en-US" });

  test("defaults to English with English category names", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add transaction" }).click();
    const sheet = page.getByRole("dialog", { name: "Add transaction" });
    await expect(sheet.getByRole("radio", { name: "Food", exact: true })).toBeVisible();
    await expect(sheet.getByRole("radio", { name: "Other", exact: true })).toBeVisible();
  });
});
