/**
 * “批量重新启动流程”弹框 —— 纯 UI 交互 场景 + 边界 测试
 *
 * 硬性要求：不绕过 Vue 层。
 *   - 弹框通过“真实勾选合格DM行 + 真实点击‘发布后重启流程’按钮”打开（不调用 show()）
 *   - 所有交互均为真实 点击/输入
 *   - 所有断言均读 DOM（渲染的 tag / 表格行 / toast 提示），或拦截真实 POST 请求校验载荷
 *   - 提交类用例用 route.fulfill 拦截，避免真正重启数据库中的流程（非破坏性）
 *
 * 覆盖：
 *   场景1 打开弹框（真实按钮）→ 初始1个“创建”节点
 *   场景2 添加节点 → 行数增加、seqno 递增
 *   场景3 创建节点(seqno=0)删除保护（P1 bug 回归）
 *   场景4 普通节点可删除
 *   场景5 创建节点“处理方式”禁用（一致性）
 *   场景6 可跳转节点下拉含前序节点
 *   场景7 《不限制》↔具体节点 互斥
 *   场景8 《不限制》↔《不可跳转》互斥
 *   边界1 重启原因为空 → 拦截提示
 *   边界2 节点名称为空 → 拦截提示
 *   边界3 正常提交 → 拦截 POST，校验 ifgetback 后端格式 + 节点结构
 *
 * @requires 前端 http://localhost:3000 + 后端 http://localhost:9999
 */
const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'

// 含合格DM的项目在首页“打开项目”列表中的索引（探测确认：索引1）
const ELIGIBLE_PROJECT_INDEX = 1

/**
 * 全真实设置链：登录 → 首页打开含数据的项目 → 进DM列表 → 展开构型树 → 点节点加载DM。
 * 全程真实点击，不注入任何数据；数据就绪判定读 vm 仅用于同步等待。
 */
async function gotoList(page) {
  await page.goto(`${BASE_URL}/user/login`, { waitUntil: 'networkidle' })
  await page.fill('#username', 'admin')
  await page.fill('#password', '123456')
  await page.click('button:has-text("登")')
  await page.waitForURL(u => !u.toString().includes('/user/login'), { timeout: 15000 })
  await page.waitForTimeout(2000)

  // 首页“手册项目”卡片：真实点击“打开项目” + 确认
  const openBtns = page.locator('button:visible:has-text("打开项目"), a:visible:has-text("打开项目")')
  await openBtns.first().waitFor({ state: 'visible', timeout: 10000 })
  await openBtns.nth(ELIGIBLE_PROJECT_INDEX).click()
  await page.waitForTimeout(700)
  await page.locator('.ant-modal .ant-btn-primary').first().click() // 确认弹框(“确 认”)
  await page.waitForTimeout(2500)

  // 进入“项目数据模块管理”
  await page.locator('.ant-menu-submenu-title:has-text("项目管理"), .ant-menu-item:has-text("项目管理")').first().click()
  await page.waitForTimeout(600)
  const leaf = page.locator('.ant-menu-item:has-text("项目数据模块管理")').first()
  await leaf.waitFor({ state: 'visible', timeout: 10000 })
  await leaf.click()
  await page.waitForURL(u => u.toString().includes('ietmdatamodulemanagement'), { timeout: 15000 })
  await page.waitForTimeout(2500)

  // 展开构型树，逐个点击节点直到 DM 列表加载出合格行
  for (let pass = 0; pass < 6; pass++) {
    const c = await page.locator('.ant-tree-switcher_close').count()
    if (c === 0) break
    for (let i = 0; i < c; i++) {
      const sw = page.locator('.ant-tree-switcher_close').first()
      if (await sw.count() === 0) break
      await sw.click().catch(() => {})
      await page.waitForTimeout(350)
    }
  }
  // 逐个点击树节点，每次点击后多轮轮询数据就绪；两轮遍历兜底时序抖动
  const nodes = page.locator('.ant-tree-node-content-wrapper')
  for (let round = 0; round < 2; round++) {
    const n = await nodes.count()
    for (let i = 0; i < Math.min(n, 40); i++) {
      await nodes.nth(i).click().catch(() => {})
      for (let poll = 0; poll < 3; poll++) {
        await page.waitForTimeout(700)
        if (await findEligibleRowId(page)) return
      }
    }
  }
}

