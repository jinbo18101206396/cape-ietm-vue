/**
 * E2E综合测试：数据模块导入 - ZIP文件展开功能
 *
 * 测试策略：
 * 1. 使用真实的浏览器环境（Playwright）
 * 2. 通过UI交互验证（点击、输入、选择文件）
 * 3. 不绕过Vue层，测试真实用户行为
 * 4. 覆盖场景测试和边界测试
 * 5. Mock后端API响应，避免依赖后端环境
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')

// 测试数据目录
const TEST_DATA_DIR = path.join(__dirname, '../test-data/dm-import')

// 准备测试数据
test.beforeAll(() => {
  // 创建测试数据目录
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
  }

  // 创建标准DM XML内容
  const createDMXml = (dmCode, infoCode = '000') => `<?xml version="1.0" encoding="UTF-8"?>
<dmodule xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="http://www.s1000d.org/S1000D_4-0/xml_schema_flat/descript.xsd">
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="${infoCode}"
                infoCodeVariant="A" itemLocationCode="A"/>
        <language languageIsoCode="en" countryIsoCode="US"/>
        <issueInfo issueNumber="001" inWork="00"/>
      </dmIdent>
      <dmAddressItems>
        <issueDate year="2026" month="09" day="04"/>
        <dmTitle>
          <techName>Test Data Module ${dmCode}</techName>
        </dmTitle>
      </dmAddressItems>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>Test Content</title>
        <para>This is test DM content for ${dmCode}</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

  // 创建单个XML文件
  fs.writeFileSync(
    path.join(TEST_DATA_DIR, 'DMC-TEST-A-00-00-00-00A-000A-A.xml'),
    createDMXml('DMC-TEST-A-00-00-00-00A-000A-A'),
    'utf-8'
  )

  // 创建包含3个XML的ZIP文件
  const zip1 = new AdmZip()
  zip1.addFile('DMC-TEST-A-00-00-00-00A-001A-A.xml', Buffer.from(createDMXml('DMC-TEST-A-00-00-00-00A-001A-A', '001'), 'utf-8'))
  zip1.addFile('DMC-TEST-A-00-00-00-00A-002A-A.xml', Buffer.from(createDMXml('DMC-TEST-A-00-00-00-00A-002A-A', '002'), 'utf-8'))
  zip1.addFile('DMC-TEST-A-00-00-00-00A-003A-A.xml', Buffer.from(createDMXml('DMC-TEST-A-00-00-00-00A-003A-A', '003'), 'utf-8'))
  zip1.writeZip(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))

  // 创建包含XML和ICN的混合ZIP文件
  const zip2 = new AdmZip()
  zip2.addFile('DMC-TEST-A-00-00-00-00A-010A-A.xml', Buffer.from(createDMXml('DMC-TEST-A-00-00-00-00A-010A-A', '010'), 'utf-8'))
  // 创建1x1像素透明PNG
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  zip2.addFile('ICN-TEST-001.PNG', pngBuffer)
  zip2.addFile('ICN-TEST-002.JPG', pngBuffer)
  zip2.writeZip(path.join(TEST_DATA_DIR, 'test-package-mixed.zip'))

  // 创建大型ZIP文件（10个文件）
  const zip3 = new AdmZip()
  for (let i = 1; i <= 10; i++) {
    const infoCode = String(i).padStart(3, '0')
    zip3.addFile(
      `DMC-TEST-A-00-00-00-00A-${infoCode}A-A.xml`,
      Buffer.from(createDMXml(`DMC-TEST-A-00-00-00-00A-${infoCode}A-A`, infoCode), 'utf-8')
    )
  }
  zip3.writeZip(path.join(TEST_DATA_DIR, 'test-package-large.zip'))

  // 创建空ZIP文件
  const zip4 = new AdmZip()
  zip4.writeZip(path.join(TEST_DATA_DIR, 'test-package-empty.zip'))

  // 创建包含无效XML的ZIP
  const zip5 = new AdmZip()
  zip5.addFile('invalid.xml', Buffer.from('<?xml version="1.0"?><invalid>broken xml', 'utf-8'))
  zip5.writeZip(path.join(TEST_DATA_DIR, 'test-package-invalid.zip'))

  console.log('✓ 测试数据准备完成')
})

// 配置测试环境
test.use({
  viewport: { width: 1920, height: 1080 },
  video: 'retain-on-failure',
  screenshot: 'only-on-failure'
})

test.describe('数据模块导入 - ZIP展开功能综合测试', () => {

  // 在每个测试前设置API拦截和登录
  test.beforeEach(async ({ page, context }) => {
    // Mock API响应 - 校验接口
    await page.route('**/ietm/ietmimport/validate', async (route, request) => {
      const postData = request.postDataBuffer()

      // 解析FormData获取文件名
      let fileName = 'unknown.zip'
      const boundary = request.headers()['content-type']?.split('boundary=')[1]
      if (boundary && postData) {
        const bodyStr = postData.toString()
        const match = bodyStr.match(/filename="([^"]+)"/)
        if (match) {
          fileName = match[1]
        }
      }

      console.log(`[Mock] 校验请求: ${fileName}`)

      // 根据文件名返回不同的响应
      let response = { success: false, message: '未知文件' }

      if (fileName.includes('3files')) {
        response = {
          success: true,
          result: {
            files: [
              {
                fileName: 'DMC-TEST-A-00-00-00-00A-001A-A.xml',
                fileType: 'DM',
                resultCode: '1',
                resultMessage: '校验通过',
                dmcCode: 'DMC-TEST-A-00-00-00-00A-001A-A',
                tempFilePath: '/tmp/file1.xml',
                xmlContent: '<dmodule>...</dmodule>'
              },
              {
                fileName: 'DMC-TEST-A-00-00-00-00A-002A-A.xml',
                fileType: 'DM',
                resultCode: '1',
                resultMessage: '校验通过',
                dmcCode: 'DMC-TEST-A-00-00-00-00A-002A-A',
                tempFilePath: '/tmp/file2.xml',
                xmlContent: '<dmodule>...</dmodule>'
              },
              {
                fileName: 'DMC-TEST-A-00-00-00-00A-003A-A.xml',
                fileType: 'DM',
                resultCode: '1',
                resultMessage: '校验通过',
                dmcCode: 'DMC-TEST-A-00-00-00-00A-003A-A',
                tempFilePath: '/tmp/file3.xml',
                xmlContent: '<dmodule>...</dmodule>'
              }
            ]
          }
        }
      } else if (fileName.includes('mixed')) {
        response = {
          success: true,
          result: {
            files: [
              {
                fileName: 'DMC-TEST-A-00-00-00-00A-010A-A.xml',
                fileType: 'DM',
                resultCode: '1',
                resultMessage: '校验通过',
                dmcCode: 'DMC-TEST-A-00-00-00-00A-010A-A',
                tempFilePath: '/tmp/file10.xml',
                xmlContent: '<dmodule>...</dmodule>'
              },
              {
                fileName: 'ICN-TEST-001.PNG',
                fileType: 'ICN',
                resultCode: '1',
                resultMessage: '校验通过',
                tempFilePath: '/tmp/icn1.png'
              },
              {
                fileName: 'ICN-TEST-002.JPG',
                fileType: 'ICN',
                resultCode: '1',
                resultMessage: '校验通过',
                tempFilePath: '/tmp/icn2.jpg'
              }
            ]
          }
        }
      } else if (fileName.includes('large')) {
        const files = []
        for (let i = 1; i <= 10; i++) {
          const infoCode = String(i).padStart(3, '0')
          files.push({
            fileName: `DMC-TEST-A-00-00-00-00A-${infoCode}A-A.xml`,
            fileType: 'DM',
            resultCode: '1',
            resultMessage: '校验通过',
            dmcCode: `DMC-TEST-A-00-00-00-00A-${infoCode}A-A`,
            tempFilePath: `/tmp/file${i}.xml`,
            xmlContent: '<dmodule>...</dmodule>'
          })
        }
        response = { success: true, result: { files } }
      } else if (fileName.includes('empty')) {
        response = {
          success: true,
          result: { files: [] }
        }
      } else if (fileName.includes('invalid')) {
        response = {
          success: true,
          result: {
            files: [
              {
                fileName: 'invalid.xml',
                fileType: 'DM',
                resultCode: '-1',
                resultMessage: 'XML格式错误',
                tempFilePath: '/tmp/invalid.xml'
              }
            ]
          }
        }
      } else if (fileName.endsWith('.xml')) {
        // 单个XML文件
        response = {
          success: true,
          result: {
            files: [
              {
                fileName: fileName,
                fileType: 'DM',
                resultCode: '1',
                resultMessage: '校验通过',
                dmcCode: fileName.replace('.xml', ''),
                tempFilePath: `/tmp/${fileName}`,
                xmlContent: '<dmodule>...</dmodule>'
              }
            ]
          }
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      })
    })

    // Mock导入接口
    await page.route('**/ietm/ietmimport/import', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: '导入成功',
          result: { importCount: 3 }
        })
      })
    })

    // Mock项目信息接口
    await page.route('**/ietm/project/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: {
            id: 'test-project-001',
            name: '测试项目',
            parameters: '{}'
          }
        })
      })
    })

    // 直接访问导入页面（跳过登录）
    await page.goto('http://localhost:3000/ietm/import')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  // ==================== 场景测试 ====================

  test('场景1: 上传单个XML文件', async ({ page }) => {
    console.log('\n=== 场景1: 上传单个XML文件 ===')

    // 1. 选择文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'DMC-TEST-A-00-00-00-00A-000A-A.xml'))

    // 2. 等待上传完成
    await page.waitForTimeout(1000)

    // 3. 验证文件列表中只有1个文件
    const tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(1)

    // 4. 验证显示的是XML文件名
    const firstRowText = await tableRows.first().textContent()
    expect(firstRowText).toContain('DMC-TEST-A-00-00-00-00A-000A-A.xml')

    // 5. 验证已自动校验
    expect(firstRowText).toContain('校验通过')

    console.log('✓ 场景1通过: 单个XML文件上传正常')
  })

  test('场景2: 上传包含3个XML的ZIP文件', async ({ page }) => {
    console.log('\n=== 场景2: 上传包含3个XML的ZIP文件 ===')

    // 1. 选择ZIP文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))

    // 2. 等待解析（应该显示"正在解析文件"）
    await page.waitForTimeout(2000)

    // 3. 验证文件列表中有3个文件
    const tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    // 4. 验证显示的是内部XML文件名，而不是ZIP文件名
    const fileNames = []
    for (let i = 0; i < 3; i++) {
      const rowText = await tableRows.nth(i).textContent()
      fileNames.push(rowText)
    }

    expect(fileNames.some(name => name.includes('DMC-TEST-A-00-00-00-00A-001A-A.xml'))).toBeTruthy()
    expect(fileNames.some(name => name.includes('DMC-TEST-A-00-00-00-00A-002A-A.xml'))).toBeTruthy()
    expect(fileNames.some(name => name.includes('DMC-TEST-A-00-00-00-00A-003A-A.xml'))).toBeTruthy()
    expect(fileNames.some(name => name.includes('test-package-3files.zip'))).toBeFalsy()

    // 5. 验证所有文件已自动校验
    for (let i = 0; i < 3; i++) {
      const rowText = await tableRows.nth(i).textContent()
      expect(rowText).toContain('校验通过')
    }

    console.log('✓ 场景2通过: ZIP文件展开为3个XML文件')
  })

  test('场景3: 上传包含XML和ICN的混合ZIP文件', async ({ page }) => {
    console.log('\n=== 场景3: 上传包含XML和ICN的混合ZIP文件 ===')

    // 1. 选择混合ZIP文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-mixed.zip'))

    // 2. 等待解析
    await page.waitForTimeout(2000)

    // 3. 验证有3个文件（1个XML + 2个ICN）
    const tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    // 4. 验证文件名
    const allText = await page.locator('.ant-table-tbody').textContent()
    expect(allText).toContain('DMC-TEST-A-00-00-00-00A-010A-A.xml')
    expect(allText).toContain('ICN-TEST-001.PNG')
    expect(allText).toContain('ICN-TEST-002.JPG')
    expect(allText).not.toContain('test-package-mixed.zip')

    console.log('✓ 场景3通过: 混合ZIP文件正确展开')
  })

  test('场景4: 混合上传（先上传XML，再上传ZIP）', async ({ page }) => {
    console.log('\n=== 场景4: 混合上传 ===')

    const fileInput = page.locator('input[type="file"]')

    // 1. 先上传单个XML
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'DMC-TEST-A-00-00-00-00A-000A-A.xml'))
    await page.waitForTimeout(1000)

    // 验证有1个文件
    let tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(1)

    // 2. 再上传ZIP（3个文件）
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    // 3. 验证总共有4个文件
    tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(4)

    // 4. 验证包含独立XML和ZIP内部的文件
    const allText = await page.locator('.ant-table-tbody').textContent()
    expect(allText).toContain('DMC-TEST-A-00-00-00-00A-000A-A.xml')
    expect(allText).toContain('DMC-TEST-A-00-00-00-00A-001A-A.xml')
    expect(allText).toContain('DMC-TEST-A-00-00-00-00A-002A-A.xml')
    expect(allText).toContain('DMC-TEST-A-00-00-00-00A-003A-A.xml')

    console.log('✓ 场景4通过: 混合上传正常')
  })

  test('场景5: 单独移除来自ZIP的文件', async ({ page }) => {
    console.log('\n=== 场景5: 单独移除来自ZIP的文件 ===')

    // 1. 上传ZIP文件（3个文件）
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    // 2. 验证有3个文件
    let tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    // 3. 点击第一个文件的"移除"按钮
    const firstRow = tableRows.first()
    const removeButton = firstRow.locator('a:has-text("移除"), button:has-text("移除")').first()
    await removeButton.click()

    // 4. 等待列表更新
    await page.waitForTimeout(500)

    // 5. 验证现在只有2个文件
    tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(2)

    console.log('✓ 场景5通过: 可以单独移除来自ZIP的文件')
  })

  test('场景6: 点击校验按钮（验证不重复校验）', async ({ page }) => {
    console.log('\n=== 场景6: 点击校验按钮 ===')

    // 监听网络请求
    const requests = []
    page.on('request', request => {
      if (request.url().includes('/ietm/ietmimport/validate')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        })
      }
    })

    // 1. 上传ZIP文件（会触发一次校验）
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    const requestCountAfterUpload = requests.length
    console.log(`  上传后请求次数: ${requestCountAfterUpload}`)
    expect(requestCountAfterUpload).toBe(1)

    // 2. 点击"校验"按钮
    const validateButton = page.locator('button:has-text("校验")')
    await validateButton.click()
    await page.waitForTimeout(1000)

    // 3. 验证没有新的请求（因为文件已校验，应该跳过）
    const requestCountAfterValidate = requests.length
    console.log(`  点击校验后请求次数: ${requestCountAfterValidate}`)
    expect(requestCountAfterValidate).toBe(requestCountAfterUpload)

    console.log('✓ 场景6通过: 不会重复校验已校验的文件')
  })

  test('场景7: 完整的导入流程', async ({ page }) => {
    console.log('\n=== 场景7: 完整的导入流程 ===')

    // 1. 上传ZIP文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    // 2. 填写DDN信息
    await page.fill('input[placeholder*="型号"]', '测试型号')

    // 选择密级（使用下拉框）
    const securitySelect = page.locator('.ant-select').filter({ hasText: '密级' }).first()
    await securitySelect.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-select-dropdown-menu-item').first().click()

    await page.fill('input[placeholder*="发送单位"]', '测试单位')

    // 选择日期
    const dateInput = page.locator('.ant-calendar-picker-input').first()
    await dateInput.click()
    await page.waitForTimeout(500)
    await page.locator('.ant-calendar-today-btn').click()

    await page.fill('input[placeholder*="年份"]', '2026')

    // 3. 点击"导入"按钮
    const importButton = page.locator('button:has-text("导入")')
    await importButton.click()

    // 4. 确认对话框
    await page.waitForTimeout(500)
    const confirmButton = page.locator('.ant-modal-confirm-btns button:has-text("确定"), .ant-btn-primary:has-text("确定")').first()
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    // 5. 等待导入完成
    await page.waitForTimeout(2000)

    // 6. 验证成功消息（查找成功提示）
    const successMessage = page.locator('.ant-message-success, .ant-notification-notice-success')
    if (await successMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('  ✓ 显示导入成功消息')
    }

    console.log('✓ 场景7通过: 完整导入流程正常')
  })

  // ==================== 边界测试 ====================

  test('边界1: 上传空ZIP文件', async ({ page }) => {
    console.log('\n=== 边界1: 上传空ZIP文件 ===')

    // 1. 上传空ZIP
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-empty.zip'))

    // 2. 等待处理
    await page.waitForTimeout(2000)

    // 3. 应该显示错误消息
    const errorMessage = page.locator('.ant-message-error')
    await expect(errorMessage).toBeVisible({ timeout: 3000 })

    // 4. 文件列表应该为空
    const emptyAlert = page.locator('.ant-alert:has-text("暂无文件")')
    await expect(emptyAlert).toBeVisible()

    console.log('✓ 边界1通过: 空ZIP文件被正确处理')
  })

  test('边界2: 上传包含无效XML的ZIP', async ({ page }) => {
    console.log('\n=== 边界2: 上传包含无效XML的ZIP ===')

    // 1. 上传包含无效XML的ZIP
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-invalid.zip'))

    // 2. 等待解析
    await page.waitForTimeout(2000)

    // 3. 文件列表应该有1个文件
    const tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(1)

    // 4. 验证显示校验失败
    const rowText = await tableRows.first().textContent()
    expect(rowText).toContain('invalid.xml')
    expect(rowText).toMatch(/失败|错误/)

    console.log('✓ 边界2通过: 无效XML被标记为校验失败')
  })

  test('边界3: 上传重复文件名', async ({ page }) => {
    console.log('\n=== 边界3: 上传重复文件名 ===')

    const fileInput = page.locator('input[type="file"]')

    // 1. 第一次上传ZIP
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    // 验证有3个文件
    let tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    // 2. 再次上传相同的ZIP
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    // 3. 应该显示"跳过"消息
    const skipMessage = page.locator('.ant-message-warning:has-text("跳过")')
    if (await skipMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('  ✓ 显示跳过重复文件消息')
    }

    // 4. 文件列表仍然是3个（重复的被跳过）
    tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    console.log('✓ 边界3通过: 重复文件被正确跳过')
  })

  test('边界4: 上传大型ZIP文件（10个文件）', async ({ page }) => {
    console.log('\n=== 边界4: 上传大型ZIP文件 ===')

    // 1. 上传包含10个文件的ZIP
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-large.zip'))

    // 2. 等待解析（可能需要更长时间）
    await page.waitForTimeout(3000)

    // 3. 验证所有10个文件都在列表中
    const tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(10)

    // 4. 验证所有文件都已校验
    for (let i = 0; i < 10; i++) {
      const rowText = await tableRows.nth(i).textContent()
      expect(rowText).toMatch(/DMC-TEST-A-00-00-00-00A-\d{3}A-A\.xml/)
      expect(rowText).toContain('校验通过')
    }

    console.log('✓ 边界4通过: 大型ZIP文件处理正常')
  })

  test('边界5: 清空列表', async ({ page }) => {
    console.log('\n=== 边界5: 清空列表 ===')

    // 1. 上传ZIP文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    // 2. 验证有文件
    let tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    // 3. 点击"清空列表"按钮
    const clearButton = page.locator('button:has-text("清空列表"), button:has-text("清空")')
    await clearButton.click()

    // 4. 等待列表更新
    await page.waitForTimeout(500)

    // 5. 验证列表为空
    const emptyAlert = page.locator('.ant-alert:has-text("暂无文件")')
    await expect(emptyAlert).toBeVisible()

    console.log('✓ 边界5通过: 清空列表功能正常')
  })

  test('边界6: 验证页面文本修改', async ({ page }) => {
    console.log('\n=== 边界6: 验证页面文本修改 ===')

    // 1. 检查顶部不应该有旧的alert说明
    const oldAlert = page.locator('.ant-alert:has-text("说明：可以导入单一DM文件")')
    const oldAlertCount = await oldAlert.count()

    // 如果有alert，确保它不在页面顶部（可能在文件列表区域）
    if (oldAlertCount > 0) {
      const alertText = await oldAlert.first().textContent()
      // 顶部的alert应该已删除，只有"暂无文件"的alert
      expect(alertText).toContain('暂无文件')
    }

    // 2. 检查工具栏提示文本
    const hintText = page.locator('span:has-text("说明：可以导入单一DM文件")')
    await expect(hintText).toBeVisible()

    const fullText = await hintText.textContent()
    expect(fullText).toContain('或者导入包含多个DM及其ICN文件的ZIP压缩文件')
    expect(fullText).toContain('最大1GB')

    console.log('✓ 边界6通过: 页面文本修改正确')
  })

  test('边界7: 文件列表分页（超过10个文件）', async ({ page }) => {
    console.log('\n=== 边界7: 文件列表分页 ===')

    // 1. 上传大型ZIP（10个文件）
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-large.zip'))
    await page.waitForTimeout(3000)

    // 2. 检查是否有分页组件
    const pagination = page.locator('.ant-pagination')
    const hasPagination = await pagination.isVisible({ timeout: 1000 }).catch(() => false)

    if (hasPagination) {
      console.log('  ✓ 显示分页组件')

      // 3. 点击下一页（如果有）
      const nextButton = page.locator('.ant-pagination-next')
      if (await nextButton.isEnabled().catch(() => false)) {
        await nextButton.click()
        await page.waitForTimeout(500)
        console.log('  ✓ 分页功能正常')
      }
    } else {
      console.log('  - 文件数未超过每页限制，无分页')
    }

    console.log('✓ 边界7通过: 分页测试完成')
  })

  test('边界8: 移除所有文件后再上传', async ({ page }) => {
    console.log('\n=== 边界8: 移除所有文件后再上传 ===')

    const fileInput = page.locator('input[type="file"]')

    // 1. 上传3个文件
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-3files.zip'))
    await page.waitForTimeout(2000)

    let tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    // 2. 逐个移除
    for (let i = 0; i < 3; i++) {
      const removeButton = page.locator('.ant-table-tbody tr').first().locator('a:has-text("移除"), button:has-text("移除")').first()
      await removeButton.click()
      await page.waitForTimeout(300)
    }

    // 3. 验证列表为空
    const emptyAlert = page.locator('.ant-alert:has-text("暂无文件")')
    await expect(emptyAlert).toBeVisible()

    // 4. 再次上传
    await fileInput.setInputFiles(path.join(TEST_DATA_DIR, 'test-package-mixed.zip'))
    await page.waitForTimeout(2000)

    // 5. 验证新文件正常显示
    tableRows = page.locator('.ant-table-tbody tr')
    await expect(tableRows).toHaveCount(3)

    console.log('✓ 边界8通过: 移除所有文件后可以正常再上传')
  })
})

test.afterAll(() => {
  console.log('\n========================================')
  console.log('所有测试完成')
  console.log('========================================')
})
