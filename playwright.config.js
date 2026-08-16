const { defineConfig, devices } = require('@playwright/test')

/**
 * Playwright E2E 测试配置 - IETM DM 编辑器
 * 前提：后端已启动（默认 http://localhost:8080），前端已启动（npm run serve，默认 http://localhost:3000）
 */
module.exports = defineConfig({
  testDir: './tests',

  // 测试文件匹配模式
  testMatch: '**/*.spec.js',

  // 超时配置
  timeout: 60000, // 单个测试 60s
  expect: {
    timeout: 10000 // expect 断言 10s
  },

  // 失败重试
  fullyParallel: false, // DM 编辑器测试涉及数据库状态，顺序执行
  retries: 0, // 首次测试不重试，便于发现问题
  workers: 1, // 单线程执行

  // 报告
  reporter: [
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
    ['list']
  ],

  use: {
    // 基础 URL（前端）
    baseURL: 'http://localhost:3000',

    // 浏览器上下文选项
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 视口大小（编辑器需要足够空间显示三区）
    viewport: { width: 1920, height: 1080 },

    // 导航超时
    navigationTimeout: 30000,
    actionTimeout: 10000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]

  // Web 服务器配置（可选：自动启动前端）
  // webServer: {
  //   command: 'npm run serve',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120000
  // }
})
