/**
 * 无序列表符号往返验证（真实 paraConverter.js，真实浏览器）
 *
 * 复现用户 bug：三级无序列表 大圆圈(circle)/小黑点(disc)/方块(square)
 *   保存 → 源码 → 再进设计视图 后符号丢失/错位。
 *
 * 策略：在浏览器内动态 import 真实的 paraConverter 模块，直接调用
 *   html2para（保存）/ para2html（加载），验证：
 *     1. 保存后 XML 的 listItemPrefix 正确（circle→pf05 / disc→默认省略 / square→pf06）
 *     2. 结构合法：嵌套 randomList 在 para 内，不是 listItem 的兄弟（S1000D descript.xsd）
 *     3. 往返一致：保存→加载后符号与原始一致
 *     4. 幂等：二次保存 == 一次保存
 */

const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

// 真实 paraConverter 的浏览器可加载副本：beforeAll 从真实源文件生成，
// 仅把 axios/refsBuilder 两处外部依赖 import 换成桩（列表逻辑完全不触碰它们），
// 其余代码逐字真实。放入 public/ 由 dev server 以 JS mime 提供，afterAll 清理。
const SRC = path.resolve(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
const PUBLIC_FILE = path.resolve(__dirname, '../../public/__test_paraconverter.js')
const CONVERTER = 'http://localhost:3000/__test_paraconverter.js'

test.beforeAll(() => {
  let code = fs.readFileSync(SRC, 'utf8')
  code = code.replace(/import\s*\{\s*axios\s*\}\s*from\s*["']@\/utils\/request["']\s*/, 'const axios = { post: async () => ({ data: {} }) };\n')
  code = code.replace(/import\s*\{\s*getDmcByText\s*\}\s*from\s*["']\.\/refsBuilder["'][^\n]*/, 'const getDmcByText = () => null;')
  if (/\bimport\s/.test(code)) throw new Error('未能桩替换全部外部 import：\n' + code.split('\n').filter(l => /\bimport\s/.test(l)).join('\n'))
  fs.writeFileSync(PUBLIC_FILE, code)
})

test.afterAll(() => {
  try { fs.unlinkSync(PUBLIC_FILE) } catch (e) { /* ignore */ }
})

// UEditor 真实的三级列表 HTML：嵌套<ul>作为<li>的"兄弟"（经真机 getContent 确认），
// 而非<li>内嵌套。符号存为内联 list-style-type。
const UEDITOR_HTML =
  '<ul style="list-style-type:circle"><li>第一层</li>' +
    '<ul style="list-style-type:disc"><li>第二层</li>' +
      '<ul style="list-style-type:square"><li>第三层</li></ul>' +
    '</ul>' +
  '</ul>'

// 合法 S1000D 结构（嵌套 randomList 在 para 内）——真机保存后的实际产物
const VALID_S1000D =
  '<para><randomList listItemPrefix="pf05"><listItem><para>第一层' +
  '<randomList><listItem><para>第二层' +
  '<randomList listItemPrefix="pf06"><listItem><para>第三层</para></listItem></randomList>' +
  '</para></listItem></randomList>' +
  '</para></listItem></randomList></para>'

test.describe('无序列表符号往返（真实代码）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  })

  test('保存：list-style-type → listItemPrefix，结构合法S1000D', async ({ page }) => {
    const r = await page.evaluate(async ({ converterPath, html }) => {
      const m = await import(converterPath)
      const xml = await m.html2para({}, html, '{}', [])
      return { xml }
    }, { converterPath: CONVERTER, html: UEDITOR_HTML })

    console.log('保存后 XML:\n' + r.xml)

    // 符号：circle→pf05，square→pf06，disc→默认省略
    expect(r.xml, '一层 circle→pf05').toContain('<randomList listItemPrefix="pf05">')
    expect(r.xml, '三层 square→pf06').toContain('<randomList listItemPrefix="pf06">')
    expect(r.xml, '二层 disc→默认无属性').toMatch(/第一层<randomList>/)

    // 结构合法：嵌套 randomList 在 para 内，不是 listItem 兄弟（descript.xsd）
    expect(r.xml, '不应有 randomList 作 listItem 兄弟').not.toMatch(/<\/listItem>\s*<randomList/)
    expect(r.xml, '不应有列表在 para 外').not.toMatch(/<\/para>\s*<randomList/)
    expect(r.xml, '嵌套列表应在 para 内紧跟文字').toMatch(/<para>第一层<randomList>/)

    // 顺序正确
    expect(r.xml.indexOf('第一层')).toBeLessThan(r.xml.indexOf('第二层'))
    expect(r.xml.indexOf('第二层')).toBeLessThan(r.xml.indexOf('第三层'))
  })

  test('加载：合法S1000D → UEditor模型，符号/顺序正确', async ({ page }) => {
    const r = await page.evaluate(async ({ converterPath, xml }) => {
      const m = await import(converterPath)
      const html = await m.para2html({}, xml)
      return { html }
    }, { converterPath: CONVERTER, xml: VALID_S1000D })

    console.log('加载 HTML:\n' + r.html)

    // 三级符号齐全
    expect(r.html, 'pf05→circle').toContain('list-style-type:circle')
    expect(r.html, 'pf02默认→disc').toContain('list-style-type:disc')
    expect(r.html, 'pf06→square').toContain('list-style-type:square')
    // 嵌套列表应为 li 兄弟（UEditor 模型）：不应困在 li 的 para 内 <li><p>文字<ul>…
    // （顶层 <p><ul> 外层包裹是良性的，浏览器会自动重整为 <p></p><ul>，真机已验证）
    expect(r.html, '嵌套列表不应困在 li 的 para 内').not.toMatch(/<li><p>[^<]*<ul/)
    // 嵌套列表应作为 li 兄弟出现
    expect(r.html, '嵌套列表应为 li 兄弟（</li><ul>）').toMatch(/<\/li><ul/)
    // 顺序正确（修复前曾出现 第三层 排到 第二层 之前）
    expect(r.html.indexOf('第一层')).toBeLessThan(r.html.indexOf('第二层'))
    expect(r.html.indexOf('第二层')).toBeLessThan(r.html.indexOf('第三层'))
  })

  test('往返幂等：S1000D→加载→保存 应回到原S1000D', async ({ page }) => {
    const r = await page.evaluate(async ({ converterPath, xml }) => {
      const m = await import(converterPath)
      const loaded = await m.para2html({}, xml) // S1000D → UEditor模型HTML
      const resaved = await m.html2para({}, loaded, '{}', []) // → 回到内容(无外层para)
      const full = '<para>' + resaved + '</para>'
      return { loaded, full }
    }, { converterPath: CONVERTER, xml: VALID_S1000D })

    console.log('重新保存:\n' + r.full)
    // 规范化空白后应与原始合法 S1000D 完全一致
    const norm = (s) => s.replace(/>\s+</g, '><').trim()
    expect(norm(r.full), '往返应回到原始合法S1000D').toBe(norm(VALID_S1000D))
  })

  test('UEditor模型往返：html2para→para2html→html2para 幂等', async ({ page }) => {
    const r = await page.evaluate(async ({ converterPath, html }) => {
      const m = await import(converterPath)
      const xml1 = await m.html2para({}, html, '{}', [])
      const loaded = await m.para2html({}, '<para>' + xml1 + '</para>')
      const xml2 = await m.html2para({}, loaded, '{}', [])
      return { xml1, xml2 }
    }, { converterPath: CONVERTER, html: UEDITOR_HTML })

    expect(r.xml2, '二次保存应等于一次保存（根治点铅笔再保存漂移）').toBe(r.xml1)
  })
})
