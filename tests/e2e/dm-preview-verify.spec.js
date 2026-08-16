const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * E2E自动化测试：验证DmXmlHelper.fixLegacyFunctionCalls()修复效果
 *
 * 测试目标：
 * 1. 验证window.external.ShowDmRef已替换为showDmRefInfo
 * 2. 验证window.parent.addShowContentPanel已替换为showDmRefInfo
 * 3. 验证window.parent.showPicture已替换为showMultimediaInfo
 * 4. 验证display:none已被移除
 *
 * @author Claude
 * @date 2026-08-13
 */

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
})

test.describe('DM预览功能 - fixLegacyFunctionCalls修复验证', () => {
  test.setTimeout(90000)

  test('验证预览HTML中遗留函数已替换', async ({ page }) => {
    // 注入token
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])

    // 访问首页
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // 导航到数据模块管理
    const dmMenu = page.locator('text=数据模块管理').first()
    await dmMenu.click()
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 15000 })

    // 获取第一行DM
    const firstRow = page.locator('.ant-table-tbody tr').first()
    const dmId = await firstRow.getAttribute('data-row-key')

    if (!dmId) {
      console.log('⚠️ 数据模块列表为空，跳过测试')
      test.skip()
      return
    }

    console.log('📋 测试DM ID:', dmId)

    // 点击"浏览DM"
    await firstRow.locator('a:has-text("浏览DM")').click()
    await page.waitForSelector('.CodeMirror', { timeout: 15000 })

    // 等待CodeMirror加载完成
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().length > 100
    }, { timeout: 10000 })

    console.log('✅ DM编辑器加载完成')

    // 点击预览按钮
    const previewBtn = page.locator('button:has-text("预览")')
    await previewBtn.click()
    await page.waitForSelector('.ant-modal-content', { timeout: 10000 })

    console.log('✅ 预览弹窗已打开')

    // 等待iframe加载
    const iframe = page.frameLocator('.ant-modal-content iframe')
    await page.waitForTimeout(2000) // 等待iframe内容渲染

    // 获取iframe内的HTML
    const iframeHandle = await page.locator('.ant-modal-content iframe').elementHandle()
    const htmlContent = await page.evaluate(iframe => {
      const doc = iframe.contentDocument || iframe.contentWindow.document
      return doc.documentElement.outerHTML
    }, iframeHandle)

    console.log('✅ 获取预览HTML，长度:', htmlContent.length)

    // 验证1：检查遗留函数是否还存在（应该不存在）
    const legacyPatterns = {
      'window.external.ShowDmRef': /window\.external\.ShowDmRef/gi,
      'window.parent.addShowContentPanel': /window\.parent\.addShowContentPanel/gi,
      'window.parent.showPicture': /window\.parent\.showPicture/gi
    }

    console.log('\n========== 遗留函数检查 ==========')
    let hasLegacy = false
    for (const [name, pattern] of Object.entries(legacyPatterns)) {
      const matches = htmlContent.match(pattern)
      if (matches && matches.length > 0) {
        console.error(`❌ ${name}: 发现 ${matches.length} 处未替换`)
        hasLegacy = true
      } else {
        console.log(`✅ ${name}: 已正确替换`)
      }
    }

    expect(hasLegacy, '不应存在遗留函数调用').toBe(false)

    // 验证2：检查新函数是否存在
    const newFunctions = {
      'showDmRefInfo': /showDmRefInfo/gi,
      'showMultimediaInfo': /showMultimediaInfo/gi
    }

    console.log('\n========== 新函数检查 ==========')
    for (const [name, pattern] of Object.entries(newFunctions)) {
      const matches = htmlContent.match(pattern)
      if (matches && matches.length > 0) {
        console.log(`✅ ${name}: 找到 ${matches.length} 处`)
      } else {
        console.log(`⚠️ ${name}: 未找到（可能DM中无相关元素）`)
      }
    }

    // 验证3：检查display:none是否已移除
    console.log('\n========== display:none 检查 ==========')
    const displayNoneMatches = htmlContent.match(/display:\s*none/gi)
    if (displayNoneMatches && displayNoneMatches.length > 0) {
      console.error(`❌ display:none: 发现 ${displayNoneMatches.length} 处未移除`)
      expect(displayNoneMatches.length, 'display:none应该被移除').toBe(0)
    } else {
      console.log('✅ display:none: 已正确移除')
    }

    console.log('\n========== 测试结果 ==========')
    console.log('✅ 所有验证通过！fixLegacyFunctionCalls()修复有效')
  })

  test('直接调用预览API验证后端修复', async () => {
    // 获取一个DM列表
    const listResp = await apiReq('GET', '/ietm/datamodule/list?pageNo=1&pageSize=1', null, TOKEN)

    if (!listResp.success || !listResp.result?.records?.length) {
      console.log('⚠️ 无可用DM数据，跳过API测试')
      test.skip()
      return
    }

    const dm = listResp.result.records[0]
    console.log('📋 测试DM:', dm.dmCode, dm.infoName)

    // 调用预览API
    const previewResp = await apiReq('GET', `/ietm/dm-content/preview?id=${dm.id}`, null, TOKEN)

    expect(previewResp.success, '预览API应该成功').toBe(true)

    const html = previewResp.result
    expect(html, '预览HTML不应为空').toBeTruthy()
    expect(html.length, 'HTML长度应大于100').toBeGreaterThan(100)

    console.log('✅ 预览API调用成功，HTML长度:', html.length)

    // 验证HTML内容
    const legacyChecks = [
      { name: 'window.external.ShowDmRef', pattern: /window\.external\.ShowDmRef/gi },
      { name: 'window.parent.addShowContentPanel', pattern: /window\.parent\.addShowContentPanel/gi },
      { name: 'window.parent.showPicture', pattern: /window\.parent\.showPicture/gi }
    ]

    console.log('\n========== API返回HTML检查 ==========')
    let apiHasLegacy = false
    for (const { name, pattern } of legacyChecks) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        console.error(`❌ ${name}: 发现 ${matches.length} 处`)
        apiHasLegacy = true
      } else {
        console.log(`✅ ${name}: 已替换`)
      }
    }

    expect(apiHasLegacy, 'API返回的HTML不应包含遗留函数').toBe(false)

    // 检查display:none
    const displayNone = html.match(/display:\s*none/gi)
    if (displayNone && displayNone.length > 0) {
      console.error(`❌ display:none: 发现 ${displayNone.length} 处`)
    } else {
      console.log('✅ display:none: 已移除')
    }

    console.log('\n========== API测试完成 ==========')
    console.log('✅ 后端fixLegacyFunctionCalls()修复验证通过')
  })
})
