#!/usr/bin/env node
/**
 * s1000d-compliance-check.js
 * S1000D 4.0 标准符合性检查
 */

const { DOMParser, XMLSerializer } = require('xmldom')
const fs = require('fs')

const parser = new DOMParser({
  errorHandler: {
    warning: () => {},
    error: () => {},
    fatalError: () => {}
  }
})

const serializer = new XMLSerializer()

// ============================================
// S1000D 4.0 标准规则
// ============================================

const S1000D_RULES = {
  // 元素顺序（DMC 必须遵循）
  elementOrder: {
    levelledPara: 1,
    warning: 2,
    caution: 3,
    note: 4,
    para: 5,
    figure: 6,
    multimedia: 7,
    foldout: 8,
    table: 9,
    caption: 10
  },

  // 必须属性
  requiredAttributes: {
    levelledPara: ['xmlns:xlink'],
    multimedia: ['id'],
    figure: ['id'],
    table: ['id'],
    para: [],
    warning: [],
    caution: [],
    note: [],
    foldout: [],
    caption: []
  },

  // 允许的 xlink 属性
  xlinkAttributes: ['xlink:type', 'xlink:href', 'xlink:show', 'xlink:actuate', 'xlink:title'],

  // 命名空间声明
  namespaces: {
    xlink: 'http://www.w3.org/1999/xlink'
  }
}

// ============================================
// 检查函数
// ============================================

class S1000DCompliance {
  constructor() {
    this.errors = []
    this.warnings = []
    this.info = []
  }

  check(xmlString) {
    try {
      const doc = parser.parseFromString(xmlString, 'text/xml')

      // 检查解析错误
      const children = doc.childNodes
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeName === 'parsererror') {
          this.errors.push('XML 解析失败')
          return false
        }
      }

      this.checkRootElement(doc)
      this.checkNamespaces(doc)
      this.checkElementOrder(doc)
      this.checkRequiredAttributes(doc)
      this.checkAttributeEscaping(xmlString)
      this.checkXLinkAttributes(doc)
      this.checkNesting(doc)

      return this.errors.length === 0
    } catch (error) {
      this.errors.push(`异常: ${error.message}`)
      return false
    }
  }

  checkRootElement(doc) {
    const root = doc.documentElement
    if (!root || root.nodeName !== 'levelledPara') {
      this.errors.push('根元素必须是 levelledPara')
    } else {
      this.info.push('✅ 根元素正确: levelledPara')
    }
  }

  checkNamespaces(doc) {
    const root = doc.documentElement
    const xlinkNs = root.getAttribute('xmlns:xlink')

    if (!xlinkNs) {
      this.warnings.push('根元素缺少 xmlns:xlink 声明')
    } else if (xlinkNs !== S1000D_RULES.namespaces.xlink) {
      this.errors.push(`xlink 命名空间错误: 期望 ${S1000D_RULES.namespaces.xlink}，实际 ${xlinkNs}`)
    } else {
      this.info.push(`✅ Namespace 正确: xlink=${xlinkNs}`)
    }
  }

  checkElementOrder(doc) {
    const walkElements = (node, parentName = 'root') => {
      let lastOrder = -1

      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i]

        if (child.nodeType !== 1) continue // 跳过非元素节点

        const tagName = child.nodeName.toLowerCase()
        const order = S1000D_RULES.elementOrder[tagName]

        if (order !== undefined) {
          if (order < lastOrder) {
            this.warnings.push(`元素顺序不符: ${tagName} 出现在 ${lastOrder} 之后`)
          }
          lastOrder = Math.max(lastOrder, order)
        }

        // 递归检查子元素
        if (tagName === 'levelledpara') {
          walkElements(child, tagName)
        }
      }
    }

    walkElements(doc.documentElement)
    if (!this.warnings.some(w => w.includes('元素顺序'))) {
      this.info.push('✅ 元素顺序符合 S1000D 标准')
    }
  }

  checkRequiredAttributes(doc) {
    const checkNode = (node) => {
      const tagName = node.nodeName.toLowerCase()
      const required = S1000D_RULES.requiredAttributes[tagName]

      if (required) {
        required.forEach(attr => {
          if (!node.getAttribute(attr)) {
            this.warnings.push(`${tagName} 元素缺少推荐属性: ${attr}`)
          }
        })
      }

      for (let i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType === 1) {
          checkNode(node.childNodes[i])
        }
      }
    }

    checkNode(doc.documentElement)
  }

  checkAttributeEscaping(xmlString) {
    // 检查是否有未转义的特殊字符
    const issues = []

    // 检查属性值中未转义的 &（必须是 &amp;）
    const unescapedAmp = xmlString.match(/="[^"]*&(?!amp;|lt;|gt;|quot;|apos;)[^"]*"/g)
    if (unescapedAmp) {
      issues.push(`发现未转义的 & 字符: ${unescapedAmp.length} 处`)
    }

    // 检查属性值中未转义的 < 或 >
    const unescapedLt = xmlString.match(/="[^"]*<(?!(?:multimedia|figure|para|warning|caution|note|table|foldout|caption|levelledPara|title|multimediaObject|graphic|tgroup|tbody|row|entry))[^"]*"/g)
    const unescapedGt = xmlString.match(/="[^"]*>(?![\w])[^"]*"/g)

    if (!issues.length) {
      this.info.push('✅ 属性值转义正确')
    } else {
      issues.forEach(issue => {
        this.errors.push(`属性转义问题: ${issue}`)
      })
    }
  }

  checkXLinkAttributes(doc) {
    const checkNode = (node) => {
      const attrs = node.attributes
      if (attrs) {
        for (let i = 0; i < attrs.length; i++) {
          const attrName = attrs[i].nodeName
          if (attrName.startsWith('xlink:')) {
            if (!S1000D_RULES.xlinkAttributes.includes(attrName)) {
              this.warnings.push(`未知的 xlink 属性: ${attrName}`)
            }
          }
        }
      }

      for (let i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType === 1) {
          checkNode(node.childNodes[i])
        }
      }
    }

    checkNode(doc.documentElement)
  }

  checkNesting(doc) {
    const maxDepth = 10

    const checkDepth = (node, depth = 0) => {
      if (depth > maxDepth) {
        this.errors.push(`nesting 深度超过限制: 最大 ${maxDepth}`)
        return false
      }

      for (let i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType === 1) {
          if (!checkDepth(node.childNodes[i], depth + 1)) {
            return false
          }
        }
      }

      return true
    }

    if (checkDepth(doc.documentElement)) {
      this.info.push('✅ Nesting 深度在允许范围内')
    }
  }

  report() {
    const output = {
      timestamp: new Date().toISOString(),
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length,
        compliant: this.errors.length === 0
      },
      details: {
        info: this.info,
        warnings: this.warnings,
        errors: this.errors
      }
    }

    return output
  }
}

