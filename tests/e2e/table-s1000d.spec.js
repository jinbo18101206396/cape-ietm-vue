/**
 * ParaDesigner - Table S1000D转换 E2E测试
 * 使用Playwright验证真实浏览器行为
 */

const { test, expect } = require('@playwright/test')

// 测试环境配置
const BASE_URL = 'http://localhost:3000'
const TEST_DM_ID = process.env.TEST_DM_ID || '2102970667065356289'  // 从环境变量获取测试DM ID

test.describe('ParaDesigner - Table S1000D转换', () => {

  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto(BASE_URL)
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**')

    // 导航到测试DM编辑页面
    await page.goto(`${BASE_URL}/ietm/dm-content-editor?id=${TEST_DM_ID}`)
    await page.waitForLoadState('networkidle')
  })

  // TC-01: 基本2×2表格转S1000D
  test('TC-01: 插入2×2表格并保存，生成S1000D格式', async ({ page }) => {
    // 1. 找到一个空para，点击铅笔图标进入设计视图
    await page.click('.xml-tree .tree-node:has-text("para") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForSelector('.ueditor-container')

    // 2. 等待UEditor加载
    await page.waitForTimeout(2000)

    // 3. 切换到iframe（UEditor在iframe中）
    const frame = page.frameLocator('iframe[class*="ueditor"]')

    // 4. 插入表格（通过UEditor工具栏）
    await page.click('.edui-toolbar .edui-button:has-text("表格")')
    await page.click('.edui-popup .edui-cellbutton:nth-child(2)')  // 选择2×2

    // 5. 填入内容
    await frame.locator('table td:nth-child(1)').first().fill('1')
    await frame.locator('table td:nth-child(2)').first().fill('2')
    await frame.locator('table tr:nth-child(2) td:nth-child(1)').fill('3')
    await frame.locator('table tr:nth-child(2) td:nth-child(2)').fill('4')

    // 6. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 7. 切换到源码视图
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
    await page.waitForTimeout(1000)

    // 8. 获取CodeMirror内容
    const xmlContent = await page.evaluate(() => {
      return window.editorInstance.getValue()
    })

    // 9. 断言S1000D格式
    expect(xmlContent).toContain('<table>')
    expect(xmlContent).toContain('<tgroup cols="2">')
    expect(xmlContent).toContain('<tbody>')
    expect(xmlContent).toContain('<row>')
    expect(xmlContent).toContain('<entry>1</entry>')
    expect(xmlContent).toContain('<entry>2</entry>')
    expect(xmlContent).toContain('<entry>3</entry>')
    expect(xmlContent).toContain('<entry>4</entry>')

    // 10. 断言不包含HTML标签
    expect(xmlContent).not.toContain('<tr')
    expect(xmlContent).not.toContain('<td')
    expect(xmlContent).not.toContain('class="firstRow"')
    expect(xmlContent).not.toContain('style=')
  })

  // TC-02: 移除HTML属性
  test('TC-02: 保存时自动移除HTML属性', async ({ page }) => {
    // 1. 进入设计视图
    await page.click('.xml-tree .tree-node:has-text("para") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForSelector('.ueditor-container')
    await page.waitForTimeout(2000)

    // 2. 插入表格
    await page.click('.edui-toolbar .edui-button:has-text("表格")')
    await page.click('.edui-popup .edui-cellbutton:nth-child(2)')

    // 3. 设置表格样式（触发HTML属性生成）
    const frame = page.frameLocator('iframe[class*="ueditor"]')
    await frame.locator('table').click({ button: 'right' })
    await page.click('.edui-popup:has-text("表格属性")')
    // ... 设置列宽、对齐等（具体UI操作根据实际UEditor版本调整）

    // 4. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 5. 切换到源码视图
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
    await page.waitForTimeout(1000)

    // 6. 获取内容
    const xmlContent = await page.evaluate(() => {
      return window.editorInstance.getValue()
    })

    // 7. 断言不包含HTML属性
    expect(xmlContent).not.toContain('class=')
    expect(xmlContent).not.toContain('style=')
    expect(xmlContent).not.toContain('width=')
    expect(xmlContent).not.toContain('valign=')
    expect(xmlContent).not.toContain('colspan=')
    expect(xmlContent).not.toContain('rowspan=')
  })

  // TC-03: 3列表格cols属性
  test('TC-03: 3列表格生成cols="3"', async ({ page }) => {
    // 1. 进入设计视图
    await page.click('.xml-tree .tree-node:has-text("para") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForTimeout(2000)

    // 2. 插入3列表格
    await page.click('.edui-toolbar .edui-button:has-text("表格")')
    await page.click('.edui-popup .edui-cellbutton:nth-child(3)')  // 3列

    // 3. 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 4. 切换到源码视图
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')

    // 5. 断言
    const xmlContent = await page.evaluate(() => {
      return window.editorInstance.getValue()
    })
    expect(xmlContent).toContain('<tgroup cols="3">')
  })

  // TC-04: 不影响definitionList
  test('TC-04: deflist="1"表格不受影响', async ({ page }) => {
    // 1. 在源码视图插入definitionList
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')
    await page.waitForTimeout(1000)

    const definitionListXml = `<para>
  <definitionList>
    <definitionListItem>
      <listItemTerm>术语1</listItemTerm>
      <listItemDefinition><para>定义1</para></listItemDefinition>
    </definitionListItem>
  </definitionList>
</para>`

    // 2. 定位到空para位置并插入
    await page.evaluate((xml) => {
      const editor = window.editorInstance
      const cursor = editor.getCursor()
      editor.replaceRange(xml, cursor)
    }, definitionListXml)

    // 3. 切换到设计视图（会转换为table deflist="1"）
    await page.click('.xml-tree .tree-node:has-text("definitionList") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForTimeout(2000)

    // 4. 不做修改，直接保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 5. 切换回源码视图
    await page.click('.view-tabs .ant-tabs-tab:has-text("源码视图")')

    // 6. 断言仍然是definitionList
    const xmlContent = await page.evaluate(() => {
      return window.editorInstance.getValue()
    })
    expect(xmlContent).toContain('<definitionList>')
    expect(xmlContent).toContain('<listItemTerm>')
    expect(xmlContent).not.toContain('<tgroup')
  })

  // TC-05: 控制台日志验证
  test('TC-05: 验证转换函数被调用', async ({ page }) => {
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('[convertHtmlTableToS1000D]')) {
        logs.push(msg.text())
      }
    })

    // 1. 插入表格并保存
    await page.click('.xml-tree .tree-node:has-text("para") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForTimeout(2000)
    await page.click('.edui-toolbar .edui-button:has-text("表格")')
    await page.click('.edui-popup .edui-cellbutton:nth-child(2)')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 2. 断言日志
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some(log => log.includes('输入HTML table'))).toBe(true)
    expect(logs.some(log => log.includes('输出S1000D table'))).toBe(true)
  })

  // TC-06: XML校验通过
  test('TC-06: 生成的table通过S1000D XSD校验', async ({ page }) => {
    // 1. 插入表格并保存
    await page.click('.xml-tree .tree-node:has-text("para") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForTimeout(2000)
    await page.click('.edui-toolbar .edui-button:has-text("表格")')
    await page.click('.edui-popup .edui-cellbutton:nth-child(2)')

    const frame = page.frameLocator('iframe[class*="ueditor"]')
    await frame.locator('table td').first().fill('测试')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 2. 点击校验按钮
    await page.click('button[title="校验"]')
    await page.waitForTimeout(3000)

    // 3. 等待校验结果
    await page.waitForSelector('.validate-result')

    // 4. 断言校验通过或无table相关错误
    const validateResult = await page.textContent('.validate-result')
    // 检查是否有table相关的错误
    expect(validateResult).not.toContain('table')
    expect(validateResult).not.toContain('tbody')
    expect(validateResult).not.toContain('tr')
    expect(validateResult).not.toContain('td')
  })

  // TC-07: 预览功能正常
  test('TC-07: 生成的table在预览中正常显示', async ({ page }) => {
    // 1. 插入表格并保存
    await page.click('.xml-tree .tree-node:has-text("para") >> nth=0')
    await page.click('button[title="编辑para"]')
    await page.waitForTimeout(2000)
    await page.click('.edui-toolbar .edui-button:has-text("表格")')
    await page.click('.edui-popup .edui-cellbutton:nth-child(2)')

    const frame = page.frameLocator('iframe[class*="ueditor"]')
    await frame.locator('table td:nth-child(1)').first().fill('预览测试')
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)

    // 2. 点击预览按钮
    await page.click('button[title="预览"]')
    await page.waitForTimeout(2000)

    // 3. 切换到预览窗口
    const previewPage = await page.context().waitForEvent('page')
    await previewPage.waitForLoadState('networkidle')

    // 4. 断言表格显示
    const tableVisible = await previewPage.isVisible('table')
    expect(tableVisible).toBe(true)

    const cellContent = await previewPage.textContent('table td')
    expect(cellContent).toContain('预览测试')

    await previewPage.close()
  })

})

/**
 * 运行说明：
 *
 * 1. 安装Playwright:
 *    npm install -D @playwright/test
 *
 * 2. 配置测试DM ID（可选）:
 *    export TEST_DM_ID=你的测试DM_ID
 *
 * 3. 运行测试:
 *    npx playwright test tests/e2e/table-s1000d.spec.js
 *
 * 4. 调试模式:
 *    npx playwright test tests/e2e/table-s1000d.spec.js --debug
 *
 * 5. 生成报告:
 *    npx playwright test tests/e2e/table-s1000d.spec.js --reporter=html
 */
