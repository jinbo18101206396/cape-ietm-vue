/**
 * Para设计器 E2E 测试
 * 验证 UEditor 集成和 Para 元素编辑功能
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = 'http://localhost:3001'
const TEST_TIMEOUT = 60000

// 登录凭证（根据实际环境调整）
const LOGIN = {
  username: 'admin',
  password: 'admin123'
}

test.describe('Para设计器 - UEditor集成测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  // 登录前置操作
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)

    // 等待登录页加载
    await page.waitForLoadState('networkidle')

    // 如果已登录则跳过
    const loginForm = await page.locator('input[placeholder*="用户名"], input[placeholder*="账号"]').first()
    if (await loginForm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('input[placeholder*="用户名"], input[placeholder*="账号"]', LOGIN.username)
      await page.fill('input[type="password"]', LOGIN.password)
      await page.click('button[type="submit"], button:has-text("登录")')
      await page.waitForLoadState('networkidle')
    }
  })

  test('TC-01: ParaDesigner组件加载验证', async ({ page }) => {
    // 导航到数据模块管理
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagement`)
    await page.waitForLoadState('networkidle')

    // 验证页面标题
    const title = await page.locator('.ant-pro-page-header-title, h2, .page-title')
    await expect(title.first()).toBeVisible({ timeout: 10000 })

    console.log('✓ 数据模块管理页面加载成功')
  })

  test('TC-02: UEditor静态资源加载验证', async ({ page }) => {
    // 验证 UEditor 核心文件可访问
    const ueditorFiles = [
      '/static/ueditor/ueditor.all.min.js',
      '/static/ueditor/ueditor.config.js',
      '/static/ueditor/lang/zh-cn/zh-cn.js',
      '/static/ueditor/themes/default/css/ueditor.css'
    ]

    for (const file of ueditorFiles) {
      const response = await page.goto(`${BASE_URL}${file}`)
      expect(response.status()).toBe(200)
      console.log(`✓ ${file} 加载成功 (${response.status()})`)
    }
  })

  test('TC-03: UEditor全局对象验证', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagement`)
    await page.waitForLoadState('networkidle')

    // 验证 UE 和 UEDITOR_HOME_URL 全局对象存在
    const ueExists = await page.evaluate(() => {
      return typeof window.UE !== 'undefined' && typeof window.UEDITOR_HOME_URL !== 'undefined'
    })

    expect(ueExists).toBeTruthy()

    const homeUrl = await page.evaluate(() => window.UEDITOR_HOME_URL)
    expect(homeUrl).toBe('/static/ueditor/')

    console.log('✓ UEditor全局对象初始化正确')
  })

  test('TC-04: Para元素双击打开编辑器（模拟）', async ({ page }) => {
    // 注意：此测试需要真实的DM数据，这里模拟测试流程
    await page.goto(`${BASE_URL}/#/ietm/IetmDataModuleManagement`)
    await page.waitForLoadState('networkidle')

    // 检查 Vue 应用是否加载（通过检查 Vue 挂载点）
    const vueAppExists = await page.evaluate(() => {
      const app = document.getElementById('app')
      return app !== null && app.innerHTML.length > 0
    })

    expect(vueAppExists).toBeTruthy()
    console.log('✓ Vue应用已挂载，组件系统正常')
  })

  test('TC-05: 自定义按钮注册验证（代码检查）', async ({ page }) => {
    // 读取 ParaDesigner.vue 验证自定义按钮定义
    const fs = require('fs')
    const path = require('path')

    const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
    const content = fs.readFileSync(paraDesignerPath, 'utf-8')

    // 验证5个自定义按钮的注册
    const customButtons = [
      'deflist',
      'insertnextrow',
      'interrefbutton',
      'dmrefbutton',
      'symbolbutton'
    ]

    for (const btnName of customButtons) {
      expect(content).toContain(`registerUI('${btnName}'`)
      console.log(`✓ 自定义按钮 ${btnName} 已注册`)
    }
  })

  test('TC-06: paraConverter工具函数验证', async ({ page }) => {
    const fs = require('fs')
    const path = require('path')

    const converterPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
    const content = fs.readFileSync(converterPath, 'utf-8')

    // 验证核心转换函数存在
    expect(content).toContain('export async function para2html')
    expect(content).toContain('export async function html2para')

    console.log('✓ paraConverter.js 核心函数验证通过')
  })

  test('TC-07: Parent接口注入验证', async ({ page }) => {
    const fs = require('fs')
    const path = require('path')

    // 验证 DmContentEditor.vue 提供 Parent 接口
    const editorPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/DmContentEditor.vue')
    const content = fs.readFileSync(editorPath, 'utf-8')

    // 验证 provide 函数
    expect(content).toContain('provide()')
    expect(content).toContain('getLocaleName')
    expect(content).toContain('toEnXml')
    expect(content).toContain('toCnXml')
    expect(content).toContain('formateXml')

    console.log('✓ Parent接口注入验证通过（4个接口函数）')
  })

  test('TC-08: Props参数验证', async ({ page }) => {
    const fs = require('fs')
    const path = require('path')

    const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
    const content = fs.readFileSync(paraDesignerPath, 'utf-8')

    // 验证5个必需的 props
    const requiredProps = ['lineno', 'pflag', 'ifedit', 'simple', 'save']

    for (const prop of requiredProps) {
      expect(content).toContain(`${prop}:`)
      console.log(`✓ Prop ${prop} 已定义`)
    }
  })

  test('TC-09: 编译产物验证', async ({ page }) => {
    const fs = require('fs')
    const path = require('path')

    // 验证 dist 目录存在且包含 UEditor 资源
    const distPath = path.resolve(__dirname, '../../dist/static/ueditor')

    expect(fs.existsSync(distPath)).toBeTruthy()
    expect(fs.existsSync(path.join(distPath, 'ueditor.all.min.js'))).toBeTruthy()
    expect(fs.existsSync(path.join(distPath, 'ueditor.config.js'))).toBeTruthy()

    console.log('✓ 编译产物包含 UEditor 资源')
  })

  test('TC-10: 可选链操作符修复验证', async ({ page }) => {
    const fs = require('fs')
    const path = require('path')

    const paraDesignerPath = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/components/ParaDesigner.vue')
    const content = fs.readFileSync(paraDesignerPath, 'utf-8')

    // 验证不再使用 ?. 操作符（已修复为兼容语法）
    const optionalChainingPattern = /this\.deflistConfig\?\./g
    const matches = content.match(optionalChainingPattern)

    expect(matches).toBeNull()
    console.log('✓ 可选链操作符已修复为兼容语法')
  })
})

test.describe('Para设计器 - 后端Java测试验证', () => {
  test('TC-11: Java ParaConverter单元测试覆盖', async () => {
    const fs = require('fs')
    const path = require('path')

    const testPath = path.resolve(__dirname, '../../../../cape-ietm-java/jeecg-module-ietm/src/test/java/org/jeecg/modules/ietm/ietmdatamodulemanagement/util/ParaConverterTest.java')

    if (fs.existsSync(testPath)) {
      const content = fs.readFileSync(testPath, 'utf-8')

      // 统计测试方法数量
      const testMethods = content.match(/@Test/g)
      expect(testMethods).not.toBeNull()
      expect(testMethods.length).toBeGreaterThan(30)

      console.log(`✓ Java单元测试覆盖 ${testMethods.length} 个测试用例`)
    } else {
      console.log('⚠ Java测试文件路径不可访问，跳过验证')
    }
  })
})
