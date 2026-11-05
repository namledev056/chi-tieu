import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    // Service worker cache không được làm lệch kết quả giữa các lần chạy.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    // Màn hình điện thoại Android, giống máy người dùng thật.
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
