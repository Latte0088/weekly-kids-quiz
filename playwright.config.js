// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 45 * 1000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:8931",
    viewport: { width: 900, height: 1100 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/server.js",
    port: 8931,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
