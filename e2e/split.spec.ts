import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import QRCode from "qrcode";
import { buildVietQR, parseVietQR } from "../src/features/finance/vietqr";
import { nav, smallTargets, typeAmount, vnd } from "./helpers";

/** Decode the QR image (PNG data URL) the app renders → the VietQR string inside. */
function decodeDataUrl(dataUrl: string) {
  const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

/** Extract a top-level EMV field value (e.g. "54" = amount). */
function field(payload: string, id: string) {
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    if (tag === id) return payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return null;
}

async function openSplit(page: Page, amount: number, note: string) {
  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  const tx = page.getByRole("dialog", { name: "Thêm giao dịch" });
  await typeAmount(page, amount);
  await tx.getByLabel("Ghi chú").fill(note);
  await tx.getByRole("button", { name: "Chia tiền" }).click();
  return page.getByRole("dialog", { name: "Chia tiền" });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("split bill: enter account, change people count, QR has the right amount", async ({ page }) => {
  const split = await openSplit(page, 900000, "Ăn tối");

  // No account yet → the form appears inside the sheet
  await split.getByLabel("Ngân hàng", { exact: true }).selectOption({ label: "Vietcombank" });
  await split.getByLabel("Số tài khoản").fill("0011001234567");
  await split.getByLabel(/Tên chủ tài khoản/).fill("Nguyen Van A");
  await split.getByRole("button", { name: "Lưu tài khoản" }).click();

  await expect(split.getByTestId("split-each")).toHaveText(vnd(450000));
  await split.getByRole("button", { name: "Thêm một người" }).click();
  await split.getByRole("button", { name: "Thêm một người" }).click();
  await expect(split.getByLabel("Số người")).toHaveText("4");
  await expect(split.getByTestId("split-each")).toHaveText(vnd(225000));
  await expect(split.getByText("Thu từ 3 người")).toBeVisible();
  await expect(split).toContainText("Vietcombank");
  await expect(split).toContainText("NGUYEN VAN A");

  const img = split.getByRole("img", { name: `Mã QR chuyển ${vnd(225000)}` });
  await expect(img).toBeVisible();
  // Wait for the QR to update for the new people count, then decode that image.
  await expect
    .poll(async () => decodeDataUrl((await img.getAttribute("src"))!))
    .toContain("5406225000");
  const payload = decodeDataUrl((await img.getAttribute("src"))!)!;
  expect(parseVietQR(payload)).toMatchObject({ bin: "970436", account: "0011001234567" });
  expect(field(payload, "54")).toBe("225000");
  expect(field(payload, "62")).toBe("0816Chia tien An toi");

  // Can't go below 2 people
  for (let i = 0; i < 5; i++) {
    const minus = split.getByRole("button", { name: "Bớt một người" });
    if (await minus.isDisabled()) break;
    await minus.click();
  }
  await expect(split.getByLabel("Số người")).toHaveText("2");
  await expect(split.getByRole("button", { name: "Bớt một người" })).toBeDisabled();

  expect(await smallTargets(page), "sheet chia tiền").toEqual([]);

  // Save the image to send
  const download = page.waitForEvent("download");
  await split.getByRole("button", { name: "Lưu ảnh" }).click();
  expect((await download).suggestedFilename()).toBe("chia-tien-450000.png");

  // Esc closes the split sheet but keeps the transaction sheet
  await page.keyboard.press("Escape");
  await expect(split).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Thêm giao dịch" })).toBeVisible();
});

test("uploading a bank QR image in Settings fills in the account", async ({ page }) => {
  const qr = await QRCode.toBuffer(buildVietQR({ bin: "970407", account: "19031234567890", name: "" }), {
    width: 500,
    margin: 4,
  });

  await nav(page, "Cài đặt").click();
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Ảnh mã QR ngân hàng").setInputFiles({ name: "qr.png", mimeType: "image/png", buffer: qr });
  await expect(page.getByText("Đã đọc: Techcombank · 19031234567890")).toBeVisible();
  await expect(page.getByLabel("Ngân hàng", { exact: true })).toHaveValue("970407");
  await expect(page.getByLabel("Số tài khoản")).toHaveValue("19031234567890");
  await page.getByRole("button", { name: "Lưu tài khoản" }).click();

  await expect(page.getByRole("button", { name: /Techcombank · 19031234567890/ })).toBeVisible();

  // Used right away when splitting, no re-entry needed
  const split = await openSplit(page, 300000, "Cafe");
  await expect(split).toContainText("19031234567890");
  await expect(split.getByTestId("split-each")).toHaveText(vnd(150000));
});

test("a non-bank-QR image shows a clear error", async ({ page }) => {
  const notBank = await QRCode.toBuffer("https://example.com", { width: 400 });
  await nav(page, "Cài đặt").click();
  await page.getByRole("button", { name: "Thêm tài khoản" }).click();
  await page.getByLabel("Ảnh mã QR ngân hàng").setInputFiles({ name: "x.png", mimeType: "image/png", buffer: notBank });
  await expect(page.getByText(/Không đọc được mã QR ngân hàng/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu tài khoản" })).toBeDisabled();
});

test("Split bill only appears for expenses and needs an amount first", async ({ page }) => {
  await page.getByRole("button", { name: "Thêm giao dịch" }).click();
  const tx = page.getByRole("dialog", { name: "Thêm giao dịch" });
  await expect(tx.getByRole("button", { name: "Chia tiền" })).toBeDisabled();
  await typeAmount(page, 5);
  await expect(tx.getByRole("button", { name: "Chia tiền" })).toBeEnabled();
  await tx.getByRole("button", { name: "Khoản thu" }).click();
  await expect(tx.getByRole("button", { name: "Chia tiền" })).toHaveCount(0);
});
