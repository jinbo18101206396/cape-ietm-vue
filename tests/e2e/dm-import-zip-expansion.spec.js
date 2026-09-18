/**
 * E2E测试：数据模块导入 - ZIP文件展开显示
 * 测试目标：验证上传ZIP文件后，列表显示内部文件名而不是ZIP文件名
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const AdmZip = require('adm-zip')
const fs = require('fs')

// 测试前准备：创建测试用的ZIP文件
test.beforeAll(() => {
  const testDataDir = path.join(__dirname, '../test-data')
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true })
  }

  // 创建测试用的XML文件内容
  const createDMContent = (dmCode) => `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="001" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A" learnCode="00"
                learnEventCode="00"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>Test DM Content - ${dmCode}</para>
    </description>
  </content>
</dmodule>`

  // 创建包含3个XML文件的ZIP
  const zip1 = new AdmZip()
  zip1.addFile('DMC-TEST-001.xml', Buffer.from(createDMContent('DMC-TEST-001'), 'utf-8'))
  zip1.addFile('DMC-TEST-002.xml', Buffer.from(createDMContent('DMC-TEST-002'), 'utf-8'))
  zip1.addFile('DMC-TEST-003.xml', Buffer.from(createDMContent('DMC-TEST-003'), 'utf-8'))
  zip1.writeZip(path.join(testDataDir, 'test-package-3files.zip'))

  // 创建包含XML和ICN的ZIP
  const zip2 = new AdmZip()
  zip2.addFile('DMC-MIXED-001.xml', Buffer.from(createDMContent('DMC-MIXED-001'), 'utf-8'))
  // 创建假的PNG文件（1x1像素透明PNG）
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  zip2.addFile('ICN-TEST-001.png', pngBuffer)
  zip2.addFile('ICN-TEST-002.jpg', pngBuffer)
  zip2.writeZip(path.join(testDataDir, 'test-package-mixed.zip'))

  console.log('测试数据准备完成')
})

test.describe('数据模块导入 - ZIP展开功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并打开数据模块导入页面
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin')
    await page.click('button[type="submit"]')

    // 等待登录成功
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // 导航到数据模块导入页面
    await page.goto('http://localhost:3000/ietm/import')
    await page.waitForLoadState('networkidle')

    // 等待页面完全加载
    await page.waitForSelector('text=数据模块导入', { timeout: 10000 })
  })

  test('TC-01: 验证页面顶部说明文本已移除', async ({ page }) => {
    // 检查页面顶部不应该有蓝色的a-alert组件
    const alert = await page.locator('.ant-alert').first()
    const alertVisible = await alert.isVisible().catch(() => false)

    if (alertVisible) {
      const alertText = await alert.textContent()
      // 如果有alert，确保不是包含"说明：可以导入单一DM文件"的那个
      expect(alertText).not.toContain('说明：可以导入单一DM文件')
    }

    console.log('✓ 页面顶部说明文本已移除')
  })

  test('TC-02: 验证工具栏提示文本已修改', async ({ page }) => {
    // 查找新的提示文本
    const hintText = await page.locator('text=/.*说明：可以导入单一DM文件.*最大1GB.*/')
    await expect(hintText).toBeVisible()

    const fullText = await hintText.textContent()
    expect(fullText).toContain('说明：可以导入单一DM文件')
    expect(fullText).toContain('或者导入包含多个DM及其ICN文件的ZIP压缩文件')
    expect(fullText).toContain('最大1GB')

    console.log('✓ 工具栏提示文本正确')
  })

  test('TC-03: 上传包含3个XML的ZIP文件', async ({ page }) => {
    const testDataDir = path.join(__dirname, '../test-data')
    const zipFilePath = path.join(testDataDir, 'test-package-3files.zip')

    // 上传文件
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipFilePath)

    // 等待解析完成（显示"正在解析文件"的loading）
    await page.waitForTimeout(2000)

    // 检查文件列表
    const tableRows = await page.locator('.ant-table-tbody tr').all()
    expect(tableRows.length).toBe(3) // 应该有3个文件

    // 验证显示的是XML文件名，而不是ZIP文件名
    const fileNames = []
    for (const row of tableRows) {
      const nameCell = await row.locator('td').nth(1).textContent()
      fileNames.push(nameCell.trim())
    }

    expect(fileNames).toContain('DMC-TEST-001.xml')
    expect(fileNames).toContain('DMC-TEST-002.xml')
    expect(fileNames).toContain('DMC-TEST-003.xml')
    expect(fileNames).not.toContain('test-package-3files.zip')

    console.log('✓ ZIP文件已展开，显示内部3个XML文件名')
    console.log('  文件列表:', fileNames)
  })

  test('TC-04: 上传包含XML和ICN的混合ZIP文件', async ({ page }) => {
    const testDataDir = path.join(__dirname, '../test-data')
    const zipFilePath = path.join(testDataDir, 'test-package-mixed.zip')

    // 上传文件
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipFilePath)

    // 等待解析完成
    await page.waitForTimeout(2000)

    // 检查文件列表
    const tableRows = await page.locator('.ant-table-tbody tr').all()
    expect(tableRows.length).toBe(3) // 1个XML + 2个ICN

    // 验证显示的文件名
    const fileNames = []
    for (const row of tableRows) {
      const nameCell = await row.locator('td').nth(1).textContent()
      fileNames.push(nameCell.trim())
    }

    expect(fileNames).toContain('DMC-MIXED-001.xml')
    expect(fileNames).toContain('ICN-TEST-001.png')
    expect(fileNames).toContain('ICN-TEST-002.jpg')
    expect(fileNames).not.toContain('test-package-mixed.zip')

    console.log('✓ 混合ZIP文件已展开，显示XML和ICN文件名')
    console.log('  文件列表:', fileNames)
  })

  test('TC-05: 验证文件已自动校验', async ({ page }) => {
    const testDataDir = path.join(__dirname, '../test-data')
    const zipFilePath = path.join(testDataDir, 'test-package-3files.zip')

    // 上传文件
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipFilePath)

    // 等待解析和校验完成
    await page.waitForTimeout(3000)

    // 检查每个文件的校验状态
    const tableRows = await page.locator('.ant-table-tbody tr').all()

    for (let i = 0; i < tableRows.length; i++) {
      const row = tableRows[i]
      // 查找"已校验"或校验结果相关的文本
      const rowText = await row.textContent()

      // 应该有校验状态（已校验、通过、失败等）
      const hasValidationStatus =
        rowText.includes('已校验') ||
        rowText.includes('通过') ||
        rowText.includes('校验')

      expect(hasValidationStatus).toBeTruthy()
      console.log(`  文件 ${i + 1} 校验状态: ${rowText.substring(0, 100)}...`)
    }

    console.log('✓ 所有文件已自动校验')
  })

  test('TC-06: 验证可以单独移除来自ZIP的文件', async ({ page }) => {
    const testDataDir = path.join(__dirname, '../test-data')
    const zipFilePath = path.join(testDataDir, 'test-package-3files.zip')

    // 上传文件
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipFilePath)

    // 等待解析完成
    await page.waitForTimeout(2000)

    // 初始应该有3个文件
    let tableRows = await page.locator('.ant-table-tbody tr').all()
    expect(tableRows.length).toBe(3)

    // 点击第一个文件的"移除"按钮
    const firstRow = tableRows[0]
    const removeButton = firstRow.locator('button:has-text("移除"), a:has-text("移除")')
    await removeButton.click()

    // 等待列表更新
    await page.waitForTimeout(500)

    // 现在应该只有2个文件
    tableRows = await page.locator('.ant-table-tbody tr').all()
    expect(tableRows.length).toBe(2)

    console.log('✓ 可以单独移除来自ZIP的文件')
  })

  test('TC-07: 混合上传XML和ZIP', async ({ page }) => {
    const testDataDir = path.join(__dirname, '../test-data')

    // 先创建一个单独的XML文件
    const singleXmlPath = path.join(testDataDir, 'DMC-SINGLE.xml')
    const singleXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="SINGLE" systemDiffCode="001" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
</dmodule>`
    fs.writeFileSync(singleXmlPath, singleXmlContent, 'utf-8')

    // 上传单个XML
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(singleXmlPath)
    await page.waitForTimeout(1000)

    // 再上传ZIP
    const zipFilePath = path.join(testDataDir, 'test-package-3files.zip')
    await fileInput.setInputFiles(zipFilePath)
    await page.waitForTimeout(2000)

    // 检查文件列表：应该有4个文件（1个独立XML + 3个来自ZIP的XML）
    const tableRows = await page.locator('.ant-table-tbody tr').all()
    expect(tableRows.length).toBe(4)

    // 验证文件名
    const fileNames = []
    for (const row of tableRows) {
      const nameCell = await row.locator('td').nth(1).textContent()
      fileNames.push(nameCell.trim())
    }

    expect(fileNames).toContain('DMC-SINGLE.xml')
    expect(fileNames).toContain('DMC-TEST-001.xml')
    expect(fileNames).toContain('DMC-TEST-002.xml')
    expect(fileNames).toContain('DMC-TEST-003.xml')

    console.log('✓ 混合上传功能正常')
    console.log('  文件列表:', fileNames)
  })

  test('TC-08: 验证点击校验按钮不会重复校验', async ({ page }) => {
    const testDataDir = path.join(__dirname, '../test-data')
    const zipFilePath = path.join(testDataDir, 'test-package-3files.zip')

    // 监听网络请求
    const requests = []
    page.on('request', request => {
      if (request.url().includes('/beforeimport')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        })
      }
    })

    // 上传文件（会触发一次beforeimport）
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipFilePath)
    await page.waitForTimeout(2000)

    const requestCountAfterUpload = requests.length
    expect(requestCountAfterUpload).toBe(1) // 上传时调用一次

    // 点击"校验"按钮
    const validateButton = await page.locator('button:has-text("校验")')
    if (await validateButton.isVisible()) {
      await validateButton.click()
      await page.waitForTimeout(1000)

      // 检查是否有新的请求
      const requestCountAfterValidate = requests.length

      // 来自ZIP的虚拟文件不应该触发新的校验请求
      expect(requestCountAfterValidate).toBe(requestCountAfterUpload)

      console.log('✓ 校验按钮不会重复校验已校验的文件')
    } else {
      console.log('⚠ 未找到校验按钮，跳过此测试')
    }
  })
})

test.afterAll(() => {
  console.log('\n所有测试完成')
})
