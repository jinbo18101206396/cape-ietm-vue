/**
 * 签出流程 - Stale Snapshot 修复验证
 *
 * 背景：启动流程后 loadData 只刷新 dataSource，antd-vue 的 onChange 不会因数据源变化重新触发，
 * 导致 selectedRows 停留在启动前的旧快照（workflowStatus 为空），签出时前端 Gate-2 误判为"未启动流程"。
 *
 * 修复：loadData 后调用 syncSelectedRows()，按 selectedRowKeys 从最新 dataSource 重新映射 selectedRows。
 */

const { test, expect } = require('@playwright/test')
const http = require('http')

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'

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
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

test.describe('签出流程 - Stale Snapshot 修复验证', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    // 注入 token 到 localStorage
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])
  })

  test('启动流程后不重新勾选直接签出应成功', async ({ page }) => {
    // 1. 导航到数据模块管理页面
    await page.goto(`${BASE}/ietmdatamodulemanagement`)
    await page.waitForSelector('.ant-tree', { timeout: 30000 })
    await page.waitForTimeout(1000)

    // 2. 选中第一个可见的树节点（点击树节点文字）
    const firstTreeTitle = page.locator('.ant-tree-title').first()
    await firstTreeTitle.waitFor({ state: 'visible', timeout: 10000 })
    await firstTreeTitle.click()
    await page.waitForTimeout(1500) // 等待列表刷新
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

    // 5. 选中列表第一条 DM
    const firstCheckbox = page.locator('.ant-table-tbody tr').first().locator('.ant-checkbox-input')
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 6. 记录选中 DM 的 DMC
    const firstRow = page.locator('.ant-table-tbody tr').first()
    const dmcCode = await firstRow.locator('td').nth(2).textContent()
    console.log('选中的 DM DMC:', dmcCode?.trim())

    // 7. 点击"启动流程"按钮
    const startFlowBtn = page.locator('button:has-text("启动流程")')
    await expect(startFlowBtn).toBeEnabled({ timeout: 5000 })
    await startFlowBtn.click()

    // 8. 等待启动流程弹窗
    await page.waitForSelector('.ant-modal:has-text("批量启动流程")', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 9. 选择流程模板（点击第一个模板）
    const templateRadio = page.locator('.ant-radio-input').first()
    if (await templateRadio.isVisible().catch(() => false)) {
      await templateRadio.check()
      await page.waitForTimeout(1000) // 等待节点加载
    }

    // 10. 点击确定启动流程
    const modalOkBtn = page.locator('.ant-modal-footer button.ant-btn-primary:has-text("确定")')
    await modalOkBtn.click()

    // 11. 等待成功提示
    await page.waitForSelector('.ant-message:has-text("保存成功")', { timeout: 5000 })
    await page.waitForTimeout(2000) // 等待列表刷新和 syncSelectedRows 执行

    // 12. 关键验证：不重新勾选，直接点击"签出"按钮
    const checkOutBtn = page.locator('button:has-text("签出")')
    await expect(checkOutBtn).toBeEnabled({ timeout: 5000 })
    await checkOutBtn.click()

    // 13. 预期：应该出现签出确认弹窗，而不是"未启动流程"的警告
    const checkOutModal = page.locator('.ant-modal:has-text("签出确认")')
    await expect(checkOutModal).toBeVisible({ timeout: 5000 })

    // 14. 验证弹窗内容包含版本信息
    await expect(checkOutModal.locator('text=当前版本')).toBeVisible()
    await expect(checkOutModal.locator('text=签出后版本')).toBeVisible()

    // 15. 取消签出
    const cancelBtn = checkOutModal.locator('button:has-text("取消")')
    await cancelBtn.click()

    console.log('✅ 测试通过：启动流程后不重新勾选，直接签出能正常弹出确认窗口')
  })

  test('翻页后 syncSelectedRows 应剔除不在当前页的选中项', async ({ page }) => {
    // 导航到数据模块管理页面
    await page.goto(`${BASE}/ietmdatamodulemanagement`)
    await page.waitForSelector('.ant-tree', { timeout: 30000 })
    await page.waitForTimeout(1000)

    // 选中第一个可见的树节点
    const firstTreeTitle = page.locator('.ant-tree-title').first()
    await firstTreeTitle.waitFor({ state: 'visible', timeout: 10000 })
    await firstTreeTitle.click()
    await page.waitForTimeout(1500)

    // 等待列表
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

    // 勾选第一条记录
    const firstCheckbox = page.locator('.ant-table-tbody tr').first().locator('.ant-checkbox-input')
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 记录选中数量
    const selectedCount1 = await page.locator('.ant-table-row-selected').count()
    expect(selectedCount1).toBe(1)

    // 翻页到第2页
    const nextPageBtn = page.locator('.ant-pagination-next')
    if (await nextPageBtn.isVisible().catch(() => false) && await nextPageBtn.isEnabled().catch(() => false)) {
      await nextPageBtn.click()
      await page.waitForTimeout(1500)

      // 验证：第2页不应该有选中态
      const selectedCount2 = await page.locator('.ant-table-row-selected').count()
      expect(selectedCount2).toBe(0)

      console.log('✅ 测试通过：翻页后选中项正确剔除')
    } else {
      console.log('⚠️ 跳过翻页测试：数据不足一页')
    }
  })

  test('验证前端 Gate-2 仍然阻止未启动流程的 DM 签出', async ({ page }) => {
    // Mock 列表接口，将 workflowStatus 置空
    await page.route('**/ietm/datamodule/list**', async route => {
      const resp = await route.fetch()
      const json = await resp.json()
      if (json && json.result && Array.isArray(json.result.records)) {
        json.result.records.forEach(r => { r.workflowStatus = null })
      }
      await route.fulfill({ json })
    })

    // 导航到数据模块管理页面
    await page.goto(`${BASE}/ietmdatamodulemanagement`)
    await page.waitForSelector('.ant-tree', { timeout: 30000 })
    await page.waitForTimeout(1000)

    // 选中第一个可见的树节点
    const firstTreeTitle = page.locator('.ant-tree-title').first()
    await firstTreeTitle.waitFor({ state: 'visible', timeout: 10000 })
    await firstTreeTitle.click()
    await page.waitForTimeout(1500)

    // 等待列表
    await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

    // 勾选第一条记录
    const firstCheckbox = page.locator('.ant-table-tbody tr').first().locator('.ant-checkbox-input')
    await firstCheckbox.check()
    await page.waitForTimeout(500)

    // 点击签出按钮
    const checkOutBtn = page.locator('button:has-text("签出")')
    await expect(checkOutBtn).toBeEnabled({ timeout: 5000 })
    await checkOutBtn.click()
    await page.waitForTimeout(500)

    // 预期：应该出现"该DM还未启动流程"警告
    const warningMsg = page.locator('.ant-message:has-text("该DM还未启动流程")')
    await expect(warningMsg).toBeVisible({ timeout: 3000 })

    console.log('✅ 测试通过：前端 Gate-2 正确阻止未启动流程的 DM 签出')
  })
})
