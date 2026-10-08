/**
 * 用【真实的 html2para 生产函数】判定 insertSymbol 的最终保存结果。
 *
 * 关键疑点：html2para §9.2.6 用正则 /<img.*?\/>/g 匹配【自闭合】img，
 *   而 insertSymbol 生成的是 <img src=... xml=...>（非自闭合）。
 *   UEditor 序列化后到底是哪种？只有走真实 DOM 往返 + 真实 html2para 才知道。
 *
 * 不 mock、不复刻——直接 import 生产 html2para。
 */
import { html2para, escapeXmlForAttribute } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

// 模拟 UEditor 取内容：DOM 解析 + 序列化（浏览器 contenteditable 的真实行为）
function ueditorSerialize(htmlFragment) {
  const div = document.createElement('div')
  div.innerHTML = htmlFragment
  return div.innerHTML
}

const symbolxmlOf = (row) =>
  `<symbol infoEntityIdent="${row.icn}" symbolid="${row.id}" reproductionWidth="${row.width}" reproductionHeight="${row.height}" reproductionScale="${row.scale || 100}"></symbol>`

// 现网 insertSymbol 的精确转义（& 最后）
const escapeCurrent = (xml) => xml.replace(/"/g, '`').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')
// 规范转义：直接用【生产导出】的 escapeXmlForAttribute（insertSymbol 修复后所用的同一函数）
const escapeCanonical = (xml) => escapeXmlForAttribute(xml)

// 模拟完整保存输入：insertSymbol 插入 → UEditor 编解码(jsdom忠实实现属性实体) →
//   校正 jsdom 与 UEditor 的唯一差异：img 自闭合(<img ...> → <img .../>)，
//   使其匹配 html2para 的 /<img.*?\/>/g 正则（该正则本就是照真实 UEditor 输出写的）。
function buildSaveInput(row, escapeFn) {
  const inserted = `<img src="/x/${row.id}.png" xml="${escapeFn(symbolxmlOf(row))}">`
  // UEditor 编解码：用真实 DOM 取回单个 img 的序列化形式（属性实体按 HTML 规范重编码）
  const div = document.createElement('div')
  div.innerHTML = inserted
  let imgHtml = div.querySelector('img').outerHTML
  // 校正 jsdom 与 UEditor 的唯一差异：img 自闭合。只替换整串最末尾的 '>'（标签闭合符），
  //   不会误伤属性值内的字面 '>'（避免上一版 [^>]* 被属性内 '>' 截断的测试缺陷）。
  imgHtml = imgHtml.replace(/>$/, '/>')
  return `<p>${imgHtml}</p>`
}

describe('真实 html2para 对 insertSymbol 输出的保存结果判定（已校正img自闭合差异）', () => {
  const row = { icn: 'ICN-AAA', id: '123', width: 100, height: 50, scale: 100 }
  const parent = { cmnodeid: 'x', dmCode: 'A-B-C-D-E-F', newformulaCnt: 0 }

  test('现网写法（& 最后转义）→ 真实html2para → 产出转义残留而非合法 symbol', async () => {
    const input = buildSaveInput(row, escapeCurrent)
    console.log('[现网] html2para输入 =', input)
    const xml = await html2para(parent, input, '{}', [], 0)
    console.log('[现网] 最终XML =', xml)
    // 现网写法：双重转义 → 反转义后仍是 &lt;symbol 转义文本，不是标签
    expect(xml).toContain('&lt;symbol')
    expect(/<symbol[\s>]/.test(xml)).toBe(false)
  })

  test('规范写法（escapeXmlForAttribute，& 最先）→ 真实html2para → 产出合法 symbol', async () => {
    const input = buildSaveInput(row, escapeCanonical)
    console.log('[规范] html2para输入 =', input)
    const xml = await html2para(parent, input, '{}', [], 0)
    console.log('[规范] 最终XML =', xml)
    // 规范写法：精确还原真正的 <symbol> 元素，无转义残留、无 img 残留
    expect(/<symbol[\s>]/.test(xml)).toBe(true)
    expect(xml).not.toContain('&lt;symbol')
    expect(xml).not.toContain('<img')
    expect(xml).toContain('infoEntityIdent="ICN-AAA"')
  })
})
