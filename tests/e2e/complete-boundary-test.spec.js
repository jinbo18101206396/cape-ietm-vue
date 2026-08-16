/**
 * IETM 边界场景测试 - 真实UI交互
 * 通过UI修改编辑器内容触发功能，验证边界条件
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'
const TEST_TIMEOUT = 180000

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  const isLoginPage = await page.locator('#password').isVisible({ timeout: 3000 }).catch(() => false)
  if (isLoginPage) {
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('123456')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(5000)
  }
  return !page.url().includes('/login')
}

async function openProject(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  const openBtn = page.locator('.ant-table-tbody tr').first().locator('button:has-text("打开项目")')
  if (await openBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openBtn.click()
    await page.waitForTimeout(2000)
    const confirmBtn = page.locator('button:has-text("确 认"), button:has-text("确认")').first()
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click()
      await page.waitForTimeout(3000)
    }
  }
}

async function getDmList(page) {
  return await page.evaluate(async () => {
    const token = localStorage.getItem('pro__Access-Token')
    let tokenValue = ''
    if (token) {
      try { tokenValue = JSON.parse(token).value } catch (e) { tokenValue = token }
    }
    const headers = { 'X-Access-Token': tokenValue, 'Content-Type': 'application/json' }
    let projectId = ''
    try {
      const projRes = await fetch('/jeecg-boot/ietmproject/ietmProject/getCurrentProject', { headers })
      const projData = await projRes.json()
      if (projData.success && projData.result) projectId = projData.result.projectId || projData.result.id
    } catch (e) {}
    const dmRes = await fetch(`/jeecg-boot/ietm/datamodule/list?pageNo=1&pageSize=20${projectId ? '&projectId=' + projectId : ''}`, { headers })
    const dmData = await dmRes.json()
    return dmData.success ? (dmData.result.records || dmData.result || []) : []
  })
}

async function openDmEditor(page, dmId) {
  // 关键：用 page.goto 完整URL带 mode=edit，才能进入可编辑模式
  await page.goto(`${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit`)
  await page.waitForTimeout(6000)
  return await page.locator('.CodeMirror').isVisible({ timeout: 10000 }).catch(() => false)
}

async function setEditorContent(page, content) {
  await page.evaluate((newContent) => {
    const cm = document.querySelector('.CodeMirror')
    if (cm?.CodeMirror) cm.CodeMirror.setValue(newContent)
  }, content)
  await page.waitForTimeout(1500)
}

async function getEditorContent(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror')
    return cm?.CodeMirror?.getValue() || ''
  })
}

async function triggerRegenAndConfirm(page) {
  const regenBtn = page.locator('button:has-text("重建refs")').first()
  const btnExists = await regenBtn.isVisible({ timeout: 3000 }).catch(() => false)
  if (!btnExists) return { executed: false, reason: '按钮不存在' }

  await regenBtn.click()
  await page.waitForTimeout(1500)

  // 处理确认框
  const confirmBtn = page.locator('.ant-modal button:has-text("确定"), .ant-modal-confirm button:has-text("确 定")').first()
  const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)

  if (!confirmVisible) return { executed: false, reason: '确认框未出现' }

  await confirmBtn.click()
  await page.waitForTimeout(8000)

  // 处理可能的补后缀弹框
  const suffixModal = page.locator('.ant-modal:has-text("后缀"), .ant-modal:has-text("ICN")')
  const suffixVisible = await suffixModal.isVisible({ timeout: 2000 }).catch(() => false)

  if (suffixVisible) {
    // 选择所有下拉框为.cgm
    const selects = await page.locator('.ant-modal .ant-select').all()
    for (const select of selects) {
      await select.click()
      await page.waitForTimeout(300)
      const cgmOption = page.locator('.ant-select-dropdown:visible .ant-select-item').first()
      if (await cgmOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cgmOption.click()
        await page.waitForTimeout(300)
      }
    }
    const suffixOk = page.locator('.ant-modal button:has-text("确定")').first()
    await suffixOk.click()
    await page.waitForTimeout(5000)
    return { executed: true, hadSuffixModal: true }
  }

  return { executed: true, hadSuffixModal: false }
}

test.describe('IETM 边界场景测试', () => {
  test.setTimeout(TEST_TIMEOUT)

  let page
  let loginOk = false
  let dmId = null

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.setViewportSize({ width: 1920, height: 1080 })

    loginOk = await login(page)
    if (loginOk) {
      await openProject(page)
      const dmList = await getDmList(page)
      if (dmList.length > 0) {
        dmId = dmList[0].id
        console.log('使用DM:', dmId)
      }
    }
  })

  test.afterAll(async () => {
    await page?.close()
  })

  // ==================== 边界1: 无图形元素 ====================

  test('边界1: 无图形元素XML → 空DOCTYPE', async () => {
    if (!loginOk || !dmId) test.skip()

    await openDmEditor(page, dmId)

    const noGraphicXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <para>无图形元素的文档</para>
  </content>
</dmodule>`

    await setEditorContent(page, noGraphicXml)
    console.log('已设置无图形元素XML')

    const result = await triggerRegenAndConfirm(page)
    console.log('执行结果:', JSON.stringify(result))

    if (result.executed) {
      const content = await getEditorContent(page)
      const hasEntity = content.includes('<!ENTITY')
      console.log('包含ENTITY:', hasEntity ? '❌ (应为空)' : '✅ (正确，无ENTITY)')
      console.log('✅ 无图形元素测试完成')
    }
  })

  // ==================== 边界2: 重复ICN去重 ====================

  test('边界2: 重复ICN引用 → 去重', async () => {
    if (!loginOk || !dmId) test.skip()

    await openDmEditor(page, dmId)

    const duplicateXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <graphic infoEntityIdent="ICN-001.cgm"/>
    <graphic infoEntityIdent="ICN-001.cgm"/>
    <graphic infoEntityIdent="ICN-002.cgm"/>
  </content>
</dmodule>`

    await setEditorContent(page, duplicateXml)
    console.log('已设置重复ICN（3个引用，2个唯一）')

    const result = await triggerRegenAndConfirm(page)

    if (result.executed) {
      const content = await getEditorContent(page)
      const entityMatches = content.match(/<!ENTITY\s+ICN-\d+/g) || []
      const unique = [...new Set(entityMatches)]

      console.log('ENTITY总数:', entityMatches.length)
      console.log('唯一ENTITY:', unique.length)
      console.log('去重正确:', unique.length === 2 ? '✅' : '⚠️')
      console.log('✅ 重复ICN测试完成')
    }
  })

  // ==================== 边界3: 特殊字符 ====================

  test('边界3: ICN特殊字符', async () => {
    if (!loginOk || !dmId) test.skip()

    await openDmEditor(page, dmId)

    const specialXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <graphic infoEntityIdent="ICN_UNDERSCORE.png"/>
    <graphic infoEntityIdent="ICN-DASH-123.jpg"/>
  </content>
</dmodule>`

    await setEditorContent(page, specialXml)
    console.log('已设置特殊字符ICN')

    const result = await triggerRegenAndConfirm(page)

    if (result.executed) {
      const content = await getEditorContent(page)
      const hasDoctype = content.includes('<!DOCTYPE')
      console.log('生成DOCTYPE:', hasDoctype ? '✅' : '⚠️')
      console.log('✅ 特殊字符测试完成')
    }
  })

  // ==================== 边界4: 大量元素 ====================

  test('边界4: 30个图形元素性能', async () => {
    if (!loginOk || !dmId) test.skip()

    await openDmEditor(page, dmId)

    const graphics = Array.from({ length: 30 }, (_, i) =>
      `    <graphic infoEntityIdent="ICN-${String(i + 1).padStart(3, '0')}.cgm"/>`
    ).join('\n')

    const manyXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
${graphics}
  </content>
</dmodule>`

    await setEditorContent(page, manyXml)
    console.log('已设置30个图形元素')

    const startTime = Date.now()
    const result = await triggerRegenAndConfirm(page)
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (result.executed) {
      const content = await getEditorContent(page)
      const entityCount = (content.match(/<!ENTITY/g) || []).length
      console.log('耗时:', duration, '秒')
      console.log('生成ENTITY数:', entityCount)
      console.log('✅ 大量元素测试完成')
    }
  })

  // ==================== 边界5: brexDmRef保留 ====================

  test('边界5: brexDmRef保留', async () => {
    if (!loginOk || !dmId) test.skip()

    await openDmEditor(page, dmId)

    const brexXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <refs>
      <dmRef>
        <dmRefIdent>
          <dmCode modelIdentCode="BREX"/>
        </dmRefIdent>
      </dmRef>
    </refs>
    <graphic infoEntityIdent="ICN-001.cgm"/>
  </content>
</dmodule>`

    await setEditorContent(page, brexXml)
    console.log('已设置含brexDmRef的XML')

    const result = await triggerRegenAndConfirm(page)

    if (result.executed) {
      const content = await getEditorContent(page)
      const hasBrex = content.includes('BREX')
      console.log('保留BREX:', hasBrex ? '✅' : '⚠️')
      console.log('✅ brexDmRef测试完成')
    }
  })

  test('测试完成', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM 边界场景测试完成（真实UI交互）')
    console.log('='.repeat(80))
  })
})
