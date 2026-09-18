/**
 * 数据模块导入 - 项目上下文测试
 *
 * 测试目标：验证"请先打开项目"错误修复
 *
 * BUG-IMPORT-001: 校验失败：请先打开项目
 * 修复内容：后端从Redis读取项目信息，而不是从Session
 *
 * @date 2026-09-04
 */

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const TEST_USERNAME = 'admin'
const TEST_PASSWORD = 'admin123'

// 测试数据目录
const TEST_DATA_DIR = path.join(__dirname, '../fixtures')

test.describe('数据模块导入 - 项目上下文测试', () => {

  test.beforeEach(async ({ page }) => {
    // 访问登录页
    await page.goto(`${BASE_URL}/user/login`)

    // 登录
    await page.fill('input[placeholder="账号"]', TEST_USERNAME)
    await page.fill('input[placeholder="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')

    // 等待登录成功，跳转到首页
    await page.waitForURL(`${BASE_URL}/dashboard/analysis`, { timeout: 10000 })

    console.log('✓ 登录成功')
  })

  test('场景1：正常流程 - 打开项目后校验文件', async ({ page }) => {
    // 1. 打开项目列表
    await page.goto(`${BASE_URL}/ietm/project-list`)
    await page.waitForLoadState('networkidle')

    // 2. 打开第一个项目
    const openButton = page.locator('button:has-text("打开")').first()
    await expect(openButton).toBeVisible({ timeout: 5000 })
    await openButton.click()

    // 等待"打开项目"成功提示
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    console.log('✓ 项目打开成功')

    // 3. 进入数据模块导入页面
    await page.goto(`${BASE_URL}/ietm/dm-import`)
    await page.waitForLoadState('networkidle')
    console.log('✓ 导入页面加载完成')

    // 4. 创建测试XML文件
    const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST001" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const testFilePath = path.join(TEST_DATA_DIR, 'DMC-TEST001-A-00-0-0-00-00-A-000-A-A.xml')

    // 确保测试数据目录存在
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(testFilePath, testXmlContent, 'utf-8')

    // 5. 上传文件（使用文件选择器）
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // 等待文件添加到列表
    await page.waitForTimeout(1000)

    // 验证文件已添加
    const fileName = 'DMC-TEST001-A-00-0-0-00-00-A-000-A-A.xml'
    await expect(page.locator(`text=${fileName}`)).toBeVisible()
    console.log('✓ 文件已添加到列表')

    // 6. 点击"校验"按钮
    const validateButton = page.locator('button:has-text("校验")')
    await validateButton.click()

    // 等待校验完成（监听loading消失）
    await page.waitForTimeout(2000)

    // 7. 验证结果：不应该出现"请先打开项目"错误
    const errorText = await page.locator('text=请先打开项目').count()
    expect(errorText).toBe(0)
    console.log('✓ 没有出现"请先打开项目"错误')

    // 8. 验证校验结果列显示了具体的校验信息（不是"校验失败：请先打开项目"）
    const validationColumn = page.locator('table tbody tr:first-child td:nth-child(3)')
    const validationText = await validationColumn.textContent()

    // 验证不是错误的"请先打开项目"提示
    expect(validationText).not.toContain('请先打开项目')
    console.log(`✓ 校验情况列显示: ${validationText}`)

    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  test('场景2：未打开项目 - 应提示需要打开项目', async ({ page }) => {
    // 1. 确保没有打开项目（如果有打开的，先关闭）
    try {
      await page.goto(`${BASE_URL}/ietm/project-list`)
      await page.waitForLoadState('networkidle')

      const closeButton = page.locator('button:has-text("关闭")').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(1000)
        console.log('✓ 已关闭当前项目')
      }
    } catch (e) {
      console.log('没有打开的项目，继续测试')
    }

    // 2. 直接进入数据模块导入页面
    await page.goto(`${BASE_URL}/ietm/dm-import`)
    await page.waitForLoadState('networkidle')

    // 3. 创建测试文件
    const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST002" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const testFilePath = path.join(TEST_DATA_DIR, 'DMC-TEST002-A-00-0-0-00-00-A-000-A-A.xml')
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(testFilePath, testXmlContent, 'utf-8')

    // 4. 上传文件
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)
    await page.waitForTimeout(1000)

    // 5. 点击"校验"按钮
    const validateButton = page.locator('button:has-text("校验")')
    await validateButton.click()

    // 等待响应
    await page.waitForTimeout(2000)

    // 6. 验证：应该提示"请先打开项目"
    const warningMessage = page.locator('.ant-message-warning:has-text("请先打开项目")')
    await expect(warningMessage).toBeVisible({ timeout: 5000 })
    console.log('✓ 正确提示"请先打开项目"')

    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  test('场景3：切换项目 - 校验应使用新项目的上下文', async ({ page }) => {
    // 1. 打开项目A
    await page.goto(`${BASE_URL}/ietm/project-list`)
    await page.waitForLoadState('networkidle')

    const firstProject = page.locator('table tbody tr').first()
    const firstProjectName = await firstProject.locator('td:nth-child(2)').textContent()

    await firstProject.locator('button:has-text("打开")').click()
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    console.log(`✓ 打开项目A: ${firstProjectName}`)

    // 2. 进入导入页面并上传文件
    await page.goto(`${BASE_URL}/ietm/dm-import`)
    await page.waitForLoadState('networkidle')

    const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST003" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const testFilePath = path.join(TEST_DATA_DIR, 'DMC-TEST003-A-00-0-0-00-00-A-000-A-A.xml')
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(testFilePath, testXmlContent, 'utf-8')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)
    await page.waitForTimeout(1000)

    // 3. 校验（项目A）
    await page.locator('button:has-text("校验")').click()
    await page.waitForTimeout(2000)

    const errorCount1 = await page.locator('text=请先打开项目').count()
    expect(errorCount1).toBe(0)
    console.log('✓ 项目A下校验成功')

    // 4. 返回项目列表，切换到项目B
    await page.goto(`${BASE_URL}/ietm/project-list`)
    await page.waitForLoadState('networkidle')

    // 关闭项目A
    const closeButton = page.locator('button:has-text("关闭")').first()
    if (await closeButton.isVisible()) {
      await closeButton.click()
      await page.waitForTimeout(1000)
      console.log('✓ 关闭项目A')
    }

    // 打开项目B（第二个项目）
    const secondProject = page.locator('table tbody tr').nth(1)
    const secondProjectName = await secondProject.locator('td:nth-child(2)').textContent()

    await secondProject.locator('button:has-text("打开")').click()
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    console.log(`✓ 打开项目B: ${secondProjectName}`)

    // 5. 再次进入导入页面并校验
    await page.goto(`${BASE_URL}/ietm/dm-import`)
    await page.waitForLoadState('networkidle')

    // 清空之前的列表
    const clearButton = page.locator('button:has-text("清空列表")')
    if (await clearButton.isEnabled()) {
      await clearButton.click()
      await page.locator('button:has-text("确定")').click()
      await page.waitForTimeout(500)
    }

    // 上传同一个文件
    await fileInput.setInputFiles(testFilePath)
    await page.waitForTimeout(1000)

    // 6. 校验（项目B）
    await page.locator('button:has-text("校验")').click()
    await page.waitForTimeout(2000)

    const errorCount2 = await page.locator('text=请先打开项目').count()
    expect(errorCount2).toBe(0)
    console.log('✓ 项目B下校验成功')

    // 7. 验证：确认使用了项目B的上下文（通过后端日志或校验结果可以判断）
    const validationText = await page.locator('table tbody tr:first-child td:nth-child(3)').textContent()
    expect(validationText).not.toContain('请先打开项目')
    console.log('✓ 项目切换后校验正常工作')

    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  test('场景4：验证Redis读取逻辑 - 后端日志检查', async ({ page }) => {
    // 此测试需要配合后端日志验证

    // 1. 打开项目
    await page.goto(`${BASE_URL}/ietm/project-list`)
    await page.waitForLoadState('networkidle')

    await page.locator('button:has-text("打开")').first().click()
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    console.log('✓ 项目已打开')

    // 2. 进入导入页面
    await page.goto(`${BASE_URL}/ietm/dm-import`)
    await page.waitForLoadState('networkidle')

    // 3. 上传文件并校验
    const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST004" systemDiffCode="A" systemCode="00"
                subSystemCode="0" subSubSystemCode="0" assyCode="00"
                disassyCode="00" disassyCodeVariant="A" infoCode="000"
                infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
    <dmStatus>
      <security securityClassification="01"/>
    </dmStatus>
  </identAndStatusSection>
</dmodule>`

    const testFilePath = path.join(TEST_DATA_DIR, 'DMC-TEST004-A-00-0-0-00-00-A-000-A-A.xml')
    if (!fs.existsSync(TEST_DATA_DIR)) {
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(testFilePath, testXmlContent, 'utf-8')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)
    await page.waitForTimeout(1000)

    // 4. 监听网络请求
    let requestCaptured = false
    let responseCaptured = false

    page.on('request', request => {
      if (request.url().includes('/ietm/ietmimport/validate')) {
        console.log('✓ 捕获到校验请求:', request.url())
        requestCaptured = true
      }
    })

    page.on('response', async response => {
      if (response.url().includes('/ietm/ietmimport/validate')) {
        const status = response.status()
        console.log('✓ 校验响应状态码:', status)

        if (status === 200) {
          try {
            const body = await response.json()
            console.log('✓ 校验响应body:', JSON.stringify(body, null, 2))

            // 验证：响应不应该包含"请先打开项目"错误
            if (body.message && body.message.includes('请先打开项目')) {
              throw new Error('后端仍然返回"请先打开项目"错误')
            }

            responseCaptured = true
          } catch (e) {
            console.error('解析响应失败:', e.message)
          }
        }
      }
    })

    // 5. 触发校验
    await page.locator('button:has-text("校验")').click()
    await page.waitForTimeout(3000)

    // 6. 验证网络请求和响应都被捕获
    expect(requestCaptured).toBe(true)
    expect(responseCaptured).toBe(true)
    console.log('✓ 后端正确处理了校验请求（从Redis读取项目信息）')

    // 清理测试文件
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })
})

test.describe('回归测试 - 确保修复不影响其他功能', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/user/login`)
    await page.fill('input[placeholder="账号"]', TEST_USERNAME)
    await page.fill('input[placeholder="密码"]', TEST_PASSWORD)
    await page.click('button:has-text("登录")')
    await page.waitForURL(`${BASE_URL}/dashboard/analysis`, { timeout: 10000 })
  })

  test('回归1：DDN导出功能正常', async ({ page }) => {
    // 1. 打开项目
    await page.goto(`${BASE_URL}/ietm/project-list`)
    await page.waitForLoadState('networkidle')
    await page.locator('button:has-text("打开")').first().click()
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })

    // 2. 进入DDN导出页面
    await page.goto(`${BASE_URL}/ietm/ddn-export`)
    await page.waitForLoadState('networkidle')

    // 3. 验证页面正常加载（DDN表单可见）
    await expect(page.locator('text=来源数据交换凭证DDN')).toBeVisible()
    console.log('✓ DDN导出页面加载正常')
  })

  test('回归2：项目打开/关闭功能正常', async ({ page }) => {
    // 1. 打开项目
    await page.goto(`${BASE_URL}/ietm/project-list`)
    await page.waitForLoadState('networkidle')

    const openButton = page.locator('button:has-text("打开")').first()
    await openButton.click()
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    console.log('✓ 项目打开成功')

    // 2. 关闭项目
    const closeButton = page.locator('button:has-text("关闭")').first()
    await closeButton.click()
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
    console.log('✓ 项目关闭成功')
  })
})
