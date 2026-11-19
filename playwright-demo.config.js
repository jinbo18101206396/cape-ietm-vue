const { defineConfig, devices } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',

    // 慢动作模式 - 每个操作延迟1000ms，方便观察
    launchOptions: {
      slowMo: 1000,
    },

    // 设置更长的超时，方便观察
    actionTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // 更大的窗口
      },
    },
  ],
})
