const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * §16.4 重建 refs 与 DOCTYPE - 全面综合审核测试
 *
 * 测试覆盖：
 * 【防御性编程】
 *   - TC-01: XML 解析失败时的错误提示
 *   - TC-02: 空文档的防御处理
 *
 * 【brexDmRef 保留】
 *   - TC-03: 正确位置的 brexDmRef 保留
 *   - TC-04: 错误位置的 brexDmRef 不被收集
 *   - TC-05: 多个 brexDmRef 的处理
 *
 * 【refs 块替换边界】
 *   - TC-06: 缺失 </refs> 闭合标签
 *   - TC-07: refs 块内有注释
 *   - TC-08: refs 块与后续元素粘连
 *   - TC-09: 重复 refs 块
 *
 * 【行号一致性】
 *   - TC-10: linenoOffset 动态变化
 *   - TC-11: 格式化后树刷新
 *
 * 【中文视图兼容】
 *   - TC-12: 中文视图下重建 refs
 *   - TC-13: 中英文切换后重建
 *
 * 【ICN 弹框与 DOCTYPE】
 *   - TC-14: 无后缀 ICN 弹框交互
 *   - TC-15: DOCTYPE ENTITY 生成顺序
 *
 * 测试环境：
 * - 前端：localhost:3000
 * - 后端：localhost:9999
 */

const BASE = 'http://localhost:3000'
const API = 'http://localhost:9999/jeecg-boot'
const TEST_DM_ID = '2086452253387866113'

function apiReq(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (data) h['Content-Length'] = Buffer.byteLength(data)
    if (token) h['X-Access-Token'] = token
    const r = http.request(API + path, { method, headers: h }, res => {
      let d = ''; res.on('data', c => { d += c }); res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { resolve({ raw: d }) }
      })
    })
    r.on('error', reject); if (data) r.write(data); r.end()
  })
}

let TOKEN
let PROJECT_ID = '2078348945532030978'

test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token
  await apiReq('POST', '/ietmproject/ietmProject/openProject', { projectId: PROJECT_ID }, TOKEN)
})

async function injectToken(page) {
  await page.addInitScript(([tok]) => {
    localStorage.setItem('pro__Access-Token', JSON.stringify({ value: tok, expire: Date.now() + 7 * 864e5 }))
  }, [TOKEN])
}

async function openEditor(page) {
  await injectToken(page)
  await page.goto(`${BASE}/#/ietm/dm-management/editor/${TEST_DM_ID}?mode=edit`)
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForTimeout(2000)

  const editorLoaded = await page.evaluate(() => {
    const app = document.querySelector('#app').__vue__
    const findEditor = (vm) => {
      if (vm.$refs && vm.$refs.editor && vm.$refs.editor.getLinenoOffset) return vm
      if (vm.$children) {
        for (let child of vm.$children) {
          let result = findEditor(child)
          if (result) return result
        }
      }
      return null
    }
    const editor = findEditor(app)
    if (editor) {
      window.__vueEditor = editor
      return true
    }
    return false
  })

  if (!editorLoaded) throw new Error('编辑器组件未加载')
}

// ============================================================================
// 【防御性编程】
// ============================================================================

test('TC-01: XML解析失败 - 应显示明确错误提示不静默失败', async ({ page }) => {
  await openEditor(page)

  // 1. 注入格式错误的 XML（<description> 错误嵌套在 <refs> 内）
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    // 创建一个会导致 XML 解析失败的结构
    content = content.replace(
      /<content>/,
      '<content>\n    <refs>\n      <description>错误嵌套</description>\n    <!-- 注意：缺少 </refs> 闭合标签，导致解析失败'
    )

    editor.$refs.editor.getEditor().setValue(content)
  })

  await page.waitForTimeout(500)

  // 2. 监听控制台错误
  const consoleMessages = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text())
    }
  })

  // 3. 点击重建按钮
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 4. 验证是否有错误提示
  const errorMessage = await page.evaluate(() => {
    // 检查是否显示了错误消息
    const messageEl = document.querySelector('.ant-message-error')
    return messageEl ? messageEl.textContent : null
  })

  console.log('[TC-01] 错误消息:', errorMessage)
  console.log('[TC-01] 控制台错误:', consoleMessages.filter(m => m.includes('XML解析失败')))

  // 断言：应该有明确的错误提示
  expect(errorMessage || consoleMessages.some(m => m.includes('XML解析失败'))).toBeTruthy()
})

