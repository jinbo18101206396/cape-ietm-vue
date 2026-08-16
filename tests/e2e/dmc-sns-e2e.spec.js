/**
 * IETM DMC/SNS E2E测试 - Playwright
 * 验证UI层DMC生成、SNS计算、表单交互的完整流程
 *
 * 运行前提:
 * 1. 前端 npm run serve (localhost:3000)
 * 2. 后端 spring-boot:run (localhost:9999)
 * 3. 数据库有测试项目和构型节点
 */

const { test, expect } = require('@playwright/test')

test.describe('IETM DMC/SNS 业务逻辑 E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录(根据实际认证机制调整)
    await page.goto('http://localhost:3000/#/user/login')
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  })

  test('场景1: 新建DM - SNS自动计算并生成正确DMC预览', async ({ page }) => {
    // 1. 进入DM列表页
    await page.goto('http://localhost:3000/#/ietm/datamodule')
    await page.waitForSelector('.ant-table', { timeout: 5000 })

    // 2. 点击"新建DM"按钮
    await page.click('button:has-text("新建")')
    await page.waitForSelector('.ant-modal-content', { timeout: 3000 })

    // 3. 选择项目(触发构型树加载)
    await page.click('.ant-select:has-text("请选择项目")')
    await page.waitForSelector('.ant-select-dropdown', { timeout: 2000 })
    await page.click('.ant-select-dropdown-menu-item:first-child')

    // 4. 等待构型树加载
    await page.waitForSelector('.ant-tree', { timeout: 3000 })

    // 5. 展开构型树并选择节点(至少2层)
    await page.click('.ant-tree-switcher:first-child') // 展开根节点
    await page.waitForTimeout(500)
    await page.click('.ant-tree-switcher:nth-child(2)') // 展开第二层
    await page.waitForTimeout(500)

    // 选择第三层某个叶子节点
    const leafNode = page.locator('.ant-tree-node-content-wrapper').nth(5)
    await leafNode.click()

    // 6. 等待SNS自动计算(getProjectInfo异步调用)
    await page.waitForTimeout(1000)

    // 7. 验证SNS字段已填充
    const snsInput = await page.locator('input[placeholder*="SNS"]')
    const snsValue = await snsInput.inputValue()

    expect(snsValue).not.toBe('')
    expect(snsValue).toMatch(/^[A-Z0-9-]+$/) // SNS格式校验

    // 8. 填写其他必填字段
    await page.fill('input[placeholder*="信息码"]', '040')
    await page.selectOption('select[placeholder*="信息码变体"]', 'A')

    // 9. 验证DMC预览
    const dmcPreview = await page.locator('text=/DMC预览：/').textContent()

    expect(dmcPreview).toContain('DMC-')
    expect(dmcPreview).toContain(snsValue) // SNS应出现在DMC中
    expect(dmcPreview).toContain('-040A-') // infoCode+variant
    expect(dmcPreview).not.toContain('DMC--') // 不应有双横线

    console.log(`✓ SNS: ${snsValue}`)
    console.log(`✓ DMC预览: ${dmcPreview}`)

    // 10. 提交表单
    await page.click('button:has-text("确定")')

    // 11. 验证保存成功(等待成功消息)
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
  })

  test('场景2: 复制DM - SNS继承或重新计算', async ({ page }) => {
    // 1. 进入DM列表页
    await page.goto('http://localhost:3000/#/ietm/datamodule')
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 })

    // 2. 对第一条记录点击"更多"→"复制DM"
    await page.click('.ant-table-tbody tr:first-child .ant-dropdown-trigger')
    await page.waitForSelector('.ant-dropdown-menu', { timeout: 2000 })
    await page.click('.ant-dropdown-menu-item:has-text("复制")')

    // 3. 复制弹框出现
    await page.waitForSelector('.ant-modal:has-text("复制DM")', { timeout: 3000 })

    // 4. 验证源DM信息显示
    const sourceDmcCode = await page.locator('strong:has-text("DMC编码：")').textContent()
    expect(sourceDmcCode).toContain('DMC-')

    // 5. 选择复制类型："原项目复制"(SNS继承)
    await page.click('input[type="radio"][value="0"]')

    // 6. 验证SNS字段(应与源DM相同)
    const snsInput = await page.locator('input[placeholder*="SNS"]')
    const snsValue = await snsInput.inputValue()
    expect(snsValue).not.toBe('')

    // 7. 验证DMC预览
    const dmcPreview = await page.locator('text=/DMC预览：/').textContent()
    expect(dmcPreview).toContain(snsValue)
    expect(dmcPreview).not.toContain('--')

    // 8. 切换到"新项目复制"(需重新选择构型节点)
    await page.click('input[type="radio"][value="1"]')

    // 9. 选择新的构型节点
    await page.click('.ant-select:has-text("请选择目标节点")')
    await page.waitForSelector('.ant-select-dropdown', { timeout: 2000 })
    await page.click('.ant-select-dropdown-menu-item:nth-child(2)')

    // 10. 验证SNS重新计算
    await page.waitForTimeout(1000)
    const newSnsValue = await snsInput.inputValue()
    expect(newSnsValue).not.toBe('')
    // SNS可能变化(如果构型节点不同)

    // 11. 验证新DMC预览
    const newDmcPreview = await page.locator('text=/DMC预览：/').textContent()
    expect(newDmcPreview).toContain(newSnsValue)

    console.log(`✓ 原项目SNS: ${snsValue}`)
    console.log(`✓ 新项目SNS: ${newSnsValue}`)
  })

  test('场景3: 编辑DM属性 - DMC版本自动升级', async ({ page }) => {
    // 1. 进入DM列表页
    await page.goto('http://localhost:3000/#/ietm/datamodule')
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 })

    // 2. 记录第一条DM的当前DMC
    const firstRow = page.locator('.ant-table-tbody tr:first-child')
    const originalDmc = await firstRow.locator('td:nth-child(3)').textContent()

    // 3. 点击"编辑属性"
    await firstRow.locator('.ant-btn:has-text("编辑")').click()
    await page.waitForSelector('.ant-modal:has-text("编辑DM属性")', { timeout: 3000 })

    // 4. 修改技术名称
    const techNameInput = await page.locator('input[placeholder*="技术名称"]')
    await techNameInput.fill('修改后的技术名称_E2E测试')

    // 5. 提交
    await page.click('.ant-modal button:has-text("确定")')
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })

    // 6. 刷新列表
    await page.reload()
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 })

    // 7. 验证DMC版本段变化(inWork+1或issueNo+1)
    const updatedRow = page.locator('.ant-table-tbody tr:first-child')
    const updatedDmc = await updatedRow.locator('td:nth-child(3)').textContent()

    // DMC前段(SNS+infoCode)应不变,版本段应变化
    const originalPrefix = originalDmc.split('-').slice(0, 3).join('-')
    const updatedPrefix = updatedDmc.split('-').slice(0, 3).join('-')

    expect(updatedPrefix).toBe(originalPrefix) // SNS段不变
    expect(updatedDmc).not.toBe(originalDmc) // 完整DMC应变化

    console.log(`✓ 原DMC: ${originalDmc}`)
    console.log(`✓ 新DMC: ${updatedDmc}`)
  })

  test('场景4: SNS为空边界 - 前端校验拦截', async ({ page }) => {
    // 1. 进入DM列表页
    await page.goto('http://localhost:3000/#/ietm/datamodule')

    // 2. 点击新建
    await page.click('button:has-text("新建")')
    await page.waitForSelector('.ant-modal-content', { timeout: 3000 })

    // 3. 选择项目
    await page.click('.ant-select:has-text("请选择项目")')
    await page.waitForSelector('.ant-select-dropdown', { timeout: 2000 })
    await page.click('.ant-select-dropdown-menu-item:first-child')

    // 4. 不选择构型节点,直接填其他字段
    await page.fill('input[placeholder*="信息码"]', '040')

    // 5. 尝试提交
    await page.click('button:has-text("确定")')

    // 6. 验证前端校验提示"SNS不能为空"
    await expect(page.locator('.ant-form-explain:has-text("SNS")')).toBeVisible({ timeout: 3000 })

    // 或验证后端返回错误
    await expect(page.locator('.ant-message-error:has-text("SNS")')).toBeVisible({ timeout: 5000 })

    console.log('✓ SNS空校验拦截成功')
  })

  test('场景5: ICN模块 - SNS算法差异验证', async ({ page }) => {
    // 1. 进入ICN列表页
    await page.goto('http://localhost:3000/#/ietm/icn')
    await page.waitForSelector('.ant-table', { timeout: 5000 })

    // 2. 点击新建ICN
    await page.click('button:has-text("新建")')
    await page.waitForSelector('.ant-modal-content', { timeout: 3000 })

    // 3. 选择项目和构型节点
    await page.click('.ant-select:has-text("请选择项目")')
    await page.waitForSelector('.ant-select-dropdown', { timeout: 2000 })
    await page.click('.ant-select-dropdown-menu-item:first-child')

    await page.waitForSelector('.ant-tree', { timeout: 3000 })
    await page.click('.ant-tree-switcher:first-child')
    await page.waitForTimeout(500)
    const icnLeafNode = page.locator('.ant-tree-node-content-wrapper').nth(5)
    await icnLeafNode.click()

    // 4. 等待SNS计算
    await page.waitForTimeout(1000)

    // 5. 验证ICN SNS格式(i>=3连写,前6段)
    const icnSnsInput = await page.locator('input[placeholder*="SNS"]')
    const icnSnsValue = await icnSnsInput.inputValue()

    // ICN SNS特征:segments <= 6, 第4-6段连写无横线
    const segments = icnSnsValue.split('-')
    expect(segments.length).toBeLessThanOrEqual(4) // equipname-diff-sys-连写段

    console.log(`✓ ICN SNS: ${icnSnsValue}`)
    console.log(`✓ 段数: ${segments.length} (<=4合格)`)
  })

  test('场景6: DM导入XML - SNS从dmCode重建', async ({ page }) => {
    // 1. 进入DM列表页
    await page.goto('http://localhost:3000/#/ietm/datamodule')

    // 2. 点击"导入XML"
    await page.click('button:has-text("导入")')
    await page.waitForSelector('.ant-modal:has-text("导入DM")', { timeout: 3000 })

    // 3. 选择项目
    await page.click('.ant-select:has-text("请选择项目")')
    await page.click('.ant-select-dropdown-menu-item:first-child')

    // 4. 上传测试XML文件(需预先准备包含完整dmCode的XML)
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="29"
                subSystemCode="1" subSubSystemCode="0" assyCode="01"
                disassyCode="00" disassyCodeVariant="A" infoCode="040"
                infoCodeVariant="A" itemLocationCode="C"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
</dmodule>`

    // 创建临时文件并上传
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test_dm.xml',
      mimeType: 'text/xml',
      buffer: Buffer.from(xmlContent)
    })

    // 5. 提交导入
    await page.click('.ant-modal button:has-text("导入")')
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 10000 })

    // 6. 刷新列表,找到导入的DM
    await page.reload()
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 5000 })

    // 7. 验证DMC包含重建的SNS(TEST-A-29-10-01-00A)
    const dmcCell = await page.locator('.ant-table-tbody td:has-text("TEST-A-29-10")').textContent()
    expect(dmcCell).toContain('DMC-TEST-A-29-10-01-00A-')

    console.log(`✓ 导入后DMC: ${dmcCell}`)
  })
})

test.describe('DMC/SNS 边界条件测试', () => {
  test('边界1: 构型路径仅1层(根节点) - 无法生成SNS', async ({ page }) => {
    await page.goto('http://localhost:3000/#/ietm/datamodule')
    await page.click('button:has-text("新建")')
    await page.waitForSelector('.ant-modal-content', { timeout: 3000 })

    await page.click('.ant-select:has-text("请选择项目")')
    await page.click('.ant-select-dropdown-menu-item:first-child')

    await page.waitForSelector('.ant-tree', { timeout: 3000 })
    // 只选择根节点(不展开)
    await page.click('.ant-tree-node-content-wrapper:first-child')

    await page.waitForTimeout(1000)

    const snsInput = await page.locator('input[placeholder*="SNS"]')
    const snsValue = await snsInput.inputValue()

    // 应为空或显示错误提示
    expect(snsValue).toBe('')

    // 尝试提交应被拦截
    await page.fill('input[placeholder*="信息码"]', '040')
    await page.click('button:has-text("确定")')
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 })

    console.log('✓ 路径不足2层正确拦截')
  })

  test('边界2: equipname含特殊字符(J-10B) - 正确拆分', async ({ page }) => {
    // 假设测试环境有equipname='J-10B'的项目
    await page.goto('http://localhost:3000/#/ietm/datamodule')
    await page.click('button:has-text("新建")')

    // 选择特殊equipname项目
    await page.click('.ant-select:has-text("请选择项目")')
    await page.click('.ant-select-dropdown-menu-item:has-text("J-10B")') // 需实际项目存在

    await page.waitForSelector('.ant-tree', { timeout: 3000 })
    await page.click('.ant-tree-switcher:first-child')
    await page.waitForTimeout(500)
    await page.click('.ant-tree-node-content-wrapper:nth-child(3)')

    await page.waitForTimeout(1000)

    const snsValue = await page.locator('input[placeholder*="SNS"]').inputValue()

    // SNS首段应为'J'(equipname按横线拆分后首字符)
    expect(snsValue).toMatch(/^J-/)

    console.log(`✓ 特殊equipname SNS: ${snsValue}`)
  })
})
