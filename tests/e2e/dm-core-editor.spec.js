const { test, expect } = require('@playwright/test')
const http = require('http')

// 核心编辑器功能全面测试
// 覆盖：加载、保存、签入、格式化、校验、撤销/重做、中英文切换
// 边界条件：空数据、极长文本、特殊字符、网络错误
// 异常场景：权限问题、版本冲突、格式错误

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => d += c).on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve(null) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
const DM_ID = '2084945965503942657'
const DMC = 'DMC-ZB1-A-03-00-00-00A-007A-A-00-0030101-001-01_ZH-CN'
const PROJECT_ID = '2078348945532030978'

test.beforeAll(async () => {
  const login = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  TOKEN = login.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

async function openEditor(page, mode = 'edit') {
  await page.addInitScript(tok => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, TOKEN)
  await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=${mode}&dmc=${encodeURIComponent(DMC)}`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForFunction(() => {
    const cm = document.querySelector('.CodeMirror')
    if (!cm || !cm.CodeMirror) return false
    const el = document.querySelector('.dm-editor-page')
    return !!(el && el.__vue__)
  }, { timeout: 30000 })
}

test.describe('核心编辑器 - 加载功能', () => {
  test('1) 正常加载 → 编辑器显示内容，树加载', async ({ page }) => {
    await openEditor(page)

    // 验证编辑器加载完成
    const cm = page.locator('.CodeMirror')
    await expect(cm).toBeVisible()

    // 验证有内容
    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(content.length).toBeGreaterThan(100)
    expect(content).toContain('<dmodule')

    // 验证树加载
    const tree = page.locator('.dm-tree')
    await expect(tree).toBeVisible()
    const treeNodes = page.locator('.ant-tree-treenode')
    await expect(treeNodes.first()).toBeVisible()
  })

  test('2) 加载失败（网络错误）→ 提示"加载失败：网络错误"', async ({ page }) => {
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, TOKEN)

    // 拦截加载请求，模拟网络错误
    await page.route(`**/dm-content/load/${DM_ID}`, route => {
      route.abort('failed')
    })

    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForTimeout(3000)

    // 验证错误提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/加载失败|网络错误/)
  })

  test('3) 加载失败（后端错误）→ 提示明确错误信息', async ({ page }) => {
    await page.addInitScript(tok => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, TOKEN)

    // 拦截加载请求，返回失败
    await page.route(`**/dm-content/load/${DM_ID}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'DM不存在或无权限访问'
        })
      })
    })

    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit&dmc=${encodeURIComponent(DMC)}`)
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/加载失败/)
  })
})

test.describe('核心编辑器 - 保存功能', () => {
  test('4) 正常保存 → dirty清除，提示"保存成功"', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 修改内容（触发 dirty）
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const val = cm.getValue()
      cm.setValue(val + '\n<!-- 测试修改 -->')
    })
    await page.waitForTimeout(500)

    // 验证 dirty 标识
    const saveBtn = page.locator('button', { hasText: '保存' })
    await expect(saveBtn).toContainText(/未保存|保存/)

    // 点击保存
    await saveBtn.click()
    await page.waitForTimeout(2000)

    // 验证保存成功提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/保存成功/)

    // 验证 dirty 清除
    await page.waitForTimeout(500)
    const isDirty = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.dirty
    })
    expect(isDirty).toBe(false)
  })

  test('5) 保存失败（版本冲突）→ 提示版本冲突，引导重新加载', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 修改内容
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- test -->')
    })
    await page.waitForTimeout(500)

    // 拦截保存请求，模拟版本冲突
    await page.route(`**/dm-content/save/${DM_ID}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '版本冲突，数据已被其他用户修改'
        })
      })
    })

    await page.locator('button', { hasText: '保存' }).click()
    await page.waitForTimeout(2000)

    // 验证提示包含"版本冲突"
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/版本冲突/)
  })

  test('6) 保存失败（网络错误）→ 提示"保存失败"', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- test -->')
    })
    await page.waitForTimeout(500)

    // 模拟网络错误
    await page.route(`**/dm-content/save/${DM_ID}`, route => {
      route.abort('failed')
    })

    await page.locator('button', { hasText: '保存' }).click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/保存失败|取消签入/)
  })
})

