/**
 * 数据包名列功能E2E测试
 *
 * 测试目标：
 * 1. "数据包名"列正确显示ZIP包名或"-"
 * 2. 相同数据包名的单元格自动合并
 * 3. 删除/分页/清空操作后合并逻辑保持正确
 *
 * @author Claude
 * @date 2026-09-06
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const JSZip = require('jszip')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const LOGIN_URL = `${BASE_URL}/#/user/login`
const IMPORT_URL = `${BASE_URL}/#/ietm/ietmimport/IetmDmImport`

// 测试用户凭据
const TEST_USER = {
  username: 'admin',
  password: 'admin'
}

/**
 * 创建测试用的ZIP文件
 */
async function createTestZip(fileName, fileCount, filePrefix = 'DMC') {
  const zip = new JSZip()

  for (let i = 0; i < fileCount; i++) {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A" learnCode=""
                learnEventCode=""/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>Test file ${i + 1} from ${fileName}</para>
    </description>
  </content>
</dmodule>`

    zip.file(`${filePrefix}-TEST-${i + 1}.xml`, xmlContent)
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' })
  const filePath = path.join(__dirname, fileName)
  fs.writeFileSync(filePath, content)
  return filePath
}

/**
 * 创建单独的XML测试文件
 */
function createStandaloneXml(fileName) {
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="STANDALONE" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A" learnCode=""
                learnEventCode=""/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <para>Standalone test file</para>
    </description>
  </content>
</dmodule>`

  const filePath = path.join(__dirname, fileName)
  fs.writeFileSync(filePath, xmlContent)
  return filePath
}

/**
 * 清理测试文件
 */
function cleanupTestFiles(files) {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  })
}

/**
 * 登录并打开项目
 */
async function loginAndOpenProject(page) {
  // 登录
  await page.goto(LOGIN_URL)
  await page.fill('input[placeholder="账号"]', TEST_USER.username)
  await page.fill('input[placeholder="密码"]', TEST_USER.password)
  await page.click('button:has-text("登录")')
  await page.waitForURL(/.*\/dashboard/)

  // 导航到导入页面
  await page.goto(IMPORT_URL)
  await page.waitForLoadState('networkidle')

  // 打开项目（假设已有测试项目）
  // 这里可能需要根据实际情况调整
  await page.waitForTimeout(1000)
}

/**
 * 获取表格中指定行的数据包名单元格信息
 */
async function getPackageNameCellInfo(page, rowIndex) {
  const row = page.locator('.ant-table-tbody tr').nth(rowIndex)
  const packageNameCell = row.locator('td').nth(1) // 第2列是数据包名

  const text = await packageNameCell.textContent()
  const rowSpan = await packageNameCell.getAttribute('rowspan')

  return {
    text: text.trim(),
    rowSpan: rowSpan ? parseInt(rowSpan) : 1,
    isVisible: await packageNameCell.isVisible()
  }
}

