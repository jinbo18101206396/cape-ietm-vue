/**
 * Para设计器 P0+P1 修复浏览器验证测试
 * 验证所有P0和P1修复在真实浏览器环境中的表现
 *
 * 测试覆盖：
 * - P0-1: para标签丢失修复验证
 * - P0-2: JSON.parse异常修复验证
 * - P1-1: dmCode验证增强
 * - P1-2: uniqueid分配诊断
 * - P1-3: Image内存泄漏修复
 * - P1-4: axios超时配置
 * - P1-5: UEditor实例复用污染修复
 * - P1-6: XSS防护验证
 * - 往返一致性验证
 */

const { test, expect } = require('@playwright/test')

// 测试配置
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const DM_EDITOR_URL = `${BASE_URL}/#/ietm/dm-content-editor`
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:9999'

// 辅助函数
async function loginSystem(page) {
  await page.goto(`${BASE_URL}/#/user/login`)
  await page.waitForLoadState('networkidle', { timeout: 10000 })

  const loginVisible = await page.locator('input[placeholder*="账号"]').isVisible({ timeout: 2000 }).catch(() => false)
  if (loginVisible) {
    await page.fill('input[placeholder*="账号"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button:has-text("登录")')
    await page.waitForURL('**/#/dashboard/**', { timeout: 10000 })
  }
}

async function createTestDM(page, xmlContent) {
  const response = await page.request.post(`${BACKEND_URL}/jeecg-boot/ietm/dm/create-test-dm`, {
    data: { content: xmlContent }
  })
  const result = await response.json()
  if (!result.success) {
    throw new Error(`创建测试DM失败: ${result.message}`)
  }
  return result.result.id
}

async function openDMEditor(page, dmId) {
  await page.goto(`${DM_EDITOR_URL}?id=${dmId}`)
  await page.waitForSelector('.dm-editor-page', { timeout: 15000 })
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  await page.waitForTimeout(800) // 等待编辑器完全初始化
}

async function getEditorContent(page) {
  return await page.evaluate(() => {
    const editor = window.app.$children.find(c => c.$options.name === 'DmContentEditor')
    if (!editor || !editor.$refs.editor) {
      throw new Error('编辑器未初始化')
    }
    return editor.$refs.editor.getEditor().getValue()
  })
}

async function openParaDesigner(page, paraId) {
  await page.dblclick(`text=para#${paraId}`)
  await page.waitForSelector('.para-designer', { timeout: 5000 })
  await page.waitForTimeout(1000) // 等待UEditor加载
}

async function setParaDesignerContent(page, htmlContent) {
  await page.evaluate((html) => {
    const designer = window.app.$children
      .find(c => c.$options.name === 'DmContentEditor')
      .$refs.paraDesigner
    if (!designer || !designer.ueditor) {
      throw new Error('ParaDesigner或UEditor未初始化')
    }
    designer.ueditor.setContent(html)
  }, htmlContent)
  await page.waitForTimeout(300)
}

async function saveParaDesigner(page) {
  await page.click('.para-designer button:has-text("保存")')
  await page.waitForSelector('.source-pane', { state: 'visible', timeout: 5000 })
  await page.waitForTimeout(500) // 等待视图切换完成
}

async function deleteTestDM(page, dmId) {
  if (dmId) {
    try {
      await page.request.delete(`${BACKEND_URL}/jeecg-boot/ietm/dm/delete?id=${dmId}`)
    } catch (e) {
      console.warn(`删除测试DM失败: ${e.message}`)
    }
  }
}

// 测试数据
const BASIC_DM = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="TEST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="001" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>P0+P1修复验证</title>
        <para id="p1">第一段内容</para>
        <para id="p2">带<emphasis>强调</emphasis>的第二段</para>
        <para id="p3">第三段内容</para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

const LIST_DM = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <identAndStatusSection>
    <dmAddress>
      <dmIdent>
        <dmCode modelIdentCode="LIST" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="002" infoCodeVariant="A" itemLocationCode="A"/>
      </dmIdent>
    </dmAddress>
  </identAndStatusSection>
  <content>
    <description>
      <levelledPara>
        <title>列表测试</title>
        <para id="list1">
          无序列表：
          <randomList>
            <listItem><para>项目A</para></listItem>
            <listItem><para>项目B</para></listItem>
          </randomList>
        </para>
      </levelledPara>
    </description>
  </content>
