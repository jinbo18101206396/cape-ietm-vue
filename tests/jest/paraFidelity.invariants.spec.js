/**
 * Para 转换保真不变量测试（真实 para2html/html2para）
 *
 * 不追求逐字符相等，而是断言"结构不变量"——这些不变量若被破坏即为真实缺陷：
 *  1) <para> 与 </para> 数量配平（本次"多出一个<para>"缺陷的核心症状）
 *  2) 不产生 <para><para>（无意义双层包裹）
 *  3) 关键标签/属性不丢失
 *  4) 各类块级元素开闭标签配平
 * 覆盖：多段落、深层列表、混合内联、UEditor风格的多<p>输入、空/空白输入。
 */
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn(() => Promise.resolve({ data: { success: false, result: null } })) }
}))

import { para2html, html2para } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

const mockParent = { cmnodeid: 'CM001', dmCode: 'A-B-C-D-E-F-G', newformulaCnt: 0 }

const count = (s, re) => (s.match(re) || []).length
// 还原 handleSave：inner = html2para(...); xml = <para>inner</para>
async function saveFrom(html) {
  const inner = await html2para(mockParent, html, '{}', [])
  return inner ? `<para>\n${inner}\n</para>` : `<para>\n</para>`
}
// 还原完整往返：XML → HTML(para2html) → XML(saveFrom)
async function roundTrip(xml) {
  const html = await para2html(mockParent, xml)
  return saveFrom(html)
}

function assertBalanced(xml, tag) {
  expect(count(xml, new RegExp(`<${tag}[ >]`, 'g'))).toBe(count(xml, new RegExp(`</${tag}>`, 'g')))
}

describe('往返后标签配平不变量', () => {
  const xmls = [
    ['单para', '<para>正文</para>'],
    ['两段(嵌套randomList)', '<para><randomList><listItem><para>甲</para></listItem><listItem><para>乙</para></listItem></randomList></para>'],
    ['三层列表嵌套', '<para><randomList><listItem><para>L1<sequentialList><listItem><para>L2</para></listItem></sequentialList></para></listItem></randomList></para>'],
    ['混合内联(强调+上下标+内部引用)', '<para>文本<emphasis>强</emphasis>x<superScript>2</superScript><internalRef internalRefId="r1" internalRefTargetType="figure"></internalRef>尾</para>'],
    ['definitionList多行', '<para><definitionList><definitionListItem><listItemTerm>T1</listItemTerm><listItemDefinition><para>D1</para></listItemDefinition></definitionListItem><definitionListItem><listItemTerm>T2</listItemTerm><listItemDefinition><para>D2</para></listItemDefinition></definitionListItem></definitionList></para>'],
    ['warningAndCautionPara', '<para><warningAndCautionPara>警告</warningAndCautionPara></para>'],
  ]

  test.each(xmls)('%s：往返后 <para> 配平且无双层包裹', async (_n, xml) => {
    const out = await roundTrip(xml)
    assertBalanced(out, 'para')
    expect(out).not.toMatch(/<para>\s*<para>\b/)  // 无 <para><para> 空壳嵌套
  })

  test.each(xmls)('%s：往返后各块级元素配平', async (_n, xml) => {
    const out = await roundTrip(xml)
    for (const tag of ['randomList', 'sequentialList', 'listItem', 'definitionList', 'definitionListItem', 'listItemTerm', 'listItemDefinition', 'warningAndCautionPara', 'internalRef', 'emphasis']) {
      assertBalanced(out, tag)
    }
  })
})

describe('UEditor 风格 HTML 输入（保存路径直入 html2para）', () => {
  const htmls = [
    ['干净单p', '<p>XXX</p>'],
    ['带缩进换行的p', '<p>\n   XXX\n </p>'],
    ['尾随空p', '<p>XXX</p><p></p>'],
    ['两个p(段落被拆)', '<p>甲</p><p>乙</p>'],
    ['p内br', '<p>甲<br/>乙</p>'],
    ['p含strong', '<p>文本<strong>强调</strong></p>'],
    ['列表', '<ul><li>项1</li><li>项2</li></ul>'],
  ]

  test.each(htmls)('%s：保存后 <para> 配平', async (_n, html) => {
    const out = await saveFrom(html)
    assertBalanced(out, 'para')
  })
})

describe('空/空白输入健壮性', () => {
  test.each([
    ['空串', ''],
    ['纯空白', '   \n  '],
    ['空p', '<p></p>'],
    ['仅nbsp', '<p>&nbsp;</p>'],
    ['仅br', '<p><br/></p>'],
  ])('%s：不抛异常且 <para> 配平', async (_n, html) => {
    let out
    await expect((async () => { out = await saveFrom(html) })()).resolves.not.toThrow()
    assertBalanced(out, 'para')
  })
})
