import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 4173);
const PYTHON = process.env.PLAYWRIGHT_PYTHON ?? "/Users/greg/miniconda3/envs/tx_music/bin/python";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { outputFolder: "test-report", open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `${PYTHON} -m http.server ${PORT} --bind 127.0.0.1 --directory public`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
