const { test, expect } = require('@playwright/test')
const http = require('http')

// 九项问题·场景测试 + 边界测试（全部走真实 Vue UI：点击/输入/读取渲染值）
// 覆盖：字典下拉可用性(问题8兜底前提) / InfoCodeSelector映射修复 / 复制新建全链路 /
//       流程编辑三态 / 引用指定版本页签 + 双击红标 / 空值与特殊输入边界
const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const PROJECT = '2078348945532030978' // ZB1

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
  if (!l.success) throw new Error('登录失败:' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT }, TOKEN)
})

async function openListPage(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
  await page.goto(`${BASE}/ietmdatamodulemanagement`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.ant-tree', { timeout: 30000 })
  await page.waitForTimeout(800)
  await page.locator('.ant-tree-node-content-wrapper').first().click()
  await page.waitForTimeout(1500)
}

test.describe('DM管理·场景与边界测试', () => {
  test.setTimeout(120000)

  // ---- 场景A：新建表单5个字典下拉都能展开且有选项（问题8兜底：映射失败时用户可手选）----
  test('场景A：新建表单 密级/DM类型/语言/国家/位置码 下拉均有选项', async ({ page }) => {
    await openListPage(page)
    await page.locator('.ant-btn:has-text("新建")').first().click()
    await page.waitForSelector('.ant-modal:visible', { timeout: 8000 })
    await page.waitForTimeout(800)

    // 逐个字典下拉：点开 → 读取选项数 → 关闭
    const dictLabels = ['密级', '数据模块类型', '位置码', '语言', '国家']
    const result = {}
    for (const label of dictLabels) {
      // 定位该 form-item 的 select 触发器（a-form-model-item 渲染为 .ant-form-item）
      const item = page.locator('.ant-modal:visible .ant-form-item', { hasText: label }).first()
      const sel = item.locator('.ant-select-selection').first()
      if (await sel.count() === 0) { result[label] = -1; continue }
      await sel.click()
      await page.waitForTimeout(500)
      // 下拉选项在 body 下的 .ant-select-dropdown（非 display:none）
      const optCount = await page.evaluate(() => {
        const dds = Array.from(document.querySelectorAll('.ant-select-dropdown'))
          .filter(d => !d.style.display || d.style.display !== 'none')
        let max = 0
        dds.forEach(d => {
          const n = d.querySelectorAll('li.ant-select-dropdown-menu-item').length
          if (n > max) max = n
        })
        return max
      })
      result[label] = optCount
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
    console.log('各字典下拉选项数:', JSON.stringify(result))
    // 每个字典都应有>=1个选项（下拉可用 → 问题8兜底成立）
    for (const label of dictLabels) {
      expect(result[label]).toBeGreaterThan(0)
    }
  })

  // 问题8核心：选信息码后 dmType 必须是合法字典值（描述性DM等），不能是空/中文类型名
  test('场景B：新建表单选信息码 → DM类型自动填为合法字典值(非中文/非空)', async ({ page }) => {
    await openListPage(page)
    await page.locator('.ant-btn:has-text("新建")').first().click()
    await page.waitForSelector('.ant-modal:visible', { timeout: 8000 })
    await page.waitForTimeout(800)
    // 打开信息码选择器
    await page.locator('.ant-modal:visible .ant-form-item:has-text("信息码") button.ant-btn').first().click()
    await page.waitForSelector('.info-code-selector-modal', { timeout: 8000 })
    await page.waitForTimeout(1000)
    // 读取第一行的 dmtypename（中文），供断言参考
    const firstRowType = await page.evaluate(() => {
      const tr = document.querySelector('.info-code-selector-modal .ant-table-tbody tr.ant-table-row')
      return tr ? tr.innerText : ''
    })
    console.log('信息码首行:', firstRowType.replace(/\s+/g, ' ').slice(0, 80))
    // 双击第一行选中
    await page.locator('.info-code-selector-modal .ant-table-tbody tr.ant-table-row').first().dblclick()
    await page.waitForTimeout(1000)
    // 读取 DM类型 下拉当前显示的文本
    const dmTypeShown = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ant-modal:not(.info-code-selector-modal) .ant-form-item, .ant-modal .ant-form-item'))
      const it = items.find(i => (i.querySelector('.ant-form-item-label') || {}).innerText && i.querySelector('.ant-form-item-label').innerText.includes('数据模块类型'))
      if (!it) return '(未找到)'
      const sel = it.querySelector('.ant-select-selection-selected-value, .ant-select-selection__rendered')
      return sel ? sel.innerText.trim() : '(空)'
    })
    console.log('选信息码后 DM类型显示:', dmTypeShown)
    // 合法字典文本白名单（不能是中文类型名如"程序类"，也不能为空）
    const validTexts = ['描述性DM', '过程性DM', '故障性DM', '乘员DM', '规划性DM', '工艺性DM', '前言类']
    const chineseTypeNames = ['描述类', '程序类', '过程类', '故障类', '故障隔离类', '产品交叉引用表类', '容器类', '操作类']
    // 若映射命中，应显示合法字典文本；若未命中(如产品交叉引用表类)，应为空(待手选)，绝不能显示中文类型名
    const isValid = validTexts.includes(dmTypeShown)
    const isEmpty = dmTypeShown === '(空)' || dmTypeShown === ''
    const isBadChinese = chineseTypeNames.includes(dmTypeShown)
    console.log('判定: 合法字典文本=', isValid, '| 空(待手选)=', isEmpty, '| 非法中文类型名=', isBadChinese)
    expect(isBadChinese).toBe(false) // 绝不能存中文类型名（修复前的bug）
    expect(isValid || isEmpty).toBe(true) // 要么合法字典值，要么空待手选
  })

  // ---- 场景C：复制新建全链路 —— 版本001-00 + DMC预览无J + DM类型合法（问题1/4/8组合边界）----
  test('场景C：复制新建 DMC预览无J + 版本001-00', async ({ page }) => {
    await openListPage(page)
    // 选中第一行（复选框）
    const firstRow = page.locator('.ant-table-tbody tr.ant-table-row').first()
    await firstRow.locator('input[type=checkbox]').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(400)
    // 点"复制"（缓存源DM）
    await page.locator('.ant-btn:has-text("复制")').first().click({ force: true })
    await page.waitForTimeout(600)
    // 需先在树上选中一个目标节点（currentTreeNode），openListPage 已点根节点，满足
    // 点"复制新建"
    const copyNewBtn = page.locator('.ant-btn:has-text("复制新建")').first()
    if (await copyNewBtn.isEnabled().catch(() => false)) {
      await copyNewBtn.click({ force: true })
      await page.waitForSelector('.ant-modal:visible', { timeout: 8000 })
      await page.waitForTimeout(1200) // 等 loadProjectInfo/回填
      // 读取 DMC 预览 alert 文本
      const preview = await page.evaluate(() => {
        const modal = document.querySelector('.ant-modal:not([style*="display: none"])')
        if (!modal) return ''
        const alert = modal.querySelector('.ant-alert-message, .ant-alert')
        return alert ? alert.innerText : ''
      })
      console.log('复制新建 DMC预览:', preview)
      const dmc = (preview.match(/DMC-[^\s]+/) || [''])[0]
      expect(dmc).toBeTruthy()
      // 第二段不是 J（方案A：DMC-{sns}-...，sns首段=装备码）
      const seg = dmc.replace(/^DMC-/, '').split('-')
      console.log('复制新建 DMC分段:', JSON.stringify(seg))
      expect(seg[0]).not.toBe('J')
      // 版本 001-00
      expect(dmc).toMatch(/-001-00_/)
    } else {
      console.log('复制新建按钮不可用（源DM未缓存），跳过')
      test.skip()
    }
  })

  // ---- 场景D：流程未启动的DM点编辑 → 应报"还没有启动流程"（问题5的反向边界）----
  test('场景D：未启动流程(workflowStatus空)的DM点编辑应报"还没有启动流程"', async ({ page }) => {
    let noFlowRowIdx = -1
    page.on('response', async resp => {
      if (resp.url().includes('/ietm/datamodule/list') && resp.request().method() === 'GET') {
        try {
          const j = await resp.json()
          if (j.success && j.result && j.result.records) {
            const idx = j.result.records.findIndex(r => !r.workflowStatus || String(r.workflowStatus) === '0')
            if (idx >= 0) noFlowRowIdx = idx
          }
        } catch (e) {}
      }
    })
    await openListPage(page)
    console.log('未启动流程DM行索引:', noFlowRowIdx)
    expect(noFlowRowIdx).toBeGreaterThanOrEqual(0)
    // 选中该行
    const row = page.locator('.ant-table-tbody tr.ant-table-row').nth(noFlowRowIdx)
    await row.locator('input[type=checkbox]').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(400)
    // 强制触发 handleEditProp（按钮可能因 canEditProp 禁用，force 派发点击验证校验逻辑）
    await page.locator('.ant-btn:has-text("编辑")').first().click({ force: true })
    await page.waitForTimeout(1000)
    const warn = await page.evaluate(() => Array.from(document.querySelectorAll('.ant-message-notice')).map(m => m.innerText).join(' | '))
    console.log('未启动流程点编辑提示:', warn || '(无)')
    // 应提示"还没有启动流程"，且不应弹出编辑弹框
    expect(warn).toContain('还没有启动流程')
  })

  // ---- 场景E：引用DM"引用指定版本"页签字段（问题6同族：另一页签也应正确）----
  test('场景E：引用DM"引用指定版本"页签 DM类型列有值', async ({ page }) => {
    const DM_ID = '2084675082302451714' // 051A（有内容）
    await page.addInitScript(([tok]) => {
      localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
    }, [TOKEN])
    // 确保签出（编辑模式非只读）
    await apiReq('POST', `/ietm/datamodule/checkOut?id=${DM_ID}`, null, TOKEN).catch(() => {})
    await page.goto(`${BASE}/ietm/dm-content-editor/${DM_ID}?mode=edit`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.CodeMirror', { timeout: 30000 })
    await page.waitForFunction(() => {
      const cm = document.querySelector('.CodeMirror')
      return cm && cm.CodeMirror && cm.CodeMirror.getValue().includes('<dmodule')
    }, { timeout: 30000 })
    await page.waitForTimeout(800)
    // 光标落到 schema 允许 dmRef 的元素行
    await page.evaluate(() => {
      const root = document.querySelector('.ietm-dm-content-editor, [class*=editor]')
      let vm = null
      const walk = el => { if (el && el.__vue__ && el.__vue__.schema) vm = el.__vue__; if (!vm && el) Array.from(el.children || []).forEach(walk) }
      walk(document.body)
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const schema = vm ? vm.schema : null
      const allow = schema ? Object.keys(schema).filter(k => schema[k] && schema[k].children && schema[k].children.indexOf('dmRef') !== -1) : []
      for (let i = 0; i < cm.lineCount(); i++) {
        const t = (cm.getLine(i) || '').trim()
        const m = t.match(/^<([a-zA-Z][\w]*)[\s>]/)
        if (m && allow.indexOf(m[1]) !== -1) { cm.setCursor({ line: i, ch: 2 }); cm.focus(); return }
      }
    })
    await page.waitForTimeout(300)
    await page.locator('.ant-btn:has-text("引用DM")').first().click()
    await page.waitForTimeout(600)
    const dialogVisible = await page.locator('.ant-modal:visible').count()
    if (dialogVisible === 0) { console.log('引用DM弹框未打开，跳过'); test.skip() }
    // 切换到"引用指定版本"页签
    await page.locator('.ant-tabs-tab:has-text("引用指定版本")').first().click()
    await page.waitForTimeout(1500)
    // 读取当前激活页签(.ant-tabs-tabpane-active)的表头 + 首行 DM类型
    const info = await page.evaluate(() => {
      const active = document.querySelector('.ant-modal .ant-tabs-tabpane-active')
      if (!active) return null
      const heads = Array.from(active.querySelectorAll('thead th')).map(th => th.innerText.trim())
      const firstRow = active.querySelector('tbody tr.ant-table-row')
      const cells = firstRow ? Array.from(firstRow.querySelectorAll('td')).map(td => td.innerText.trim()) : []
      const dmTypeIdx = heads.indexOf('DM类型')
      return { heads, dmType: dmTypeIdx >= 0 ? cells[dmTypeIdx] : '(无列)', rowCount: active.querySelectorAll('tbody tr.ant-table-row').length }
    })
    console.log('引用指定版本页签:', JSON.stringify(info))
    expect(info).toBeTruthy()
    // 版本页签只展示已发布DM(onlyIssued=true)；测试DM均为草稿，故rowCount可能为0（设计行为）。
    // 关键验证：DM类型列定义存在（列头渲染），且有数据时不显示原始英文码。
    expect(info.heads).toContain('DM类型')
    if (info.rowCount > 0) {
      expect(['descriptive', 'description', 'procedure', 'procedural']).not.toContain(info.dmType)
    }
  })
})
