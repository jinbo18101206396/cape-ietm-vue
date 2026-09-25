/**
 * DmSourceView._writeAttr() 单元测试（P1-3）
 *
 * 测试复杂正则逻辑的 10+ 边界场景，提供回归保护
 *
 * 运行：node tests/unit/DmSourceView._writeAttr.spec.js
 */

// 从 DmSourceView.vue 提取的纯函数（保持与源码完全一致）
function _writeAttr(line, name, val) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escVal = v => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const en = esc(name)
  const exists = new RegExp('(^|\\s)' + en + '\\s*=\\s*"[^"]*"')
  if (exists.test(line)) {
    if (val === '' || val == null)
      return line.replace(new RegExp('(^|\\s)' + en + '\\s*=\\s*"[^"]*"'), '')
    return line.replace(new RegExp('(^|\\s)(' + en + ')(\\s*=\\s*")([^"]*)(")'),
      (m, g1, g2, g3) => g1 + g2 + g3 + escVal(val) + '"')
  }
  if (val !== '' && val != null) {
    const attrStr = ' ' + name + '="' + escVal(val) + '"'
    if (/\/>\s*$/.test(line)) return line.replace(/\/>(\s*)$/, (m, tail) => attrStr + '/>' + tail)
    return line.replace('>', () => attrStr + '>')
  }
  return line
}

// 简易测试框架
let passed = 0
let failed = 0
const tests = []

function it(desc, fn) {
  tests.push({ desc, fn })
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}", got "${actual}"`)
      }
    }
  }
}

function describe(suite, fn) {
  console.log(`\n📦 ${suite}`)
  fn()
}

function runTests() {
  tests.forEach(({ desc, fn }) => {
    try {
      fn()
      console.log(`  ✓ ${desc}`)
      passed++
    } catch (err) {
      console.log(`  ✗ ${desc}`)
      console.log(`    ${err.message}`)
      failed++
    }
  })
  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}  📊 总计: ${passed + failed}`)
  console.log(`${'='.repeat(60)}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

