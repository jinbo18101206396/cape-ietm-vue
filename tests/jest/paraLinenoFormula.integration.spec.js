/**
 * 行号公式集成测试（真实生产函数，非重写）
 *
 * 验证 DmContentEditor 打开设计视图时的行号换算公式：
 *   0-based编辑器行 = node.attributes.lineno + linenoOffset - 2
 * 必须精确命中每个 para 节点的 <para 开始标签行。
 *
 * 使用真实：formatXml + getTreeNodesfromXml + getLinenoOffset（editor/utils/xmlTree.js）
 * 覆盖多种真实DM文档形态（含前导<?xml?>/DOCTYPE、多层嵌套、多para、列表内para、
 * definitionList内para、连续para、深层content）。
 */
import { formatXml, getTreeNodesfromXml, getLinenoOffset } from '@/views/ietm/ietmdatamodulemanagement/editor/utils/xmlTree'

// 最小 CodeMirror 桩（getLinenoOffset 只用 lineCount/getLine）
function makeCM(text) {
  const lines = text.split('\n')
  return { lineCount: () => lines.length, getLine: i => lines[i], _lines: lines }
}

// DmContentEditor 修复后使用的公式（gutter 与 tree 双击共用）
function resolveEditorLine(node, linenoOffset) {
  return node.attributes.lineno + linenoOffset - 2
}

const DOCS = {
  '单para': `<dmodule><content><description><para>正文A</para></description></content></dmodule>`,

  '带xml声明与DOCTYPE': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dmodule []>
<dmodule><content><description><para>正文A</para><para>正文B</para></description></content></dmodule>`,

  '多个连续para': `<dmodule><content><description><para>一</para><para>二</para><para>三</para></description></content></dmodule>`,

  '列表内para': `<dmodule><content><description><para>引言</para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></description></content></dmodule>`,

  'definitionList内para': `<dmodule><content><description><para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义X</para></listItemDefinition></definitionListItem></definitionList></para></description></content></dmodule>`,

  '深层嵌套多para': `<dmodule><content><procedure><mainProcedure><proceduralStep><para>步骤说明</para></proceduralStep><proceduralStep><para>另一步骤</para><para>补充</para></proceduralStep></mainProcedure></procedure></content></dmodule>`,

  'para带id': `<dmodule><content><description><para id="p001">带ID正文</para></description></content></dmodule>`
}

describe('行号公式命中<para>开始标签（真实函数）', () => {
  for (const [name, rawXml] of Object.entries(DOCS)) {
    test(`${name}: 每个para节点换算行都落在<para开始标签行`, () => {
      const formatted = formatXml(rawXml, 0)
      const cm = makeCM(formatted)
      const linenoOffset = getLinenoOffset(cm)
      const nodes = getTreeNodesfromXml(formatted, 'dmodule')

      const paraNodes = nodes.filter(n => n.text === 'para')
      expect(paraNodes.length).toBeGreaterThan(0) // 确保样本非空

      for (const node of paraNodes) {
        const editorLine = resolveEditorLine(node, linenoOffset)
        const lineStr = cm.getLine(editorLine) || ''
        // 关键断言：该行确实是 <para 开始标签（而非内容行/结束标签行）
        expect(lineStr.trim().startsWith('<para')).toBe(true)
      }
    })
  }

  test('反例：旧gutter逻辑(line+1)会落到<para的下一行(非开始标签行)', () => {
    const formatted = formatXml(DOCS['单para'], 0)
    const cm = makeCM(formatted)
    const linenoOffset = getLinenoOffset(cm)
    const nodes = getTreeNodesfromXml(formatted, 'dmodule')
    const para = nodes.find(n => n.text === 'para')

    const correct = resolveEditorLine(para, linenoOffset)   // 修复后：命中 <para
    const buggy = correct + 1                                // 旧逻辑 line+1：多一行

    expect((cm.getLine(correct) || '').trim().startsWith('<para')).toBe(true)
    expect((cm.getLine(buggy) || '').trim().startsWith('<para')).toBe(false)
  })
})
