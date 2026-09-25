/**
 * Para转换对称性E2E测试 - 真实浏览器环境
 *
 * 目标：在真实浏览器中验证paraConverter.js的XML↔HTML往返对称性
 * 策略：直接在浏览器中执行转换函数，使用真实代码
 */

const { test, expect } = require('@playwright/test')
const path = require('path')

test.describe('Para转换对称性验证（真实代码）', () => {
  test.beforeEach(async ({ page }) => {
    // 加载包含paraConverter的页面（使用任意DM编辑页面）
    await page.goto('http://localhost:3000')
  })

  // 测试用例定义
  const testCases = [
    {
      id: 'TC-01',
      name: '基础文本',
      xml: '<para>普通文本</para>'
    },
    {
      id: 'TC-02',
      name: 'emphasis强调',
      xml: '<para><emphasis>强调文本</emphasis></para>'
    },
    {
      id: 'TC-03',
      name: 'superScript上标',
      xml: '<para>x<superScript>2</superScript></para>'
    },
    {
      id: 'TC-04',
      name: 'subScript下标',
      xml: '<para>H<subScript>2</subScript>O</para>'
    },
    {
      id: 'TC-05',
      name: 'randomList无序列表',
      xml: '<para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></para>'
    },
    {
      id: 'TC-06',
      name: 'sequentialList有序列表',
      xml: '<para><sequentialList><listItem><para>步骤1</para></listItem><listItem><para>步骤2</para></listItem></sequentialList></para>'
    },
    {
      id: 'TC-07',
      name: 'definitionList定义列表',
      xml: '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>'
    },
    {
      id: 'TC-08',
      name: 'symbol图符',
      xml: '<para><symbol infoEntityIdent="ICN-001" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"/></para>'
    },
    {
      id: 'TC-09',
      name: 'internalRef内部引用',
      xml: '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>'
    },
    {
      id: 'TC-10',
      name: '混合嵌套',
      xml: '<para>文本<emphasis>强调</emphasis>更多文本<superScript>上标</superScript></para>'
    },
    {
      id: 'TC-11',
      name: '空para',
      xml: '<para></para>'
    },
    {
      id: 'TC-12',
      name: 'warningAndCautionPara',
      xml: '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>'
    },
    {
      id: 'TC-13',
      name: 'notePara',
      xml: '<para><notePara>注释文本</notePara></para>'
    },
    {
      id: 'TC-14',
      name: '嵌套emphasis',
      xml: '<para><emphasis>强调1</emphasis><emphasis>强调2</emphasis></para>'
    },
    {
      id: 'TC-15',
      name: 'list嵌套emphasis',
      xml: '<para><randomList><listItem><para><emphasis>强调项</emphasis></para></listItem></randomList></para>'
    }
  ]

  for (const testCase of testCases) {
    test(`${testCase.id}: ${testCase.name}`, async ({ page }) => {
      // 在浏览器中执行往返转换
      const result = await page.evaluate(async (inputXml) => {
        // 动态导入paraConverter模块
        const converterPath = '/src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js'

        try {
          // 使用动态import加载模块
          const module = await import(converterPath)
          const para2html = module.para2html
          const html2para = module.html2para

          // 创建模拟的parent对象
          const mockParent = {
            $axios: {
              post: async (url, data) => {
                // 模拟symbol图片接口
                if (url.includes('getSymbolFile')) {
                  return { data: { data: '/mock-image.jpg' } }
                }
                return { data: { data: null } }
              }
            }
          }

          // Step 1: XML → HTML
          const html = await para2html(mockParent, inputXml)

          // Step 2: HTML → XML
          const outputXml = await html2para(mockParent, html)

          // Step 3: 包裹<para>标签（模拟ParaDesigner.vue的handleSave）
          const finalXml = `<para>${outputXml}</para>`

          // 规范化XML用于对比
          const normalize = (xml) => {
            return xml
              .replace(/\s+/g, ' ')
              .replace(/>\s+</g, '><')
              .replace(/\s*\/>/g, '/>')
              .trim()
          }

          return {
            inputXml: normalize(inputXml),
            html: html,
            outputXml: normalize(finalXml),
            isSymmetric: normalize(inputXml) === normalize(finalXml)
          }
        } catch (error) {
          return {
            error: error.message,
            stack: error.stack
          }
        }
      }, testCase.xml)

      // 验证
      console.log(`\n${testCase.id}: ${testCase.name}`)
      console.log(`  输入: ${result.inputXml}`)
      console.log(`  HTML: ${result.html?.substring(0, 100)}...`)
      console.log(`  输出: ${result.outputXml}`)
      console.log(`  对称: ${result.isSymmetric}`)

      if (result.error) {
        console.error(`  ❌ 错误: ${result.error}`)
        throw new Error(result.error)
      }

      expect(result.isSymmetric,
        `往返转换不对称:\n输入: ${result.inputXml}\n输出: ${result.outputXml}`
      ).toBe(true)
    })
  }

  // 汇总测试
  test('汇总报告', async ({ page }) => {
    console.log('\n========================================')
    console.log('Para转换对称性E2E测试完成')
    console.log('测试环境: 真实浏览器 + 真实paraConverter.js')
    console.log('========================================')
  })
})
