/**
 * 数据模块导入完整E2E测试套件
 * 测试范围：
 * 1. ZIP文件解压并显示内部文件名
 * 2. 校验后自动填充DDN信息
 * 3. API端点迁移验证
 * 4. 完整的上传→校验→导入流程
 *
 * @requires Playwright
 * @requires 后端服务运行在 http://localhost:9999
 * @requires 前端服务运行在 http://localhost:3000
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const JSZip = require('jszip')
const config = require('../test-config')
const helpers = require('../helpers/test-helpers')

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  apiURL: 'http://localhost:9999',
  timeout: 60000,
  tempDir: path.join(__dirname, '../temp')
}

// 确保临时目录存在
if (!fs.existsSync(TEST_CONFIG.tempDir)) {
  fs.mkdirSync(TEST_CONFIG.tempDir, { recursive: true })
}

// 测试前置条件检查
test.beforeAll(async () => {
  console.log('========================================')
  console.log('数据模块导入完整E2E测试套件')
  console.log('========================================')
  console.log(`前端地址: ${TEST_CONFIG.baseURL}`)
  console.log(`后端地址: ${TEST_CONFIG.apiURL}`)
  console.log(`临时目录: ${TEST_CONFIG.tempDir}`)
})

// 测试后清理
test.afterAll(async () => {
  console.log('清理临时文件...')
  helpers.cleanupTempFiles()
})

// ========== 辅助函数 ==========

/**
 * 创建包含多个DM和ICN的ZIP文件
 */