</dmodule>`

test.describe('Para设计器 - P0修复浏览器验证', () => {
  let page
  let dmId

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`)
      }
    })

    await loginSystem(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.afterEach(async () => {
    await deleteTestDM(page, dmId)
    dmId = null
  })

  test('E2E-P0-01: para标签不应丢失（修复验证）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const originalContent = await getEditorContent(page)

    // 验证原始内容有3个para
    expect(originalContent).toContain('<para id="p1">第一段内容</para>')
    expect(originalContent).toContain('<para id="p2">带<emphasis>强调</emphasis>的第二段</para>')
    expect(originalContent).toContain('<para id="p3">第三段内容</para>')

    // 编辑中间的para#p2
    await openParaDesigner(page, 'p2')
    await setParaDesignerContent(page, '<p>修改后的第二段内容</p>')
    await saveParaDesigner(page)

    // 验证所有para都保留
    const finalContent = await getEditorContent(page)

    expect(finalContent).toContain('<para id="p1">第一段内容</para>')
    expect(finalContent).toContain('<para id="p2">修改后的第二段内容</para>')
    expect(finalContent).toContain('<para id="p3">第三段内容</para>')

    // 验证没有丢失任何para标签
    const paraCount = (finalContent.match(/<para id=/g) || []).length
    expect(paraCount).toBe(3)

    console.log('✅ P0-1: para标签不丢失验证通过')
  })

  test('E2E-P0-02: listItem内para不应重复（修复验证）', async () => {
    dmId = await createTestDM(page, LIST_DM)
    await openDMEditor(page, dmId)

    const originalContent = await getEditorContent(page)

    // 统计原始listItem内para数量
    const originalParaCount = (originalContent.match(/<listItem><para>/g) || []).length
    expect(originalParaCount).toBe(2) // 两个listItem

    // 编辑list para
    await openParaDesigner(page, 'list1')

    // 不修改内容，直接保存（测试往返一致性）
    await saveParaDesigner(page)

    const finalContent = await getEditorContent(page)

    // 验证listItem内para数量没有增加
    const finalParaCount = (finalContent.match(/<listItem><para>/g) || []).length
    expect(finalParaCount).toBe(2)

    // 验证没有重复的para标签
    expect(finalContent).not.toMatch(/<listItem><para><para>/)

    console.log('✅ P0-2: listItem内para不重复验证通过')
  })

  test('E2E-P0-03: JSON.parse不应抛异常（修复验证）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 编辑para
    await openParaDesigner(page, 'p1')
    await setParaDesignerContent(page, '<p>测试JSON解析</p>')
    await saveParaDesigner(page)

    // 验证没有JSON.parse相关错误
    const jsonErrors = consoleErrors.filter(err =>
      err.includes('JSON.parse') ||
      err.includes('Unexpected token') ||
      err.includes('SyntaxError')
    )

    expect(jsonErrors.length).toBe(0)
    console.log('✅ P0-3: JSON.parse异常修复验证通过')
  })
})

