/**
 * 诊断报告：XML 格式化丢失问题
 *
 * 问题描述：
 * 1. 首次保存 para 时，XML 格式化正常（有换行和缩进）
 * 2. 再次进入设计视图保存后，XML 变成单行（格式化丢失）
 *
 * 复现步骤：
 * 1. 访问 http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN
 * 2. 点击第 69 行铅笔图标进入 para 设计视图
 * 3. 点击"DM引用"，选择第一条记录，点击确定
 * 4. 点击保存 → XML 格式化正常（图1）
 * 5. 再次点击第 69 行铅笔图标进入 para 设计视图（图2）
 * 6. 点击保存 → XML 变成单行（图3）
 */

const { test, expect } = require('@playwright/test')

test.describe('XML 格式化丢失问题诊断', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.fill('input[placeholder="账户: admin"]', 'admin')
    await page.fill('input[placeholder="密码: admin"]', 'admin')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })
  })

  test('重现 XML 格式化丢失问题', async ({ page }) => {
    const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'

    console.log('\n========== 开始诊断 ==========')

    // 访问编辑器
    await page.goto(url)
    await page.waitForTimeout(2000)

    // 监听控制台日志，捕获 formatXml 的调用
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('ParaDesigner') || msg.text().includes('formatXml')) {
        logs.push(msg.text())
      }
    })

    // ========== 第一次保存 ==========
    console.log('\n📝 第一次保存流程开始...')

    // 找到第 69 行并点击铅笔图标
    await page.click('.CodeMirror-line:nth-child(69) .design-icon')
    await page.waitForTimeout(1000)

    // 点击"DM引用"按钮
    await page.click('button:has-text("DM引用")')
    await page.waitForTimeout(500)

    // 选择第一条记录
    await page.click('.ant-table-row:first-child')
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(500)

    // 点击保存按钮
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    // 获取第 69 行的 XML 内容
    const firstSaveXml = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      const line69 = cm.getLine(68) // 0-based
      return line69
    })

    console.log('\n✅ 第一次保存后的 XML（第69行）:')
    console.log(firstSaveXml)
    console.log('换行数:', (firstSaveXml.match(/\n/g) || []).length)
    console.log('是否格式化:', firstSaveXml.includes('\n') ? '是' : '否')

    // ========== 第二次保存 ==========
    console.log('\n📝 第二次保存流程开始...')

    // 再次点击第 69 行铅笔图标
    await page.click('.CodeMirror-line:nth-child(69) .design-icon')
    await page.waitForTimeout(1000)

    // 直接点击保存（不做任何修改）
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    // 获取第 69 行的 XML 内容
    const secondSaveXml = await page.evaluate(() => {
      const cm = window.cmInstance || document.querySelector('.CodeMirror').CodeMirror
      const line69 = cm.getLine(68) // 0-based
      return line69
    })

    console.log('\n❌ 第二次保存后的 XML（第69行）:')
    console.log(secondSaveXml)
    console.log('换行数:', (secondSaveXml.match(/\n/g) || []).length)
    console.log('是否格式化:', secondSaveXml.includes('\n') ? '是' : '否')

    // ========== 分析结果 ==========
    console.log('\n========== 诊断结果 ==========')
    console.log('第一次保存格式化:', firstSaveXml.includes('\n') ? '✅' : '❌')
    console.log('第二次保存格式化:', secondSaveXml.includes('\n') ? '✅' : '❌')
    console.log('格式是否一致:', firstSaveXml === secondSaveXml ? '✅' : '❌')

    // 输出相关日志
    console.log('\n========== 控制台日志 ==========')
    logs.forEach(log => console.log(log))

    // 断言：第二次保存应该保持格式化
    expect(secondSaveXml.includes('\n')).toBe(true)
  })

  test('深度分析：html2para 的输出', async ({ page }) => {
    const url = 'http://localhost:3000/ietm/dm-content-editor/2118574906139455490?mode=edit&dmc=DMC-ZB1-A-08-00-00-00A-007A-A_001-01_zh-CN'

    console.log('\n========== 深度分析：html2para 输出 ==========')

    await page.goto(url)
    await page.waitForTimeout(2000)

    // 捕获详细的调试日志
    const debugLogs = {
      step1_html2para: [],
      step2_wrapPara: [],
      step3_formatXml: []
    }

    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Step 1 - html2para')) {
        debugLogs.step1_html2para.push(text)
      } else if (text.includes('Step 2 - 包裹para')) {
        debugLogs.step2_wrapPara.push(text)
      } else if (text.includes('Step 3 - formatXml')) {
        debugLogs.step3_formatXml.push(text)
      }
    })

    // 第一次保存
    await page.click('.CodeMirror-line:nth-child(69) .design-icon')
    await page.waitForTimeout(1000)
    await page.click('button:has-text("DM引用")')
    await page.waitForTimeout(500)
    await page.click('.ant-table-row:first-child')
    await page.click('button:has-text("确定")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    console.log('\n📊 第一次保存 - html2para 输出:')
    console.log(debugLogs.step1_html2para.join('\n'))

    // 清空日志
    debugLogs.step1_html2para = []
    debugLogs.step2_wrapPara = []
    debugLogs.step3_formatXml = []

    // 第二次保存
    await page.click('.CodeMirror-line:nth-child(69) .design-icon')
    await page.waitForTimeout(1000)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    console.log('\n📊 第二次保存 - html2para 输出:')
    console.log(debugLogs.step1_html2para.join('\n'))

    console.log('\n========== 分析完成 ==========')
  })
})
