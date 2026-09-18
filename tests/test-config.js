/**
 * 测试配置文件
 * 集中管理所有测试相关的配置
 */

module.exports = {
  // 基础配置
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiURL: process.env.API_URL || 'http://localhost:9999',

  // 登录配置
  auth: {
    username: process.env.TEST_USERNAME || 'admin',
    password: process.env.TEST_PASSWORD || 'admin'
  },

  // 项目配置
  project: {
    name: process.env.TEST_PROJECT_NAME || '测试项目',
    hasParameters: true // 是否有项目参数
  },

  // 超时配置
  timeout: {
    default: 30000,
    upload: 60000,
    validation: 60000,
    import: 120000
  },

  // 测试数据配置
  testData: {
    validDmCode: 'HOUXJJ00-A-AAA00-00A-040A-A',
    testDataDir: './tests/test-data',
    tempDir: './tests/temp'
  },

  // API端点
  api: {
    beforeimport: '/ietm/csdb/ietmdm/operation/beforeimport',
    import: '/ietm/csdb/ietmdm/operation/import'
  },

  // 文件类型支持
  supportedFileTypes: [
    { ext: 'xml', type: 'XML' },
    { ext: 'zip', type: 'ZIP' },
    { ext: 'cgm', type: 'CGM' },
    { ext: 'jpg', type: 'JPG' },
    { ext: 'jpeg', type: 'JPEG' },
    { ext: 'png', type: 'PNG' },
    { ext: 'gif', type: 'GIF' },
    { ext: 'tif', type: 'TIF' },
    { ext: 'tiff', type: 'TIFF' },
    { ext: 'bmp', type: 'BMP' },
    { ext: 'svg', type: 'SVG' }
  ]
}
