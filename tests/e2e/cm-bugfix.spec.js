const { test, expect } = require('@playwright/test')
const http = require('http')
const fs = require('fs')
const path = require('path')

// 真实浏览器 + 真实 CodeMirror + 真实源码函数的端到端验证（不依赖后端）。
// 通过内置静态服务器提供 /node_modules 与 harness，页面加载真实 CM 实例后驱动交互。
const ROOT = path.join(__dirname, '../..')
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }
let server, PORT

test.beforeAll(async () => {
  // 每次都重建 harness.gen.js，保证测的是当前源码
  require('child_process').execSync('node ' + path.join(__dirname, 'harness/build-harness.js'))
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0])
    const fp = path.join(ROOT, url)
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404); res.end('not found'); return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' })
    fs.createReadStream(fp).pipe(res)
  })
  await new Promise(r => server.listen(0, r))
  PORT = server.address().port
})
test.afterAll(async () => { server && server.close() })

// content 的 schema：refs(1) / warningsAndCautions(1) / description(1) —— 与用户 DM 一致
const SCHEMA = {
  content: {
    children: ['refs', 'warningsAndCautions', 'description'],
    setelem: {
      refs: { minocc: '0', maxocc: '1' },
      warningsAndCautions: { minocc: '0', maxocc: '1' },
      description: { minocc: '0', maxocc: '1' }
    }
  },
  refs: { children: [], setelem: {} },
  warningsAndCautions: { children: [], setelem: {} },
  description: { mixed: 'true', children: [], setelem: {} }
}
// 初始 XML：description 已存在（maxocc=1 已满）→ 东区/弹框都不应再列 description
const XML = [
  '<dmodule>',
  '  <content>',
  '    <description>已有说明</description>',
  '  </content>',
  '</dmodule>'
].join('\n')
// nodeList：lineno 相对 dmodule(=1)。content 在编辑器第2行→lineno2；description 第3行→lineno3
const NODELIST = [
  { id: 0, pid: -1, text: 'dmodule', attributes: { lineno: 1 } },
  { id: 1, pid: 0, text: 'content', attributes: { lineno: 2 } },
  { id: 2, pid: 1, text: 'description', attributes: { lineno: 3 } }
]

async function boot(page) {
  await page.goto(`http://localhost:${PORT}/tests/e2e/harness/cm-harness.html`)
  await page.waitForFunction(() => window.__READY === true)
  return page.evaluate(([xml, sc, nl]) => window.HARNESS.init(xml, sc, nl), [XML, SCHEMA, NODELIST])
}

test.describe('8问题修复 · 真实 CodeMirror 端到端', () => {
  test('Bug1：<content> 补全弹框与东区一致（无 </content>、无已满的 description）', async ({ page }) => {
    await boot(page)
    // 光标放到 content 开标签行（编辑器第2行，0-based=1）末尾后回车位置模拟
    const list = await page.evaluate(() => window.HARNESS.hintListAt(1))
    console.log('弹框候选:', list)
    expect(list).toContain('<refs')
    expect(list).toContain('<warningsAndCautions')
    expect(list).not.toContain('</content>') // 不含父级闭合标签
    expect(list.some(s => s.includes('description'))).toBeFalsy() // maxocc=1 已满，剔除
  })

  test('Bug2/6：回车补全插入的元素被格式化拆行（不与父元素同行）', async ({ page }) => {
    await boot(page)
    const r = await page.evaluate(() => window.HARNESS.pickAt(1, 'refs'))
    console.log('插入后(未格式化):', JSON.stringify(r.glued.split('\n').find(l => l.includes('refs'))))
    // glue 阶段：refs 与 content 在同一行文本内（复现 bug 现象）
    expect(r.glued.split('\n').some(l => /<content>\s*<refs>/.test(l))).toBeTruthy()
    // 格式化后：refs 独占一行，且没有任何一行同时含 <content> 和 <refs>
    const fmtLines = r.formatted.split('\n').map(l => l.trim())
    expect(fmtLines).toContain('<refs></refs>')
    expect(fmtLines).toContain('<content>')
    expect(r.formatted.split('\n').some(l => /<content>\s*<refs>/.test(l))).toBeFalsy() // 不再同行
  })

  test('Bug7：格式化拆行后，新元素开/闭标签为 atomic（Backspace 不能拆字符）', async ({ page }) => {
    await boot(page)
    await page.evaluate(() => window.HARNESS.pickAt(1, 'refs'))
    // 找到 <refs> 所在行
    const lines = await page.evaluate(() => window.HARNESS.getLines())
    const refsLine = lines.findIndex(l => l.trim() === '<refs></refs>')
    expect(refsLine).toBeGreaterThan(0)
    const del = await page.evaluate(l => window.HARNESS.tryDeleteInTag(l), refsLine)
    console.log('refs 行:', del.before, '| 标签 atomic:', del.tagIsAtomic)
    expect(del.tagIsAtomic).toBeTruthy() // 开标签名区受原子保护
  })

  test('Bug3：自闭合标签加属性位置正确（真实 _writeAttr）', async ({ page }) => {
    await boot(page)
    const cases = await page.evaluate(() => ({
      selfClose: window.HARNESS.writeAttr('  <description/>', 'warningRefs', '1'),
      normal: window.HARNESS.writeAttr('  <para>', 'id', 'p1'),
      cnSelf: window.HARNESS.writeAttr('  <图形/>', '标识', 'ICN-1')
    }))
    expect(cases.selfClose).toBe('  <description warningRefs="1"/>')
    expect(cases.normal).toBe('  <para id="p1">')
    expect(cases.cnSelf).toBe('  <图形 标识="ICN-1"/>')
  })

  test('Bug5：加载后 undo 栈为空，连续撤销不会清空内容', async ({ page }) => {
    const init = await boot(page)
    const hist = await page.evaluate(() => window.HARNESS.historySize())
    console.log('加载后 undo 历史:', hist)
    expect(hist.undo).toBe(0) // clearHistory 生效
    // 连续撤销 5 次，内容不应变空
    const afterUndo = await page.evaluate(() => {
      for (let i = 0; i < 5; i++) window.HARNESS.undo()
      return window.HARNESS.getValue()
    })
    expect(afterUndo).toContain('<dmodule>')
    expect(afterUndo.trim().length).toBeGreaterThan(10)
  })

  test('Bug8：移动行起始行落在闭合标签行也能反查到元素', async ({ page }) => {
    await boot(page)
    // 编辑器行（1-based）：1=<dmodule> 2=<content> 3=<description>已有</description> 4=</content> 5=</dmodule>
    const atOpen = await page.evaluate(() => window.HARNESS.nodeAtLine(2)) // content 开标签
    const atClose = await page.evaluate(() => window.HARNESS.nodeAtLine(4)) // </content> 闭合行
    const atNone = await page.evaluate(() => window.HARNESS.nodeAtLine(99)) // 越界
    console.log('开标签行:', atOpen, '| 闭合行反查:', atClose, '| 越界:', atNone)
    expect(atOpen && atOpen.text).toBe('content')
    expect(atClose && atClose.text).toBe('content') // 闭合标签行反查到 content（Bug8 核心）
    expect(atNone).toBeNull()
  })
})
