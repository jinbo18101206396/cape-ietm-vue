import { defineConfig, devices } from '@playwright/test';

/**
 * 往返加载测试专用配置
 * 使用已运行的开发服务器，避免重复编译
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/levelledpara-roundtrip.spec.ts',

  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-roundtrip', open: 'never' }]
  ],

  use: {
    baseURL: 'http://localhost:3003',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 不自动启动服务器，假设已经在运行
  // 如果需要自动启动，取消下面的注释
  // webServer: {
  //   command: 'npm run serve',
  //   url: 'http://localhost:3003',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },
});
