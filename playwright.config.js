const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright配置文件
 * 用于IETM系统的E2E测试
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  /* 测试超时时间 */
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },

  /* 失败重试次数 */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  /* 测试报告配置 */
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  /* 全局配置 */
  use: {
    /* 基础URL */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* 追踪配置 */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    /* 浏览器上下文配置 */
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,

    /* 超时配置 */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* 浏览器配置 */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* 本地开发服务器配置（可选） */
  // webServer: {
  //   command: 'npm run serve',
  //   port: 3000,
  //   timeout: 120 * 1000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