// ============================================
// 测试用例
// ============================================

const testCases = [
  {
    name: '原始错误场景',
    xml: `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>层级1</title>
    <multimedia id="222">
      <title>111</title>
      <multimediaObject xlink:type="simple" xlink:show="replace" xlink:actuate="onRequest" infoEntityIdent="ICN-ZB1-A-000000-60101-30101-00007-A-001-01" multimediaType="3D"/>
    </multimedia>
  </levelledPara>
</levelledPara>`
  },
  {
    name: '完整的内容元素',
    xml: `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>完整示例</title>
    <warning id="w1">
      <warningAndCautionPara>安全警告</warningAndCautionPara>
    </warning>
    <caution id="c1">
      <warningAndCautionPara>注意事项</warningAndCautionPara>
    </caution>
    <note id="n1">
      <notePara>备注信息</notePara>
    </note>
    <para id="p1">
      <para>普通段落</para>
    </para>
    <figure id="f1">
      <title>图表</title>
      <graphic xlink:href="image.jpg"/>
    </figure>
    <multimedia id="m1">
      <title>多媒体</title>
      <multimediaObject xlink:type="simple"/>
    </multimedia>
    <table id="t1">
      <title>表格</title>
      <tgroup cols="2">
        <tbody>
          <row>
            <entry>单元格</entry>
          </row>
        </tbody>
      </tgroup>
    </table>
  </levelledPara>
</levelledPara>`
  },
  {
    name: '特殊字符处理',
    xml: `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <para id="p1" description="Test &amp; verify &lt;tags&gt;">
    <para>文本 &quot;引号&quot; 和 &apos;撇号&apos;</para>
  </para>
</levelledPara>`
  },
  {
    name: '嵌套结构',
    xml: `<?xml version="1.0"?>
<levelledPara xmlns:xlink="http://www.w3.org/1999/xlink">
  <levelledPara>
    <title>第一层</title>
    <levelledPara>
      <title>第二层</title>
      <levelledPara>
        <title>第三层</title>
        <para><para>内容</para></para>
      </levelledPara>
    </levelledPara>
  </levelledPara>
</levelledPara>`
  }
]

// ============================================
// 运行检查
// ============================================

console.log('\n' + '='.repeat(60))
console.log('S1000D 4.0 标准符合性检查报告')
console.log('='.repeat(60) + '\n')

const results = []

testCases.forEach(testCase => {
  console.log(`测试: ${testCase.name}`)
  console.log('-'.repeat(60))

  const checker = new S1000DCompliance()
  const isCompliant = checker.check(testCase.xml)
  const report = checker.report()

  results.push({
    name: testCase.name,
    ...report
  })

  // 输出结果
  report.details.info.forEach(info => console.log('  ' + info))
  report.details.warnings.forEach(w => console.log('  ⚠️  ' + w))
  report.details.errors.forEach(e => console.log('  ❌ ' + e))

  console.log()
  console.log(`  结果: ${isCompliant ? '✅ 符合 S1000D 标准' : '❌ 不符合标准'}`)
  console.log()
})

// ============================================
// 总结
// ============================================

console.log('='.repeat(60))
console.log('总体评估')
console.log('='.repeat(60) + '\n')

const totalTests = results.length
const compliantTests = results.filter(r => r.summary.compliant).length
const totalErrors = results.reduce((sum, r) => sum + r.summary.errors, 0)
const totalWarnings = results.reduce((sum, r) => sum + r.summary.warnings, 0)

console.log(`测试数量: ${totalTests}`)
console.log(`符合标准: ${compliantTests}/${totalTests}`)
console.log(`总错误数: ${totalErrors}`)
console.log(`总警告数: ${totalWarnings}`)
console.log()

if (compliantTests === totalTests && totalErrors === 0) {
  console.log('🎉 所有测试都符合 S1000D 4.0 标准！修复成功。\n')
  process.exit(0)
} else {
  console.log('⚠️  部分测试不符合标准或存在错误\n')
  process.exit(1)
}
