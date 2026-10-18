import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    launchOptions:
      process.platform === "win32"
        ? {
            executablePath:
              "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
          }
        : {},
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node ../backend/tests/ui-server.cjs",
      url: "http://localhost:5055/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run build && npm run start -- -p 3100",
      url: "http://localhost:3100/login",
      reuseExistingServer: false,
      timeout: 180000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:5055",
        NEXT_PUBLIC_SOCKET_URL: "http://localhost:5055",
      },
    },
  ],
});
