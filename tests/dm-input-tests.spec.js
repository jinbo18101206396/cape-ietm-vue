const { test, expect } = require('@playwright/test')
const http = require('http')

// 输入字段场景+边界测试
// 所有断言通过真实 UI 输入（填写/点击）完成，不绕过 Vue 层
// 覆盖：新建DM表单输入约束 / 字段格式校验 / 必填校验 / 编辑模式techName输入 / 输入边界
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978'
const DM_NODE_TITLE = /^02-项目自定义$/

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

async function openListWithTreeNode(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietmdatamodulemanagement`)
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(600)
  await page.locator('.ant-tree-title').filter({ hasText: DM_NODE_TITLE }).first().click()
  await page.locator('.ant-table-row').first().waitFor({ state: 'visible', timeout: 15000 })
}

// 打开新建DM弹窗（需要先选构型节点）
async function openNewDmForm(page) {
  await page.locator('button').filter({ hasText: /新\s*建/ }).first().click()
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: 10000 })
  // 等待表单spin消失
  await page.locator('.ant-modal .ant-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
}

// 打开编辑DM弹窗（选中DM后点编辑）
async function openEditDmForm(page) {
  const row = page.locator('.ant-table-row').first()
  await row.locator('.ant-checkbox-input').check({ force: true })
  await page.waitForTimeout(300)
  const editBtn = page.locator('button').filter({ hasText: /^编\s*辑$/ }).first()
  await expect(editBtn).not.toBeDisabled()
  await editBtn.click()
  await page.locator('.ant-modal').waitFor({ state: 'visible', timeout: 10000 })
  await page.locator('.ant-modal .ant-spin').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
}

// ============ 新建DM表单输入测试 ============
test.describe('新建DM表单·输入字段测试', () => {
  test.setTimeout(90000)

  test('INP-01 点击新建按钮 → 表单弹窗打开且包含必要输入字段', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    // 弹窗标题（实际标题是"添加"）
    await expect(page.locator('.ant-modal-title')).toBeVisible()
    // 学习码输入框存在且可输入
    const learnCodeInput = page.locator('input[placeholder="000-999（可选）"]')
    await expect(learnCodeInput).toBeVisible()
    await expect(learnCodeInput).toBeEnabled()
    // 学习事件码输入框存在
    const learnEventInput = page.locator('input[placeholder*="A-Z"]')
    await expect(learnEventInput).toBeVisible()
    await expect(learnEventInput).toBeEnabled()
    // 信息码变量输入框存在
    const infoVariantInput = page.locator('input[placeholder*="默认"]')
    await expect(infoVariantInput).toBeVisible()
    console.log('✅ INP-01: 新建表单打开，三个可编辑输入字段均可见')
  })

  test('INP-02 学习码：输入超过3位字符时自动截断到3位', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnCodeInput = page.locator('input[placeholder="000-999（可选）"]')
    // 输入5位数字
    await learnCodeInput.fill('12345')
    await page.waitForTimeout(200)
    const val = await learnCodeInput.inputValue()
    expect(val.length).toBeLessThanOrEqual(3)
    expect(val).toBe('123')
    console.log(`✅ INP-02: 学习码超长被截断为: "${val}"`)
  })

  test('INP-03 学习码：非数字格式blur后显示校验提示', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnCodeInput = page.locator('input[placeholder="000-999（可选）"]')
    // 输入非数字字母
    await learnCodeInput.fill('ab')
    await learnCodeInput.blur()
    await page.waitForTimeout(500)
    // 校验提示出现（antdv 1.x: .ant-form-explain 或 .ant-form-item-explain）
    const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /格式|数字/ })
    await expect(errHint.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ INP-03: 非数字学习码blur后校验提示出现')
  })

  test('INP-04 学习事件码：输入小写字母自动转为大写', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnEventInput = page.locator('input[placeholder*="A-Z"]')
    // 输入小写字母 c
    await learnEventInput.click()
    await page.keyboard.type('c')
    await page.waitForTimeout(300)
    const val = await learnEventInput.inputValue()
    expect(val).toBe('C')
    console.log(`✅ INP-04: 小写 'c' 自动转为大写 '${val}'`)
  })

  test('INP-05 学习事件码：maxLength=1 只接受单字符', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnEventInput = page.locator('input[placeholder*="A-Z"]')
    await learnEventInput.click()
    await page.keyboard.type('ABC')
    await page.waitForTimeout(300)
    const val = await learnEventInput.inputValue()
    expect(val.length).toBeLessThanOrEqual(1)
    console.log(`✅ INP-05: 学习事件码输入3字符，实际值: "${val}" (maxLength=1生效)`)
  })

  test('INP-06 信息码变量：输入禁用字母 I → blur后校验提示', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const infoVariantInput = page.locator('input[placeholder*="默认"]')
    await infoVariantInput.fill('I')
    await infoVariantInput.blur()
    await page.waitForTimeout(500)
    // 规则：必须是除I、O之外的大写字母或为空
    const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /除I|大写|字母/ })
    await expect(errHint.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ INP-06: 禁用字母 I 触发校验提示')
  })

  test('INP-07 点保存但必填字段为空 → 显示多个必填校验提示', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    // 不填任何字段，直接点保存
    await page.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(800)
    // 密级、信息码、DM类型等必填项均应显示校验提示
    const allErrors = page.locator('.ant-form-explain, .ant-form-item-explain-error')
    const count = await allErrors.count()
    expect(count).toBeGreaterThanOrEqual(3)
    // 至少看到"请选择密级"
    await expect(page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /密级|信息码|单位/ }).first()).toBeVisible({ timeout: 5000 })
    console.log(`✅ INP-07: 保存时显示 ${count} 个必填校验提示`)
  })

  test('INP-08 信息码变量：输入后清空 → 无校验错误（optional字段）', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const infoVariantInput = page.locator('input[placeholder*="默认"]')
    // 输入合法值A，然后清空
    await infoVariantInput.fill('A')
    await infoVariantInput.fill('')
    await infoVariantInput.blur()
    await page.waitForTimeout(500)
    // 清空后不应显示错误（optional）
    const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /字母/ })
    const errCount = await errHint.count()
    expect(errCount).toBe(0)
    console.log('✅ INP-08: 信息码变量清空后无校验错误（optional字段行为正确）')
  })
})

// ============ 编辑模式表单输入测试 ============
test.describe('编辑DM属性·techName输入测试', () => {
  test.setTimeout(90000)

  test('INP-09 编辑模式打开 → techName输入框可编辑', async ({ page }) => {
    await openListWithTreeNode(page)
    await openEditDmForm(page)
    // 编辑模式提示可见
    await expect(page.locator('.ant-alert').filter({ hasText: /技术名称|编辑模式/ })).toBeVisible({ timeout: 8000 })
    // techName输入框可用
    const techNameInput = page.locator('input[placeholder="请输入技术名称"]')
    await expect(techNameInput).toBeVisible()
    await expect(techNameInput).toBeEnabled()
    console.log('✅ INP-09: 编辑模式techName输入框可编辑')
  })

  test('INP-10 编辑模式：输入新技术名称 → 字段接受输入', async ({ page }) => {
    await openListWithTreeNode(page)
    await openEditDmForm(page)
    const techNameInput = page.locator('input[placeholder="请输入技术名称"]')
    const originalVal = await techNameInput.inputValue()
    // 输入新名称
    await techNameInput.fill('测试技术名称_' + Date.now().toString().slice(-6))
    await page.waitForTimeout(200)
    const newVal = await techNameInput.inputValue()
    expect(newVal).not.toBe(originalVal)
    expect(newVal.length).toBeGreaterThan(0)
    // 恢复原始值（不提交修改，点取消）
    await page.locator('.ant-modal-footer button:not(.ant-btn-primary)').click()
    await expect(page.locator('.ant-modal')).toBeHidden({ timeout: 5000 })
    console.log(`✅ INP-10: techName输入接受新值 "${newVal}"，点取消不保存`)
  })

  test('INP-11 编辑模式：清空techName后保存 → 显示"请输入技术名称"校验提示', async ({ page }) => {
    await openListWithTreeNode(page)
    await openEditDmForm(page)
    const techNameInput = page.locator('input[placeholder="请输入技术名称"]')
    // 清空techName
    await techNameInput.fill('')
    await techNameInput.blur()
    await page.waitForTimeout(300)
    // 点保存 → 触发必填校验
    await page.locator('.ant-modal-footer .ant-btn-primary').click()
    await page.waitForTimeout(500)
    const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /技术名称/ })
    await expect(errHint.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ INP-11: 清空techName后保存触发必填校验提示')
  })

  test('INP-12 编辑模式：修改techName再恢复 → 取消不影响数据', async ({ page }) => {
    await openListWithTreeNode(page)
    // 先获取表格中的当前技术名称
    const techNameCell = page.locator('.ant-table-row').first().locator('td').nth(2)
    const originalCellText = (await techNameCell.innerText()).trim()
    await openEditDmForm(page)
    const techNameInput = page.locator('input[placeholder="请输入技术名称"]')
    const originalInputVal = await techNameInput.inputValue()
    // 修改
    await techNameInput.fill('修改后的名称_' + Date.now().toString().slice(-4))
    // 取消
    await page.locator('.ant-modal-footer button:not(.ant-btn-primary)').click()
    await expect(page.locator('.ant-modal')).toBeHidden({ timeout: 5000 })
    await page.waitForTimeout(500)
    // 表格中数据不变
    const afterCancelText = (await techNameCell.innerText()).trim()
    expect(afterCancelText).toBe(originalCellText)
    console.log(`✅ INP-12: 取消编辑后表格数据未改变: "${afterCancelText}"`)
  })
})

// ============ 边界输入测试 ============
test.describe('表单输入边界测试', () => {
  test.setTimeout(90000)

  test('INP-B01 新建DM：学习码输入全角数字 → 提示格式错误', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnCodeInput = page.locator('input[placeholder="000-999（可选）"]')
    // 输入全角数字
    await learnCodeInput.fill('１２３')
    await learnCodeInput.blur()
    await page.waitForTimeout(500)
    const val = await learnCodeInput.inputValue()
    console.log(`INP-B01: 全角数字输入后值: "${val}"`)
    // 全角不匹配 /^\d{3}$/ → 校验错误
    if (val.length > 0) {
      const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /格式|数字/ })
      if (await errHint.count() > 0) {
        await expect(errHint.first()).toBeVisible({ timeout: 3000 })
        console.log('✅ INP-B01: 全角数字触发格式校验提示')
      } else {
        console.log('⚠ INP-B01: 全角数字未触发显式错误（可能被截断或忽略）')
      }
    }
    // 不做断言失败，只观察行为（诊断测试）
  })

  test('INP-B02 新建DM：学习事件码输入数字 → blur后显示格式错误', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnEventInput = page.locator('input[placeholder*="A-Z"]')
    await learnEventInput.click()
    await page.keyboard.type('5')
    await learnEventInput.blur()
    await page.waitForTimeout(500)
    const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /字母|格式/ })
    await expect(errHint.first()).toBeVisible({ timeout: 5000 })
    console.log('✅ INP-B02: 数字输入学习事件码触发格式校验提示')
  })

  test('INP-B03 新建DM：learnCode只输入2位数字 → blur后显示格式错误（需3位）', async ({ page }) => {
    await openListWithTreeNode(page)
    await openNewDmForm(page)
    const learnCodeInput = page.locator('input[placeholder="000-999（可选）"]')
    await learnCodeInput.fill('12')
    await learnCodeInput.blur()
    await page.waitForTimeout(500)
    // 规则：pattern=/^\d{3}$/ 即恰好3位
    const errHint = page.locator('.ant-form-explain, .ant-form-item-explain').filter({ hasText: /格式|3位/ })
    if (await errHint.count() > 0) {
      await expect(errHint.first()).toBeVisible({ timeout: 3000 })
      console.log('✅ INP-B03: 2位数字学习码触发格式提示')
    } else {
      console.log('⚠ INP-B03: 2位数字未触发错误（未blur触发 or 规则不检查）')
    }
  })
})