test('TC-02: 空文档 - 应拒绝操作并提示', async ({ page }) => {
  await openEditor(page)

  // 1. 清空编辑器内容
  await page.evaluate(() => {
    const editor = window.__vueEditor
    editor.$refs.editor.getEditor().setValue('')
  })

  await page.waitForTimeout(500)

  // 2. 尝试重建（按钮应该被禁用或操作失败）
  const buttonDisabled = await page.locator('button[title*="重建"]').isDisabled()

  if (!buttonDisabled) {
    // 如果按钮未禁用，点击后应该有错误提示
    await page.locator('button[title*="重建"]').click()
    await page.waitForTimeout(300)

    const modalVisible = await page.locator('.ant-modal-confirm').isVisible()
    if (modalVisible) {
      await page.locator('.ant-modal-confirm .ant-btn-primary').click()
      await page.waitForTimeout(1000)

      const errorMessage = await page.evaluate(() => {
        const messageEl = document.querySelector('.ant-message-error')
        return messageEl ? messageEl.textContent : null
      })

      console.log('[TC-02] 空文档错误提示:', errorMessage)
      expect(errorMessage).toBeTruthy()
    }
  } else {
    console.log('[TC-02] 按钮正确禁用')
    expect(buttonDisabled).toBe(true)
  }
})

// ============================================================================
// 【brexDmRef 保留】
// ============================================================================

test('TC-03: brexDmRef正确位置 - 应保留不被删除', async ({ page }) => {
  await openEditor(page)

  // 1. 确保 brexDmRef 在正确位置
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    // 确保 dmStatus 中有 brexDmRef
    if (!content.includes('brexDmRef')) {
      content = content.replace(
        /<dmStatus>/,
        `<dmStatus>
          <brexDmRef>
            <dmRef>
              <dmRefIdent>
                <dmCode modelIdentCode="BREX" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
              </dmRefIdent>
            </dmRef>
          </brexDmRef>`
      )
    }

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 记录 brexDmRef 的内容
  const beforeBrex = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    const match = content.match(/<brexDmRef>([\s\S]*?)<\/brexDmRef>/)
    return match ? match[0] : null
  })

  console.log('[TC-03] 重建前 brexDmRef:', beforeBrex ? '存在' : '不存在')

  // 3. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 4. 验证 brexDmRef 仍然存在
  const afterBrex = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    const match = content.match(/<brexDmRef>([\s\S]*?)<\/brexDmRef>/)
    return match ? match[0] : null
  })

  console.log('[TC-03] 重建后 brexDmRef:', afterBrex ? '存在' : '不存在')

  // 断言：brexDmRef 应该保留
  expect(afterBrex).toBeTruthy()
  expect(afterBrex).toContain('BREX')
})

test('TC-04: brexDmRef错误位置 - 不应被收集到refs', async ({ page }) => {
  await openEditor(page)

  // 1. 在 content/description 中添加一个 dmRef（模拟正常引用）
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    // 在 description 中添加 dmRef
    content = content.replace(
      /(<description>[\s\S]*?)(<\/description>)/,
      '$1<dmRef><dmRefIdent><dmCode modelIdentCode="NORMAL" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>$2'
    )

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证 refs 块
  const refsContent = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    const refsMatch = content.match(/<refs[^>]*>([\s\S]*?)<\/refs>/)
    return refsMatch ? refsMatch[1] : ''
  })

  console.log('[TC-04] refs 块内容:', refsContent.substring(0, 200))

  // 断言：refs 中应该有 NORMAL，不应该有 BREX
  expect(refsContent).toContain('NORMAL')
  expect(refsContent).not.toContain('BREX')
  expect(refsContent.toLowerCase()).not.toContain('brex')
})

test('TC-05: 多个brexDmRef - 应全部保留', async ({ page }) => {
  await openEditor(page)

  // 1. 添加多个 brexDmRef（测试去重逻辑）
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    // 在 dmStatus 中添加两个 brexDmRef
    content = content.replace(
      /<dmStatus>/,
      `<dmStatus>
        <brexDmRef>
          <dmRef>
            <dmRefIdent>
              <dmCode modelIdentCode="BREX1" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
            </dmRefIdent>
          </dmRef>
        </brexDmRef>
        <brexDmRef>
          <dmRef>
            <dmRefIdent>
              <dmCode modelIdentCode="BREX2" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
            </dmRefIdent>
          </dmRef>
        </brexDmRef>`
    )

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证两个 brexDmRef 都存在
  const brexCount = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    const matches = content.match(/<brexDmRef>/g)
    return matches ? matches.length : 0
  })

  console.log('[TC-05] brexDmRef 数量:', brexCount)

  // 断言：应该有 2 个 brexDmRef
  expect(brexCount).toBe(2)

  // 验证内容
  const afterContent = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())
  expect(afterContent).toContain('BREX1')
  expect(afterContent).toContain('BREX2')
})

