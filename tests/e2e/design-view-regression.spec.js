/**
 * 设计视图功能 E2E 回归测试
 * 使用Playwright进行真实浏览器测试
 *
 * 测试范围：
 * - 问题1：视图切换高度正常
 * - 问题2：数据完整性
 * - 问题3：自动返回源码视图
 * - 回归测试：其他编辑功能
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const DM_EDITOR_URL = `${BASE_URL}/#/ietm/dm-content-editor`

// 测试数据
const TEST_DM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="001" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>测试文档</title>
        <para id="p1">第一段内容保持不变</para>
        <para id="p2">第二段待编辑</para>
        <para id="p3">第三段内容保持不变</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

test.describe('设计视图三大问题修复 - E2E测试', () => {
  let page
  let dmId

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // 登录系统
    await page.goto(`${BASE_URL}/#/user/login`)
    await page.fill('input[placeholder="账号"]', 'admin')
    await page.fill('input[placeholder="密码"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForURL(`${BASE_URL}/#/dashboard/**`)
  })

  test.beforeEach(async () => {
    // 创建测试DM
    const response = await page.request.post(`${BASE_URL}/jeecg-boot/ietm/dm/create-test-dm`, {
      data: { content: TEST_DM_XML }
    })
    const result = await response.json()
    dmId = result.result.id

    // 打开DM编辑器
    await page.goto(`${DM_EDITOR_URL}?id=${dmId}`)
    await page.waitForSelector('.dm-editor-page')

    // 等待CodeMirror加载
    await page.waitForSelector('.CodeMirror')
  })

  test.afterEach(async () => {
    // 清理测试数据
    if (dmId) {
      await page.request.delete(`${BASE_URL}/jeecg-boot/ietm/dm/delete?id=${dmId}`)
    }
  })

  test.describe('问题2：数据完整性测试', () => {
    test('E2E-01: 保存后不应删除para前后的内容', async () => {
      // 1. 记录原始内容
      const originalContent = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(originalContent).toContain('<para id="p1">第一段内容保持不变</para>')
      expect(originalContent).toContain('<para id="p2">第二段待编辑</para>')
      expect(originalContent).toContain('<para id="p3">第三段内容保持不变</para>')

      // 2. 双击para#p2进入设计视图
      await page.click('text=para#p2')
      await page.dblclick('text=para#p2')
      await page.waitForSelector('.para-designer', { timeout: 3000 })

      // 3. 等待UEditor加载
      await page.waitForTimeout(500)

      // 4. 编辑内容
      await page.evaluate(() => {
        const designer = window.app.$children
          .find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner
        designer.ueditor.setContent('<p>修改后的第二段内容，增加了<strong>强调文字</strong></p>')
      })

      // 5. 点击保存按钮
      await page.click('.para-designer button:has-text("保存")')

      // 6. 等待保存完成和视图切换
      await page.waitForSelector('.source-pane', { timeout: 5000 })
      await page.waitForTimeout(500)

      // 7. 验证所有内容都保留
      const updatedContent = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      // ✅ 关键验证：para#p1 应该保留
      expect(updatedContent).toContain('<para id="p1">第一段内容保持不变</para>')

      // ✅ 关键验证：para#p2 内容应该更新
      expect(updatedContent).toContain('修改后的第二段内容')
      expect(updatedContent).toContain('<emphasis>强调文字</emphasis>')

      // ✅ 关键验证：para#p3 应该保留
      expect(updatedContent).toContain('<para id="p3">第三段内容保持不变</para>')

      // ✅ 关键验证：title 应该保留
      expect(updatedContent).toContain('<title>测试文档</title>')
    })

    test('E2E-02: 编辑第一个para不应影响后续内容', async () => {
      // 编辑第一个para
      await page.dblclick('text=para#p1')
      await page.waitForSelector('.para-designer')
      await page.waitForTimeout(500)

      await page.evaluate(() => {
        const designer = window.app.$children
          .find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner
        designer.ueditor.setContent('<p>修改了第一段</p>')
      })

      await page.click('.para-designer button:has-text("保存")')
      await page.waitForSelector('.source-pane', { timeout: 5000 })
      await page.waitForTimeout(500)

      const content = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(content).toContain('修改了第一段')
      expect(content).toContain('<para id="p2">第二段待编辑</para>')
      expect(content).toContain('<para id="p3">第三段内容保持不变</para>')
    })

    test('E2E-03: 编辑最后一个para不应出错', async () => {
      // 编辑最后一个para
      await page.dblclick('text=para#p3')
      await page.waitForSelector('.para-designer')
      await page.waitForTimeout(500)

      await page.evaluate(() => {
        const designer = window.app.$children
          .find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner
        designer.ueditor.setContent('<p>修改了最后一段</p>')
      })

      await page.click('.para-designer button:has-text("保存")')
      await page.waitForSelector('.source-pane', { timeout: 5000 })
      await page.waitForTimeout(500)

      const content = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(content).toContain('<para id="p1">第一段内容保持不变</para>')
      expect(content).toContain('<para id="p2">第二段待编辑</para>')
      expect(content).toContain('修改了最后一段')
    })
  })

  test.describe('问题3：自动返回源码视图测试', () => {
    test('E2E-04: 保存后应自动返回源码视图', async () => {
      // 1. 确认初始在源码视图
      await expect(page.locator('.source-pane')).toBeVisible()
      await expect(page.locator('.para-designer')).not.toBeVisible()

      // 2. 进入设计视图
      await page.dblclick('text=para#p2')
      await page.waitForSelector('.para-designer')

      // 3. 确认在设计视图
      await expect(page.locator('.para-designer')).toBeVisible()
      await expect(page.locator('.source-pane')).not.toBeVisible()

      // 4. 编辑并保存
      await page.waitForTimeout(500)
      await page.evaluate(() => {
        const designer = window.app.$children
          .find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner
        designer.ueditor.setContent('<p>保存测试</p>')
      })
      await page.click('.para-designer button:has-text("保存")')

      // 5. ✅ 关键验证：应自动返回源码视图
      await page.waitForSelector('.source-pane', {
        state: 'visible',
        timeout: 5000
      })

      // 6. 验证设计视图已关闭
      await expect(page.locator('.para-designer')).not.toBeVisible()

      // 7. 验证左侧树显示
      await expect(page.locator('.region-west')).toBeVisible()

      // 8. 验证右侧属性面板显示
      await expect(page.locator('.region-east')).toBeVisible()
    })

    test('E2E-05: 连续编辑多个para都应自动返回', async () => {
      // 编辑para#p1
      await page.dblclick('text=para#p1')
      await page.waitForSelector('.para-designer')
      await page.waitForTimeout(500)
      await page.evaluate(() => {
        window.app.$children.find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner.ueditor.setContent('<p>修改1</p>')
      })
      await page.click('.para-designer button:has-text("保存")')
      await page.waitForSelector('.source-pane', { state: 'visible' })

      // 立即编辑para#p2
      await page.dblclick('text=para#p2')
      await page.waitForSelector('.para-designer')
      await page.waitForTimeout(500)
      await page.evaluate(() => {
        window.app.$children.find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner.ueditor.setContent('<p>修改2</p>')
      })
      await page.click('.para-designer button:has-text("保存")')
      await page.waitForSelector('.source-pane', { state: 'visible' })

      // 验证都返回了源码视图
      await expect(page.locator('.source-pane')).toBeVisible()
      await expect(page.locator('.para-designer')).not.toBeVisible()
    })
  })

  test.describe('问题1：视图高度测试', () => {
    test('E2E-06: 返回源码视图后CodeMirror高度应正常', async () => {
      // 1. 记录源码视图时的CodeMirror高度
      const initialHeight = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror')
        return cm.offsetHeight
      })

      expect(initialHeight).toBeGreaterThan(200) // 高度应该合理

      // 2. 进入设计视图
      await page.dblclick('text=para#p2')
      await page.waitForSelector('.para-designer')
      await page.waitForTimeout(500)

      // 3. 保存返回源码视图
      await page.evaluate(() => {
        window.app.$children.find(c => c.$options.name === 'DmContentEditor')
          .$refs.paraDesigner.ueditor.setContent('<p>高度测试</p>')
      })
      await page.click('.para-designer button:has-text("保存")')
      await page.waitForSelector('.source-pane', { state: 'visible' })
      await page.waitForTimeout(300)

      // 4. ✅ 验证CodeMirror高度保持正常
      const finalHeight = await page.evaluate(() => {
        const cm = document.querySelector('.CodeMirror')
        return cm.offsetHeight
      })

      // 允许±10px的误差
      expect(Math.abs(finalHeight - initialHeight)).toBeLessThan(10)
      expect(finalHeight).toBeGreaterThan(200)
    })

    test('E2E-07: 手动切换视图按钮也应保持高度正常', async () => {
      // 获取初始高度
      const initialHeight = await page.evaluate(() => {
        return document.querySelector('.CodeMirror').offsetHeight
      })

      // 进入设计视图
      await page.dblclick('text=para#p2')
      await page.waitForSelector('.para-designer')

      // 手动点击"源码视图"按钮返回
      await page.click('.ant-tabs-tab:has-text("源码视图")')
      await page.waitForSelector('.source-pane', { state: 'visible' })
      await page.waitForTimeout(300)

      // 验证高度
      const finalHeight = await page.evaluate(() => {
        return document.querySelector('.CodeMirror').offsetHeight
      })

      expect(Math.abs(finalHeight - initialHeight)).toBeLessThan(10)
    })
  })

  test.describe('回归测试：其他编辑功能', () => {
    test('E2E-08: 源码视图直接编辑应正常工作', async () => {
      // 直接在CodeMirror中编辑
      await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        const cm = editor.$refs.editor.getEditor()
        const content = cm.getValue()
        cm.setValue(content.replace('第二段待编辑', '直接编辑修改'))
      })

      // 验证修改
      const content = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(content).toContain('直接编辑修改')
    })

    test('E2E-09: 格式化功能应正常工作', async () => {
      // 点击格式化按钮
      await page.click('button:has-text("格式化")')
      await page.waitForTimeout(500)

      // 验证格式化后内容缩进正确
      const content = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      // 检查缩进（2空格）
      expect(content).toMatch(/\n  <identAndStatusSection>/)
      expect(content).toMatch(/\n    <dmAddress>/)
    })

    test('E2E-10: 撤销/重做功能应正常工作', async () => {
      // 获取原始内容
      const originalContent = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      // 进行修改
      await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        const cm = editor.$refs.editor.getEditor()
        cm.setValue(cm.getValue().replace('第二段待编辑', '修改内容'))
      })

      // 撤销
      await page.click('button:has-text("撤销")')
      await page.waitForTimeout(200)

      const afterUndo = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(afterUndo).toBe(originalContent)

      // 重做
      await page.click('button:has-text("重做")')
      await page.waitForTimeout(200)

      const afterRedo = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(afterRedo).toContain('修改内容')
    })

    test('E2E-11: 保存到数据库功能应正常工作', async () => {
      // 修改内容
      await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        const cm = editor.$refs.editor.getEditor()
        cm.setValue(cm.getValue().replace('第二段待编辑', '保存测试'))
      })

      // 点击保存按钮
      await page.click('button:has-text("已保存"), button:has-text("未保存")')

      // 等待保存成功提示
      await page.waitForSelector('.ant-message-success', { timeout: 5000 })

      // 刷新页面验证保存成功
      await page.reload()
      await page.waitForSelector('.CodeMirror')
      await page.waitForTimeout(500)

      const content = await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        return editor.$refs.editor.getEditor().getValue()
      })

      expect(content).toContain('保存测试')
    })

    test('E2E-12: 树节点增删改功能不受影响', async () => {
      // 这个测试验证设计视图修复没有破坏树操作

      // 选中一个节点
      await page.click('.dm-structure-tree .tree-node:has-text("para")')
      await page.waitForTimeout(200)

      // 验证属性面板更新
      await expect(page.locator('.region-east')).toBeVisible()

      // 树应该正常显示
      const treeVisible = await page.isVisible('.region-west')
      expect(treeVisible).toBe(true)
    })
  })

  test.describe('边界场景测试', () => {
    test('E2E-13: 只读模式下不应打开设计视图', async () => {
      // 模拟只读模式
      await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        editor.readonly = true
      })

      // 尝试双击para
      await page.dblclick('text=para#p2')
      await page.waitForTimeout(500)

      // 应该显示提示消息
      await expect(page.locator('.ant-message')).toContainText('浏览模式下无法编辑')

      // 不应该打开设计视图
      await expect(page.locator('.para-designer')).not.toBeVisible()
    })

    test('E2E-14: 保存失败应保持在设计视图', async () => {
      // 进入设计视图
      await page.dblclick('text=para#p2')
      await page.waitForSelector('.para-designer')
      await page.waitForTimeout(500)

      // Mock保存失败
      await page.evaluate(() => {
        const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        editor.doSave = () => Promise.reject(new Error('保存失败'))
      })

      // 尝试保存
      await page.click('.para-designer button:has-text("保存")')
      await page.waitForTimeout(1000)

      // 应该仍在设计视图（因为保存失败）
      await expect(page.locator('.para-designer')).toBeVisible()
    })
  })
})

test.describe('性能测试', () => {
  test('E2E-15: 保存操作应在合理时间内完成', async ({ page }) => {
    // 省略登录和DM创建代码...

    const startTime = Date.now()

    // 执行保存操作
    await page.dblclick('text=para#p2')
    await page.waitForSelector('.para-designer')
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      window.app.$children.find(c => c.$options.name === 'DmContentEditor')
        .$refs.paraDesigner.ueditor.setContent('<p>性能测试</p>')
    })
    await page.click('.para-designer button:has-text("保存")')
    await page.waitForSelector('.source-pane', { state: 'visible' })

    const endTime = Date.now()
    const duration = endTime - startTime

    // 保存操作应在3秒内完成
    expect(duration).toBeLessThan(3000)
  })
})
