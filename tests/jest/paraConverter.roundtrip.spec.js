/**
 * paraConverter 往返转换单元测试（真实生产代码）
 *
 * 目标：直接导入生产 paraConverter.js，验证 XML↔HTML 往返对称性
 * 与E2E区别：无需浏览器登录/导航，在 jsdom 环境直接测试纯转换逻辑
 *
 * 往返语义（对齐 ParaDesigner.vue handleSave）：
 *   para2html(parent, '<para>X</para>')  →  HTML
 *   html2para(parent, HTML)              →  内层内容(不含外层para)
 *   最终XML = `<para>${内层}</para>`      →  应等于原始输入
 *
 * 已知限制：symbol/formula 往返依赖 UEditor 的 HTML 规范化（<img>自闭合），
 *   Node 环境无此步骤，故不在纯字符串层测试（由 E2E 覆盖）。
 */

// axios 仅在 dmRef/symbol 时触发；mock 防止真实网络调用
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(() => Promise.resolve({ data: { success: false, result: null } }))
  }
}))

import { para2html, html2para } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

// 模拟 parent（仅 formula 路径会用到 cmnodeid/dmCode，本套用例不触发）
const mockParent = { cmnodeid: 'CM001', dmCode: 'A-B-C-D-E-F-G', newformulaCnt: 0 }

// 规范化：消除空白差异后对比结构（对齐 E2E 的 normalize）
function normalize(xml) {
  return xml
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s*\/>/g, '/>')
    .trim()
}

// 执行完整往返：XML → HTML → XML
async function roundTrip(inputXml) {
  const html = await para2html(mockParent, inputXml)
  const inner = await html2para(mockParent, html)
  return `<para>${inner}</para>`
}

describe('往返对称性（纯字符串，无需浏览器）', () => {
  const cases = [
    ['基础文本', '<para>普通文本</para>'],
    ['emphasis强调', '<para><emphasis>强调文本</emphasis></para>'],
    ['superScript上标', '<para>x<superScript>2</superScript></para>'],
    ['subScript下标', '<para>H<subScript>2</subScript>O</para>'],
    ['randomList无序列表', '<para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></para>'],
    ['sequentialList有序列表', '<para><sequentialList><listItem><para>步骤1</para></listItem><listItem><para>步骤2</para></listItem></sequentialList></para>'],
    ['definitionList定义列表', '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>'],
    ['internalRef内部引用', '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>'],
    ['混合嵌套', '<para>文本<emphasis>强调</emphasis>更多文本<superScript>上标</superScript></para>'],
    ['warningAndCautionPara', '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>'],
    ['notePara', '<para><notePara>注释文本</notePara></para>'],
    ['嵌套emphasis', '<para><emphasis>强调1</emphasis><emphasis>强调2</emphasis></para>'],
    ['list嵌套emphasis', '<para><randomList><listItem><para><emphasis>强调项</emphasis></para></listItem></randomList></para>']
  ]

  test.each(cases)('%s 往返对称', async (_name, xml) => {
    const result = await roundTrip(xml)
    expect(normalize(result)).toBe(normalize(xml))
  })
})

describe('P0缺陷回归（往返不应产生重复/丢失）', () => {
  test('P0-1: listItem内para不重复', async () => {
    const xml = '<para><randomList><listItem><para>内容</para></listItem></randomList></para>'
    const result = await roundTrip(xml)
    // 关键：listItem内只应有一层para，不能出现 <para><para>
    expect(result).not.toMatch(/<para>\s*<para>/)
    expect(normalize(result)).toBe(normalize(xml))
  })

  test('P0-2: definitionList内listItemDefinition不重复para', async () => {
    const xml = '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>'
    const result = await roundTrip(xml)
    // listItemDefinition内只应有一层para
    expect(result).not.toMatch(/<listItemDefinition>\s*<para>\s*<para>/)
    expect(normalize(result)).toBe(normalize(xml))
  })

  test('P0-4: internalRef保留完整结束标签', async () => {
    const xml = '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>'
    const result = await roundTrip(xml)
    // 必须包含完整的 </internalRef> 结束标签，不能丢失
    expect(result).toContain('</internalRef>')
    expect(result).toContain('internalRefId="ref1"')
  })

  test('P0-5: warningAndCautionPara类型不丢失（不退化为普通para）', async () => {
    const xml = '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>'
    const result = await roundTrip(xml)
    expect(result).toContain('<warningAndCautionPara>')
    expect(result).toContain('</warningAndCautionPara>')
  })

  test('P0-5: notePara类型不丢失', async () => {
    const xml = '<para><notePara>注释文本</notePara></para>'
    const result = await roundTrip(xml)
    expect(result).toContain('<notePara>')
    expect(result).toContain('</notePara>')
  })
})

describe('td属性边界修复回归（本次修复）', () => {
  test('裸<td>(无属性、无para)应正确转为listItemDefinition并包裹para', async () => {
    // 场景：UEditor中用户在定义列表单元格直接输入纯文本，产生无属性裸<td>
    // 修复前：L286需要para(不匹配)、L289需要属性(不匹配)→ 残留<td>标签破坏结构
    const html = '<table deflist="1"><tr><th>术语</th><td>纯文本定义</td></tr></table>'
    const result = await html2para(mockParent, html)
    // 裸<td>必须被转换，不能有残留的<td>/</td>标签
    expect(result).not.toContain('<td>')
    expect(result).not.toContain('</td>')
    // 内容应被包裹为 listItemDefinition > para
    expect(result).toContain('<listItemDefinition><para>纯文本定义</para></listItemDefinition>')
  })

  test('带属性<td>(无para)仍正常转换（未回归）', async () => {
    const html = '<table deflist="1"><tr><th>术语</th><td class="foo">定义</td></tr></table>'
    const result = await html2para(mockParent, html)
    expect(result).not.toContain('<td')
    expect(result).toContain('<listItemDefinition><para>定义</para></listItemDefinition>')
  })
})
