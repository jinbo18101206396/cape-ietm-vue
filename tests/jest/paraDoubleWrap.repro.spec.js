// 复现"保存后多出一个<para>"缺陷
// 模拟 ParaDesigner.handleSave 的核心两步：html2para(去外层p) → 包裹<para>
import { html2para } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter'

jest.mock('axios', () => ({ post: jest.fn(), get: jest.fn() }))

const mockParent = { cmnodeid: 'CM001', dmCode: 'A-B-C-D-E-F-G', newformulaCnt: 0 }

// 还原 handleSave: paraContent = html2para(...); xml = `<para>\n${paraContent}\n</para>`
async function saveWrap(getContentReturn) {
  const paraContent = await html2para(mockParent, getContentReturn, '{}', [])
  return paraContent ? `<para>\n${paraContent}\n</para>` : `<para>\n</para>`
}

function countParaOpen(xml) { return (xml.match(/<para>/g) || []).length }
function countParaClose(xml) { return (xml.match(/<\/para>/g) || []).length }

describe('Para保存双层<para>复现', () => {
  // UEditor 对单段落 <p>XXX</p> 的各种可能归一化输出
  const candidates = {
    '干净单p': '<p>XXX</p>',
    '带换行缩进': '<p>\n          XXX\n        </p>',
    '尾部空p(UEditor常见)': '<p>XXX</p><p></p>',
    '尾部<br>': '<p>XXX<br/></p>',
    '两个p(段内换行被UEditor拆分)': '<p>XXX</p><p>YYY</p>',
  }

  for (const [name, html] of Object.entries(candidates)) {
    test(`${name}: 标签应配平且不产生嵌套<para>`, async () => {
      const xml = await saveWrap(html)
      // eslint-disable-next-line no-console
      console.log(`[${name}] →`, JSON.stringify(xml))
      expect(countParaOpen(xml)).toBe(countParaClose(xml)) // 配平
    })
  }
})
