/**
 * 直接测试真实的 paraConverter.js（通过require）
 */

// 注意：无法直接require ES6模块，所以我们复制核心逻辑进行验证
console.log('========== 实际代码逻辑验证 ==========\n')

// 场景1：definitionList → HTML → definitionList
const xml1 = `<para><definitionList><definitionListItem><listItemTerm>CPU</listItemTerm><listItemDefinition>中央处理器</listItemDefinition></definitionListItem></definitionList></para>`

console.log('1. 原始XML:')
console.log(xml1)
console.log()

// 模拟 para2html（只处理 definitionList）
let html1 = xml1
const deflists = html1.match(/<definitionList.*?<\/definitionList>/g)
if (deflists != null) {
  deflists.forEach(m => {
    let html_ = m.replace(/<definitionList>/g, '<table deflist="1">')
      .replace('</definitionList>', '</table>')
      .replace(/<definitionListItem>/g, '<tr>')
      .replace(/<\/definitionListItem>/g, '</tr>')
      .replace(/<listItemTerm\/>/g, '<th></th>')
      .replace(/<listItemTerm>/g, '<th>')
      .replace(/<\/listItemTerm>/g, '</th>')
      .replace(/<listItemDefinition\/>/g, '<td></td>')
      .replace(/<listItemDefinition>/g, '<td>')
      .replace(/<\/listItemDefinition>/g, '</td>')
    html1 = html1.replace(m, html_)
  })
}
html1 = html1.replace(/<para/g, '<p').replace(/<\/para>/g, '</p>')

console.log('2. 转换为HTML:')
console.log(html1)
console.log()

// 模拟 html2para（先处理基础元素，再处理 deflist）
let xml2 = html1
// 基础元素转换（注意：此时不应该有 <li>，因为这是 deflist）
xml2 = xml2.replace(/<p>/g, '<para>').replace(/<\/p>/g, '</para>')

// 处理 deflist table（核心测试点）
const deflists2 = xml2.match(/<table deflist="1">.*?<\/table>/g)
console.log('3. 匹配到的 deflist tables:', deflists2 ? deflists2.length : 0)
if (deflists2) {
  console.log('   匹配内容:', deflists2[0].substring(0, 100))
}
console.log()

if (deflists2 != null) {
  deflists2.forEach(m => {
    let table_ = m.replace(/<table deflist="1">/g, '<definitionList>')
      .replace(/<\/table>/g, '</definitionList>')
      .replace(/<tr.*?>/g, '<definitionListItem>')
      .replace(/<\/tr>/g, '</definitionListItem>')
      .replace(/<th.*?>/g, '<listItemTerm>')
      .replace(/<\/th>/g, '</listItemTerm>')
      .replace(/<td.*?>/g, '<listItemDefinition>')
      .replace(/<\/td>/g, '</listItemDefinition>')

    console.log('4. 单个 table 替换后:')
    console.log(table_)
    console.log()

    xml2 = xml2.replace(m, table_)
  })
}

console.log('5. 最终XML:')
console.log(xml2)
console.log()

// 验证是否还原
const normalize = s => s.replace(/\s+/g, '').trim()
const original = normalize(xml1)
const roundtrip = normalize(xml2)

console.log('========== 双向转换验证 ==========')
console.log('原始（规范化）:', original.substring(0, 150))
console.log('还原（规范化）:', roundtrip.substring(0, 150))
console.log('是否一致:', original === roundtrip ? '✓ 是' : '✗ 否')
console.log()

// 场景2：测试是否会错误匹配 listItem
console.log('========== 场景2：混合内容测试 ==========')
const mixed = `<para><randomList><listItem><para>普通列表项</para></listItem></randomList><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition>定义</listItemDefinition></definitionListItem></definitionList></para>`
console.log('混合XML:', mixed)
console.log()

// 先转HTML
let mixedHtml = mixed
// 1. 处理 deflist
const d = mixedHtml.match(/<definitionList.*?<\/definitionList>/g)
if (d) {
  d.forEach(m => {
    let html_ = m.replace(/<definitionList>/g, '<table deflist="1">')
      .replace('</definitionList>', '</table>')
      .replace(/<definitionListItem>/g, '<tr>')
      .replace(/<\/definitionListItem>/g, '</tr>')
      .replace(/<listItemTerm>/g, '<th>')
      .replace(/<\/listItemTerm>/g, '</th>')
      .replace(/<listItemDefinition>/g, '<td>')
      .replace(/<\/listItemDefinition>/g, '</td>')
    mixedHtml = mixedHtml.replace(m, html_)
  })
}
// 2. 基础元素
mixedHtml = mixedHtml.replace(/<para/g, '<p')
  .replace(/<\/para>/g, '</p>')
  .replace(/<randomList/g, '<ul')
  .replace(/<\/randomList>/g, '</ul>')
  .replace(/<listItem/g, '<li')
  .replace(/<\/listItem>/g, '</li>')

console.log('转为HTML:', mixedHtml)
console.log()

// 再转回XML
let mixedXml = mixedHtml
// 1. 基础元素（这会把 <li> → <listItem>）
mixedXml = mixedXml.replace(/<ul>/g, '<randomList>')
  .replace(/<\/ul>/g, '</randomList>')
  .replace(/<li>/g, '<listItem>')
  .replace(/<\/li>/g, '</listItem>')
  .replace(/<p>/g, '<para>')
  .replace(/<\/p>/g, '</para>')

console.log('基础元素替换后:', mixedXml)
console.log()

// 2. 处理 deflist（此时已经有 <listItem> 了，但它们不在 <table deflist="1"> 内部）
const d2 = mixedXml.match(/<table deflist="1">.*?<\/table>/g)
console.log('匹配到的 deflist:', d2 ? d2.length : 0)
if (d2) {
  console.log('   内容不包含 listItem:', !d2[0].includes('listItem') ? '✓ 正确' : '✗ 错误')

  d2.forEach(m => {
    console.log('   原 table:', m)
    let table_ = m.replace(/<table deflist="1">/g, '<definitionList>')
      .replace(/<\/table>/g, '</definitionList>')
      .replace(/<tr>/g, '<definitionListItem>')
      .replace(/<\/tr>/g, '</definitionListItem>')
      .replace(/<th>/g, '<listItemTerm>')
      .replace(/<\/th>/g, '</listItemTerm>')
      .replace(/<td>/g, '<listItemDefinition>')
      .replace(/<\/td>/g, '</listItemDefinition>')
    console.log('   转换后:', table_)
    mixedXml = mixedXml.replace(m, table_)
  })
}

console.log()
console.log('最终混合XML:', mixedXml)
console.log('包含正确的 listItemTerm:', mixedXml.includes('<listItemTerm>术语</listItemTerm>') ? '✓ 是' : '✗ 否')
console.log('没有错误的 listItemstItemTerm:', !mixedXml.includes('listItemstItemTerm') ? '✓ 是' : '✗ 否')