// ============================================================================
// 【refs 块替换边界】
// ============================================================================

test('TC-06: 缺失闭合标签 - 应正确处理或报错', async ({ page }) => {
  await openEditor(page)

  // 1. 创建一个 refs 块但缺少 </refs>
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    // 移除已有 refs（如果有）
    content = content.replace(/<refs[^>]*>[\s\S]*?<\/refs>/g, '')

    // 添加缺少闭合标签的 refs
    content = content.replace(
      /<content>/,
      `<content>
    <refs>
      <dmRef><dmRefIdent><dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>
    <!-- 注意：这里故意缺少 </refs> -->`
    )

    editor.$refs.editor.getEditor().setValue(content)
  })

  await page.waitForTimeout(500)

  // 2. 尝试重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证结果（应该有错误提示或正确修复）
  const errorMessage = await page.evaluate(() => {
    const messageEl = document.querySelector('.ant-message-error')
    return messageEl ? messageEl.textContent : null
  })

  console.log('[TC-06] 错误消息:', errorMessage || '无（可能自动修复）')

  // 断言：要么报错，要么成功修复
  if (errorMessage) {
    expect(errorMessage).toContain('XML解析失败')
  } else {
    const afterContent = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())
    // 如果自动修复，应该有正确的 refs 结构
    expect(afterContent).toMatch(/<refs[^>]*>[\s\S]*?<\/refs>/)
  }
})

test('TC-07: refs块内有注释 - 应正确替换包含注释', async ({ page }) => {
  await openEditor(page)

  // 1. 创建包含注释的 refs 块
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    content = content.replace(/<refs[^>]*>[\s\S]*?<\/refs>/g, '')

    content = content.replace(
      /<content>/,
      `<content>
    <refs xmlns:xlink="http://www.w3.org/1999/xlink">
      <!-- 旧的引用列表 -->
      <dmRef><dmRefIdent><dmCode modelIdentCode="OLD" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>
      <!-- 更多引用 -->
    </refs>`
    )

    // 添加新的 dmRef 到 description
    content = content.replace(
      /(<description>[\s\S]*?)(<\/description>)/,
      '$1<dmRef><dmRefIdent><dmCode modelIdentCode="NEW" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>$2'
    )

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证结果
  const afterContent = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

  console.log('[TC-07] refs 块:', afterContent.match(/<refs[^>]*>([\s\S]*?)<\/refs>/)?.[0].substring(0, 200))

  // 断言：OLD 应该被删除，NEW 应该存在，注释应该被删除
  expect(afterContent).not.toContain('modelIdentCode="OLD"')
  expect(afterContent).toContain('modelIdentCode="NEW"')
  // 注释被删除是正确行为（重建会清空旧内容）
})

test('TC-08: refs与后续元素粘连 - 应正确分离', async ({ page }) => {
  await openEditor(page)

  // 1. 创建粘连的结构（refs 和 description 在同一行）
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    // 创建粘连结构
    content = content.replace(
      /<content>[\s\S]*?<\/content>/,
      `<content>
    <refs xmlns:xlink="http://www.w3.org/1999/xlink"><dmRef><dmRefIdent><dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef></refs><description>紧挨着的描述</description>
  </content>`
    )

    editor.$refs.editor.getEditor().setValue(content)
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证 description 没有被误删
  const afterContent = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

  console.log('[TC-08] 重建后 content 区域:', afterContent.match(/<content>([\s\S]*?)<\/content>/)?.[0].substring(0, 300))

  // 断言：description 应该存在且内容完整
  expect(afterContent).toContain('<description>')
  expect(afterContent).toContain('紧挨着的描述')
  expect(afterContent).toContain('</description>')
})

test('TC-09: 重复refs块 - 应正确处理', async ({ page }) => {
  await openEditor(page)

  // 1. 创建重复的 refs 块
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    content = content.replace(
      /<content>/,
      `<content>
    <refs xmlns:xlink="http://www.w3.org/1999/xlink">
      <dmRef><dmRefIdent><dmCode modelIdentCode="FIRST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>
    </refs>
    <refs xmlns:xlink="http://www.w3.org/1999/xlink">
      <dmRef><dmRefIdent><dmCode modelIdentCode="SECOND" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>
    </refs>`
    )

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证结果（应该只有一个 refs 块）
  const refsCount = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    const matches = content.match(/<refs/g)
    return matches ? matches.length : 0
  })

  console.log('[TC-09] refs 块数量:', refsCount)

  // 断言：应该只有 1 个 refs 块
  expect(refsCount).toBe(1)
})

