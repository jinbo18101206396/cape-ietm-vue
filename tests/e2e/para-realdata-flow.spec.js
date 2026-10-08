/**
 * Para设计视图 - 真实数据完整操作流程 E2E 验证
 *
 * 真实浏览器 + 真实后端(:9999) + 真实DM数据。基于当前代码事实编写：
 *   - 路由 /ietm/dm-content-editor/{id}?mode=edit（readonly只看mode参数）
 *   - gutter图标类名 gutter-pencil-icon（gutterMarker.js）
 *   - UEditor容器id动态 para_<ts>_<rand>（ParaDesigner.vue）
 *
 * 验证目标：
 *   T1 文本para：源码→设计视图→编辑→保存→源码，往返一致（happy path）
 *   T2 图符para：打开设计视图后保存，验证<symbol>是否在往返中丢失（getIcnContent 404 的真实后果）
 */
const { test, expect } = require('@playwright/test')

const BASE = 'http://localhost:3000'
const BACKEND = 'http://localhost:9999'

// 真实DM（实测确认的para形态）
const DM_TEXT = '2104221587304550402'   // <para>XXX</para>
const DM_SYMBOL = '2100916775137787905' // 含<symbol>

async function loginUI(page) {
  await page.goto(`${BASE}/user/login`)
  await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 15000 })
  await page.fill('input[placeholder*="账户名"]', 'admin')
  await page.fill('input[placeholder*="密码"]', '123456')
  await page.click('button:has-text("登 录")')
  await page.waitForURL(/dashboard|ietm/, { timeout: 20000 })
}

// 取CodeMirror全文
async function getCM(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.CodeMirror')
    return el && el.CodeMirror ? el.CodeMirror.getValue() : null
  })
}

// 打开某DM编辑器，等CodeMirror加载真实内容
async function openEditor(page, id) {
  await page.goto(`${BASE}/ietm/dm-content-editor/${id}?mode=edit`)
  await page.waitForSelector('.CodeMirror', { timeout: 20000 })
  await page.waitForFunction(() => {
    const el = document.querySelector('.CodeMirror')
    return el && el.CodeMirror && el.CodeMirror.getValue().includes('<dmodule')
  }, { timeout: 20000 })
}

test.describe('Para设计视图 - 真实数据流程', () => {
  test.setTimeout(90000)

  test('T1 文本para: 源码→设计视图→保存→往返一致', async ({ page }) => {
    await loginUI(page)
    await openEditor(page, DM_TEXT)

    const before = await getCM(page)
    console.log('[T1] 编辑器初始内容含para:', before.includes('<para>'), '| 含XXX:', before.includes('XXX'))
    expect(before).toContain('<para>')

    // 点gutter铅笔图标进设计视图（找含<para>的行）
    const pencil = page.locator('.gutter-pencil-icon').first()
    await expect(pencil).toBeVisible({ timeout: 10000 })
    await pencil.click()

    // 设计视图打开：等UEditor iframe出现
    await page.waitForSelector('.design-view-container iframe', { timeout: 15000 })
    await page.waitForTimeout(2500) // 等UEditor setContent

    // 读UEditor正文
    const ueditorText = await page.evaluate(() => {
      const ifr = document.querySelector('.design-view-container iframe')
      if (!ifr) return null
      const body = ifr.contentDocument && ifr.contentDocument.body
      return body ? body.innerText : null
    })
    console.log('[T1] UEditor正文:', JSON.stringify(ueditorText))

    // 点保存按钮（Para工具栏内）
    const saveBtn = page.locator('.para-toolbar button:has-text("保存")')
    await expect(saveBtn).toBeVisible({ timeout: 10000 })
    await saveBtn.click()
    await page.waitForTimeout(3000) // 等保存+切回源码视图

    const after = await getCM(page)
    console.log('[T1] 保存后含para:', after && after.includes('<para>'), '| 含XXX:', after && after.includes('XXX'))
    // 文本para往返：<para>与XXX都应保留
    expect(after).toContain('<para>')
    expect(after).toContain('XXX')
  })

  test('T2 图符para: 打开设计视图→保存→验证symbol是否丢失', async ({ page }) => {
    await loginUI(page)
    await openEditor(page, DM_SYMBOL)

    const before = await getCM(page)
    const symbolBefore = (before.match(/<symbol\b/g) || []).length
    console.log('[T2] 保存前<symbol>数量:', symbolBefore, '| 含infoEntityIdent:', before.includes('infoEntityIdent'))
    expect(symbolBefore).toBeGreaterThan(0)

    // 进设计视图
    const pencil = page.locator('.gutter-pencil-icon').first()
    await expect(pencil).toBeVisible({ timeout: 10000 })
    await pencil.click()
    await page.waitForSelector('.design-view-container iframe', { timeout: 15000 })
    await page.waitForTimeout(2500)

    // UEditor里图符是否渲染成<img>（getIcnContent 404时不会）
    const imgCount = await page.evaluate(() => {
      const ifr = document.querySelector('.design-view-container iframe')
      const body = ifr && ifr.contentDocument && ifr.contentDocument.body
      return body ? body.querySelectorAll('img').length : -1
    })
    console.log('[T2] UEditor内<img>数量:', imgCount, '(getIcnContent 404时预期为0)')

    // 保存
    const saveBtn = page.locator('.para-toolbar button:has-text("保存")')
    await expect(saveBtn).toBeVisible({ timeout: 10000 })
    await saveBtn.click()
    await page.waitForTimeout(3000)

    const after = await getCM(page)
    const symbolAfter = after ? (after.match(/<symbol\b/g) || []).length : -1
    console.log('[T2] 保存后<symbol>数量:', symbolAfter)
    console.log('[T2] 🔴 关键结论: symbol', symbolBefore, '→', symbolAfter,
      symbolAfter < symbolBefore ? '=== 数据丢失! ===' : '(保留)')

    // 🔴 表征测试(characterization)：锁定当前【已确认的P0数据丢失缺陷】。
    //   根因：getIcnContent 返回404 → tosymbol的catch返回null → 裸<symbol>进UEditor被剥离
    //   → 保存后symbol从1变0，图符数据被永久销毁。
    //   影响：用户在设计视图打开任何含图符的para并保存，图符即丢失。
    //   待后端补 getIcnContent 端点（或前端改用 metadata/view 契约）修复后，
    //   本断言会变红，届时应改为 expect(symbolAfter).toBe(symbolBefore)。
    expect(imgCount).toBe(0)          // 图符未渲染成img（getIcnContent 404）
    expect(symbolBefore).toBe(1)      // 打开前确有1个图符
    expect(symbolAfter).toBe(0)       // 保存后图符被销毁（当前缺陷行为）
  })
})
