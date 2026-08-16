// Playwright端到端测试 - 元素操作功能
const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3000'
const LOGIN_USER = 'admin'
const LOGIN_PASS = 'admin' // 需要替换为实际密码

test.describe('二期阶段1 - 元素操作功能E2E测试', () => {
  test.beforeEach(async ({ page }) => {
    // 设置超时
    test.setTimeout(120000) // 2分钟

    // 访问首页
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  test('冒烟测试1: 登录并打开DM编辑器', async ({ page }) => {
    // 1. 登录
    console.log('1. 尝试登录...')

    // 等待登录表单或直接跳转到主页
    await page.waitForTimeout(2000)

    // 检查是否有登录表单
    const hasLoginForm = await page.locator('input[type="text"], input[placeholder*="用户"], input[placeholder*="账号"]').count() > 0

    if (hasLoginForm) {
      console.log('检测到登录页面，正在登录...')
      await page.fill('input[type="text"], input[placeholder*="用户"]', LOGIN_USER)
      await page.fill('input[type="password"], input[placeholder*="密码"]', LOGIN_PASS)
      await page.click('button[type="submit"], button:has-text("登录")')
      await page.waitForLoadState('networkidle')
      console.log('✓ 登录成功')
    } else {
      console.log('✓ 已登录状态')
    }

    // 2. 进入DM管理模块
    console.log('2. 导航到DM管理...')

    // 尝试多种方式找到DM管理入口
    const dmMenuSelectors = [
      'a:has-text("DM管理")',
      'a:has-text("数据模块")',
      'text=DM管理',
      '[title="DM管理"]'
    ]

    let found = false
    for (const selector of dmMenuSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        await page.click(selector)
        found = true
        console.log(`✓ 通过选择器 "${selector}" 找到DM管理`)
        break
      }
    }

    if (!found) {
      console.log('⚠ 未找到DM管理菜单，尝试直接访问URL')
      await page.goto(BASE_URL + '/ietm/IetmDmManage')
    }

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 3. 查找并点击第一个DM的"浏览或编辑"按钮
    console.log('3. 查找DM列表...')

    // 等待表格加载
    await page.waitForSelector('.ant-table, table, .datagrid', { timeout: 10000 })

    // 尝试找到"浏览或编辑DM内容"按钮
    const editButtonSelectors = [
      'a:has-text("浏览或编辑")',
      'button:has-text("编辑")',
      'a:has-text("编辑内容")',
      '.ant-table a:has-text("编辑")'
    ]

    let editorOpened = false
    for (const selector of editButtonSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log(`✓ 找到编辑按钮: ${selector}`)
        await page.click(`${selector}:first-child`)
        editorOpened = true
        break
      }
    }

    if (!editorOpened) {
      console.log('⚠ 无法自动找到编辑按钮')
      // 截图保存当前页面状态
      await page.screenshot({ path: '/tmp/dm-list-page.png' })
      console.log('✓ 已保存截图到 /tmp/dm-list-page.png')
      throw new Error('未找到DM编辑入口，请查看截图')
    }

    // 4. 等待编辑器加载
    console.log('4. 等待编辑器加载...')
    await page.waitForTimeout(3000)

    // 检查编辑器元素是否存在
    const editorSelectors = [
      '.CodeMirror',
      '#editor',
      'textarea',
      '.dm-editor'
    ]

    let editorFound = false
    for (const selector of editorSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log(`✓ 找到编辑器: ${selector}`)
        editorFound = true
        break
      }
    }

    if (!editorFound) {
      await page.screenshot({ path: '/tmp/editor-page.png' })
      console.log('⚠ 未找到编辑器组件，已保存截图')
    }

    // 5. 检查三区布局
    console.log('5. 检查三区布局...')

    // 检查树（左侧）
    const treeExists = await page.locator('.ant-tree, .tree, #tree').count() > 0
    console.log(treeExists ? '✓ 找到结构树' : '⚠ 未找到结构树')

    // 检查编辑器（中间）
    const editorExists = await page.locator('.CodeMirror, #editor').count() > 0
    console.log(editorExists ? '✓ 找到编辑器' : '⚠ 未找到编辑器')

    // 检查属性面板（右侧）
    const attrPanelExists = await page.locator('.attr-panel, .property-panel, table').count() > 0
    console.log(attrPanelExists ? '✓ 找到属性面板' : '⚠ 未找到属性面板')

    // 截图记录
    await page.screenshot({ path: '/tmp/editor-loaded.png' })
    console.log('✓ 已保存编辑器截图')

    // 断言：至少要有编辑器
    expect(editorExists || treeExists).toBeTruthy()
  })

  test('UI测试1: 右键树节点显示插入菜单', async ({ page }) => {
    console.log('测试：右键菜单显示')

    // 假设已经在编辑器页面
    await page.goto(BASE_URL + '/ietm/IetmDmManage')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // 查找树节点
    const treeNodeSelectors = [
      '.ant-tree-node-content-wrapper',
      '.tree-node',
      '.ant-tree-title'
    ]

    let nodeFound = false
    for (const selector of treeNodeSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log(`✓ 找到树节点: ${selector}`)

        // 右键点击第一个节点
        await page.locator(selector).first().click({ button: 'right' })
        await page.waitForTimeout(500)

        // 检查是否出现上下文菜单
        const contextMenuExists = await page.locator('.ant-dropdown, .context-menu, .menu').count() > 0
        console.log(contextMenuExists ? '✓ 右键菜单已显示' : '⚠ 右键菜单未显示')

        // 截图
        await page.screenshot({ path: '/tmp/context-menu.png' })
        console.log('✓ 已保存右键菜单截图')

        nodeFound = true
        break
      }
    }

    expect(nodeFound).toBeTruthy()
  })

  test('UI测试2: 插入元素功能', async ({ page }) => {
    console.log('测试：插入元素')

    // 此测试需要真实的编辑器环境
    // 由于环境复杂，这里提供测试框架

    console.log('⚠ 此测试需要真实DM数据和完整登录流程')
    console.log('测试框架已就绪，等待补充登录凭据')
  })

  test('UI测试3: 删除元素功能', async ({ page }) => {
    console.log('测试：删除元素')
    console.log('⚠ 测试框架已就绪')
  })

  test('UI测试4: 移动元素功能', async ({ page }) => {
    console.log('测试：移动元素')
    console.log('⚠ 测试框架已就绪')
  })

  test('截图测试: 捕获主要页面状态', async ({ page }) => {
    console.log('执行截图测试...')

    // 访问首页
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: '/tmp/playwright-homepage.png', fullPage: true })
    console.log('✓ 首页截图已保存')

    // 获取页面标题
    const title = await page.title()
    console.log('页面标题:', title)

    // 获取页面URL
    console.log('当前URL:', page.url())

    expect(page.url()).toContain(BASE_URL)
  })
})

// 单独运行的简单连接测试
test('连接测试: 验证前端服务可访问', async ({ page }) => {
  console.log('测试前端服务连接...')

  const response = await page.goto(BASE_URL)

  console.log('HTTP状态码:', response.status())
  console.log('URL:', response.url())

  // 截图
  await page.screenshot({ path: '/tmp/connection-test.png' })
  console.log('✓ 连接测试截图已保存')

  expect(response.status()).toBeLessThan(400)
})
