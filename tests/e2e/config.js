/**
 * 测试环境配置
 */
module.exports = {
  // 测试环境URL
  baseURL: process.env.BASE_URL || 'http://localhost:3000',

  // 测试账号
  testUser: {
    username: process.env.TEST_USERNAME || 'admin',
    password: process.env.TEST_PASSWORD || 'admin123'
  },

  // 超时配置
  timeout: {
    short: 5000,
    medium: 10000,
    long: 30000
  },

  // 测试数据
  testData: {
    // 源DM信息（需要根据实际数据调整）
    sourceDm: {
      dmcCode: 'DMC-DDN-A-A1-ZBBM02-A-A-000-00',
      techName: '动力系统基本信息'
    },

    // 目标节点（需要根据实际数据调整）
    targetNode: {
      name: 'DDN 动力系统',
      expectedSns: 'DDN-A-A1'
    },

    // 复制新建时的修改数据
    copyData: {
      infoCode: 'ZBBM03',
      infoCodeVariant: 'B',
      locationCode: 'A',
      learnCode: '001',
      learnEventCode: 'A'
    }
  },

  // 截图配置
  screenshot: {
    path: './test-results/screenshots',
    fullPage: true
  }
};
