import { expect, test, type Page } from "@playwright/test";
import { addTx, EMOJI, nav } from "./helpers";

test("icon danh mục là SVG, không còn emoji ở bất kỳ màn nào", async ({ page }) => {
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

test("thêm danh mục mới với icon và màu chọn từ bảng", async ({ page }) => {
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

test("dữ liệu bản cũ (icon emoji) được tự chuyển sang icon SVG", async ({ page }) => {
  // Tạo DB đúng như bản v1 (Dexie version 1 = IndexedDB version 10) trước khi app mở.
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
  // Emoji lạ (🐶) rơi về icon mặc định của loại chi.
  expect(icons).toEqual(["utensils", "package", "briefcase"]);
});

async function smallTargets(page: Page) {
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

test("mọi nút đều có vùng chạm tối thiểu 44px", async ({ page }) => {
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

test("vòng focus hiện khi dùng bàn phím", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Chọn tháng" })).toBeVisible();
  await page.keyboard.press("Tab");
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    return el === document.body ? "no focus" : getComputedStyle(el).outlineStyle;
  });
  expect(outline).toBe("solid");
});