test.describe('数据包名列功能测试', () => {
  let testFiles = []

  test.beforeEach(async ({ page }) => {
    await loginAndOpenProject(page)
  })

  test.afterEach(() => {
    cleanupTestFiles(testFiles)
    testFiles = []
  })

  test('TC-01: 单个ZIP包（3个文件）- 数据包名列合并显示', async ({ page }) => {
    // 创建包含3个文件的ZIP包
    const zipPath = await createTestZip('test-package-A.zip', 3, 'DMC-A')
    testFiles.push(zipPath)

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)

    // 等待文件解析完成
    await page.waitForTimeout(2000)

    // 验证表格有3行
    const rows = page.locator('.ant-table-tbody tr')
    await expect(rows).toHaveCount(3)

    // 验证第1行：数据包名显示且rowSpan=3
    const cell1 = await getPackageNameCellInfo(page, 0)
    expect(cell1.text).toBe('test-package-A.zip')
    expect(cell1.rowSpan).toBe(3)

    // 验证第2行：数据包名单元格不可见（被合并）
    const cell2 = await getPackageNameCellInfo(page, 1)
    expect(cell2.rowSpan).toBe(0)

    // 验证第3行：数据包名单元格不可见（被合并）
    const cell3 = await getPackageNameCellInfo(page, 2)
    expect(cell3.rowSpan).toBe(0)

    console.log('✓ TC-01 通过：单个ZIP包的数据包名正确合并显示')
  })

  test('TC-02: 多个ZIP包 - 分别合并显示', async ({ page }) => {
    // 创建2个ZIP包
    const zipPath1 = await createTestZip('test-package-A.zip', 2, 'DMC-A')
    const zipPath2 = await createTestZip('test-package-B.zip', 2, 'DMC-B')
    testFiles.push(zipPath1, zipPath2)

    // 依次上传
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath1)
    await page.waitForTimeout(1500)
    await fileInput.setInputFiles(zipPath2)
    await page.waitForTimeout(1500)

    // 验证表格有4行
    const rows = page.locator('.ant-table-tbody tr')
    await expect(rows).toHaveCount(4)

    // 验证第1个包：前2行
    const cellA1 = await getPackageNameCellInfo(page, 0)
    expect(cellA1.text).toBe('test-package-A.zip')
    expect(cellA1.rowSpan).toBe(2)

    const cellA2 = await getPackageNameCellInfo(page, 1)
    expect(cellA2.rowSpan).toBe(0)

    // 验证第2个包：后2行
    const cellB1 = await getPackageNameCellInfo(page, 2)
    expect(cellB1.text).toBe('test-package-B.zip')
    expect(cellB1.rowSpan).toBe(2)

    const cellB2 = await getPackageNameCellInfo(page, 3)
    expect(cellB2.rowSpan).toBe(0)

    console.log('✓ TC-02 通过：多个ZIP包分别合并显示')
  })

  test('TC-03: 单独上传XML文件 - 显示"-"且不合并', async ({ page }) => {
    // 创建单独的XML文件
    const xmlPath = createStandaloneXml('standalone.xml')
    testFiles.push(xmlPath)

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(xmlPath)
    await page.waitForTimeout(1000)

    // 验证表格有1行
    const rows = page.locator('.ant-table-tbody tr')
    await expect(rows).toHaveCount(1)

    // 验证数据包名显示"-"且rowSpan=1
    const cell = await getPackageNameCellInfo(page, 0)
    expect(cell.text).toBe('-')
    expect(cell.rowSpan).toBe(1)

    console.log('✓ TC-03 通过：单独XML文件显示"-"')
  })

  test('TC-04: 混合上传（ZIP + 单独文件）', async ({ page }) => {
    // 创建测试文件
    const zipPath = await createTestZip('test-package.zip', 2, 'DMC-ZIP')
    const xmlPath = createStandaloneXml('standalone.xml')
    testFiles.push(zipPath, xmlPath)

    // 先上传ZIP
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(1500)

    // 再上传单独XML
    await fileInput.setInputFiles(xmlPath)
    await page.waitForTimeout(1000)

    // 验证表格有3行
    const rows = page.locator('.ant-table-tbody tr')
    await expect(rows).toHaveCount(3)

    // 验证前2行：ZIP包名合并
    const cellZip1 = await getPackageNameCellInfo(page, 0)
    expect(cellZip1.text).toBe('test-package.zip')
    expect(cellZip1.rowSpan).toBe(2)

    const cellZip2 = await getPackageNameCellInfo(page, 1)
    expect(cellZip2.rowSpan).toBe(0)

    // 验证第3行：单独文件显示"-"
    const cellXml = await getPackageNameCellInfo(page, 2)
    expect(cellXml.text).toBe('-')
    expect(cellXml.rowSpan).toBe(1)

    console.log('✓ TC-04 通过：混合上传正确显示')
  })

  test('TC-05: 删除文件后重新计算合并', async ({ page }) => {
    // 创建包含3个文件的ZIP包
    const zipPath = await createTestZip('test-package.zip', 3, 'DMC-DEL')
    testFiles.push(zipPath)

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(2000)

    // 验证初始状态：3行，rowSpan=3
    let cell1 = await getPackageNameCellInfo(page, 0)
    expect(cell1.rowSpan).toBe(3)

    // 选中第2行并删除
    await page.locator('.ant-table-tbody tr').nth(1).locator('.ant-checkbox-input').check()
    await page.click('button:has-text("删除")')
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证删除后：2行，rowSpan=2
    const rows = page.locator('.ant-table-tbody tr')
    await expect(rows).toHaveCount(2)

    cell1 = await getPackageNameCellInfo(page, 0)
    expect(cell1.text).toBe('test-package.zip')
    expect(cell1.rowSpan).toBe(2)

    const cell2 = await getPackageNameCellInfo(page, 1)
    expect(cell2.rowSpan).toBe(0)

    console.log('✓ TC-05 通过：删除后重新计算合并')
  })

  test('TC-06: 清空列表后重新上传', async ({ page }) => {
    // 创建ZIP包
    const zipPath = await createTestZip('test-package.zip', 2, 'DMC-CLEAR')
    testFiles.push(zipPath)

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(1500)

    // 清空列表
    await page.click('button:has-text("清空列表")')
    await page.click('.ant-modal button:has-text("确定")')
    await page.waitForTimeout(500)

    // 验证列表为空
    const emptyText = page.locator('.ant-empty-description')
    await expect(emptyText).toBeVisible()

    // 重新上传
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(1500)

    // 验证重新上传后合并正常
    const rows = page.locator('.ant-table-tbody tr')
    await expect(rows).toHaveCount(2)

    const cell1 = await getPackageNameCellInfo(page, 0)
    expect(cell1.text).toBe('test-package.zip')
    expect(cell1.rowSpan).toBe(2)

    console.log('✓ TC-06 通过：清空后重新上传正常')
  })

  test('TC-07: 列显示顺序验证', async ({ page }) => {
    // 创建测试文件
    const zipPath = await createTestZip('test-order.zip', 1, 'DMC-ORDER')
    testFiles.push(zipPath)

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(1500)

    // 验证表头顺序
    const headers = page.locator('.ant-table-thead th')

    // 第1列：复选框（无文字）
    // 第2列：序号
    const col2Text = await headers.nth(1).textContent()
    expect(col2Text.trim()).toBe('序号')

    // 第3列：数据包名
    const col3Text = await headers.nth(2).textContent()
    expect(col3Text.trim()).toBe('数据包名')

    // 第4列：文件名
    const col4Text = await headers.nth(3).textContent()
    expect(col4Text.trim()).toBe('文件名')

    // 第5列：校验情况
    const col5Text = await headers.nth(4).textContent()
    expect(col5Text.trim()).toBe('校验情况')

    // 第6列：导入结果
    const col6Text = await headers.nth(5).textContent()
    expect(col6Text.trim()).toBe('导入结果')

    console.log('✓ TC-07 通过：列显示顺序正确')
  })
})