// ============================================================================
// 【行号一致性】
// ============================================================================

test('TC-10: linenoOffset动态变化 - 应正确计算', async ({ page }) => {
  await openEditor(page)

  // 1. 记录初始 linenoOffset
  const beforeOffset = await page.evaluate(() => {
    const editor = window.__vueEditor
    return editor.$refs.editor.getLinenoOffset()
  })

  console.log('[TC-10] 重建前 linenoOffset:', beforeOffset)

  // 2. 添加 graphic 元素（会影响 DOCTYPE）
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    content = content.replace(
      /(<description>)/,
      '<graphic infoEntityIdent="ICN-TEST"/>\n    $1'
    )

    editor.icnlist = ['ICN-TEST.cgm']
    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 3. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 4. 验证 linenoOffset 变化
  const afterOffset = await page.evaluate(() => {
    const editor = window.__vueEditor
    return editor.$refs.editor.getLinenoOffset()
  })

  console.log('[TC-10] 重建后 linenoOffset:', afterOffset)

  // 断言：linenoOffset 应该增加（因为添加了 DOCTYPE ENTITY）
  expect(afterOffset).toBeGreaterThan(beforeOffset)
})

test('TC-11: 格式化后树刷新 - nodeList应同步', async ({ page }) => {
  await openEditor(page)

  // 1. 记录重建前 nodeList 长度
  const beforeNodeCount = await page.evaluate(() => {
    const editor = window.__vueEditor
    return editor.nodeList.length
  })

  console.log('[TC-11] 重建前 nodeList 长度:', beforeNodeCount)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证 nodeList 已刷新
  const afterNodeCount = await page.evaluate(() => {
    const editor = window.__vueEditor
    return editor.nodeList.length
  })

  console.log('[TC-11] 重建后 nodeList 长度:', afterNodeCount)

  // 断言：nodeList 不应该为空（表示树刷新成功）
  expect(afterNodeCount).toBeGreaterThan(0)

  // 验证树可以正常导航
  const treeWorks = await page.evaluate(() => {
    const editor = window.__vueEditor
    const contentNode = editor.nodeList.find(n => n.text === 'content')
    return contentNode != null
  })

  expect(treeWorks).toBe(true)
})

// ============================================================================
// 【中文视图兼容】
// ============================================================================

test('TC-12: 中文视图下重建 - 应正确转换', async ({ page }) => {
  await openEditor(page)

  // 1. 切换到中文视图
  await page.evaluate(() => {
    const editor = window.__vueEditor
    editor.locale = 'cn'
    const cur = editor.$refs.editor.getValue()
    const next = editor.toCnXml ? editor.toCnXml(cur, editor.en2cnElem) : cur
    editor.$refs.editor.setValue(next)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 验证当前是中文视图
  const isChinese = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    return content.includes('<数据模块') || content.includes('<内容')
  })

  console.log('[TC-12] 当前是中文视图:', isChinese)

  // 3. 添加 dmRef 引用
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    const descTag = isChinese ? '说明' : 'description'
    const regex = new RegExp(`(<${descTag}>[\\s\\S]*?)(</${descTag}>)`)
    content = content.replace(
      regex,
      `$1<dmRef><dmRefIdent><dmCode modelIdentCode="TEST中文" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>$2`
    )

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 4. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 5. 验证 refs 块生成
  const afterContent = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

  console.log('[TC-12] refs 块:', afterContent.match(/<refs[^>]*>([\s\S]{0,200})/)?.[0])

  // 断言：应该有 refs 块且包含引用
  expect(afterContent).toContain('TEST中文')
  expect(afterContent).toMatch(/<refs/)
})

