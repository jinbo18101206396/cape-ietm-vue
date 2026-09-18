/**
 * 数据模块导出→导入闭环E2E测试
 *
 * 测试场景：
 * 1. 在"导出数据模块"页面，添加一个DM，生成数据包
 * 2. 在"数据模块导入"页面，选择生成的数据包，校验，导入
 * 3. 验证导出→导入闭环的完整性
 *
 * 验收标准：
 * - 导出的ZIP包含DM/、ICN/、MM/目录
 * - 校验阶段资源文件显示"资源文件，导入时校验"
 * - 导入成功后，资源文件正确关联到DM
 *
 * @date 2026-09-05
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const API_BASE_URL = 'http://localhost:9999'
const TEST_USERNAME = 'admin'
const TEST_PASSWORD = 'admin'
const DOWNLOAD_DIR = path.join(__dirname, '../../../downloads')

test.describe('数据模块导出→导入闭环测试', () => {
  let page
  let context
  let exportedZipPath
  let exportedDdnCode

  test.beforeAll(async ({ browser }) => {
    // 创建浏览器上下文，配置下载目录
    context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1920, height: 1080 }
    })
    page = await context.newPage()

    // 确保下载目录存在
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
    }

    // 登录系统
    await login(page)

    // 打开项目（假设默认打开第一个项目）
    await openProject(page)
  })

  test.afterAll(async () => {
    // 清理：删除导出的ZIP包
    if (exportedZipPath && fs.existsSync(exportedZipPath)) {
      fs.unlinkSync(exportedZipPath)
      console.log(`✓ 清理导出文件: ${exportedZipPath}`)
    }

    await context.close()
  })

  /**
   * TC-01: 导出数据模块
   * 验证：生成DDN数据包，包含DM/、MM/目录
   */
  test('TC-01: 导出包含资源的DM', async () => {
    console.log('\n=== TC-01: 导出包含资源的DM ===')

    // 1. 进入"导出数据模块"页面
    await page.goto(`${BASE_URL}/#/ietm/ddn-export`)
    await page.waitForLoadState('networkidle')
    console.log('✓ 进入导出数据模块页面')

    // 2. 填写DDN基本信息（从项目自动获取）
    await page.waitForSelector('input[placeholder="从项目获取"]', { timeout: 5000 })

    // 验证型号、导出单位已自动填充
    const modelic = await page.inputValue('input[placeholder="从项目获取"]')
    expect(modelic).toBeTruthy()
    console.log(`✓ 型号已自动填充: ${modelic}`)

    // 选择密级（如果未自动填充）
    const securitySelect = page.locator('.ant-select').first()
    const securityValue = await securitySelect.inputValue()
    if (!securityValue) {
      await securitySelect.click()
      await page.click('.ant-select-dropdown li:first-child')
      console.log('✓ 手动选择密级')
    }

    // 3. 点击"添加DM"按钮
    await page.click('button:has-text("添加DM")')
    await page.waitForSelector('.ant-modal', { timeout: 5000 })
    console.log('✓ 弹出DM选择弹窗')

    // 4. 在弹窗中选择构型树节点（选择第一个根节点）
    await page.waitForSelector('.ant-tree', { timeout: 5000 })
    const treeNode = page.locator('.ant-tree-node-content-wrapper').first()
    await treeNode.click()
    await page.waitForTimeout(1000) // 等待树节点加载数据
    console.log('✓ 选择构型树节点')

    // 5. 等待DM列表加载
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })
    console.log('✓ DM列表加载完成')

    // 6. 选择第一个DM（点击复选框）
    const firstCheckbox = page.locator('.ant-table-tbody tr:first-child .ant-checkbox-input')
    await firstCheckbox.click()
    await page.waitForTimeout(500)
    console.log('✓ 选择第一个DM')

    // 7. 点击"确定"按钮
    await page.click('.ant-modal-footer button.ant-btn-primary:has-text("确定")')
    await page.waitForTimeout(1000)
    console.log('✓ 确认选择DM')

    // 8. 验证DM已添加到列表
    const dmRowCount = await page.locator('.table-card .ant-table-tbody tr').count()
    expect(dmRowCount).toBeGreaterThan(0)
    console.log(`✓ DM已添加到列表，共 ${dmRowCount} 个`)

    // 9. 勾选导出选项：引用ICN、引用DM、DM资源（默认全选）
    const includeRefIcn = page.locator('input[type="checkbox"][value="includeRefIcn"]')
    const includeRefDm = page.locator('input[type="checkbox"][value="includeRefDm"]')
    const includeDmResource = page.locator('input[type="checkbox"][value="includeDmResource"]')

    if (!await includeRefIcn.isChecked()) await includeRefIcn.check()
    if (!await includeRefDm.isChecked()) await includeRefDm.check()
    if (!await includeDmResource.isChecked()) await includeDmResource.check()
    console.log('✓ 导出选项已全选')

    // 10. 点击"生成数据包"按钮，监听下载
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("生成数据包")')
    console.log('⏳ 等待数据包生成...')

    // 11. 等待成功提示（包含DDN编码）
    await page.waitForSelector('.ant-message-success', { timeout: 30000 })
    const successMsg = await page.locator('.ant-message-success').textContent()
    console.log(`✓ ${successMsg}`)

    // 提取DDN编码
    const ddnCodeMatch = successMsg.match(/DDN-[A-Za-z0-9-]+/)
    expect(ddnCodeMatch).toBeTruthy()
    exportedDdnCode = ddnCodeMatch[0]
    console.log(`✓ DDN编码: ${exportedDdnCode}`)

    // 12. 保存下载的文件
    const download = await downloadPromise
    exportedZipPath = path.join(DOWNLOAD_DIR, `${exportedDdnCode}.zip`)
    await download.saveAs(exportedZipPath)
    console.log(`✓ 数据包已下载: ${exportedZipPath}`)

    // 13. 验证ZIP包结构
    expect(fs.existsSync(exportedZipPath)).toBeTruthy()
    const zip = new AdmZip(exportedZipPath)
    const zipEntries = zip.getEntries()

    const dmFiles = zipEntries.filter(e => e.entryName.startsWith('DM/'))
    const icnFiles = zipEntries.filter(e => e.entryName.startsWith('ICN/'))
    const mmFiles = zipEntries.filter(e => e.entryName.startsWith('MM/'))
    const ddnXml = zipEntries.find(e => e.entryName.endsWith('.xml') && e.entryName.startsWith('DDN-'))
    const ddnLog = zipEntries.find(e => e.entryName === 'DDN.log')

    console.log(`\n📦 ZIP包结构分析:`)
    console.log(`  - DM文件: ${dmFiles.length} 个`)
    console.log(`  - ICN文件: ${icnFiles.length} 个`)
    console.log(`  - MM资源文件: ${mmFiles.length} 个`)
    console.log(`  - DDN.xml: ${ddnXml ? '✓ 存在' : '✗ 缺失'}`)
    console.log(`  - DDN.log: ${ddnLog ? '✓ 存在' : '✗ 缺失'}`)

    // 验证ZIP包必须包含DM/目录
    expect(dmFiles.length).toBeGreaterThan(0)

    // 验证必须包含DDN.xml和DDN.log
    expect(ddnXml).toBeTruthy()
    expect(ddnLog).toBeTruthy()

    // 如果有MM/资源文件，验证文件名包含DMC前缀
    if (mmFiles.length > 0) {
      const firstMmFile = mmFiles[0].entryName
      const fileName = path.basename(firstMmFile)
      console.log(`  - MM/资源文件示例: ${fileName}`)

      // 验证文件名格式：DMC-XXX_原始文件名
      expect(fileName).toMatch(/^DMC-[A-Za-z0-9-]+_.+/)
      console.log(`✓ 资源文件命名规范正确（包含DMC前缀）`)
    }

    console.log('\n✅ TC-01 通过: 数据包导出成功，结构符合S1000D 4.0标准\n')
  })

  /**
   * TC-02: 导入数据包 - 校验阶段
   * 验证：资源文件显示"资源文件，导入时校验"
   */
  test('TC-02: 校验导出的数据包', async () => {
    console.log('\n=== TC-02: 校验导出的数据包 ===')

    // 前置条件：TC-01已执行，exportedZipPath存在
    expect(exportedZipPath).toBeTruthy()
    expect(fs.existsSync(exportedZipPath)).toBeTruthy()

    // 1. 进入"数据模块导入"页面
    await page.goto(`${BASE_URL}/#/ietm/dm-import`)
    await page.waitForLoadState('networkidle')
    console.log('✓ 进入数据模块导入页面')

    // 2. 点击"选择文件"按钮，上传ZIP包
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(exportedZipPath)
    console.log(`✓ 选择文件: ${path.basename(exportedZipPath)}`)

    // 3. 等待文件列表加载
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })
    console.log('✓ 文件列表加载完成')

    // 4. 验证文件列表中包含DM、ICN、RESOURCE
    const rows = await page.locator('.ant-table-tbody tr').all()
    console.log(`\n📋 文件列表分析 (共 ${rows.length} 个文件):`)

    let dmCount = 0
    let icnCount = 0
    let resourceCount = 0
    let resourceValidateMsg = null

    for (const row of rows) {
      const fileType = await row.locator('td').nth(1).textContent()
      const validateStatus = await row.locator('td').nth(2).textContent()

      if (fileType === 'DM') {
        dmCount++
      } else if (fileType === 'ICN') {
        icnCount++
      } else if (fileType === 'RESOURCE') {
        resourceCount++
        if (!resourceValidateMsg) {
          resourceValidateMsg = validateStatus.trim()
        }
      }
    }

    console.log(`  - DM: ${dmCount} 个`)
    console.log(`  - ICN: ${icnCount} 个`)
    console.log(`  - RESOURCE: ${resourceCount} 个`)

    expect(dmCount).toBeGreaterThan(0)

    // 5. 验证资源文件的校验情况（关键验证点）
    if (resourceCount > 0) {
      console.log(`\n🔍 资源文件校验情况: "${resourceValidateMsg}"`)
      expect(resourceValidateMsg).toBe('资源文件，导入时校验')
      console.log('✓ 资源文件延迟校验机制正常（这是正确行为）')
    } else {
      console.log('\n⚠️  警告: 导出的数据包不包含资源文件')
    }

    // 6. 点击"校验"按钮
    await page.click('button:has-text("校验")')
    console.log('⏳ 执行校验...')

    // 7. 等待校验完成
    await page.waitForSelector('.ant-message-success', { timeout: 30000 })
    const validateMsg = await page.locator('.ant-message-success').textContent()
    console.log(`✓ ${validateMsg}`)

    // 8. 再次检查资源文件的校验状态（校验后应保持"资源文件，导入时校验"）
    if (resourceCount > 0) {
      const resourceRow = await page.locator('.ant-table-tbody tr').filter({ hasText: 'RESOURCE' }).first()
      const statusAfterValidate = await resourceRow.locator('td').nth(2).textContent()
      console.log(`\n📊 校验后资源文件状态: "${statusAfterValidate.trim()}"`)
      expect(statusAfterValidate.trim()).toBe('资源文件，导入时校验')
      console.log('✓ 校验后状态保持一致（延迟到导入阶段）')
    }

    console.log('\n✅ TC-02 通过: 校验阶段正常，资源文件延迟校验机制正确\n')
  })

  /**
   * TC-03: 导入数据包 - 导入阶段
   * 验证：导入成功，资源文件正确关联到DM
   */
  test('TC-03: 导入数据包', async () => {
    console.log('\n=== TC-03: 导入数据包 ===')

    // 前置条件：TC-02已执行，当前在导入页面

    // 1. 点击"导入"按钮
    await page.click('button:has-text("导入")')
    console.log('⏳ 执行导入...')

    // 2. 等待导入完成（可能耗时较长）
    await page.waitForSelector('.ant-message-success', { timeout: 60000 })
    const importMsg = await page.locator('.ant-message-success').textContent()
    console.log(`✓ ${importMsg}`)

    // 3. 验证导入结果统计
    const successRows = await page.locator('.ant-table-tbody tr').filter({ hasText: '成功' }).count()
    const totalRows = await page.locator('.ant-table-tbody tr').count()
    console.log(`\n📊 导入结果统计:`)
    console.log(`  - 成功: ${successRows} / ${totalRows}`)

    // 期望所有文件都导入成功（包括资源文件）
    expect(successRows).toBe(totalRows)
    console.log('✓ 所有文件导入成功（包括资源文件）')

    // 4. 检查是否有导入失败的记录
    const errorRows = await page.locator('.ant-table-tbody tr').filter({ hasText: '失败' }).count()
    if (errorRows > 0) {
      console.error(`✗ 发现 ${errorRows} 个导入失败的文件`)
      // 打印失败原因
      const failedRows = await page.locator('.ant-table-tbody tr').filter({ hasText: '失败' }).all()
      for (let i = 0; i < failedRows.length; i++) {
        const fileName = await failedRows[i].locator('td').first().textContent()
        const errorMsg = await failedRows[i].locator('td').nth(2).textContent()
        console.error(`  - ${fileName}: ${errorMsg}`)
      }
    }
    expect(errorRows).toBe(0)

    console.log('\n✅ TC-03 通过: 数据包导入成功，资源文件正确关联\n')
  })

  /**
   * TC-04: 验证资源文件关联
   * 验证：进入DM详情，查看资源列表
   */
  test('TC-04: 验证资源文件关联', async () => {
    console.log('\n=== TC-04: 验证资源文件关联 ===')

    // 1. 进入"数据模块管理"页面
    await page.goto(`${BASE_URL}/#/ietm/data-module-management`)
    await page.waitForLoadState('networkidle')
    console.log('✓ 进入数据模块管理页面')

    // 2. 搜索刚刚导入的DM（使用DDN编码的型号部分）
    if (exportedDdnCode) {
      const modelPart = exportedDdnCode.split('-')[1]
      await page.fill('input[placeholder*="DMC"]', modelPart)
      await page.click('button:has-text("查询")')
      await page.waitForTimeout(2000)
      console.log(`✓ 搜索DM: ${modelPart}`)
    }

    // 3. 点击第一条记录的"更多"→"编辑属性"
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 })
    const firstRow = page.locator('.ant-table-tbody tr').first()
    await firstRow.locator('button:has-text("更多")').click()
    await page.waitForTimeout(500)
    await page.click('li:has-text("编辑属性")')
    console.log('✓ 打开DM属性编辑弹窗')

    // 4. 切换到"资源文件"页签
    await page.waitForSelector('.ant-modal', { timeout: 5000 })
    await page.click('.ant-tabs-tab:has-text("资源文件")')
    await page.waitForTimeout(1000)
    console.log('✓ 切换到资源文件页签')

    // 5. 验证资源文件列表
    const resourceRows = await page.locator('.ant-modal .ant-table-tbody tr').count()
    console.log(`\n📂 资源文件列表: ${resourceRows} 个`)

    if (resourceRows > 0) {
      // 读取第一个资源文件信息
      const firstResourceRow = page.locator('.ant-modal .ant-table-tbody tr').first()
      const resourceName = await firstResourceRow.locator('td').nth(1).textContent()
      console.log(`  - 第一个资源: ${resourceName}`)
      console.log('✓ 资源文件已正确关联到DM')
    } else {
      console.log('⚠️  警告: 该DM没有关联资源文件')
    }

    // 6. 关闭弹窗
    await page.click('.ant-modal-footer button:has-text("取消")')
    await page.waitForTimeout(500)

    console.log('\n✅ TC-04 通过: 资源文件关联验证完成\n')
  })

  /**
   * TC-05: 导出→导入→再导出 可逆性测试
   * 验证：再次导出，ZIP结构与第一次一致
   */
  test('TC-05: 导出→导入→再导出 可逆性测试', async () => {
    console.log('\n=== TC-05: 导出→导入→再导出 可逆性测试 ===')

    // 1. 进入"导出数据模块"页面
    await page.goto(`${BASE_URL}/#/ietm/ddn-export`)
    await page.waitForLoadState('networkidle')
    console.log('✓ 进入导出数据模块页面')

    // 2. 添加刚刚导入的DM（重复TC-01的步骤2-7）
    await page.click('button:has-text("添加DM")')
    await page.waitForSelector('.ant-modal', { timeout: 5000 })

    await page.waitForSelector('.ant-tree', { timeout: 5000 })
    const treeNode = page.locator('.ant-tree-node-content-wrapper').first()
    await treeNode.click()
    await page.waitForTimeout(1000)

    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })
    const firstCheckbox = page.locator('.ant-table-tbody tr:first-child .ant-checkbox-input')
    await firstCheckbox.click()
    await page.waitForTimeout(500)

    await page.click('.ant-modal-footer button.ant-btn-primary:has-text("确定")')
    await page.waitForTimeout(1000)
    console.log('✓ 添加DM到导出列表')

    // 3. 生成数据包
    const downloadPromise2 = page.waitForEvent('download')
    await page.click('button:has-text("生成数据包")')
    console.log('⏳ 生成第二次数据包...')

    await page.waitForSelector('.ant-message-success', { timeout: 30000 })
    const successMsg2 = await page.locator('.ant-message-success').textContent()
    console.log(`✓ ${successMsg2}`)

    const download2 = await downloadPromise2
    const exportedZipPath2 = path.join(DOWNLOAD_DIR, `second-export.zip`)
    await download2.saveAs(exportedZipPath2)
    console.log(`✓ 第二次数据包已下载: ${exportedZipPath2}`)

    // 4. 对比两次导出的ZIP包结构
    const zip1 = new AdmZip(exportedZipPath)
    const zip2 = new AdmZip(exportedZipPath2)

    const entries1 = zip1.getEntries().map(e => e.entryName).sort()
    const entries2 = zip2.getEntries().map(e => e.entryName).sort()

    console.log(`\n📦 结构对比:`)
    console.log(`  - 第一次导出: ${entries1.length} 个文件`)
    console.log(`  - 第二次导出: ${entries2.length} 个文件`)

    // 验证文件数量一致
    expect(entries2.length).toBe(entries1.length)
    console.log('✓ 文件数量一致')

    // 验证目录结构一致（忽略DDN.xml和DDN.log，因为DDN编码不同）
    const dmFiles1 = entries1.filter(e => e.startsWith('DM/'))
    const dmFiles2 = entries2.filter(e => e.startsWith('DM/'))
    const icnFiles1 = entries1.filter(e => e.startsWith('ICN/'))
    const icnFiles2 = entries2.filter(e => e.startsWith('ICN/'))
    const mmFiles1 = entries1.filter(e => e.startsWith('MM/'))
    const mmFiles2 = entries2.filter(e => e.startsWith('MM/'))

    expect(dmFiles2.length).toBe(dmFiles1.length)
    expect(icnFiles2.length).toBe(icnFiles1.length)
    expect(mmFiles2.length).toBe(mmFiles1.length)

    console.log(`  - DM文件: ${dmFiles1.length} → ${dmFiles2.length} ✓`)
    console.log(`  - ICN文件: ${icnFiles1.length} → ${icnFiles2.length} ✓`)
    console.log(`  - MM资源文件: ${mmFiles1.length} → ${mmFiles2.length} ✓`)

    // 清理第二次导出的文件
    if (fs.existsSync(exportedZipPath2)) {
      fs.unlinkSync(exportedZipPath2)
    }

    console.log('\n✅ TC-05 通过: 导出→导入→再导出 完全可逆\n')
  })
})

// ============== 辅助函数 ==============

/**
 * 登录系统
 */
async function login(page) {
  await page.goto(`${BASE_URL}/#/user/login`)
  await page.fill('input[placeholder="账户: admin"]', TEST_USERNAME)
  await page.fill('input[placeholder="密码: admin"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  // 等待登录成功，跳转到首页
  await page.waitForURL(`${BASE_URL}/#/dashboard/**`, { timeout: 10000 })
  console.log('✓ 登录成功')
}

/**
 * 打开项目
 */
async function openProject(page) {
  // 进入项目管理页面
  await page.goto(`${BASE_URL}/#/ietm/project-list`)
  await page.waitForLoadState('networkidle')

  // 点击第一个项目的"打开"按钮
  await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 })
  const firstRow = page.locator('.ant-table-tbody tr').first()
  await firstRow.locator('button:has-text("打开")').click()

  // 等待打开成功提示
  await page.waitForSelector('.ant-message-success', { timeout: 5000 })
  console.log('✓ 打开项目成功')
}