async function createTestZipFile(filename, options = {}) {
  const {
    dmCount = 3,
    icnCount = 2,
    modelCode = 'ZB1',
    security = '01'
  } = options

  const zip = new JSZip()

  // 添加DM文件
  for (let i = 1; i <= dmCount; i++) {
    const dmCode = `${modelCode}-A-00${i}-0-0-00-00A-040A-A`
    const xmlContent = createDmXmlContent(modelCode, `00${i}`, security)
    zip.file(`DMC-${dmCode}.xml`, xmlContent)
  }

  // 添加ICN文件
  for (let i = 1; i <= icnCount; i++) {
    const icnName = `ICN-${modelCode}-00${i}-00001.png`
    const pngBuffer = createMinimalPngBuffer()
    zip.file(icnName, pngBuffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const filePath = path.join(TEST_CONFIG.tempDir, filename)
  fs.writeFileSync(filePath, zipBuffer)

  console.log(`创建测试ZIP文件: ${filename} (${dmCount} DM + ${icnCount} ICN)`)
  return filePath
}

/**
 * 创建DM XML内容
 */
function createDmXmlContent(modelCode, systemCode, security) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="${modelCode}"
                systemDiffCode="A"
                systemCode="${systemCode}"
                subSystemCode="0"
                subSubSystemCode="0"
                assyCode="00"
                disassyCode="00"
                disassyCodeVariant="A"
                infoCode="040"
                infoCodeVariant="A"
                itemLocationCode="A"/>
        <language languageIsoCode="zh" countryIsoCode="CN"/>
        <issueInfo issueNumber="001" inWork="00"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="09" day="04"/>
        <dmTitle>
          <techName>测试数据模块 ${systemCode}</techName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
    <dmStatus>
      <security securityClassification="${security}"/>
      <responsiblePartnerCompany>
        <enterpriseName>测试单位</enterpriseName>
      </responsiblePartnerCompany>
    </dmStatus>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>测试内容</title>
        <para>这是测试数据模块 ${systemCode}</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`
}

/**
 * 创建最小PNG图片缓冲区
 */
function createMinimalPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ])
}

/**
 * 创建单个DM XML文件
 */
function createSingleDmFile(filename, modelCode, security) {
  const filePath = path.join(TEST_CONFIG.tempDir, filename)
  const content = createDmXmlContent(modelCode, '001', security)
  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`创建单个DM文件: ${filename}`)
  return filePath
}

/**
 * 上传文件（使用file input）
 */
async function uploadFileViaInput(page, filePath) {
  console.log(`上传文件: ${path.basename(filePath)}`)

  // 使用隐藏的file input上传
  const fileInput = await page.locator('input[type="file"][accept=".xml,.zip"]')
  await fileInput.setInputFiles(filePath)

  // 等待文件处理完成（解压或添加到列表）
  await page.waitForTimeout(2000)
}

/**
 * 获取文件列表中的文件数量
 */
async function getFileListCount(page) {
  const rows = await page.locator('.ant-table-tbody tr').count()
  return rows
}

/**
 * 获取文件列表中的所有文件名
 */
async function getFileListNames(page) {
  const rows = await page.locator('.ant-table-tbody tr')
  const count = await rows.count()
  const names = []

  for (let i = 0; i < count; i++) {
    const nameCell = rows.nth(i).locator('td').nth(1) // 第二列是文件名
    const name = await nameCell.textContent()
    names.push(name.trim())
  }

  return names
}

/**
 * 点击校验按钮并等待完成
 */
async function clickValidateAndWait(page) {
  console.log('点击校验按钮...')

  // 监听API请求
  const validateApiPromise = page.waitForResponse(
    response => response.url().includes('/ietm/ietmimport/validate') && response.status() === 200,
    { timeout: 30000 }
  )

  await page.click('button:has-text("校验")')

  // 等待API响应
  const response = await validateApiPromise
  const responseData = await response.json()

  console.log('校验API响应:', responseData.success ? '成功' : '失败')

  // 等待UI更新
  await page.waitForTimeout(1000)

  return responseData
}

/**
 * 获取DDN表单值
 */
async function getDdnFormValues(page) {
  const values = {}

  // 型号
  const modelicInput = await page.locator('input[placeholder*="型号"]')
  values.modelic = await modelicInput.inputValue()

  // 密级
  const securitySelect = await page.locator('.ant-select:has(input[placeholder*="密级"])')
  const securityText = await securitySelect.locator('.ant-select-selection-item').textContent()
  values.security = securityText.trim()

  // 发送单位
  const senderInput = await page.locator('input[placeholder*="发送单位"]')
  values.sender = await senderInput.inputValue()

  console.log('DDN表单值:', values)
  return values
}

// ========== 测试套件 ==========

test.describe('数据模块导入 - ZIP文件解压和显示', () => {

  test('TC-01: 上传ZIP文件，显示内部XML文件名（不显示ZIP名）', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建包含3个DM的ZIP文件
    const zipPath = await createTestZipFile('test-3dm.zip', { dmCount: 3, icnCount: 0 })

    // 上传ZIP文件
    await uploadFileViaInput(page, zipPath)

    // 验证：文件列表显示3个XML文件
    const fileCount = await getFileListCount(page)
    expect(fileCount).toBe(3)

    // 验证：显示的是XML文件名，不是ZIP文件名
    const fileNames = await getFileListNames(page)
    console.log('文件列表中的文件名:', fileNames)

    expect(fileNames.some(name => name.includes('DMC-ZB1-A-001'))).toBe(true)
    expect(fileNames.some(name => name.includes('DMC-ZB1-A-002'))).toBe(true)
    expect(fileNames.some(name => name.includes('DMC-ZB1-A-003'))).toBe(true)
    expect(fileNames.some(name => name.includes('.zip'))).toBe(false) // 不应该显示ZIP名
  })

  test('TC-02: 上传ZIP文件，初始状态为"待校验"', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    const zipPath = await createTestZipFile('test-state.zip', { dmCount: 2, icnCount: 0 })
    await uploadFileViaInput(page, zipPath)

    // 验证：文件状态为"待校验"
    const statusCells = await page.locator('.ant-table-tbody tr td').nth(4) // 第5列是状态
    const statusText = await statusCells.first().textContent()

    console.log('初始状态:', statusText)
    expect(statusText).toContain('待校验')
    expect(statusText).not.toContain('已校验')
  })

  test('TC-03: 上传ZIP文件（包含DM和ICN），正确识别文件类型', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    const zipPath = await createTestZipFile('test-mixed.zip', { dmCount: 2, icnCount: 3 })
    await uploadFileViaInput(page, zipPath)

    // 验证：显示5个文件（2个DM + 3个ICN）
    const fileCount = await getFileListCount(page)
    expect(fileCount).toBe(5)

    // 验证：包含DM文件
    const fileNames = await getFileListNames(page)
    const dmFiles = fileNames.filter(name => name.includes('DMC-'))
    const icnFiles = fileNames.filter(name => name.includes('ICN-'))

    expect(dmFiles.length).toBe(2)
    expect(icnFiles.length).toBe(3)
  })
})

test.describe('数据模块导入 - 校验功能', () => {

  test('TC-04: 点击校验按钮，调用新API端点', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    const zipPath = await createTestZipFile('test-validate.zip', { dmCount: 1, icnCount: 0 })
    await uploadFileViaInput(page, zipPath)

    // 监听网络请求
    let validateApiCalled = false
    page.on('request', request => {
      if (request.url().includes('/ietm/ietmimport/validate')) {
        validateApiCalled = true
        console.log('✓ 调用新API端点: /ietm/ietmimport/validate')
      }
      if (request.url().includes('/ietm/csdb/ietmdm/operation/beforeimport')) {
        throw new Error('❌ 调用了旧API端点（不应该调用）')
      }
    })

    // 点击校验
    await clickValidateAndWait(page)

    // 验证：调用了新API
    expect(validateApiCalled).toBe(true)
  })

  test('TC-05: 校验后，文件状态更新为"校验通过"或"校验失败"', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    const zipPath = await createTestZipFile('test-status.zip', { dmCount: 1, icnCount: 0 })
    await uploadFileViaInput(page, zipPath)

    // 点击校验
    await clickValidateAndWait(page)

    // 验证：状态已更新
    const statusCell = await page.locator('.ant-table-tbody tr td').nth(4)
    const statusText = await statusCell.textContent()

    console.log('校验后状态:', statusText)
    expect(statusText).not.toContain('待校验')
    expect(statusText.includes('通过') || statusText.includes('失败')).toBe(true)
  })
})

test.describe('数据模块导入 - DDN自动填充', () => {

  test('TC-06: 校验成功后，自动填充型号和密级', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建特定型号和密级的DM
    const zipPath = await createTestZipFile('test-ddn-fill.zip', {
      dmCount: 1,
      icnCount: 0,
      modelCode: 'ZB2',
      security: '02'
    })

    await uploadFileViaInput(page, zipPath)

    // 校验前，DDN字段应该为空或默认值
    let ddnBefore = await getDdnFormValues(page)
    console.log('校验前DDN值:', ddnBefore)

    // 点击校验
    await clickValidateAndWait(page)

    // 等待自动填充
    await page.waitForTimeout(1000)

    // 验证：型号和密级已填充
    let ddnAfter = await getDdnFormValues(page)
    console.log('校验后DDN值:', ddnAfter)

    expect(ddnAfter.modelic).toBe('ZB2')
    expect(ddnAfter.security).toContain('02')

    // 验证：弹出提示消息
    const successMsg = await page.locator('.ant-message:has-text("已从DM文件中自动填充")').isVisible({ timeout: 3000 })
    expect(successMsg).toBe(true)
  })

  test('TC-07: 不覆盖用户已填写的DDN字段', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 手动填写型号
    const modelicInput = await page.locator('input[placeholder*="型号"]')
    await modelicInput.fill('USER_MODEL')

    // 上传DM（型号是ZB1）
    const zipPath = await createTestZipFile('test-no-overwrite.zip', {
      dmCount: 1,
      icnCount: 0,
      modelCode: 'ZB1',
      security: '01'
    })

    await uploadFileViaInput(page, zipPath)
    await clickValidateAndWait(page)

    await page.waitForTimeout(1000)

    // 验证：型号保持用户填写的值，没有被DM的值覆盖
    const ddnValues = await getDdnFormValues(page)
    expect(ddnValues.modelic).toBe('USER_MODEL') // 保持用户填写的
  })

  test('TC-08: 密级格式标准化（1位转2位）', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建密级为单字符"1"的DM
    const dmPath = createSingleDmFile('test-security-1char.xml', 'ZB3', '1')
    await uploadFileViaInput(page, dmPath)

    await clickValidateAndWait(page)
    await page.waitForTimeout(1000)

    // 验证：密级自动转为"01"
    const ddnValues = await getDdnFormValues(page)
    console.log('密级值:', ddnValues.security)
    expect(ddnValues.security).toMatch(/01/)
  })

  test('TC-09: 多个DM文件，使用第一个DM的信息', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建包含多个DM的ZIP，每个DM的密级不同
    const zip = new JSZip()
    zip.file('DMC-MODEL1-A-001-0-0-00-00A-040A-A.xml', createDmXmlContent('MODEL1', '001', '01'))
    zip.file('DMC-MODEL1-A-002-0-0-00-00A-040A-A.xml', createDmXmlContent('MODEL1', '002', '02'))
    zip.file('DMC-MODEL1-A-003-0-0-00-00A-040A-A.xml', createDmXmlContent('MODEL1', '003', '03'))

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipPath = path.join(TEST_CONFIG.tempDir, 'test-multiple-dm.zip')
    fs.writeFileSync(zipPath, zipBuffer)

    await uploadFileViaInput(page, zipPath)
    await clickValidateAndWait(page)
    await page.waitForTimeout(1000)

    // 验证：使用第一个DM的密级（01）
    const ddnValues = await getDdnFormValues(page)
    expect(ddnValues.modelic).toBe('MODEL1')
    expect(ddnValues.security).toMatch(/01/) // 第一个DM的密级
  })
})

test.describe('数据模块导入 - 完整流程', () => {

  test('TC-10: 完整流程：上传→校验→自动填充→导入', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 1. 上传ZIP
    console.log('步骤1: 上传ZIP文件')
    const zipPath = await createTestZipFile('test-complete-flow.zip', {
      dmCount: 2,
      icnCount: 1,
      modelCode: 'FLOW1',
      security: '01'
    })
    await uploadFileViaInput(page, zipPath)

    // 验证：显示3个文件
    let fileCount = await getFileListCount(page)
    expect(fileCount).toBe(3)

    // 2. 点击校验
    console.log('步骤2: 点击校验')
    await clickValidateAndWait(page)

    // 验证：DDN自动填充
    await page.waitForTimeout(1000)
    const ddnValues = await getDdnFormValues(page)
    expect(ddnValues.modelic).toBe('FLOW1')
    expect(ddnValues.security).toContain('01')

    // 3. 填写剩余DDN字段
    console.log('步骤3: 填写剩余DDN字段')
    await page.locator('input[placeholder*="发送单位"]').fill('30101')

    const dateInput = await page.locator('.ant-calendar-picker-input')
    await dateInput.click()
    await page.waitForTimeout(500)
    await page.click('.ant-calendar-today-btn') // 选择今天

    await page.locator('input[placeholder*="年份"]').fill('2026')

    // 4. 点击导入
    console.log('步骤4: 点击导入')

    // 监听导入API
    const importApiPromise = page.waitForResponse(
      response => response.url().includes('/ietm/ietmimport/import') && response.status() === 200,
      { timeout: 30000 }
    )

    await page.click('button:has-text("导入")')

    // 确认导入
    await page.waitForTimeout(500)
    const confirmBtn = await page.locator('.ant-modal button:has-text("确定")')
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click()
    }

    // 等待导入完成
    const importResponse = await importApiPromise
    const importData = await importResponse.json()

    console.log('导入API响应:', importData)
    expect(importData.success).toBe(true)

    // 验证：显示导入结果对话框
    const resultModal = await page.locator('.ant-modal:has-text("导入结果")').isVisible({ timeout: 5000 })
    expect(resultModal).toBe(true)
  })

  test('TC-11: 上传单个XML文件，校验并自动填充', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 上传单个XML
    const xmlPath = createSingleDmFile('test-single-dm.xml', 'SINGLE1', '02')
    await uploadFileViaInput(page, xmlPath)

    // 验证：显示1个文件
    const fileCount = await getFileListCount(page)
    expect(fileCount).toBe(1)

    // 校验
    await clickValidateAndWait(page)
    await page.waitForTimeout(1000)

    // 验证：DDN自动填充
    const ddnValues = await getDdnFormValues(page)
    expect(ddnValues.modelic).toBe('SINGLE1')
    expect(ddnValues.security).toContain('02')
  })
})

test.describe('数据模块导入 - 边界和异常测试', () => {

  test('TC-12: 上传空ZIP文件', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建空ZIP
    const zip = new JSZip()
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipPath = path.join(TEST_CONFIG.tempDir, 'empty.zip')
    fs.writeFileSync(zipPath, zipBuffer)

    await uploadFileViaInput(page, zipPath)

    // 验证：应该显示错误或无文件
    await page.waitForTimeout(2000)
    const errorMsg = await page.locator('.ant-message-error').isVisible({ timeout: 3000 })
    const fileCount = await getFileListCount(page)

    expect(errorMsg || fileCount === 0).toBe(true)
  })

  test('TC-13: 上传超大ZIP文件（性能测试）', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建包含50个DM的ZIP
    console.log('创建包含50个DM的ZIP文件...')
    const zipPath = await createTestZipFile('test-large.zip', { dmCount: 50, icnCount: 0 })

    const startTime = Date.now()
    await uploadFileViaInput(page, zipPath)
    const endTime = Date.now()

    const processingTime = endTime - startTime
    console.log(`处理时间: ${processingTime}ms`)

    // 验证：显示50个文件
    const fileCount = await getFileListCount(page)
    expect(fileCount).toBe(50)

    // 验证：处理时间在合理范围内（<10秒）
    expect(processingTime).toBeLessThan(10000)
  })

  test('TC-14: 仅上传ICN文件（无DM），不填充DDN', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建仅包含ICN的ZIP
    const zipPath = await createTestZipFile('test-icn-only.zip', { dmCount: 0, icnCount: 3 })
    await uploadFileViaInput(page, zipPath)

    // 记录校验前DDN值
    const ddnBefore = await getDdnFormValues(page)

    // 校验
    await clickValidateAndWait(page)
    await page.waitForTimeout(1000)

    // 验证：DDN值未变化（因为没有DM）
    const ddnAfter = await getDdnFormValues(page)
    expect(ddnAfter.modelic).toBe(ddnBefore.modelic) // 未填充
  })

  test('TC-15: 上传无效XML文件', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 创建无效XML
    const invalidPath = path.join(TEST_CONFIG.tempDir, 'invalid.xml')
    fs.writeFileSync(invalidPath, '<invalid>not a valid DM</invalid>', 'utf-8')

    await uploadFileViaInput(page, invalidPath)

    // 校验
    await clickValidateAndWait(page)

    // 验证：校验失败
    const statusCell = await page.locator('.ant-table-tbody tr td').nth(4)
    const statusText = await statusCell.textContent()
    expect(statusText).toContain('失败')
  })

  test('TC-16: 混合上传（独立XML + ZIP）', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 上传独立XML
    const xmlPath = createSingleDmFile('standalone.xml', 'MIX1', '01')
    await uploadFileViaInput(page, xmlPath)

    await page.waitForTimeout(1000)

    // 上传ZIP
    const zipPath = await createTestZipFile('mixed.zip', { dmCount: 2, icnCount: 0, modelCode: 'MIX1' })
    await uploadFileViaInput(page, zipPath)

    // 验证：显示3个文件（1个独立 + 2个来自ZIP）
    const fileCount = await getFileListCount(page)
    expect(fileCount).toBe(3)

    // 校验
    await clickValidateAndWait(page)
    await page.waitForTimeout(1000)

    // 验证：DDN填充了型号
    const ddnValues = await getDdnFormValues(page)
    expect(ddnValues.modelic).toBe('MIX1')
  })
})

test.describe('数据模块导入 - UI交互细节', () => {

  test('TC-17: 清空列表功能', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 上传文件
    const zipPath = await createTestZipFile('test-clear.zip', { dmCount: 2, icnCount: 0 })
    await uploadFileViaInput(page, zipPath)

    // 验证：有文件
    let fileCount = await getFileListCount(page)
    expect(fileCount).toBe(2)

    // 点击清空列表
    await page.click('button:has-text("清空列表")')
    await page.waitForTimeout(500)

    // 确认清空
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证：文件列表已清空
    const emptyAlert = await page.locator('.ant-alert:has-text("暂无文件")').isVisible()
    expect(emptyAlert).toBe(true)
  })

  test('TC-18: 删除单个文件', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 上传文件
    const zipPath = await createTestZipFile('test-delete.zip', { dmCount: 3, icnCount: 0 })
    await uploadFileViaInput(page, zipPath)

    // 验证：有3个文件
    let fileCount = await getFileListCount(page)
    expect(fileCount).toBe(3)

    // 删除第一个文件
    await page.locator('.ant-table-tbody tr').first().locator('button:has-text("删除")').click()
    await page.waitForTimeout(500)

    // 确认删除
    await page.click('.ant-popover button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证：剩余2个文件
    fileCount = await getFileListCount(page)
    expect(fileCount).toBe(2)
  })

  test('TC-19: 查看校验详情', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 上传并校验
    const zipPath = await createTestZipFile('test-detail.zip', { dmCount: 1, icnCount: 0 })
    await uploadFileViaInput(page, zipPath)
    await clickValidateAndWait(page)

    // 点击"查看详情"
    await page.locator('.ant-table-tbody tr').first().locator('button:has-text("查看详情")').click()
    await page.waitForTimeout(500)

    // 验证：详情对话框显示
    const detailModal = await page.locator('.ant-modal:has-text("校验详情")').isVisible()
    expect(detailModal).toBe(true)

    // 关闭对话框
    await page.click('.ant-modal-close')
  })

  test('TC-20: 统计信息更新', async ({ page }) => {
    await page.goto(TEST_CONFIG.baseURL)
    await helpers.login(page, 'admin', 'admin')
    await helpers.navigateToImportPage(page)

    // 上传文件
    const zipPath = await createTestZipFile('test-stats.zip', { dmCount: 3, icnCount: 2 })
    await uploadFileViaInput(page, zipPath)

    // 验证：总文件数=5
    const totalStat = await page.locator('.ant-statistic:has-text("总文件数") .ant-statistic-content-value')
    const totalValue = await totalStat.textContent()
    expect(totalValue.trim()).toBe('5')

    // 校验
    await clickValidateAndWait(page)
    await page.waitForTimeout(1000)

    // 验证：已校验数更新
    const validatedStat = await page.locator('.ant-statistic:has-text("已校验") .ant-statistic-content-value')
    const validatedValue = await validatedStat.textContent()
    expect(parseInt(validatedValue.trim())).toBeGreaterThan(0)
  })
})

console.log('所有测试用例定义完成')