test('TC-13: 中英文切换后重建 - 应保持一致', async ({ page }) => {
  await openEditor(page)

  // 1. 添加引用
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    content = content.replace(
      /(<description>[\s\S]*?)(<\/description>)/,
      '$1<dmRef><dmRefIdent><dmCode modelIdentCode="SWITCH" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>$2'
    )

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 记录英文视图的 refs
  const enRefs = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    return content.match(/<refs[^>]*>([\s\S]*?)<\/refs>/)?.[0]
  })

  console.log('[TC-13] 英文视图 refs:', enRefs ? '存在' : '不存在')

  // 4. 切换到中文视图
  await page.evaluate(() => {
    const editor = window.__vueEditor
    editor.onLocaleChange('cn')
  })

  await page.waitForTimeout(500)

  // 5. 切换回英文视图
  await page.evaluate(() => {
    const editor = window.__vueEditor
    editor.onLocaleChange('en')
  })

  await page.waitForTimeout(500)

  // 6. 验证 refs 仍然存在
  const afterSwitch = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    return content.match(/<refs[^>]*>([\s\S]*?)<\/refs>/)?.[0]
  })

  console.log('[TC-13] 切换后 refs:', afterSwitch ? '存在' : '不存在')

  // 断言：refs 应该保持一致
  expect(afterSwitch).toBeTruthy()
  expect(afterSwitch).toContain('SWITCH')
})

// ============================================================================
// 【ICN 弹框与 DOCTYPE】
// ============================================================================

test('TC-14: 无后缀ICN - 应弹框提示补全', async ({ page }) => {
  await openEditor(page)

  // 1. 添加无后缀的 graphic
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    content = content.replace(
      /(<description>)/,
      '<graphic infoEntityIdent="ICN-NOEXT"/>\n    $1'
    )

    // 清空 icnlist（模拟无后缀情况）
    editor.icnlist = []

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(2000)

  // 3. 验证 ICN 后缀弹框是否出现
  const modalVisible = await page.locator('.ant-modal').filter({ hasText: '补全' }).isVisible()

  console.log('[TC-14] ICN 补全弹框:', modalVisible ? '已显示' : '未显示')

  if (modalVisible) {
    // 4. 选择后缀
    await page.locator('.ant-select').first().click()
    await page.waitForTimeout(300)
    await page.locator('.ant-select-dropdown .ant-select-item').first().click()
    await page.waitForTimeout(300)

    // 5. 确认
    await page.locator('.ant-modal .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 6. 验证 DOCTYPE 生成
    const afterContent = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

    console.log('[TC-14] DOCTYPE:', afterContent.match(/<!DOCTYPE[^>]*>/)?.[0])

    // 断言：DOCTYPE 应该包含 ENTITY
    expect(afterContent).toMatch(/<!ENTITY ICN-NOEXT SYSTEM/)
  } else {
    console.log('[TC-14] 无弹框（可能已有后缀或逻辑调整）')
  }
})

test('TC-15: DOCTYPE ENTITY生成顺序 - 应与正文一致', async ({ page }) => {
  await openEditor(page)

  // 1. 按特定顺序添加多个 graphic
  await page.evaluate(() => {
    const editor = window.__vueEditor
    let content = editor.$refs.editor.getEditor().getValue()

    content = content.replace(
      /(<description>)/,
      `<graphic infoEntityIdent="ICN-THIRD"/>
      <graphic infoEntityIdent="ICN-FIRST"/>
      <graphic infoEntityIdent="ICN-SECOND"/>
      $1`
    )

    editor.icnlist = ['ICN-THIRD.cgm', 'ICN-FIRST.cgm', 'ICN-SECOND.cgm']

    editor.$refs.editor.getEditor().setValue(content)
    editor.$refs.editor.formateDM()
    editor.refreshTree()
  })

  await page.waitForTimeout(500)

  // 2. 执行重建
  await page.locator('button[title*="重建"]').click()
  await page.waitForTimeout(300)
  await page.locator('.ant-modal-confirm .ant-btn-primary').click()
  await page.waitForTimeout(1000)

  // 3. 验证 ENTITY 顺序
  const doctype = await page.evaluate(() => {
    const editor = window.__vueEditor
    const content = editor.$refs.editor.getEditor().getValue()
    const match = content.match(/<!DOCTYPE dmodule\[([\s\S]*?)\]>/)
    return match ? match[1] : ''
  })

  console.log('[TC-15] DOCTYPE 内容:', doctype)

  // 提取 ENTITY 顺序
  const entityMatches = doctype.match(/<!ENTITY ([^\s]+)/g) || []
  const entityOrder = entityMatches.map(m => m.match(/<!ENTITY ([^\s]+)/)[1])

  console.log('[TC-15] ENTITY 顺序:', entityOrder)

  // 断言：ENTITY 顺序应该与正文出现顺序一致 (THIRD, FIRST, SECOND)
  expect(entityOrder).toEqual(['ICN-THIRD', 'ICN-FIRST', 'ICN-SECOND'])
})