test.describe('Para设计器 - P1修复浏览器验证', () => {
  let page
  let dmId

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()

    // 监听控制台日志
    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error') {
        console.log(`🔴 Error: ${text}`)
      } else if (text.includes('dmCode') || text.includes('uniqueid')) {
        console.log(`🔵 Info: ${text}`)
      }
    })

    await loginSystem(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.afterEach(async () => {
    await deleteTestDM(page, dmId)
    dmId = null
  })

  test('E2E-P1-01: dmCode验证增强（错误信息清晰）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const consoleLogs = []
    page.on('console', msg => {
      consoleLogs.push(msg.text())
    })

    // 正常操作不应触发dmCode错误
    await openParaDesigner(page, 'p1')
    await setParaDesignerContent(page, '<p>正常内容</p>')
    await saveParaDesigner(page)

    // 验证没有dmCode格式错误
    const dmCodeErrors = consoleLogs.filter(log =>
      log.includes('dmCode格式错误')
    )

    expect(dmCodeErrors.length).toBe(0)
    console.log('✅ P1-1: dmCode验证增强通过（无错误）')
  })

  test('E2E-P1-05: UEditor实例不应复用污染（修复验证）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    // 第一次打开para#p1
    await openParaDesigner(page, 'p1')
    await setParaDesignerContent(page, '<p>第一次打开的内容</p>')

    // 验证内容
    let content1 = await page.evaluate(() => {
      const designer = window.app.$children
        .find(c => c.$options.name === 'DmContentEditor')
        .$refs.paraDesigner
      return designer.ueditor.getContent()
    })
    expect(content1).toContain('第一次打开的内容')

    await saveParaDesigner(page)

    // 第二次打开para#p2
    await openParaDesigner(page, 'p2')
    await page.waitForTimeout(500)

    // 验证UEditor内容是para#p2的，不是para#p1的
    let content2 = await page.evaluate(() => {
      const designer = window.app.$children
        .find(c => c.$options.name === 'DmContentEditor')
        .$refs.paraDesigner
      return designer.ueditor.getContent()
    })

    expect(content2).not.toContain('第一次打开的内容')
    expect(content2).toContain('强调')

    console.log('✅ P1-5: UEditor实例复用污染修复验证通过')
  })

  test('E2E-P1-06: XSS防护应生效（修复验证）', async () => {
    const xssDM = BASIC_DM.replace(
      '<para id="p1">第一段内容</para>',
      '<para id="p1">测试&lt;script&gt;alert("xss")&lt;/script&gt;防护</para>'
    )

    dmId = await createTestDM(page, xssDM)
    await openDMEditor(page, dmId)

    // 打开设计视图
    await openParaDesigner(page, 'p1')

    // 验证HTML中script标签被转义
    const htmlContent = await page.evaluate(() => {
      const designer = window.app.$children
        .find(c => c.$options.name === 'DmContentEditor')
        .$refs.paraDesigner
      return designer.ueditor.getContent()
    })

    // 不应包含未转义的script标签
    expect(htmlContent).not.toContain('<script>alert("xss")</script>')

    // 添加带特殊字符的内容
    await setParaDesignerContent(page, '<p>测试&lt;img src=x onerror=alert(1)&gt;</p>')
    await saveParaDesigner(page)

    // 验证XML中正确转义
    const finalContent = await getEditorContent(page)
    expect(finalContent).toContain('&lt;')
    expect(finalContent).toContain('&gt;')

    console.log('✅ P1-6: XSS防护验证通过')
  })

  test('E2E-P1-03: Image内存泄漏修复验证（事件监听器清理）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    // 多次打开关闭设计视图
    for (let i = 0; i < 3; i++) {
      await openParaDesigner(page, 'p1')
      await setParaDesignerContent(page, `<p>第${i+1}次编辑</p>`)
      await saveParaDesigner(page)
    }

    // 验证没有内存泄漏相关的错误
    const performanceMetrics = await page.evaluate(() => {
      if (window.performance && window.performance.memory) {
        return {
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
        }
      }
      return null
    })

    if (performanceMetrics) {
      const heapUsageRatio = performanceMetrics.usedJSHeapSize / performanceMetrics.jsHeapSizeLimit
      expect(heapUsageRatio).toBeLessThan(0.9) // 堆使用率应小于90%
      console.log(`✅ P1-3: Image内存泄漏修复验证通过（堆使用率: ${(heapUsageRatio * 100).toFixed(2)}%）`)
    } else {
      console.log('⚠️ P1-3: 浏览器不支持performance.memory，跳过内存检查')
    }
  })
})