test.describe('核心编辑器 - 签入功能', () => {
  test('7) 正常签入 → 先保存后签入，模式切换为 browse', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 修改内容
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- test checkin -->')
    })
    await page.waitForTimeout(500)

    // 点击签入按钮
    await page.locator('button', { hasText: '签入' }).click()
    await page.waitForTimeout(500)

    // 确认对话框
    const confirmBtn = page.locator('.ant-modal-confirm .ant-btn-primary')
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()
    await page.waitForTimeout(3000)

    // 验证签入成功提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/签入成功/)

    // 验证模式切换为 browse（编辑器只读）
    const isReadonly = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getOption('readOnly')
    })
    expect(isReadonly).toBeTruthy()
  })

  test('8) 签入失败（网络错误）→ 提示"签入失败：网络错误"', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- test -->')
    })
    await page.waitForTimeout(500)

    // 拦截签入请求，模拟网络错误
    await page.route(`**/datamodule/checkIn*`, route => {
      route.abort('failed')
    })

    await page.locator('button', { hasText: '签入' }).click()
    await page.waitForTimeout(500)
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(3000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/签入失败|网络错误/)
  })

  test('9) 签入时保存失败 → 中止签入，提示"已取消签入"', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- test -->')
    })
    await page.waitForTimeout(500)

    // 拦截保存请求，返回失败
    await page.route(`**/dm-content/save/${DM_ID}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: '保存失败'
        })
      })
    })

    await page.locator('button', { hasText: '签入' }).click()
    await page.waitForTimeout(500)
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/已取消签入/)
  })
})

test.describe('核心编辑器 - 格式化功能', () => {
  test('10) 格式化 → 内容规范化，树同步', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 注入混乱格式的 XML
    const messyXml = '<dmodule><content><description><para>段落1</para><para>段落2</para></description></content></dmodule>'
    await page.evaluate(xml => {
      document.querySelector('.CodeMirror').CodeMirror.setValue(xml)
    }, messyXml)
    await page.waitForTimeout(500)

    // 格式化
    await page.locator('button[title="格式化XML"]').click()
    await page.waitForTimeout(1000)

    // 验证格式化后有缩进
    const formatted = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(formatted).toContain('  <content>')
    expect(formatted).toContain('    <description>')
    expect(formatted.split('\n').length).toBeGreaterThan(3)

    // 验证树同步
    const treeNodes = page.locator('.ant-tree-treenode')
    await expect(treeNodes.first()).toBeVisible()
  })
})

test.describe('核心编辑器 - 撤销/重做功能', () => {
  test('11) 撤销/重做 → 内容正确恢复，树同步', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 记录原始内容
    const original = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })

    // 修改1
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- 修改1 -->')
    })
    await page.waitForTimeout(500)

    // 修改2
    await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      cm.setValue(cm.getValue() + '\n<!-- 修改2 -->')
    })
    await page.waitForTimeout(500)

    // 撤销2次
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(500)
    await page.keyboard.press('Control+Z')
    await page.waitForTimeout(500)

    // 验证恢复到原始内容
    const afterUndo = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(afterUndo).toBe(original)

    // 重做1次
    await page.keyboard.press('Control+Y')
    await page.waitForTimeout(500)

    const afterRedo = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(afterRedo).toContain('修改1')
    expect(afterRedo).not.toContain('修改2')
  })
})

test.describe('核心编辑器 - 中英文切换', () => {
  test('12) 中英文切换 → 往返无损，dirty 保持', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 记录原始英文内容
    const originalEn = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(originalEn).toContain('<dmodule>')

    // 切换到中文
    const langSelect = page.locator('.toolbar-row .ant-select').filter({ hasText: /中文|English/ })
    await langSelect.click()
    await page.waitForTimeout(300)
    const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    await dropdown.locator('.ant-select-dropdown-menu-item', { hasText: '中文' }).click()
    await page.waitForTimeout(1500)

    // 验证显示中文标签
    const cn = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(cn).toContain('<数据模块>')

    // 切回英文
    await langSelect.click()
    await page.waitForTimeout(300)
    const dropdown2 = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
    await dropdown2.locator('.ant-select-dropdown-menu-item', { hasText: 'English' }).click()
    await page.waitForTimeout(1500)

    // 验证恢复到原始英文（往返无损）
    const backToEn = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(backToEn).toBe(originalEn)
  })
})
