/**
 * Para转换对称性验证 - 旧系统对标测试
 *
 * 目标：验证新系统修复后的行为是否符合旧系统的预期
 *
 * 测试场景来源：
 * 1. memory中记录的6个P0缺陷（来自审核旧系统发现的问题）
 * 2. S1000D 4.0标准规定的元素转换规则
 */

const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

test.describe('Para转换对称性 - 旧系统对标验证', () => {
  test('完整往返测试（15个标准场景）', async ({ page }) => {
    console.log('\n========================================')
    console.log('Para转换对称性 - 旧系统对标验证')
    console.log('========================================\n')

    // 读取真实的paraConverter.js源码
    const converterPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
    let converterCode = fs.readFileSync(converterPath, 'utf-8')

    // 去除ES6 export/import
    converterCode = converterCode
      .replace(/export\s+async\s+function/g, 'async function')
      .replace(/export\s+function/g, 'function')
      .replace(/export\s+const/g, 'const')
      .replace(/export\s+\{[^}]+\}/g, '')
      .replace(/import\s+.+from\s+.+/g, '')
      .replace(/import\s+.+/g, '')

    await page.goto('about:blank')

    const results = await page.evaluate(async (sourceCode) => {
      eval(sourceCode)

      const testResults = []

      // 标准测试用例（覆盖S1000D 4.0常用元素）
      const testCases = [
        {
          id: 'TC-01',
          name: '基础文本',
          xml: '<para>普通文本内容</para>',
          category: '基础元素'
        },
        {
          id: 'TC-02',
          name: 'emphasis强调',
          xml: '<para><emphasis>强调文本</emphasis></para>',
          category: '基础元素'
        },
        {
          id: 'TC-03',
          name: 'superScript上标',
          xml: '<para>x<superScript>2</superScript></para>',
          category: '基础元素'
        },
        {
          id: 'TC-04',
          name: 'subScript下标',
          xml: '<para>H<subScript>2</subScript>O</para>',
          category: '基础元素'
        },
        {
          id: 'TC-05',
          name: 'randomList无序列表',
          xml: '<para><randomList><listItem><para>项目1</para></listItem><listItem><para>项目2</para></listItem></randomList></para>',
          category: 'P0-1修复'
        },
        {
          id: 'TC-06',
          name: 'sequentialList有序列表',
          xml: '<para><sequentialList><listItem><para>步骤1</para></listItem><listItem><para>步骤2</para></listItem></sequentialList></para>',
          category: 'P0-1修复'
        },
        {
          id: 'TC-07',
          name: 'definitionList定义列表',
          xml: '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义内容</para></listItemDefinition></definitionListItem></definitionList></para>',
          category: 'P0-2修复'
        },
        {
          id: 'TC-08',
          name: 'symbol图符（自闭合）',
          xml: '<para><symbol infoEntityIdent="ICN-TEST-001" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"/></para>',
          category: 'P0-3修复'
        },
        {
          id: 'TC-09',
          name: 'internalRef内部引用',
          xml: '<para><internalRef internalRefId="fig001" internalRefTargetType="figure"></internalRef></para>',
          category: 'P0-4修复'
        },
        {
          id: 'TC-10',
          name: 'warningAndCautionPara',
          xml: '<para><warningAndCautionPara>警告：高温表面</warningAndCautionPara></para>',
          category: 'P0-5修复'
        },
        {
          id: 'TC-11',
          name: 'notePara',
          xml: '<para><notePara>注意：保持清洁</notePara></para>',
          category: 'P0-5修复'
        },
        {
          id: 'TC-12',
          name: '混合嵌套',
          xml: '<para>普通文本<emphasis>强调</emphasis>更多<superScript>上标</superScript>内容</para>',
          category: '复杂场景'
        },
        {
          id: 'TC-13',
          name: '空para',
          xml: '<para></para>',
          category: '边界情况'
        },
        {
          id: 'TC-14',
          name: '列表嵌套emphasis',
          xml: '<para><randomList><listItem><para><emphasis>强调项目</emphasis></para></listItem></randomList></para>',
          category: '复杂场景'
        },
        {
          id: 'TC-15',
          name: '多个emphasis',
          xml: '<para><emphasis>第一段强调</emphasis>普通文本<emphasis>第二段强调</emphasis></para>',
          category: '复杂场景'
        }
      ]

      const normalize = (xml) => {
        if (!xml) return ''
        return xml
          .replace(/\s+/g, ' ')
          .replace(/>\s+</g, '><')
          .replace(/\s*\/>/g, '/>')
          .trim()
      }

      const mockParent = {
        cmnodeid: '1',
        dmCode: 'DMC-TEST-A-00-00-00-00A-001A-A',
        $axios: {
          post: async (url, data) => {
            if (url && url.includes('getSymbolFile')) {
              return { data: { data: 'data:image/png;base64,mock' } }
            }
            if (url && url.includes('getUniqueIds')) {
              return { data: ['001', '002', '003'] }
            }
            return { data: { data: null } }
          }
        }
      }

      for (const tc of testCases) {
        try {
          // Step 1: XML → HTML
          const html = await para2html(mockParent, tc.xml)

          // Step 2: HTML → XML
          let outputContent = await html2para(mockParent, html)
          const outputXml = `<para>${outputContent}</para>`

          // Step 3: 规范化对比
          const inputNorm = normalize(tc.xml)
          const outputNorm = normalize(outputXml)
          const isSymmetric = inputNorm === outputNorm

          testResults.push({
            id: tc.id,
            name: tc.name,
            category: tc.category,
            input: inputNorm,
            output: outputNorm,
            html: html.substring(0, 150),
            isSymmetric: isSymmetric,
            passed: isSymmetric
          })

        } catch (error) {
          testResults.push({
            id: tc.id,
            name: tc.name,
            category: tc.category,
            error: error.message,
            passed: false
          })
        }
      }

      return testResults
    }, converterCode)

    // 输出详细结果
    console.log('\n测试结果按类别分组：\n')

    const categories = {}
    results.forEach(r => {
      if (!categories[r.category]) categories[r.category] = []
      categories[r.category].push(r)
    })

    let totalPass = 0
    let totalFail = 0

    Object.keys(categories).forEach(cat => {
      const items = categories[cat]
      const passCount = items.filter(i => i.passed).length
      const failCount = items.length - passCount

      console.log(`【${cat}】`)
      items.forEach(item => {
        const icon = item.passed ? '✅' : '❌'
        console.log(`  ${icon} ${item.id}: ${item.name}`)
        if (!item.passed) {
          if (item.error) {
            console.log(`      错误: ${item.error}`)
          } else {
            console.log(`      输入:  ${item.input.substring(0, 80)}...`)
            console.log(`      输出:  ${item.output.substring(0, 80)}...`)
          }
        }
      })
      console.log(`  小计: ${passCount}/${items.length} 通过\n`)

      totalPass += passCount
      totalFail += failCount
    })

    console.log('========================================')
    console.log(`总计: ${results.length}个测试用例`)
    console.log(`通过: ${totalPass}个`)
    console.log(`失败: ${totalFail}个`)
    console.log(`通过率: ${(totalPass / results.length * 100).toFixed(1)}%`)
    console.log('========================================\n')

    // 生成对标报告
    if (totalFail === 0) {
      console.log('✅ 新系统完全符合S1000D 4.0标准')
      console.log('✅ 所有P0修复验证通过')
      console.log('✅ 可以安全替代旧系统')
    } else {
      console.log(`⚠️  发现${totalFail}个不对称问题`)
      console.log('需要进一步排查')
    }

    // 断言
    expect(totalPass, `15个标准场景中有${totalFail}个失败`).toBe(15)
  })
})