test.describe('数据包名列边界测试', () => {
  let testFiles = []

  test.beforeEach(async ({ page }) => {
    await loginAndOpenProject(page)
  })

  test.afterEach(() => {
    cleanupTestFiles(testFiles)
    testFiles = []
  })

  test('边界-01: 空ZIP包处理', async ({ page }) => {
    // 创建空ZIP包
    const zip = new JSZip()
    const content = await zip.generateAsync({ type: 'nodebuffer' })
    const zipPath = path.join(__dirname, 'empty.zip')
    fs.writeFileSync(zipPath, content)
    testFiles.push(zipPath)

    // 上传空ZIP
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(1000)

    // 应该显示错误提示
    const errorMessage = page.locator('.ant-message-error')
    await expect(errorMessage).toBeVisible()

    console.log('✓ 边界-01 通过：空ZIP包正确提示错误')
  })

  test('边界-02: 超长ZIP包名显示', async ({ page }) => {
    // 创建超长文件名的ZIP包
    const longName = 'test-very-long-package-name-that-exceeds-normal-display-width-' + 'x'.repeat(100) + '.zip'
    const zipPath = await createTestZip(longName, 1, 'DMC-LONG')
    testFiles.push(zipPath)

    // 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zipPath)
    await page.waitForTimeout(1500)

    // 验证单元格有ellipsis效果
    const cell = page.locator('.ant-table-tbody tr').first().locator('td').nth(1)
    const cellText = await cell.textContent()
    expect(cellText.trim()).toBe(longName)

    console.log('✓ 边界-02 通过：超长包名正常显示')
  })

  test('边界-03: 同时上传多个不同ZIP包', async ({ page }) => {
    // 创建3个不同的ZIP包
    const zip1 = await createTestZip('package-1.zip', 1, 'DMC-1')
    const zip2 = await createTestZip('package-2.zip', 1, 'DMC-2')
    const zip3 = await createTestZip('package-3.zip', 1, 'DMC-3')
    testFiles.push(zip1, zip2, zip3)

    // 依次上传
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(zip1)
    await page.waitForTimeout(1000)
    await fileInput.setInputFiles(zip2)
    await page.waitForTimeout(1000)
    await fileInput.setInputFiles(zip3)
    await page.waitForTimeout(1000)

    // 验证3个包分别显示
    const cell1 = await getPackageNameCellInfo(page, 0)
    expect(cell1.text).toBe('package-1.zip')
    expect(cell1.rowSpan).toBe(1)

    const cell2 = await getPackageNameCellInfo(page, 1)
    expect(cell2.text).toBe('package-2.zip')
    expect(cell2.rowSpan).toBe(1)

    const cell3 = await getPackageNameCellInfo(page, 2)
    expect(cell3.text).toBe('package-3.zip')
    expect(cell3.rowSpan).toBe(1)

    console.log('✓ 边界-03 通过：多个不同ZIP包正确显示')
  })
})

/**
 * 辅助函数：获取数据包名单元格信息
 */
async function getPackageNameCellInfo(page, rowIndex) {
  const row = page.locator('.ant-table-tbody tr').nth(rowIndex)
  const packageNameCell = row.locator('td').nth(1) // 第2列（第1列是复选框）

  const text = await packageNameCell.textContent()
  const rowSpan = await packageNameCell.getAttribute('rowspan')

  return {
    text: text.trim(),
    rowSpan: rowSpan ? parseInt(rowSpan) : 1,
    isVisible: await packageNameCell.isVisible()
  }
}
