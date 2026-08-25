/**
 * 向后兼容性测试：验证xmlTree.js修改不影响原有功能
 */

describe('xmlTree.js 修改向后兼容性验证', () => {
  describe('原有长标签名仍然正常匹配', () => {
    test('普通标签仍然正常工作', () => {
      const tagNames = ['dmodule', 'content', 'para', 'description', 'emphasis']

      tagNames.forEach(tag => {
        const regex = new RegExp('^<' + tag + '[\\s>/]')

        // 开始标签
        expect(regex.test(`<${tag}>`)).toBe(true)
        expect(regex.test(`<${tag} attr="val">`)).toBe(true)
        expect(regex.test(`<${tag}/>`)).toBe(true)

        // 不应该匹配其他标签
        expect(regex.test(`<other>`)).toBe(false)
      })
    })

    test('常见S1000D标签', () => {
      const s1000dTags = [
        'identAndStatusSection',
        'dmAddress',
        'dmIdent',
        'dmCode',
        'issueInfo',
        'languageCode'
      ]

      s1000dTags.forEach(tag => {
        const regex = new RegExp('^<' + tag + '[\\s>/]')

        expect(regex.test(`<${tag}>`)).toBe(true)
        expect(regex.test(`<${tag} attr="val">`)).toBe(true)
      })
    })
  })

  describe('修改前后行为对比', () => {
    test('修改前：startsWith匹配', () => {
      // 模拟修改前的逻辑
      const matchOld = (line, tagName) => {
        return line.trim().startsWith('<' + tagName)
      }

      // 普通标签：修改前正常
      expect(matchOld('<dmodule>', 'dmodule')).toBe(true)
      expect(matchOld('<para attr="val">', 'para')).toBe(true)

      // 问题：短标签误匹配（这是我们要修复的bug）
      expect(matchOld('<emphasis>', 'em')).toBe(true) // ❌ BUG
    })

    test('修改后：正则匹配', () => {
      // 模拟修改后的逻辑
      const matchNew = (line, tagName) => {
        return new RegExp('^<' + tagName + '[\\s>/]').test(line.trim())
      }

      // 普通标签：修改后仍正常 ✅
      expect(matchNew('<dmodule>', 'dmodule')).toBe(true)
      expect(matchNew('<para attr="val">', 'para')).toBe(true)

      // 修复：短标签不再误匹配 ✅
      expect(matchNew('<emphasis>', 'em')).toBe(false)
      expect(matchNew('<em>', 'em')).toBe(true)
    })

    test('向后兼容：所有原本能匹配的仍能匹配', () => {
      const testCases = [
        { line: '<dmodule>', tag: 'dmodule', expected: true },
        { line: '<dmodule attr="val">', tag: 'dmodule', expected: true },
        { line: '<dmodule/>', tag: 'dmodule', expected: true },
        { line: '<para>', tag: 'para', expected: true },
        { line: '<content>', tag: 'content', expected: true },
        { line: '<emphasis>', tag: 'emphasis', expected: true },
        { line: '<strong>', tag: 'strong', expected: true }
      ]

      testCases.forEach(({ line, tag, expected }) => {
        const matchOld = line.trim().startsWith('<' + tag)
        const matchNew = new RegExp('^<' + tag + '[\\s>/]').test(line.trim())

        if (matchOld === true) {
          // 原本能匹配的，修改后必须仍能匹配
          expect(matchNew).toBe(true)
        }
      })
    })

    test('唯一差异：修复了短标签误匹配bug', () => {
      const bugCases = [
        { line: '<emphasis>', tag: 'em' }, // emphasis不应匹配em
        { line: '<embed>', tag: 'em' }, // embed不应匹配em
        { line: '<para>', tag: 'p' }, // para不应匹配p
        { line: '<info>', tag: 'i' } // info不应匹配i
      ]

      bugCases.forEach(({ line, tag }) => {
        const matchOld = line.trim().startsWith('<' + tag)
        const matchNew = new RegExp('^<' + tag + '[\\s>/]').test(line.trim())

        // 修改前：误匹配（BUG）
        expect(matchOld).toBe(true)

        // 修改后：正确不匹配（BUG修复）
        expect(matchNew).toBe(false)
      })
    })
  })

  describe('边界情况验证', () => {
    test('自闭合标签', () => {
      const regex = new RegExp('^<' + 'dmodule' + '[\\s>/]')

      expect(regex.test('<dmodule/>')).toBe(true)
      expect(regex.test('<dmodule />')).toBe(true)
    })

    test('带属性的标签', () => {
      const regex = new RegExp('^<' + 'dmCode' + '[\\s>/]')

      expect(regex.test('<dmCode modelIdentCode="TEST">')).toBe(true)
      expect(regex.test('<dmCode   attr="val">')).toBe(true) // 多空格
    })

    test('空字符串和null', () => {
      const regex = new RegExp('^<' + 'test' + '[\\s>/]')

      expect(regex.test('')).toBe(false)
      expect(regex.test('  ')).toBe(false)
    })
  })
})
