/**
 * Jest单元测试配置
 * 用途：测试纯逻辑工具函数（如paraConverter的XML↔HTML往返转换）
 * 注意：与E2E测试(Playwright)分离，仅覆盖不依赖浏览器登录/导航的纯函数逻辑
 */
module.exports = {
  // jsdom环境：提供DOMParser/Image等浏览器API（paraConverter部分函数需要）
  testEnvironment: 'jsdom',

  // 仅扫描tests/jest目录（专用于纯逻辑jest测试）
  // 隔离说明：tests/unit有大量@vue/test-utils组件测试和Playwright spec，不能混入
  roots: ['<rootDir>/tests/jest'],
  testMatch: ['**/*.spec.js'],

  // 用jest专用babel配置转译ES modules（不影响主构建的babel.config.js）
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.jest.js' }]
  },

  // axios是ESM/CJS混合包，需允许转译
  transformIgnorePatterns: ['/node_modules/(?!axios)'],

  // 解析 @ 路径别名（对齐 vue.config.js 的 @ → src）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  clearMocks: true
}
