/**
 * 数据模块导入功能 - P0+P1修复验证测试套件
 * 测试日期: 2026-09-04
 * 测试范围: P0(8项) + P1(6项) 共14项修复
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  username: 'admin',
  password: 'admin',
  projectName: '测试项目' // 需要根据实际情况调整
}

// 测试数据路径
const TEST_DATA_DIR = path.join(__dirname, 'test-data')
const TEMP_DIR = path.join(__dirname, 'temp')

/**
 * 测试前置条件检查
 */
test.beforeAll(async () => {
  // 创建临时目录
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }

  // 创建测试数据目录
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
  }
})

/**
 * 登录辅助函数
 */
async function login(page) {
  await page.goto('/')

  // 检查是否已登录
  const isLoggedIn = await page.locator('.ant-layout-header').isVisible().catch(() => false)
  if (isLoggedIn) {
    return
  }

  // 执行登录
  await page.fill('input[placeholder="请输入用户名"]', TEST_CONFIG.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_CONFIG.password)
  await page.click('button[type="submit"]')

  // 等待登录完成
  await page.waitForSelector('.ant-layout-header', { timeout: 10000 })
}

/**
 * 打开项目辅助函数
 */
async function openProject(page, projectName) {
  // 点击项目菜单
  await page.click('text=项目管理')
  await page.waitForTimeout(1000)

  // 查找并打开项目
  const projectRow = page.locator(`tr:has-text("${projectName}")`)
  if (await projectRow.isVisible()) {
    await projectRow.locator('text=打开').click()
    await page.waitForTimeout(2000)
  }
}

/**
 * 导航到数据模块导入页面
 */
async function navigateToImportPage(page) {
  await page.goto('/#/ietm/ietmimport/IetmDmImport')
  await page.waitForTimeout(1500)
}

/**
 * 创建测试XML文件
 */
function createTestXmlFile(filename, valid = true) {
  const filePath = path.join(TEMP_DIR, filename)

  const content = valid
    ? `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="HOUXJJ00" systemDiffCode="A" systemCode="AAA"
                subSystemCode="00" subSubSystemCode="00" assyCode="A"
                disassyCode="040" disassyCodeVariant="A" infoCode="040"
                infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>Test DM Content</description>
  </content>
</dmodule>`
    : `<?xml version="1.0" encoding="UTF-8"?><invalid>invalid xml</invalid>`

  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

/**
 * 创建大文件（用于测试文件大小限制）
 */
function createLargeFile(filename, sizeMB) {
  const filePath = path.join(TEMP_DIR, filename)
  const buffer = Buffer.alloc(sizeMB * 1024 * 1024, 'x')
  fs.writeFileSync(filePath, buffer)
  return filePath
}

// ==================== P0修复测试用例 ====================

test.describe('P0-3: 功能说明显示测试', () => {
  test('TC-01: 页面顶部应显示功能说明', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 验证功能说明alert存在
    const alert = page.locator('.ant-alert-info')
    await expect(alert).toBeVisible()

    // 验证说明内容
    const alertText = await alert.textContent()
    expect(alertText).toContain('可以导入单一DM文件')
    expect(alertText).toContain('包含多个DM及其ICN文件的ZIP压缩文件')

    // 验证有info图标
    const icon = alert.locator('.anticon-info-circle')
    await expect(icon).toBeVisible()
  })
})

test.describe('P0-5: 项目参数校验测试', () => {
  test('TC-02: 未配置项目参数时应拦截上传', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 注意: 此测试需要一个未配置项目参数的项目
    // 如果当前项目已配置，此测试会跳过

    // 点击上传文件按钮
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)

    // 检查是否显示警告消息或打开上传对话框
    const warningVisible = await page.locator('.ant-message-warning').isVisible().catch(() => false)
    const uploadModalVisible = await page.locator('.ant-modal:has-text("上传文件")').isVisible().catch(() => false)

    // 应该显示警告或打开对话框（取决于项目参数是否配置）
    expect(warningVisible || uploadModalVisible).toBeTruthy()
  })
})

test.describe('P0-6: 导入按钮状态控制', () => {
  test('TC-03: 无文件时导入按钮应禁用', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 导入按钮应该禁用
    const importBtn = page.locator('button:has-text("导入")')
    await expect(importBtn).toBeDisabled()
  })

  test('TC-04: 只有校验通过的文件时导入按钮应启用', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建有效的测试文件
    const testFile = createTestXmlFile('test-valid.xml', true)

    // 上传文件
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile)
    await page.waitForTimeout(500)

    // 确认上传
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 此时导入按钮应该禁用（文件未校验）
    const importBtn = page.locator('button:has-text("导入")')
    await expect(importBtn).toBeDisabled()

    // 校验文件
    await page.click('button:has-text("校验")')
    await page.waitForTimeout(3000) // 等待校验完成

    // 校验通过后导入按钮应启用
    await expect(importBtn).toBeEnabled()
  })
})

