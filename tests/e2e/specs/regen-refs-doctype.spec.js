const { test, expect } = require('@playwright/test')
const http = require('http')

/**
 * §16.4 重建 refs 与 DOCTYPE E2E 测试
 *
 * 测试策略：
 * 1. 真实 UI 交互（点击、输入、弹窗）
 * 2. 场景覆盖（6个主场景）
 * 3. 边界测试（5个边界条件）
 * 4. XML 结构验证（声明、DOCTYPE、根元素）
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
let PROJECT_ID = '2078348945532030978'  // 项目1

test.beforeAll(async () => {
  const l = await apiReq('POST', '/sys/login', { username: 'admin', password: '123456' })
  if (!l.success) throw new Error('登录失败: ' + JSON.stringify(l))
  TOKEN = l.result.token

  // 打开项目
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

  // 等待编辑器加载完成
  await page.waitForSelector('.CodeMirror', { timeout: 30000 })
  await page.waitForTimeout(2000)

  // 验证编辑器已加载
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

  if (!editorLoaded) {
    throw new Error('编辑器组件未加载')
  }
}

  /**
   * TC-01: 无 DOCTYPE、无图形元素
   * 预期：生成空 DOCTYPE，保留 XML 声明和 <dmodule>
   */
  test('TC-01: 无DOCTYPE无图形 - 应生成空DOCTYPE并保留结构', async ({ page }) => {
    await openEditor(page)

    // 1. 准备测试数据：删除已有 DOCTYPE（如果有）
    await page.evaluate(() => {
      const editor = window.__vueEditor = document.querySelector('#app').__vue__.$children[0].$children.find(c => c.$refs && c.$refs.editor)
      let content = editor.content

      // 移除 DOCTYPE
      content = content.replace(/<!DOCTYPE[^>]*>/g, '')

      // 确保没有 graphic 元素
      content = content.replace(/<graphic[^>]*\/>/g, '')
      content = content.replace(/<multimediaObject[^>]*>[\s\S]*?<\/multimediaObject>/g, '')

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()
    })

    await page.waitForTimeout(500)

    // 2. 记录操作前状态
    const beforeXml = await page.evaluate(() => {
      const editor = window.__vueEditor
      return editor.$refs.editor.getEditor().getValue()
    })

    console.log('[TC-01] 操作前 XML 前 200 字符:', beforeXml.substring(0, 200))

    // 3. 点击"重建Refs"按钮（真实 UI 交互）
    await page.locator('button[title*="重建"]').click()
    await page.waitForTimeout(300)

    // 4. 确认弹窗
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 5. 验证结果
    const afterXml = await page.evaluate(() => {
      const editor = window.__vueEditor
      return editor.$refs.editor.getEditor().getValue()
    })

    console.log('[TC-01] 操作后 XML 前 300 字符:', afterXml.substring(0, 300))

    // 断言：XML 声明存在
    expect(afterXml).toContain('<?xml version="1.0" encoding="UTF-8"?>')

    // 断言：DOCTYPE 存在且为空
    expect(afterXml).toMatch(/<!DOCTYPE dmodule\[\]>/)

    // 断言：<dmodule> 标签存在且包含所有 xmlns 属性
    expect(afterXml).toContain('<dmodule xmlns:dc=')
    expect(afterXml).toContain('xmlns:xlink=')
    expect(afterXml).toContain('xsi:noNamespaceSchemaLocation=')

    // 断言：顺序正确
    const xmlDeclarationIndex = afterXml.indexOf('<?xml')
    const doctypeIndex = afterXml.indexOf('<!DOCTYPE')
    const dmoduleIndex = afterXml.indexOf('<dmodule')

    expect(xmlDeclarationIndex).toBeLessThan(doctypeIndex)
    expect(doctypeIndex).toBeLessThan(dmoduleIndex)

    // 断言：树解析成功（无错误日志）
    const hasTreeError = await page.evaluate(() => {
      const editor = window.__vueEditor
      return editor.nodeList.length === 0
    })

    expect(hasTreeError).toBe(false)
  })

  /**
   * TC-02: 有 DOCTYPE、有图形元素
   * 预期：替换 DOCTYPE，生成正确的 ENTITY 和 NOTATION
   */
  test('TC-02: 有DOCTYPE有图形 - 应替换DOCTYPE并生成ENTITY', async ({ page }) => {
    await openEditor(page)

    // 1. 准备测试数据：添加 DOCTYPE 和 graphic
    await page.evaluate(() => {
      const editor = window.__vueEditor = document.querySelector('#app').__vue__.$children[0].$children.find(c => c.$refs && c.$refs.editor)
      let content = editor.content

      // 确保有 DOCTYPE
      if (!content.includes('<!DOCTYPE')) {
        const dmoduleIndex = content.indexOf('<dmodule')
        const xmlDecl = content.substring(0, dmoduleIndex)
        const rest = content.substring(dmoduleIndex)
        content = xmlDecl + '<!DOCTYPE dmodule[\n<!NOTATION cgm PUBLIC "image/cgm">\n<!ENTITY ICN-TEST SYSTEM "ICN-TEST.cgm" NDATA cgm>\n]>\n' + rest
      }

      // 添加一个 graphic 元素到 content 下
      const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/)
      if (contentMatch) {
        const contentBody = contentMatch[1]
        // 在 description 前插入 graphic
        const newContent = contentBody.replace(
          /(<description>)/,
          '<graphic infoEntityIdent="ICN-TEST"/>\n    $1'
        )
        content = content.replace(contentMatch[0], `<content>${newContent}</content>`)
      }

      // 更新 icnlist
      editor.icnlist = ['ICN-TEST.cgm']

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()
    })

    await page.waitForTimeout(500)

    // 2. 点击"重建Refs"
    await page.locator('button[title*="重建"]').click()
    await page.waitForTimeout(300)

    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 3. 验证结果
    const afterXml = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

    console.log('[TC-02] DOCTYPE 区域:\n', afterXml.substring(afterXml.indexOf('<!DOCTYPE'), afterXml.indexOf('<dmodule')))

    // 断言：DOCTYPE 包含 NOTATION
    expect(afterXml).toMatch(/<!NOTATION cgm PUBLIC/)

    // 断言：DOCTYPE 包含 ENTITY
    expect(afterXml).toMatch(/<!ENTITY ICN-TEST SYSTEM "ICN-TEST\.cgm" NDATA cgm>/)

    // 断言：结构完整
    expect(afterXml).toContain('<?xml version')
    expect(afterXml).toContain('<dmodule xmlns:')
  })

  /**
   * TC-03: 有 refs 块 - 测试替换逻辑
   * 预期：正确替换已有 refs 块，不删除后续内容
   */
  test('TC-03: 已有refs块 - 应正确替换不误删后续内容', async ({ page }) => {
    await openEditor(page)

    // 1. 准备：确保有 refs 块和 dmRef
    await page.evaluate(() => {
      const editor = window.__vueEditor = document.querySelector('#app').__vue__.$children[0].$children.find(c => c.$refs && c.$refs.editor)
      let content = editor.content

      // 添加 dmRef 到 content/description 内
      content = content.replace(
        /(<description>[\s\S]*?)(<\/description>)/,
        '$1<dmRef><dmRefIdent><dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>$2'
      )

      // 添加 refs 块到 content 开头
      content = content.replace(
        /<content>/,
        '<content>\n    <refs>\n      <dmRef><dmRefIdent><dmCode modelIdentCode="OLD" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/></dmRefIdent></dmRef>\n    </refs>'
      )

      editor.content = content
      editor.$refs.editor.getEditor().setValue(content)
      editor.$refs.editor.formateDM()
      editor.refreshTree()
    })

    await page.waitForTimeout(500)

    // 记录 description 前的内容（用于验证不被删除）
    const beforeDescription = await page.evaluate(() => {
      const editor = window.__vueEditor
      const content = editor.$refs.editor.getEditor().getValue()
      const match = content.match(/<description>([\s\S]{0,100})/)
      return match ? match[0] : ''
    })

    // 2. 执行重建
    await page.locator('button[title*="重建"]').click()
    await page.waitForTimeout(300)
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 3. 验证
    const afterXml = await page.evaluate(() => window.__vueEditor.$refs.editor.getEditor().getValue())

    // 断言：refs 块被替换（OLD 应该不存在，TEST 应该存在）
    expect(afterXml).not.toContain('modelIdentCode="OLD"')
    expect(afterXml).toContain('modelIdentCode="TEST"')

    // 断言：description 元素仍然存在
    expect(afterXml).toContain('<description>')
    expect(afterXml).toContain('</description>')

    // 断言：description 的内容没有被误删
    expect(afterXml).toContain(beforeDescription)

    console.log('[TC-03] refs 块替换成功，后续内容未被删除')
  })

  /**
   * TC-04: brexDmRef 排除测试
   * 预期：brexDmRef 不应该被收集到 refs 块中
   */
  test('TC-04: brexDmRef排除 - 不应被收集到refs', async ({ page }) => {
    await openEditor(page)

    // 1. 验证 brexDmRef 存在
    const hasBrex = await page.evaluate(() => {
      const editor = window.__vueEditor = document.querySelector('#app').__vue__.$children[0].$children.find(c => c.$refs && c.$refs.editor)
      const content = editor.$refs.editor.getEditor().getValue()
      return content.includes('brexDmRef')
    })

    console.log('[TC-04] brexDmRef 存在:', hasBrex)

    // 2. 执行重建
    await page.locator('button[title*="重建"]').click()
    await page.waitForTimeout(300)
    await page.locator('.ant-modal-confirm .ant-btn-primary').click()
    await page.waitForTimeout(1000)

    // 3. 验证 refs 块中没有 brexDmRef 的内容
    const refsContent = await page.evaluate(() => {
      const editor = window.__vueEditor
      const content = editor.$refs.editor.getEditor().getValue()
      const refsMatch = content.match(/<refs>([\s\S]*?)<\/refs>/)
      return refsMatch ? refsMatch[1] : ''
    })

    // 如果有 refs 块，验证其中没有 brex 相关的 DMC
    if (refsContent) {
      // 检查是否误收集了 brexDmRef
      expect(refsContent.toLowerCase()).not.toContain('brex')
      console.log('[TC-04] brexDmRef 正确排除')
    } else {
      console.log('[TC-04] 无 refs 块（无 dmRef 引用）')
    }
  })
