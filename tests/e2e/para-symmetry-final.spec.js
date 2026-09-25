/**
 * Para转换对称性验证 - 直接执行源码版本
 *
 * 策略：
 * 1. 读取paraConverter.js源码
 * 2. 在浏览器中执行源码（去除Vue/axios依赖）
 * 3. 执行6个P0修复的往返测试
 */

const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

test.describe('Para转换对称性 - 源码直接执行验证', () => {
  test('验证6个P0修复（通过源码注入）', async ({ page }) => {
    console.log('\n========================================')
    console.log('Para转换对称性验证 - 源码直接执行')
    console.log('========================================\n')

    // 读取真实的paraConverter.js源码
    const converterPath = path.join(__dirname, '../../src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
    let converterCode = fs.readFileSync(converterPath, 'utf-8')

    // 去除ES6 export/import语法（浏览器中直接执行）
    converterCode = converterCode
      .replace(/export\s+async\s+function/g, 'async function')
      .replace(/export\s+function/g, 'function')
      .replace(/export\s+const/g, 'const')
      .replace(/export\s+\{[^}]+\}/g, '')
      .replace(/import\s+.+from\s+.+/g, '')
      .replace(/import\s+.+/g, '')

    // 访问空白页面
    await page.goto('about:blank')

    // 注入paraConverter源码并执行测试
    const results = await page.evaluate(async (sourceCode) => {
      // 执行paraConverter源码
      eval(sourceCode)

      const testResults = []

      // 测试用例
      const testCases = [
        {
          id: 'P0-1',
          name: 'listItem内para不重复',
          xml: '<para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></para>',
          checkPoint: '不应出现<para><para>'
        },
        {
          id: 'P0-2',
          name: 'definitionList内para不重复',
          xml: '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>',
          checkPoint: '不应出现<para><para>'
        },
        {
          id: 'P0-3',
          name: 'symbol转义顺序正确',
          xml: '<para><symbol infoEntityIdent="ICN-001" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"/></para>',
          checkPoint: '不应出现&amp;lt;'
        },
        {
          id: 'P0-4',
          name: 'internalRef结束标签完整',
          xml: '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>',
          checkPoint: '应保留</internalRef>'
        },
        {
          id: 'P0-5a',
          name: 'warningAndCautionPara可还原',
          xml: '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>',
          checkPoint: '应保留warningAndCautionPara'
        },
        {
          id: 'P0-5b',
          name: 'notePara可还原',
          xml: '<para><notePara>注释文本</notePara></para>',
          checkPoint: '应保留notePara'
        }
      ]

      // 规范化函数
      const normalize = (xml) => {
        if (!xml) return ''
        return xml
          .replace(/\s+/g, ' ')
          .replace(/>\s+</g, '><')
          .replace(/\s*\/>/g, '/>')
          .trim()
      }

      // 模拟parent对象
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

      // 执行测试
      for (const tc of testCases) {
        try {
          // 🔧 关键修正：para2html期望输入包含<para>标签，输出的HTML也包含<p>标签
          // html2para期望输入包含<p>标签，输出不包含外层para（由调用方包裹）

          // Step 1: XML → HTML（输入带<para>，输出带<p>）
          const html = await para2html(mockParent, tc.xml)

          // Step 2: HTML → XML（输入带<p>，输出不带外层para）
          let outputContent = await html2para(mockParent, html)

          // Step 3: 包裹外层para（模拟ParaDesigner.vue的handleSave）
          const outputXml = `<para>${outputContent}</para>`

          // Step 4: 规范化对比
          const inputNorm = normalize(tc.xml)
          const outputNorm = normalize(outputXml)
          const isSymmetric = inputNorm === outputNorm

          // 特殊检查点
          let specificCheck = true
          let specificMsg = ''

          if (tc.id === 'P0-1' || tc.id === 'P0-2') {
            // 检查是否有双层para
            if (outputNorm.includes('<para><para>')) {
              specificCheck = false
              specificMsg = '发现<para><para>双层嵌套'
            }
          } else if (tc.id === 'P0-3') {
            // 检查转义顺序
            if (outputNorm.includes('&amp;lt;')) {
              specificCheck = false
              specificMsg = '转义顺序错误，出现&amp;lt;'
            }
          }

          testResults.push({
            id: tc.id,
            name: tc.name,
            input: inputNorm.substring(0, 100),
            output: outputNorm.substring(0, 100),
            html: html.substring(0, 100),
            isSymmetric: isSymmetric,
            specificCheck: specificCheck,
            specificMsg: specificMsg,
            passed: isSymmetric && specificCheck
          })

        } catch (error) {
          testResults.push({
            id: tc.id,
            name: tc.name,
            error: error.message,
            stack: error.stack,
            passed: false
          })
        }
      }

      return testResults
    }, converterCode)

    // 输出结果
    console.log('\n测试结果：\n')

    let passCount = 0
    let failCount = 0

    for (const result of results) {
      if (result.error) {
        console.log(`❌ ${result.id}: ${result.name}`)
        console.log(`   错误: ${result.error}`)
        console.log(`   堆栈: ${result.stack}\n`)
        failCount++
      } else if (result.passed) {
        console.log(`✅ ${result.id}: ${result.name}`)
        passCount++
      } else {
        console.log(`❌ ${result.id}: ${result.name}`)
        if (!result.isSymmetric) {
          console.log(`   输入:  ${result.input}...`)
          console.log(`   HTML:  ${result.html}...`)
          console.log(`   输出:  ${result.output}...`)
        }
        if (result.specificMsg) {
          console.log(`   检查: ${result.specificMsg}`)
        }
        console.log()
        failCount++
      }
    }

    console.log('\n========================================')
    console.log(`总计: ${results.length}个P0修复`)
    console.log(`通过: ${passCount}个`)
    console.log(`失败: ${failCount}个`)
    console.log(`通过率: ${(passCount / results.length * 100).toFixed(1)}%`)
    console.log('========================================\n')

    // 生成详细报告
    if (failCount > 0) {
      console.log('失败详情:')
      results.filter(r => !r.passed).forEach(r => {
        console.log(`\n${r.id}: ${r.name}`)
        if (r.error) {
          console.log(`  错误: ${r.error}`)
        } else {
          console.log(`  对称: ${r.isSymmetric}`)
          console.log(`  特殊检查: ${r.specificCheck}`)
          if (r.specificMsg) console.log(`  消息: ${r.specificMsg}`)
        }
      })
      console.log()
    }

    // 断言
    expect(passCount, `6个P0修复中有${failCount}个失败`).toBe(6)
  })
})
