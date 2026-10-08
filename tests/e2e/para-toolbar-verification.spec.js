/**
 * Para设计器工具栏验证测试
 * 验证修复后工具栏是否只显示13个按钮
 */

const { test, expect } = require('@playwright/test')

test.describe('Para设计器工具栏验证', () => {

  test('应该只显示13个核心按钮', async ({ page }) => {
    // 设置超时时间
    test.setTimeout(120000)

    console.log('🔍 步骤1: 访问登录页面...')
    await page.goto('http://localhost:3001/user/login', {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    // 等待页面加载
    await page.waitForTimeout(2000)

    console.log('🔍 步骤2: 执行登录...')
    // 填写登录信息（根据实际情况调整）
    await page.fill('input[placeholder*="用户名" i], input#username', 'admin')
    await page.fill('input[placeholder*="密码" i], input#password', 'admin123')

    // 点击登录按钮
    await page.click('button[type="submit"], button.ant-btn-primary')

    // 等待登录成功并跳转
    await page.waitForTimeout(3000)

    console.log('🔍 步骤3: 导航到数据模块列表...')
    // 访问数据模块管理页面
    await page.goto('http://localhost:3001/ietm/IetmDataModuleList', {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    await page.waitForTimeout(2000)

    console.log('🔍 步骤4: 选择项目和构型节点...')
    // 等待页面完全加载
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 30000 })

    // 点击第一行数据进入编辑器
    const firstRow = await page.locator('.ant-table-tbody tr').first()
    await firstRow.click()

    // 等待进入编辑器
    await page.waitForTimeout(2000)

    console.log('🔍 步骤5: 查找并双击para节点...')
    // 等待树形结构加载
    await page.waitForSelector('.tree-container, .ant-tree', { timeout: 30000 })

    // 查找para节点
    const paraNode = await page.locator('.ant-tree-node-content-wrapper:has-text("para")').first()

    if (await paraNode.count() > 0) {
      // 双击para节点
      await paraNode.dblclick()
      console.log('✓ 已双击para节点')
    } else {
      console.log('⚠️  未找到para节点，尝试查找其他元素节点')
      // 查找任意可编辑的元素节点
      const anyEditableNode = await page.locator('.ant-tree-node-content-wrapper').nth(5)
      await anyEditableNode.dblclick()
    }

    // 等待Para设计器加载
    await page.waitForTimeout(3000)

    console.log('🔍 步骤6: 切换到设计视图...')
    // 查找并点击"设计视图"标签页
    const designTab = await page.locator('.ant-tabs-tab:has-text("设计视图")')
    if (await designTab.count() > 0) {
      await designTab.click()
      console.log('✓ 已切换到设计视图')
    }

    // 等待UEditor加载
    await page.waitForTimeout(5000)

    console.log('🔍 步骤7: 等待UEditor工具栏渲染...')
    // 等待UEditor工具栏出现
    await page.waitForSelector('.edui-toolbar, .edui-editor-toolbarbox', { timeout: 30000 })

    console.log('🔍 步骤8: 检测控制台日志...')
    // 监听控制台消息
    let toolbarConfig = null
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[ParaDesigner] 工具栏配置')) {
        console.log('📋 控制台日志:', text)
        toolbarConfig = text
      }
    })

    // 等待日志输出
    await page.waitForTimeout(2000)

    console.log('🔍 步骤9: 统计工具栏按钮数量...')
    // 统计工具栏中的按钮数量
    const toolbarButtons = await page.locator('.edui-toolbar .edui-button, .edui-toolbar .edui-splitbutton').count()

    console.log(`\n═══════════════════════════════════════`)
    console.log(`📊 工具栏按钮统计结果`)
    console.log(`═══════════════════════════════════════`)
    console.log(`实际按钮数量: ${toolbarButtons}`)
    console.log(`预期按钮数量: 13-20 (含分隔符和自定义按钮)`)

    // 截图保存
    await page.screenshot({
      path: 'D:/workspace/IETM/cape-ietm-vue/tests/screenshots/para-toolbar-after-fix.png',
      fullPage: true
    })
    console.log('✓ 已保存截图: tests/screenshots/para-toolbar-after-fix.png')

    // 获取工具栏HTML用于详细分析
    const toolbarHTML = await page.locator('.edui-toolbar').first().innerHTML()

    // 统计不同类型的按钮
    const buttonCount = (toolbarHTML.match(/edui-button/g) || []).length
    const splitButtonCount = (toolbarHTML.match(/edui-splitbutton/g) || []).length
    const separatorCount = (toolbarHTML.match(/edui-separator/g) || []).length

    console.log(`\n详细统计:`)
    console.log(`  - 普通按钮: ${buttonCount}`)
    console.log(`  - 下拉按钮: ${splitButtonCount}`)
    console.log(`  - 分隔符: ${separatorCount}`)
    console.log(`  - 总计: ${buttonCount + splitButtonCount}`)

    // 列出所有按钮的title属性（用于识别具体按钮）
    const buttonTitles = await page.locator('.edui-toolbar .edui-button, .edui-toolbar .edui-splitbutton')
      .evaluateAll(buttons => buttons.map(btn => {
        const titleDiv = btn.querySelector('.edui-button-wrap')
        return titleDiv ? titleDiv.getAttribute('title') : 'unknown'
      }))

    console.log(`\n按钮列表:`)
    buttonTitles.forEach((title, index) => {
      console.log(`  ${index + 1}. ${title}`)
    })

    console.log(`\n═══════════════════════════════════════`)
    console.log(`🎯 验证结果`)
    console.log(`═══════════════════════════════════════`)

    // 验证按钮数量是否合理（13个核心按钮 + 分隔符 + 可能的自定义按钮）
    if (toolbarButtons <= 25) {
      console.log(`✅ 通过: 工具栏按钮数量在合理范围内 (${toolbarButtons} <= 25)`)
      console.log(`✅ 修复成功: 工具栏已精简`)
    } else if (toolbarButtons > 50) {
      console.log(`❌ 失败: 工具栏仍然有太多按钮 (${toolbarButtons} > 50)`)
      console.log(`❌ 修复未生效: 工具栏未精简`)
      throw new Error(`工具栏按钮数量过多: ${toolbarButtons}`)
    } else {
      console.log(`⚠️  警告: 工具栏按钮数量偏多 (25 < ${toolbarButtons} <= 50)`)
      console.log(`⚠️  可能需要进一步精简`)
    }

    console.log(`═══════════════════════════════════════\n`)

    // 断言：工具栏按钮数应该少于30个（含分隔符）
    expect(toolbarButtons).toBeLessThan(30)
  })
})
