const { test, expect } = require('@playwright/test')
const http = require('http')

// 预览功能全面测试
// 覆盖：正常场景、边界条件、异常场景、交互细节

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

async function injectXml(page, xml) {
  await page.evaluate((xmlContent) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(xmlContent)
  }, xml)
  await page.waitForTimeout(500)
}

test.describe('预览功能 - 正常场景', () => {
  test('1) 简单DM预览 → 弹窗显示标题和段落', async ({ page }) => {
    await openEditor(page)

    const simpleXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <title>测试标题</title>
      <para>测试段落内容</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, simpleXml)

    // 点击预览按钮
    const previewBtn = page.locator('button[title="生成HTML预览"]')
    await previewBtn.click()
    await page.waitForTimeout(2000)

    // 验证弹窗打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 验证iframe存在
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible()

    // 验证srcdoc包含文本
    const srcdoc = await iframe.getAttribute('srcdoc')
    expect(srcdoc).toContain('测试标题')
    expect(srcdoc).toContain('测试段落内容')
    expect(srcdoc).toContain('<h4>')
    expect(srcdoc).toContain('<p>')
  })

  test('2) 多段落DM预览 → 显示所有段落', async ({ page }) => {
    await openEditor(page)

    const multiParaXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>第一段落</para>
      <para>第二段落</para>
      <para>第三段落</para>
      <para>第四段落</para>
      <para>第五段落</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, multiParaXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const iframe = page.locator('.ant-modal iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')

    // 验证所有段落都存在
    expect(srcdoc).toContain('第一段落')
    expect(srcdoc).toContain('第二段落')
    expect(srcdoc).toContain('第三段落')
    expect(srcdoc).toContain('第四段落')
    expect(srcdoc).toContain('第五段落')

    // 验证有5个<p>标签
    const pCount = (srcdoc.match(/<p>/g) || []).length
    expect(pCount).toBe(5)
  })

  test('3) 嵌套元素DM预览 → 正确提取所有文本', async ({ page }) => {
    await openEditor(page)

    const nestedXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>开始文本 <emphasis>强调内容</emphasis> 中间文本 <emphasis>另一个强调</emphasis> 结束文本</para>
      <title>标题 <emphasis>强调标题</emphasis> 文本</title>
    </description>
  </content>
</dmodule>`

    await injectXml(page, nestedXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const iframe = page.locator('.ant-modal iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')

    // 验证所有文本都被提取（包括嵌套元素内的）
    expect(srcdoc).toContain('开始文本')
    expect(srcdoc).toContain('强调内容')
    expect(srcdoc).toContain('中间文本')
    expect(srcdoc).toContain('另一个强调')
    expect(srcdoc).toContain('结束文本')
    expect(srcdoc).toContain('标题')
    expect(srcdoc).toContain('强调标题')
  })

  test('4) 关闭后重新打开预览 → 正常工作', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试内容</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 第一次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    let modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 关闭
    await page.locator('.ant-modal-close').click()
    await page.waitForTimeout(500)
    await expect(modal).not.toBeVisible()

    // 第二次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    const iframe = modal.locator('iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')
    expect(srcdoc).toContain('测试内容')
  })
})

test.describe('预览功能 - 边界条件', () => {
  test('5) 空文档预览 → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)

    // 清空编辑器
    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue('')
    })
    await page.waitForTimeout(500)

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // 验证提示消息
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)

    // 验证弹窗未打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).not.toBeVisible()
  })

  test('6) 仅空白字符的文档 → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)

    await page.evaluate(() => {
      document.querySelector('.CodeMirror').CodeMirror.setValue('   \n\n\t\t   ')
    })
    await page.waitForTimeout(500)

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)
  })

  test('7) 极长文本预览 (>500KB) → 显示预警', async ({ page }) => {
    await openEditor(page)

    // 生成超过500KB的XML
    const largePara = '<para>' + 'A'.repeat(10000) + '</para>\n'
    const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
${largePara.repeat(60)}
    </description>
  </content>
</dmodule>`

    await injectXml(page, largeXml)

    // 验证文档大小
    const sizeKB = await page.evaluate(() => {
      const content = document.querySelector('.CodeMirror').CodeMirror.getValue()
      return new Blob([content]).size / 1024
    })
    console.log('文档大小:', sizeKB, 'KB')
    expect(sizeKB).toBeGreaterThan(500)

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(1000)

    // 验证预警提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/文档较大|预览可能较慢/)
  })

  test('8) 特殊字符处理 → 正确转义', async ({ page }) => {
    await openEditor(page)

    const specialCharXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>&lt;标签&gt; &amp; "引号" 'apostrophe'</para>
      <title>特殊字符: &lt; &gt; &amp;</title>
    </description>
  </content>
</dmodule>`

    await injectXml(page, specialCharXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const iframe = page.locator('.ant-modal iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')

    // 验证特殊字符被正确转义
    expect(srcdoc).toContain('&lt;')
    expect(srcdoc).toContain('&gt;')
    expect(srcdoc).toContain('&amp;')
  })

  test('9) 极深嵌套元素 → 正确提取所有层级文本', async ({ page }) => {
    await openEditor(page)

    const deepNestedXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>层1 <emphasis>层2 <emphasis>层3 <emphasis>层4文本</emphasis> 层3</emphasis> 层2</emphasis> 层1</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, deepNestedXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const iframe = page.locator('.ant-modal iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')

    // 验证所有层级的文本都被提取
    expect(srcdoc).toContain('层1')
    expect(srcdoc).toContain('层2')
    expect(srcdoc).toContain('层3')
    expect(srcdoc).toContain('层4文本')
  })

  test('10) 仅title无para → 正常显示标题', async ({ page }) => {
    await openEditor(page)

    const titleOnlyXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <title>仅有标题</title>
    </description>
  </content>
</dmodule>`

    await injectXml(page, titleOnlyXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const iframe = page.locator('.ant-modal iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')

    expect(srcdoc).toContain('仅有标题')
    expect(srcdoc).toContain('<h4>')
  })

  test('11) 仅para无title → 正常显示段落', async ({ page }) => {
    await openEditor(page)

    const paraOnlyXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>仅有段落</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, paraOnlyXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const iframe = page.locator('.ant-modal iframe')
    const srcdoc = await iframe.getAttribute('srcdoc')

    expect(srcdoc).toContain('仅有段落')
    expect(srcdoc).toContain('<p>')
  })
})

