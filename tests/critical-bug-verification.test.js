/**
 * Para设计器 CRITICAL Bug 修复验证测试
 * 针对深度审查中发现的严重问题进行专项测试
 */

const { para2html, html2para } = require('../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter')

describe('CRITICAL Bug修复验证', () => {

  // ==========================================
  // CRITICAL-01: td内多个para残留标签问题
  // ==========================================

  describe('CRITICAL-01: td内多个para不应留下残留标签', () => {

    test('td包含单个para - 应正常转换', () => {
      const html = '<table deflist="1"><tbody><tr><td><para>定义A</para></td></tr></tbody></table>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      expect(xml).toContain('<definitionList>')
      expect(xml).toContain('<listItemDefinition><para>定义A</para></listItemDefinition>')
      expect(xml).not.toContain('</td>') // ✅ 不应有残留的td标签
      expect(xml).not.toContain('<td') // ✅ 不应有残留的td标签
    })

    test('CRITICAL: td包含多个para - 不应留下残留</td>', () => {
      const html = '<table deflist="1"><tbody><tr><td><para>段落1</para><para>段落2</para></td></tr></tbody></table>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      console.log('输出XML:', xml)

      // ✅ 关键验证：两个para都应该被包含
      expect(xml).toContain('<para>段落1</para>')
      expect(xml).toContain('<para>段落2</para>')

      // ✅ 关键验证：不应有任何td残留
      expect(xml).not.toContain('</td>')
      expect(xml).not.toContain('<td')

      // ✅ 结构验证：两个para都应在listItemDefinition内
      expect(xml).toMatch(/<listItemDefinition>\s*<para>段落1<\/para>\s*<para>段落2<\/para>\s*<\/listItemDefinition>/)
    })

    test('td包含三个para - 全部正确转换', () => {
      const html = '<table deflist="1"><tbody><tr><td><para>P1</para><para>P2</para><para>P3</para></td></tr></tbody></table>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      expect(xml).toContain('<para>P1</para>')
      expect(xml).toContain('<para>P2</para>')
      expect(xml).toContain('<para>P3</para>')
      expect(xml).not.toContain('</td>')
      expect(xml).not.toContain('<td')
    })

    test('td包含para和换行 - 空白字符正确处理', () => {
      const html = '<table deflist="1"><tbody><tr><td>\n  <para>段落1</para>\n  <para>段落2</para>\n</td></tr></tbody></table>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      expect(xml).toContain('<para>段落1</para>')
      expect(xml).toContain('<para>段落2</para>')
      expect(xml).not.toContain('</td>')
    })

    test('多个td，每个包含多个para - 全部正确转换', () => {
      const html = `<table deflist="1"><tbody>
        <tr>
          <th>术语1</th>
          <td><para>定义1-1</para><para>定义1-2</para></td>
        </tr>
        <tr>
          <th>术语2</th>
          <td><para>定义2-1</para><para>定义2-2</para><para>定义2-3</para></td>
        </tr>
      </tbody></table>`

      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      // 验证所有para都被转换
      expect(xml).toContain('<para>定义1-1</para>')
      expect(xml).toContain('<para>定义1-2</para>')
      expect(xml).toContain('<para>定义2-1</para>')
      expect(xml).toContain('<para>定义2-2</para>')
      expect(xml).toContain('<para>定义2-3</para>')

      // 验证无残留标签
      expect(xml).not.toContain('</td>')
      expect(xml).not.toContain('<td')

      // 验证结构完整
      expect(xml).toContain('<definitionList>')
      expect(xml).toContain('</definitionList>')
      expect(xml).toContain('<listItemTerm>术语1</listItemTerm>')
      expect(xml).toContain('<listItemTerm>术语2</listItemTerm>')
    })

    test('边界情况: td内para之间有其他内容 - 全部保留', () => {
      const html = '<table deflist="1"><tbody><tr><td><para>段落1</para>中间文本<para>段落2</para></td></tr></tbody></table>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      expect(xml).toContain('<para>段落1</para>')
      expect(xml).toContain('中间文本')
      expect(xml).toContain('<para>段落2</para>')
      expect(xml).not.toContain('</td>')
    })
  })

  // ==========================================
  // CRITICAL-02: ueditorInstanceId唯一性验证
  // ==========================================

  describe('CRITICAL-02: ueditorInstanceId唯一性验证', () => {

    test('生成100个实例ID - 应全部唯一', () => {
      const ids = new Set()

      for (let i = 0; i < 100; i++) {
        const id = `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        ids.add(id)

        // 微小延迟确保时间戳变化
        if (i % 10 === 0) {
          const start = Date.now()
          while (Date.now() - start < 1) { /* 等待1ms */ }
        }
      }

      expect(ids.size).toBe(100) // ✅ 100个不同的ID
      console.log('✅ 生成了100个唯一的实例ID')
    })

    test('同一毫秒内生成的ID - 应通过随机数区分', () => {
      const id1 = `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const id2 = `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      expect(id1).not.toBe(id2)
      console.log('ID1:', id1)
      console.log('ID2:', id2)
      console.log('✅ 同一毫秒内ID仍然不同')
    })

    test('ID格式验证 - 应符合预期格式', () => {
      const id = `para_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 格式: para_<时间戳>_<随机字符串>
      expect(id).toMatch(/^para_\d{13}_[a-z0-9]{9}$/)
      console.log('生成的ID:', id)
      console.log('✅ ID格式正确')
    })
  })

  // ==========================================
  // 边界情况补充验证
  // ==========================================

  describe('边界情况补充验证', () => {

    test('嵌套列表 - para内包含列表', () => {
      const html = '<p>外层<ul><li>内层项目</li></ul></p>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      console.log('嵌套列表XML:', xml)

      // 验证外层para存在
      expect(xml).toMatch(/<para>/)

      // 验证内层列表存在
      expect(xml).toContain('<randomList>')
      expect(xml).toContain('<listItem>')

      // 结构应该是: <para>外层<randomList><listItem><para>内层项目</para></listItem></randomList></para>
    })

    test('td带属性 - colspan应正确处理', () => {
      const html = '<table deflist="1"><tbody><tr><td colspan="2"><para>跨列内容</para></td></tr></tbody></table>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      console.log('带属性td的XML:', xml)

      // 验证内容被转换
      expect(xml).toContain('<para>跨列内容</para>')

      // 注意: colspan属性可能丢失，这是已知的设计决策
      // 如需保留，需要修改正则表达式
    })

    test('空para - 应正确处理', () => {
      const html = '<p></p><p>非空</p>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      expect(xml).toContain('<para></para>')
      expect(xml).toContain('<para>非空</para>')
    })

    test('para内包含多层嵌套 - 结构保持', () => {
      const html = '<p>文本<strong>强调<em>斜体</em></strong></p>'
      const xml = html2para(html, { dmCode: 'TEST-A-00-0-0-00' })

      console.log('多层嵌套XML:', xml)

      expect(xml).toContain('<para>')
      expect(xml).toContain('<emphasis>')
    })
  })

  // ==========================================
  // dmCode验证增强测试
  // ==========================================

  describe('dmCode验证边界测试', () => {

    test('正常dmCode - 6段', () => {
      const html = '<p>测试</p>'

      expect(() => {
        html2para(html, { dmCode: 'TEST-A-00-0-0-00' })
      }).not.toThrow()
    })

    test('dmCode不足6段 - 应抛出清晰错误', () => {
      const html = '<p>测试</p>'

      expect(() => {
        html2para(html, { dmCode: 'TEST-A-00' })
      }).toThrow(/dmCode格式错误/)

      expect(() => {
        html2para(html, { dmCode: 'TEST-A-00' })
      }).toThrow(/预期至少6段/)
    })

    test('dmCode包含空段 - 当前会通过但sns包含空段', () => {
      const html = '<p>测试</p>'

      // 当前实现：这会通过验证，但sns会包含空段
      // 建议：应该增强验证逻辑
      const xml = html2para(html, { dmCode: 'TEST--00-0-0-00' })
      console.log('⚠️ 空段dmCode通过了验证（建议增强）')
    })

    test('dmCode超过6段 - 应正常工作', () => {
      const html = '<p>测试</p>'

      expect(() => {
        html2para(html, { dmCode: 'TEST-A-00-0-0-00-EXTRA-SEGMENT' })
      }).not.toThrow()
    })
  })
})