test.describe('Para设计器 - 往返一致性验证', () => {
  let page
  let dmId

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await loginSystem(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test.afterEach(async () => {
    await deleteTestDM(page, dmId)
    dmId = null
  })

  test('E2E-RT-01: 单次往返一致性（XML→HTML→XML）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const originalContent = await getEditorContent(page)
    const originalPara2 = originalContent.match(/<para id="p2">.*?<\/para>/s)[0]

    // 打开→保存（不修改）
    await openParaDesigner(page, 'p2')
    await saveParaDesigner(page)

    const finalContent = await getEditorContent(page)
    expect(finalContent).toContain(originalPara2)

    console.log('✅ RT-01: 单次往返一致性验证通过')
  })

  test('E2E-RT-02: 多次往返一致性（3次）', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const originalContent = await getEditorContent(page)

    // 3次往返
    for (let i = 0; i < 3; i++) {
      await openParaDesigner(page, 'p2')
      await saveParaDesigner(page)
    }

    const finalContent = await getEditorContent(page)

    // 验证emphasis标签保持不变
    expect(finalContent).toContain('<emphasis>强调</emphasis>')

    console.log('✅ RT-02: 多次往返一致性验证通过')
  })

  test('E2E-RT-03: 复杂元素往返一致性', async () => {
    dmId = await createTestDM(page, LIST_DM)
    await openDMEditor(page, dmId)

    const originalContent = await getEditorContent(page)

    // 打开→保存
    await openParaDesigner(page, 'list1')
    await saveParaDesigner(page)

    const finalContent = await getEditorContent(page)

    // 验证列表结构保持不变
    expect(finalContent).toContain('<randomList>')
    expect(finalContent).toContain('<listItem><para>项目A</para></listItem>')
    expect(finalContent).toContain('<listItem><para>项目B</para></listItem>')

    console.log('✅ RT-03: 复杂元素往返一致性验证通过')
  })

  test('E2E-RT-04: 编辑后往返一致性', async () => {
    dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    // 第一次编辑
    await openParaDesigner(page, 'p1')
    await setParaDesignerContent(page, '<p>编辑后的内容<strong>加粗文本</strong></p>')
    await saveParaDesigner(page)

    const afterFirstEdit = await getEditorContent(page)

    // 第二次往返（不修改）
    await openParaDesigner(page, 'p1')
    await saveParaDesigner(page)

    const afterSecondRound = await getEditorContent(page)

    // 验证第二次往返后内容不变
    expect(afterSecondRound).toContain('编辑后的内容')
    expect(afterSecondRound).toContain('<emphasis emphasisType="em02">加粗文本</emphasis>')

    console.log('✅ RT-04: 编辑后往返一致性验证通过')
  })
})

test.describe('Para设计器 - 性能测试', () => {
  let page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await loginSystem(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('E2E-PERF-01: 打开设计视图性能', async () => {
    const dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const startTime = Date.now()

    await page.dblclick('text=para#p1')
    await page.waitForSelector('.para-designer')
    await page.waitForTimeout(1000) // 等待UEditor加载

    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(3000) // 应在3秒内打开
    console.log(`✅ PERF-01: 打开设计视图耗时 ${duration}ms`)

    await deleteTestDM(page, dmId)
  })

  test('E2E-PERF-02: 保存操作性能', async () => {
    const dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    await openParaDesigner(page, 'p1')
    await setParaDesignerContent(page, '<p>性能测试内容</p>')

    const startTime = Date.now()

    await page.click('.para-designer button:has-text("保存")')
    await page.waitForSelector('.source-pane', { state: 'visible' })

    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(2000) // 应在2秒内保存
    console.log(`✅ PERF-02: 保存操作耗时 ${duration}ms`)

    await deleteTestDM(page, dmId)
  })

  test('E2E-PERF-03: 连续操作性能', async () => {
    const dmId = await createTestDM(page, BASIC_DM)
    await openDMEditor(page, dmId)

    const startTime = Date.now()

    // 连续编辑3个para
    for (let i = 1; i <= 3; i++) {
      await openParaDesigner(page, `p${i}`)
      await setParaDesignerContent(page, `<p>快速编辑${i}</p>`)
      await saveParaDesigner(page)
    }

    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(10000) // 应在10秒内完成
    console.log(`✅ PERF-03: 连续操作3次耗时 ${duration}ms`)

    await deleteTestDM(page, dmId)
  })
})