/** 读取一条满足重启门禁的真实DM id（仅用于决定点击哪一行，不注入数据） */
async function findEligibleRowId(page) {
  return page.evaluate(() => {
    const root = document.getElementById('app').__vue__
    let vm = null
    const walk = (c) => {
      if (!c) return
      if (c.$options && c.$options.name === 'IetmDataModuleList') { vm = c; return }
      ;(c.$children || []).forEach(walk)
    }
    walk(root)
    if (!vm) return null
    const cur = vm.currentUser
    const row = (vm.dataSource || []).find(r =>
      (r.workflowStatus === '0' || r.workflowStatus === '9') &&
      parseInt(r.issueNo || '0') > 0 && r.inWork === '00' &&
      (!r.createBy || r.createBy === cur))
    return row ? row.id : null
  })
}

/** 真实点击：勾选目标行复选框 + 点“发布后重启流程”按钮，打开弹框 */
async function openRestartModalByRealClick(page) {
  // 以 vm.dataSource 就绪为准重试查找合格行（列表数据异步加载，比等 DOM 更可靠）
  let rowId = null
  for (let i = 0; i < 15 && !rowId; i++) {
    rowId = await findEligibleRowId(page)
    if (!rowId) await page.waitForTimeout(1000)
  }
  if (!rowId) {
    const diag = await page.evaluate(() => {
      const root = document.getElementById('app').__vue__
      let vm = null
      const walk = (c) => { if (!c) return; if (c.$options && c.$options.name === 'IetmDataModuleList') { vm = c; return } ;(c.$children || []).forEach(walk) }
      walk(root)
      return {
        url: location.hash || location.pathname,
        vmFound: !!vm,
        dsLen: vm ? (vm.dataSource || []).length : -1,
        treeNodes: document.querySelectorAll('.ant-tree-node-content-wrapper').length,
        openBtns: Array.from(document.querySelectorAll('button,a')).filter(b => b.innerText.trim() === '打开项目').length
      }
    })
    throw new Error('无合格DM，诊断=' + JSON.stringify(diag))
  }
  // 数据就绪后，等对应行挂载到 DOM（可能在可视区外，用 attached 而非 visible）
  await page.waitForSelector(`.ant-table-tbody tr[data-row-key="${rowId}"]`, { state: 'attached', timeout: 10000 })
  // antd 真实 input 视觉隐藏(opacity:0)，点击可见的 .ant-checkbox 外壳(force 兜底)
  const checkbox = page.locator(`.ant-table-tbody tr[data-row-key="${rowId}"] .ant-checkbox`).first()
  await checkbox.scrollIntoViewIfNeeded()
  await checkbox.click({ force: true })
  await page.waitForTimeout(300)
  const btn = page.locator('button:has-text("发布后重启流程")').first()
  await expect(btn).toBeEnabled({ timeout: 5000 })
  await btn.click()
  await page.waitForSelector('.ant-modal-title:has-text("批量重新启动流程")', { timeout: 10000 })
  await page.waitForTimeout(400)
}

/** 弹框内点“添加节点” n 次 */
async function addNodes(page, n) {
  for (let i = 0; i < n; i++) {
    await page.click('.ant-modal button:has-text("添加节点")')
    await page.waitForTimeout(200)
  }
}

/** 打开第 rowIndex(0基) 行的“可跳转节点”下拉（每行最后一个 select），返回可见选项 locator */
async function openIfgetbackDropdown(page, rowIndex) {
  const row = page.locator('.ant-modal tbody tr').nth(rowIndex)
  await row.locator('.ant-select').last().click()
  await page.waitForTimeout(300)
  return page.locator('.ant-select-dropdown:visible .ant-select-dropdown-menu-item')
}