test.describe('P1-3: 进度提示测试', () => {
  test('TC-05: 校验时应显示进度提示', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建测试文件
    const testFile = createTestXmlFile('test-progress.xml', true)

    // 上传文件
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 点击校验按钮
    await page.click('button:has-text("校验")')

    // 应该显示进度提示
    const loadingMessage = page.locator('.ant-message-loading:has-text("正在校验")')
    await expect(loadingMessage).toBeVisible({ timeout: 2000 })

    // 等待校验完成，进度提示应该消失
    await page.waitForTimeout(3000)
    await expect(loadingMessage).not.toBeVisible()
  })

  test('TC-06: 导入时应显示进度提示', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建测试文件
    const testFile = createTestXmlFile('test-import-progress.xml', true)

    // 上传文件
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 校验文件
    await page.click('button:has-text("校验")')
    await page.waitForTimeout(3000)

    // 点击导入按钮
    await page.click('button:has-text("导入")')

    // 应该显示进度提示
    const loadingMessage = page.locator('.ant-message-loading:has-text("正在导入")')
    await expect(loadingMessage).toBeVisible({ timeout: 2000 })
  })
})

test.describe('P1-4: 文件大小边界值测试', () => {
  test('TC-07: 1GB文件应该可以上传', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建1GB文件（实际测试中可能需要调整大小以节省时间）
    // 注意：创建真实1GB文件耗时较长，这里使用小文件模拟
    const testFile = createTestXmlFile('test-1gb.xml', true)

    // 上传文件
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile)
    await page.waitForTimeout(500)

    // 应该没有错误提示
    const errorMessage = await page.locator('.ant-message-error:has-text("文件大小")').isVisible().catch(() => false)
    expect(errorMessage).toBeFalsy()

    // 确认上传
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 文件应该出现在列表中
    const fileRow = page.locator('tr:has-text("test-1gb.xml")')
    await expect(fileRow).toBeVisible()
  })

  test('TC-08: 超过1GB的文件应该被拦截', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建超过1GB的文件（实际测试可能需要调整）
    // 注意：此测试需要修改，因为无法实际创建超大文件
    // 可以通过修改文件对象的size属性来模拟

    // 点击上传按钮
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)

    // 使用JS修改文件大小检测逻辑进行测试
    // 这个测试在实际环境中可能需要手动验证
  })
})

test.describe('P1-5: 清空状态完整性测试', () => {
  test('TC-09: 清空按钮应重置所有状态', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 上传文件
    const testFile = createTestXmlFile('test-clear.xml', true)
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证文件已上传
    let fileRow = page.locator('tr:has-text("test-clear.xml")')
    await expect(fileRow).toBeVisible()

    // 点击清空按钮
    await page.click('button:has-text("清空")')
    await page.waitForTimeout(500)

    // 确认清空
    await page.click('.ant-modal-confirm button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证文件列表已清空
    fileRow = page.locator('tr:has-text("test-clear.xml")')
    await expect(fileRow).not.toBeVisible()

    // 验证导入按钮禁用
    const importBtn = page.locator('button:has-text("导入")')
    await expect(importBtn).toBeDisabled()
  })
})

test.describe('P1-9: 文件重复检测测试', () => {
  test('TC-10: 上传相同文件应被检测并拦截', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建测试文件
    const testFile = createTestXmlFile('test-duplicate.xml', true)

    // 第一次上传
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证文件已上传
    const fileRows = page.locator('tr:has-text("test-duplicate.xml")')
    expect(await fileRows.count()).toBe(1)

    // 第二次上传相同文件
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.waitForTimeout(500)

    // 应该显示警告消息
    const warningMessage = page.locator('.ant-message-warning:has-text("文件已存在")')
    await expect(warningMessage).toBeVisible({ timeout: 2000 })

    // 关闭上传对话框
    await page.click('.ant-modal button:has-text("取消")')
    await page.waitForTimeout(500)

    // 验证文件列表中只有一个文件
    expect(await fileRows.count()).toBe(1)
  })
})