test.describe('预览功能 - 异常场景', () => {
  test('12) XML格式错误 → 提示错误', async ({ page }) => {
    await openEditor(page)

    const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>未闭合段落
      <title>标题</title>
    </description>
  </content>
</dmodule>`

    await injectXml(page, malformedXml)
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 应该有错误提示
    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toBeVisible()
  })

  test('13) 网络错误 → catch捕获，提示明确', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 拦截请求，模拟网络错误
    await page.route('**/dm-content/preview', route => route.abort('failed'))

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/预览失败|网络错误/)
  })

  test('14) 后端返回flag=noxsl → 提示"无解析引擎"', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 拦截请求，返回noxsl
    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: { flag: 'noxsl' }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/无解析引擎|无法预览/)
  })

  test('15) 后端返回flag=null → 提示"DM内容为空"', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    await page.route('**/dm-content/preview', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: { flag: 'null' }
        })
      })
    })

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const toast = page.locator('.ant-message-notice-content')
    await expect(toast).toContainText(/DM内容为空/)
  })
})

test.describe('预览功能 - 交互细节', () => {
  test('16) 快速连续点击预览5次 → 按钮loading，不重复请求', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 记录请求次数
    let requestCount = 0
    await page.route('**/dm-content/preview', route => {
      requestCount++
      setTimeout(() => route.continue(), 1000) // 延迟响应
    })

    const previewBtn = page.locator('button[title="生成HTML预览"]')

    // 快速点击5次
    for (let i = 0; i < 5; i++) {
      await previewBtn.click({ force: true })
      await page.waitForTimeout(100)
    }

    await page.waitForTimeout(3000)

    // 验证只发送了1次请求
    expect(requestCount).toBe(1)

    // 验证弹窗正常打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()
  })

  test('17) 预览后编辑内容再预览 → 显示更新后的内容', async ({ page }) => {
    await openEditor(page)

    const xml1 = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>第一次内容</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml1)

    // 第一次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    let iframe = page.locator('.ant-modal iframe')
    let srcdoc = await iframe.getAttribute('srcdoc')
    expect(srcdoc).toContain('第一次内容')

    // 关闭
    await page.locator('.ant-modal-close').click()
    await page.waitForTimeout(500)

    // 修改内容
    const xml2 = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>第二次内容</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml2)

    // 第二次预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    iframe = page.locator('.ant-modal iframe')
    srcdoc = await iframe.getAttribute('srcdoc')
    expect(srcdoc).toContain('第二次内容')
    expect(srcdoc).not.toContain('第一次内容')
  })

  test('18) 预览窗口不阻塞编辑器 → 可以同时操作', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 打开预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 尝试编辑（预览窗口打开时）
    const canEdit = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const before = cm.getValue().length
      cm.replaceRange('<!-- 测试 -->', { line: 0, ch: 0 })
      const after = cm.getValue().length
      return after > before
    })

    expect(canEdit).toBe(true)
  })

  test('19) 中文视图预览 → 自动转英文发送', async ({ page }) => {
    await openEditor(page)
    await page.waitForTimeout(1000)

    // 切换到中文视图
    const langSelect = page.locator('.toolbar-row .ant-select').filter({ hasText: /中文|English/ })
    await langSelect.click()
    await page.waitForTimeout(300)
    await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-dropdown-menu-item').filter({ hasText: '中文' }).click()
    await page.waitForTimeout(2000)

    // 验证编辑器显示中文标签
    const content = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getValue()
    })
    expect(content).toContain('<数据模块>')

    // 拦截预览请求，检查发送的内容
    let sentContent = null
    await page.route('**/dm-content/preview', async route => {
      const postData = route.request().postDataJSON()
      sentContent = postData.content
      await route.continue()
    })

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证发送的是英文XML
    expect(sentContent).toContain('<dmodule>')
    expect(sentContent).not.toContain('<数据模块>')
  })

  test('20) 浏览模式预览 → 只读状态下可预览', async ({ page }) => {
    await openEditor(page, 'browse')
    await page.waitForTimeout(2000)

    // 验证编辑器只读
    const isReadonly = await page.evaluate(() => {
      return document.querySelector('.CodeMirror').CodeMirror.getOption('readOnly')
    })
    expect(isReadonly).toBeTruthy()

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证预览正常打开
    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()
  })
})

test.describe('预览功能 - 状态管理', () => {
  test('21) previewing状态正确管理 → 请求期间为true，结束后为false', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 延迟API响应
    await page.route('**/dm-content/preview', route => {
      setTimeout(() => route.continue(), 2000)
    })

    // 点击预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(500)

    // 验证previewing=true（按钮应该loading）
    const previewingDuring = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.previewing
    })
    expect(previewingDuring).toBe(true)

    // 等待完成
    await page.waitForTimeout(3000)

    // 验证previewing=false
    const previewingAfter = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.previewing
    })
    expect(previewingAfter).toBe(false)
  })

  test('22) 错误后状态恢复 → previewing重置为false', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 模拟错误
    await page.route('**/dm-content/preview', route => route.abort('failed'))

    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    // 验证previewing=false
    const previewing = await page.evaluate(() => {
      return document.querySelector('.dm-editor-page').__vue__.previewing
    })
    expect(previewing).toBe(false)
  })

  test('23) srcdoc清空验证 → 关闭后srcdoc为空', async ({ page }) => {
    await openEditor(page)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<dmodule>
  <content>
    <description>
      <para>测试</para>
    </description>
  </content>
</dmodule>`

    await injectXml(page, xml)

    // 打开预览
    await page.locator('button[title="生成HTML预览"]').click()
    await page.waitForTimeout(2000)

    const modal = page.locator('.ant-modal-content:has-text("DM内容预览")')
    await expect(modal).toBeVisible()

    // 关闭
    await page.locator('.ant-modal-close').click()
    await page.waitForTimeout(500)

    // 验证srcdoc被清空
    const srcdoc = await page.evaluate(() => {
      const modal = document.querySelector('.dm-editor-page').__vue__.$refs.previewModal
      return modal.srcdoc
    })
    expect(srcdoc).toBe('')
  })
})