test.describe('批量重启-纯UI场景与边界', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    await gotoList(page)
    await openRestartModalByRealClick(page)
  })

  test('场景1: 真实按钮打开弹框，初始含1个"创建"节点', async ({ page }) => {
    const rows = page.locator('.ant-modal tbody tr')
    await expect(rows).toHaveCount(1)
    // 创建节点名称输入框回显“创建”
    const val = await rows.nth(0).locator('input').first().inputValue()
    expect(val).toBe('创建')
  })

  test('场景2: 添加节点后行数增加、seqno 递增(0/10/20)', async ({ page }) => {
    await addNodes(page, 2)
    const rows = page.locator('.ant-modal tbody tr')
    await expect(rows).toHaveCount(3)
    // 第一列为顺序号纯文本
    const seq0 = (await rows.nth(0).locator('td').first().innerText()).trim()
    const seq1 = (await rows.nth(1).locator('td').first().innerText()).trim()
    const seq2 = (await rows.nth(2).locator('td').first().innerText()).trim()
    expect(seq0).toBe('0')
    expect(seq1).toBe('10')
    expect(seq2).toBe('20')
  })

  test('场景3(P1回归): 创建节点(seqno=0)不可删除，点击无效且行数不变', async ({ page }) => {
    await addNodes(page, 1) // 创建(0) + 普通(10)
    const rows = page.locator('.ant-modal tbody tr')
    await expect(rows).toHaveCount(2)
    // 创建节点行的“删除”应为禁用态（span，非可点 a）
    const createDelete = rows.nth(0).locator('td').last()
    const hasClickableLink = await createDelete.locator('a:has-text("删除")').count()
    expect(hasClickableLink).toBe(0) // 无可点击的 <a>
    await expect(createDelete.locator('span:has-text("删除")')).toBeVisible()
    // 尝试点击该 span，行数不应变化
    await createDelete.locator('span:has-text("删除")').click({ force: true }).catch(() => {})
    await page.waitForTimeout(300)
    await expect(rows).toHaveCount(2)
  })

  test('场景4: 普通节点可正常删除', async ({ page }) => {
    await addNodes(page, 1) // 创建(0)+普通(10)
    const rows = page.locator('.ant-modal tbody tr')
    await expect(rows).toHaveCount(2)
    await rows.nth(1).locator('td').last().locator('a:has-text("删除")').click()
    await page.waitForTimeout(300)
    await expect(rows).toHaveCount(1)
    // 剩下的仍是创建节点
    const seq0 = (await rows.nth(0).locator('td').first().innerText()).trim()
    expect(seq0).toBe('0')
  })

  test('场景5(一致性): 创建节点"处理方式"下拉禁用', async ({ page }) => {
    const rows = page.locator('.ant-modal tbody tr')
    // 创建节点行的 nodetype select（第3列）应带 disabled 类
    const nodetypeCell = rows.nth(0).locator('td').nth(2)
    await expect(nodetypeCell.locator('.ant-select-disabled')).toBeVisible()
  })

  test('场景6: 可跳转节点下拉含前序节点(创建/审核)，不含自己', async ({ page }) => {
    await addNodes(page, 2)
    const rows = page.locator('.ant-modal tbody tr')
    await rows.nth(1).locator('input').first().fill('审核')
    await rows.nth(2).locator('input').first().fill('签批')
    const options = await openIfgetbackDropdown(page, 2) // 签批行
    const texts = await options.allTextContents()
    expect(texts.some(t => t.includes('不限制'))).toBe(true)
    expect(texts.some(t => t.includes('不可跳转'))).toBe(true)
    expect(texts.some(t => t.includes('创建'))).toBe(true)
    expect(texts.some(t => t.includes('审核'))).toBe(true)
    expect(texts.some(t => t === '签批')).toBe(false)
  })

  test('场景7: 《不限制》与具体节点互斥(真实点击，断言渲染tag)', async ({ page }) => {
    await addNodes(page, 2)
    const rows = page.locator('.ant-modal tbody tr')
    await rows.nth(1).locator('input').first().fill('审核')
    await rows.nth(2).locator('input').first().fill('签批')
    // 签批行：默认《不限制》。选具体节点“创建”，《不限制》应被互斥掉
    let opts = await openIfgetbackDropdown(page, 2)
    await opts.filter({ hasText: '创建' }).first().click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    const tags = await rows.nth(2).locator('.ant-select-selection__choice__content').allTextContents()
    expect(tags.some(t => t.includes('不限制'))).toBe(false)
    expect(tags.some(t => t.includes('创建'))).toBe(true)
  })

  test('场景8: 《不限制》↔《不可跳转》互斥切换', async ({ page }) => {
    await addNodes(page, 1)
    const rows = page.locator('.ant-modal tbody tr')
    let opts = await openIfgetbackDropdown(page, 1) // 普通节点行，默认《不限制》
    await opts.filter({ hasText: '不可跳转' }).first().click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    const tags = await rows.nth(1).locator('.ant-select-selection__choice__content').allTextContents()
    expect(tags.some(t => t.includes('不可跳转'))).toBe(true)
    expect(tags.some(t => t.includes('不限制'))).toBe(false)
  })

  test('边界1: 重启原因为空 → 提示且不发请求', async ({ page }) => {
    let posted = false
    await page.route('**/batchRestartFlow', route => { posted = true; route.abort() })
    // 清空自动填充的重启原因
    const reason = page.locator('.ant-modal textarea').first()
    await reason.fill('')
    await page.click('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")')
    await page.waitForTimeout(500)
    await expect(page.locator('.ant-message').filter({ hasText: '重启原因' })).toBeVisible()
    expect(posted).toBe(false)
  })

  test('边界2: 节点名称为空 → 提示且不发请求', async ({ page }) => {
    let posted = false
    await page.route('**/batchRestartFlow', route => { posted = true; route.abort() })
    await addNodes(page, 1)
    // 新增普通节点(seqno=10)名称留空；填处理人以隔离“名称为空”这一条
    const rows = page.locator('.ant-modal tbody tr')
    await rows.nth(1).locator('input').nth(1).fill('u1') // 处理人ID列
    await rows.nth(1).locator('input').nth(2).fill('张三') // 处理人姓名列
    await page.click('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")')
    await page.waitForTimeout(500)
    await expect(page.locator('.ant-message').filter({ hasText: '节点名称' })).toBeVisible()
    expect(posted).toBe(false)
  })

  test('边界3: 正常提交 → 拦截POST，校验载荷(ifgetback后端格式)', async ({ page }) => {
    let payload = null
    await page.route('**/batchRestartFlow', route => {
      payload = JSON.parse(route.request().postData() || '{}')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: '成功重启 1 条流程', result: '1' })
      })
    })
    // 创建节点已自动填充处理人(admin)。补一个审核节点并选“可跳转=创建”
    await addNodes(page, 1)
    const rows = page.locator('.ant-modal tbody tr')
    await rows.nth(1).locator('input').first().fill('审核') // 名称
    await rows.nth(1).locator('input').nth(1).fill('admin') // 处理人ID
    await rows.nth(1).locator('input').nth(2).fill('管理员') // 处理人姓名
    // 审核行可跳转选“创建”(seqno=0)
    const opts = await openIfgetbackDropdown(page, 1)
    await opts.filter({ hasText: '创建' }).first().click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')

    await page.click('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")')
    await page.waitForTimeout(800)

    expect(payload).not.toBeNull()
    expect(Array.isArray(payload.dataList)).toBe(true)
    expect(payload.dataList.length).toBe(1)
    expect(Array.isArray(payload.nodes)).toBe(true)
    // 创建节点 seqno=0，ifgetback 空串(不限制)
    const create = payload.nodes.find(n => n.seqno === 0)
    expect(create).toBeTruthy()
    expect(create.ifgetback === '' || create.ifgetback == null).toBe(true)
    // 审核节点 seqno=10，ifgetback 应为后端格式 '0'（不含 __UI标记__）
    const review = payload.nodes.find(n => n.seqno === 10)
    expect(review).toBeTruthy()
    expect(review.ifgetback).toBe('0')
    expect(String(review.ifgetback).includes('__')).toBe(false)
    // 成功提示
    await expect(page.locator('.ant-message').filter({ hasText: '成功重启' })).toBeVisible()
  })
})