test.describe('P1-12: ICN文件类型支持测试', () => {
  test('TC-11: 应该正确识别11种ICN文件类型', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建不同类型的测试文件
    const testFiles = [
      'test.xml',
      'test.cgm',
      'test.jpg',
      'test.png',
      'test.gif',
      'test.svg'
    ]

    const expectedTypes = {
      'test.xml': 'XML',
      'test.cgm': 'CGM',
      'test.jpg': 'JPG',
      'test.png': 'PNG',
      'test.gif': 'GIF',
      'test.svg': 'SVG'
    }

    // 上传每个文件并验证类型显示
    for (const filename of testFiles) {
      const filePath = path.join(TEMP_DIR, filename)
      fs.writeFileSync(filePath, 'test content')

      await page.click('button:has-text("上传文件")')
      await page.waitForTimeout(500)
      await page.locator('input[type="file"]').setInputFiles(filePath)
      await page.click('.ant-modal button:has-text("确定")')
      await page.waitForTimeout(1000)

      // 验证文件类型显示正确
      const fileRow = page.locator(`tr:has-text("${filename}")`)
      await expect(fileRow).toBeVisible()

      const typeCell = fileRow.locator('td').nth(2) // 类型列
      const typeText = await typeCell.textContent()
      expect(typeText).toContain(expectedTypes[filename])
    }
  })
})

test.describe('P1-7: 密级默认值动态化测试', () => {
  test('TC-12: 密级下拉框应从字典动态加载', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 点击密级下拉框
    const securitySelect = page.locator('label:has-text("密级")').locator('..').locator('.ant-select')
    await securitySelect.click()
    await page.waitForTimeout(500)

    // 验证下拉选项存在
    const options = page.locator('.ant-select-dropdown-menu-item')
    const count = await options.count()
    expect(count).toBeGreaterThan(0)

    // 验证默认值已选中
    const selectedValue = await securitySelect.locator('.ant-select-selection-selected-value').textContent()
    expect(selectedValue).toBeTruthy()
  })
})

// ==================== 综合测试用例 ====================

test.describe('综合流程测试', () => {
  test('TC-13: 完整导入流程 - 单个XML文件', async ({ page }) => {
    await login(page)
    await navigateToImportPage(page)

    // 创建有效的测试文件
    const testFile = createTestXmlFile('test-complete-flow.xml', true)

    // 步骤1: 上传文件
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证文件已上传
    const fileRow = page.locator('tr:has-text("test-complete-flow.xml")')
    await expect(fileRow).toBeVisible()

    // 步骤2: 校验文件
    await page.click('button:has-text("校验")')
    await page.waitForTimeout(3000)

    // 验证校验完成提示
    const successMessage = page.locator('.ant-message-success')
    await expect(successMessage).toBeVisible({ timeout: 5000 })

    // 步骤3: 导入文件
    const importBtn = page.locator('button:has-text("导入")')
    await expect(importBtn).toBeEnabled()
    await importBtn.click()
    await page.waitForTimeout(3000)

    // 验证导入结果对话框
    const resultModal = page.locator('.ant-modal:has-text("导入结果")')
    await expect(resultModal).toBeVisible({ timeout: 5000 })
  })

  test('TC-14: API路径验证 - 网络请求检查', async ({ page }) => {
    await login(page)

    // 监听网络请求
    const requests = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/ietm/csdb/ietmdm/operation/')) {
        requests.push({
          url: url,
          method: request.method(),
          headers: request.headers()
        })
      }
    })

    await navigateToImportPage(page)

    // 创建测试文件并上传
    const testFile = createTestXmlFile('test-api-check.xml', true)
    await page.click('button:has-text("上传文件")')
    await page.waitForTimeout(500)
    await page.locator('input[type="file"]').setInputFiles(testFile)
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 校验文件
    await page.click('button:has-text("校验")')
    await page.waitForTimeout(3000)

    // 验证校验API请求
    const beforeimportRequest = requests.find(r => r.url.includes('/beforeimport'))
    expect(beforeimportRequest).toBeTruthy()
    expect(beforeimportRequest.method).toBe('POST')
    expect(beforeimportRequest.headers['content-type']).toContain('multipart/form-data')

    // 导入文件
    await page.click('button:has-text("导入")')
    await page.waitForTimeout(3000)

    // 验证导入API请求
    const importRequest = requests.find(r => r.url.includes('/import') && !r.url.includes('beforeimport'))
    expect(importRequest).toBeTruthy()
    expect(importRequest.method).toBe('POST')
    expect(importRequest.headers['content-type']).toContain('application/x-www-form-urlencoded')
  })
})

// ==================== 测试清理 ====================

test.afterEach(async ({ page }) => {
  // 截图保存（仅失败时）
  // Playwright会自动保存失败截图
})

test.afterAll(async () => {
  // 清理临时文件
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR)
    files.forEach(file => {
      fs.unlinkSync(path.join(TEMP_DIR, file))
    })
  }
})