// ========== 测试套件 ==========
describe('DmSourceView._writeAttr()', () => {
  // ========== 场景1：属性存在，修改值 ==========
  it('应该修改已存在的属性值', () => {
    const line = '<para id="abc" class="note">'
    const result = _writeAttr(line, 'id', 'xyz')
    expect(result).toBe('<para id="xyz" class="note">')
  })

  it('应该修改值时保留属性间的空格', () => {
    const line = '<para   id="abc"   class="note">'
    const result = _writeAttr(line, 'id', 'xyz')
    expect(result).toBe('<para   id="xyz"   class="note">')
  })

  // ========== 场景2：属性存在，删除属性 ==========
  it('应该删除属性（val为空字符串）', () => {
    const line = '<para id="abc" class="note">'
    const result = _writeAttr(line, 'id', '')
    expect(result).toBe('<para class="note">')
  })

  it('应该删除属性（val为null）', () => {
    const line = '<para id="abc" class="note">'
    const result = _writeAttr(line, 'id', null)
    expect(result).toBe('<para class="note">')
  })

  it('应该删除行首属性时清除前导空格', () => {
    const line = '<para id="abc">'
    const result = _writeAttr(line, 'id', '')
    expect(result).toBe('<para>')
  })

  // ========== 场景3：属性不存在，添加属性 ==========
  it('应该在开标签末尾添加新属性', () => {
    const line = '<para class="note">'
    const result = _writeAttr(line, 'id', 'xyz')
    expect(result).toBe('<para class="note" id="xyz">')
  })

  it('应该在自闭合标签 /> 之前添加属性（Bug3修复）', () => {
    const line = '<dmRef id="abc" />'
    const result = _writeAttr(line, 'class', 'ref')
    // 实际会在原空格后追加，形成两个空格：id="abc" + 空格 + class="ref"
    expect(result).toBe('<dmRef id="abc"  class="ref"/>')
  })

  it('应该在自闭合标签（带尾随空格）之前添加属性', () => {
    const line = '<dmRef id="abc" />  '
    const result = _writeAttr(line, 'class', 'ref')
    expect(result).toBe('<dmRef id="abc"  class="ref"/>  ')
  })

  // ========== 场景4：属性名是另一个属性名的子串（Bug1修复）==========
  it('应该精确匹配属性名（id不应匹配validid）', () => {
    const line = '<para validid="long">'
    const result = _writeAttr(line, 'id', 'short')
    // 不应修改 validid，应添加新属性 id
    expect(result).toBe('<para validid="long" id="short">')
  })

  it('应该精确匹配属性名（data不应匹配data-type）', () => {
    const line = '<para data-type="info">'
    const result = _writeAttr(line, 'data', 'raw')
    expect(result).toBe('<para data-type="info" data="raw">')
  })

  // ========== 场景5：XML特殊字符转义（Bug2修复）==========
  it('应该转义值中的 & 字符', () => {
    const line = '<para id="old">'
    const result = _writeAttr(line, 'id', 'A&B')
    expect(result).toBe('<para id="A&amp;B">')
  })

  it('应该转义值中的 < 和 > 字符', () => {
    const line = '<para id="old">'
    const result = _writeAttr(line, 'id', '<tag>')
    expect(result).toBe('<para id="&lt;tag&gt;">')
  })

  it('应该转义值中的 " 引号', () => {
    const line = '<para id="old">'
    const result = _writeAttr(line, 'id', 'say "hi"')
    expect(result).toBe('<para id="say &quot;hi&quot;">')
  })

  it('应该转义所有XML特殊字符（组合测试）', () => {
    const line = '<para id="old">'
    const result = _writeAttr(line, 'id', '&<>"')
    expect(result).toBe('<para id="&amp;&lt;&gt;&quot;">')
  })

  // ========== 场景6：属性名包含正则特殊字符（转义测试）==========
  it('应该转义属性名中的正则元字符（data-*）', () => {
    const line = '<para data-id="123">'
    const result = _writeAttr(line, 'data-id', '456')
    expect(result).toBe('<para data-id="456">')
  })

  it('应该转义属性名中的正则元字符（attr[0]）', () => {
    const line = '<para attr[0]="old">'
    const result = _writeAttr(line, 'attr[0]', 'new')
    expect(result).toBe('<para attr[0]="new">')
  })

  // ========== 场景7：值中包含正则替换模式字符（Bug修复）==========
  it('应该防止值中的 $1 被当作替换模式展开', () => {
    const line = '<para id="old">'
    const result = _writeAttr(line, 'id', '$1$2$&')
    expect(result).toBe('<para id="$1$2$&amp;">')
  })

  it('应该防止值中的 $ 序列在新增属性时展开', () => {
    const line = '<para class="note">'
    const result = _writeAttr(line, 'id', '$100')
    expect(result).toBe('<para class="note" id="$100">')
  })

  // ========== 场景8：边界情况 ==========
  it('应该处理空标签（只有标签名）', () => {
    const line = '<para>'
    const result = _writeAttr(line, 'id', 'abc')
    expect(result).toBe('<para id="abc">')
  })

  it('应该处理属性值为空字符串的新增（不添加）', () => {
    const line = '<para>'
    const result = _writeAttr(line, 'id', '')
    expect(result).toBe('<para>')
  })

  it('应该处理属性值为null的新增（不添加）', () => {
    const line = '<para>'
    const result = _writeAttr(line, 'id', null)
    expect(result).toBe('<para>')
  })

  it('应该处理属性值为数字0（转为字符串）', () => {
    const line = '<para>'
    const result = _writeAttr(line, 'count', 0)
    expect(result).toBe('<para count="0">')
  })

  it('应该处理属性值为布尔值false（转为字符串）', () => {
    const line = '<para>'
    const result = _writeAttr(line, 'flag', false)
    expect(result).toBe('<para flag="false">')
  })

  // ========== 场景9：多属性行内精确定位 ==========
  it('应该在多属性行中精确修改目标属性', () => {
    const line = '<para id="a" validid="b" data-id="c">'
    const result = _writeAttr(line, 'id', 'NEW')
    expect(result).toBe('<para id="NEW" validid="b" data-id="c">')
  })

  it('应该在多属性行中精确删除目标属性', () => {
    const line = '<para id="a" validid="b" data-id="c">'
    const result = _writeAttr(line, 'id', '')
    expect(result).toBe('<para validid="b" data-id="c">')
  })

  // ========== 场景10：保留尾随内容 ==========
  it('应该保留标签后的文本内容', () => {
    const line = '<para id="old">Some text'
    const result = _writeAttr(line, 'id', 'new')
    expect(result).toBe('<para id="new">Some text')
  })

  it('应该保留行尾换行符（如果有）', () => {
    const line = '<para id="old">\n'
    const result = _writeAttr(line, 'id', 'new')
    expect(result).toBe('<para id="new">\n')
  })
})

// 执行所有测试
runTests()
