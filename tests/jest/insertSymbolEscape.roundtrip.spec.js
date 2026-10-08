/**
 * 判定 insertSymbol 的转义顺序是否为真实缺陷。
 *
 * 疑点：ParaDesigner.insertSymbol 生成 img 的 xml 属性时，转义顺序为
 *   .replace(/"/g,'`').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;')
 * 即 & 最后替换 —— 会把刚生成的 &lt;/&gt; 二次转义成 &amp;lt;/&amp;gt;。
 *
 * 兄弟方法 insertInterref/insertDmRef 只做 "→`（引号转反引号），不转义尖括号。
 *
 * 验证方式（决定性，不靠推理 UEditor）：
 *   浏览器把 html 插入 contenteditable → getContent 取回，本质是
 *   「HTML 解析进 DOM」+「DOM 序列化回 HTML」。jsdom 实现了该 HTML 规范。
 *   我们复刻这一往返，再跑 html2para 里对 xml 属性的真实提取逻辑，
 *   看还原出的是合法 <symbol .../> 还是被破坏的 &lt;symbol...。
 */

// 复刻 html2para 中提取 xml 属性并反转义的真实逻辑（paraConverter.js §9.2.6 / insert 的逆过程）
function unescapeXmlAttribute(escapedXml) {
  if (!escapedXml) return ''
  return escapedXml
    .replace(/&#96;/g, '`')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&') // & 最后替换
}

// 模拟浏览器/UEditor 往返：把 innerHTML 写进 DOM 再序列化回来
function domRoundTrip(htmlFragment) {
  const div = document.createElement('div')
  div.innerHTML = htmlFragment
  return div.innerHTML
}

// html2para 对 <img>/<a> 的还原：先 DOM 往返(UEditor)，再正则取 xml 属性，再反转义
function recoverXmlFromInserted(insertedHtml) {
  const afterEditor = domRoundTrip(insertedHtml)
  const match = afterEditor.match(/xml="([^"]+)"/)
  if (!match) return { afterEditor, recovered: null }
  return { afterEditor, recovered: unescapeXmlAttribute(match[1]) }
}

describe('insertSymbol 转义顺序真实往返判定', () => {
  test('insertInterref（引号→反引号，不转义尖括号）能还原出合法 internalRef', () => {
    const data = { refid: 'REF-001', reftype: 'para' }
    const refxml = `<internalRef xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" internalRefId="${data.refid}" internalRefTargetType="${data.reftype}"></internalRef>`
    const html = `<a href="javascript:void(0);" xml="${refxml.replace(/"/g, '`')}">【内部引用】</a>`

    const { recovered } = recoverXmlFromInserted(html)
    expect(recovered).toContain('<internalRef')
    expect(recovered).toContain('</internalRef>')
    // 不应残留转义实体
    expect(recovered).not.toContain('&lt;')
    expect(recovered).not.toContain('&amp;')
  })

  test('根因锁定：旧写法（& 最后转义）往返后残留 &lt;symbol 转义文本，不是合法标签', () => {
    const row = { icn: 'ICN-AAA', id: '123', width: 100, height: 50, scale: 100 }
    const symbolxml = `<symbol infoEntityIdent="${row.icn}" symbolid="${row.id}" reproductionWidth="${row.width}" reproductionHeight="${row.height}" reproductionScale="${row.scale || 100}"></symbol>`
    // 修复前 insertSymbol 的精确转义顺序（& 放最后）—— 已被本次修复移除，此处锁定其错误行为
    const escaped = symbolxml.replace(/"/g, '`').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')
    const html = `<img src="/x.png" xml="${escaped}">`

    const { afterEditor, recovered } = recoverXmlFromInserted(html)

    // 打印真实往返结果，供人工确认
    console.log('[根因] 插入前 escaped =', escaped)
    console.log('[根因] UEditor往返后 =', afterEditor)
    console.log('[根因] 反转义还原   =', recovered)

    // 锁定根因：& 最后转义 → 双重转义 → 反转义只解一层 → 得到 &lt;symbol 转义文本
    expect(recovered).toContain('&lt;symbol')
    expect(recovered).not.toMatch(/<symbol[\s>]/)
  })

  // 复刻 paraConverter 的规范转义函数（para2html 用它生成 xml 属性，与 unescapeXmlAttribute 互逆）
  function escapeXmlForAttribute(xml) {
    if (!xml) return ''
    return xml
      .replace(/&/g, '&amp;') // & 必须最先替换
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;')
  }

  test('规范方案：insertSymbol 用 escapeXmlForAttribute（& 最先）能精确还原原始 XML（含双引号）', () => {
    const row = { icn: 'ICN-AAA', id: '123', width: 100, height: 50, scale: 100 }
    const symbolxml = `<symbol infoEntityIdent="${row.icn}" symbolid="${row.id}" reproductionWidth="${row.width}" reproductionHeight="${row.height}" reproductionScale="${row.scale || 100}"></symbol>`
    const escapedFix = escapeXmlForAttribute(symbolxml)
    const html = `<img src="/x.png" xml="${escapedFix}">`

    const { recovered } = recoverXmlFromInserted(html)
    console.log('[规范方案] 反转义还原 =', recovered)
    // 必须精确还原为原始 XML —— 属性用双引号，不是反引号
    expect(recovered).toBe(symbolxml)
  })

  test('对照：仅引号→反引号（兄弟方法写法）还原后属性变成反引号（非精确还原）', () => {
    const row = { icn: 'ICN-AAA', id: '123', width: 100, height: 50, scale: 100 }
    const symbolxml = `<symbol infoEntityIdent="${row.icn}" symbolid="${row.id}" reproductionWidth="${row.width}" reproductionHeight="${row.height}" reproductionScale="${row.scale || 100}"></symbol>`
    const escapedFix = symbolxml.replace(/"/g, '`') // 仅引号→反引号
    const html = `<img src="/x.png" xml="${escapedFix}">`

    const { recovered } = recoverXmlFromInserted(html)
    console.log('[反引号方案] 反转义还原 =', recovered)
    // 标签在，但属性分隔符是反引号，不等于原始双引号 XML
    expect(recovered).toContain('<symbol')
    expect(recovered).not.toBe(symbolxml) // 证明这不是精确往返
  })
})
