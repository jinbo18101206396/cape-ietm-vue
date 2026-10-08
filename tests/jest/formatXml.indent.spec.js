// formatXml 缩进兜底回归测试
// 复现并锁定 "Invalid count value: -1" 根因：baseIndent 为负时 ' '.repeat() 抛异常。
// 触发路径：ParaDesigner.handleSave → getLine(lineno).indexOf('<') 返回 -1 → formatXml(xml, -1)。
import { formatXml } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree'

describe('formatXml baseIndent 边界', () => {
  const xml = '<para>\n<title>x</title>\n</para>'

  test('负数缩进(-1)不抛"Invalid count value"，按0缩进兜底', () => {
    expect(() => formatXml(xml, -1)).not.toThrow()
    const out = formatXml(xml, -1)
    // 根行(<para>)应无前导空格（baseIndent兜底为0）
    expect(out.split('\n')[0]).toBe('<para>')
  })

  test('负数缩进结果与0缩进一致', () => {
    expect(formatXml(xml, -1)).toBe(formatXml(xml, 0))
  })

  test('正常正数缩进仍生效', () => {
    const out = formatXml(xml, 4)
    expect(out.split('\n')[0]).toBe('    <para>')
  })

  test('非法类型(NaN/undefined)兜底为0缩进', () => {
    expect(() => formatXml(xml, NaN)).not.toThrow()
    expect(() => formatXml(xml, undefined)).not.toThrow()
    expect(formatXml(xml, NaN)).toBe(formatXml(xml, 0))
  })
})
