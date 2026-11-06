import { expect, test } from "@playwright/test";
import { addTx, EMOJI, nav, smallTargets } from "./helpers";

test("category icons are SVG, with no emoji on any screen", async ({ page }) => {
  await page.goto("/");
  await addTx(page, { amount: 45000, category: "Ăn uống" });

  for (const tab of ["Tổng quan", "Giao dịch", "Ngân sách", "Cài đặt"] as const) {
    await nav(page, tab).click();
    await expect(page.locator("main")).not.toHaveText(EMOJI);
  }

  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  const radios = page.getByRole("radiogroup", { name: "Danh mục" }).getByRole("radio");
  await expect(radios.first()).toBeVisible();
  for (const r of await radios.all()) {
    await expect(r.locator("svg")).toHaveCount(1);
    await expect(r).not.toHaveText(EMOJI);
  }
});

test("add a new category with an icon and color from the pickers", async ({ page }) => {
  await page.goto("/");
  await nav(page, "Cài đặt").click();
  await page.getByRole("button", { name: "Thêm", exact: true }).first().click();

  await page.getByLabel("Tên danh mục").fill("Cà phê sáng");
  const icons = page.getByRole("radiogroup", { name: "Biểu tượng" });
  await icons.getByRole("radio", { name: "Cà phê" }).click();
  await expect(icons.getByRole("radio", { name: "Cà phê" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radiogroup", { name: "Màu" }).getByRole("radio", { name: "Xanh lá" }).click();
  await page.getByRole("button", { name: "Lưu" }).click();

  await expect(page.getByRole("button", { name: /Cà phê sáng/ })).toBeVisible();

  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  const radio = page.getByRole("radio", { name: "Cà phê sáng" });
  await expect(radio).toBeVisible();
  await expect(radio.locator("svg")).toHaveCount(1);
});

test("legacy data (emoji icons) is migrated to SVG icons", async ({ page }) => {
  // Create the DB exactly as v1 did (Dexie version 1 = IndexedDB version 10) before the app opens.
  await page.goto("/manifest.webmanifest");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("chi-tieu", 10);
        req.onupgradeneeded = () => {
          const db = req.result;
          const tx = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
          tx.createIndex("date", "date");
          tx.createIndex("categoryId", "categoryId");
          tx.createIndex("type", "type");
          const cats = db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
          cats.createIndex("type", "type");
          const b = db.createObjectStore("budgets", { keyPath: "id", autoIncrement: true });
          b.createIndex("[categoryId+month]", ["categoryId", "month"], { unique: true });
          b.createIndex("month", "month");
          b.createIndex("categoryId", "categoryId");
          cats.add({ name: "Ăn uống", icon: "🍜", color: "#e8590c", type: "expense", order: 0 });
          cats.add({ name: "Thú cưng", icon: "🐶", color: "#1c7ed6", type: "expense", order: 1 });
          cats.add({ name: "Lương", icon: "💼", color: "#2f9e44", type: "income", order: 2 });
        };
        req.onsuccess = () => {
          req.result.close();
          resolve();
        };
        req.onerror = () => reject(req.error);
      }),
  );

  await page.goto("/");
  await nav(page, "Cài đặt").click();
  for (const name of ["Ăn uống", "Thú cưng", "Lương"]) {
    const row = page.getByRole("button", { name });
    await expect(row.locator("svg")).toHaveCount(1);
    await expect(row).not.toHaveText(EMOJI);
  }

  const icons = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const req = indexedDB.open("chi-tieu");
        req.onsuccess = () => {
          const all = req.result.transaction("categories").objectStore("categories").getAll();
          all.onsuccess = () => resolve(all.result.map((c: { icon: string }) => c.icon));
        };
      }),
  );
  // An unknown emoji (🐶) falls back to the default expense icon.
  expect(icons).toEqual(["utensils", "package", "briefcase"]);
});

test("every button has at least a 44px touch target", async ({ page }) => {
  await page.goto("/");
  await addTx(page, { amount: 45000, category: "Ăn uống" });

  for (const tab of ["Tổng quan", "Giao dịch", "Ngân sách", "Cài đặt"] as const) {
    await nav(page, tab).click();
    expect(await smallTargets(page), `màn ${tab}`).toEqual([]);
  }

  await page.getByRole("button", { name: "Thêm", exact: true }).first().click();
  expect(await smallTargets(page), "trình sửa danh mục").toEqual([]);
  await page.getByRole("button", { name: "Hủy" }).click();

  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  expect(await smallTargets(page), "sheet thêm giao dịch").toEqual([]);
});

test("focus ring shows for keyboard use", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Chọn tháng" })).toBeVisible();
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return el === document.body ? "no focus" : getComputedStyle(el).outlineStyle;
  });
  expect(outline).toBe("solid");
});
