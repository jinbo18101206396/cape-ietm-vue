module.exports = {
  testDir: './',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};
