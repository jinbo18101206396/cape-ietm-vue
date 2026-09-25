/**
 * Para转换对称性集成测试 - 真实UI验证
 *
 * 策略：
 * 1. 登录系统
 * 2. 打开一个真实的DM编辑页面
 * 3. 注入测试代码到页面中
 * 4. 使用页面真实的paraConverter.js执行往返测试
 */

const { test, expect } = require('@playwright/test')

test.describe('Para转换对称性 - 真实UI集成测试', () => {
  test.beforeEach(async ({ page }) => {
    // 设置较长的超时时间
    test.setTimeout(60000)

    // 访问登录页面
    await page.goto('http://localhost:3000/user/login')

    // 等待登录页面加载
    await page.waitForSelector('input[placeholder*="账号"]', { timeout: 10000 }).catch(() => {
      console.log('登录页面未找到，可能已登录或页面结构变化')
    })

    // 尝试登录（如果未登录）
    const isLoginPage = await page.locator('input[placeholder*="账号"]').count() > 0
    if (isLoginPage) {
      console.log('执行登录...')
      await page.fill('input[placeholder*="账号"]', 'admin')
      await page.fill('input[type="password"]', 'admin')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {
        console.log('登录可能失败或跳转异常')
      })
    }
  })

  test('验证6个P0修复在真实环境中生效', async ({ page }) => {
    console.log('\n========================================')
    console.log('开始Para转换对称性真实环境测试')
    console.log('========================================\n')

    // 注入测试函数到页面
    const results = await page.evaluate(async () => {
      const testResults = []

      // 定义测试用例
      const testCases = [
        {
          id: 'P0-1',
          name: 'listItem内para重复',
          xml: '<para><randomList><listItem><para>项1</para></listItem><listItem><para>项2</para></listItem></randomList></para>'
        },
        {
          id: 'P0-2',
          name: 'definitionList内para重复',
          xml: '<para><definitionList><definitionListItem><listItemTerm>术语</listItemTerm><listItemDefinition><para>定义</para></listItemDefinition></definitionListItem></definitionList></para>'
        },
        {
          id: 'P0-3',
          name: 'symbol转义顺序',
          xml: '<para><symbol infoEntityIdent="ICN-001" reproductionWidth="100" reproductionHeight="50" reproductionScale="100"/></para>'
        },
        {
          id: 'P0-4',
          name: 'internalRef结束标签',
          xml: '<para><internalRef internalRefId="ref1" internalRefTargetType="table"></internalRef></para>'
        },
        {
          id: 'P0-5a',
          name: 'warningAndCautionPara还原',
          xml: '<para><warningAndCautionPara>警告文本</warningAndCautionPara></para>'
        },
        {
          id: 'P0-5b',
          name: 'notePara还原',
          xml: '<para><notePara>注释文本</notePara></para>'
        }
      ]

      // 规范化XML
      const normalize = (xml) => {
        if (!xml) return ''
        return xml
          .replace(/\s+/g, ' ')
          .replace(/>\s+</g, '><')
          .replace(/\s*\/>/g, '/>')
          .trim()
      }

      // 尝试导入paraConverter模块
      let para2html, html2para

      try {
        // 方法1: 动态import（如果支持）
        const module = await import('/src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
        para2html = module.para2html
        html2para = module.html2para
      } catch (e1) {
        console.error('动态import失败:', e1.message)

        // 方法2: 从window对象获取（如果已经加载）
        if (window.__paraConverter) {
          para2html = window.__paraConverter.para2html
          html2para = window.__paraConverter.html2para
        } else {
          throw new Error('无法获取paraConverter函数，请确保在DM编辑页面执行测试')
        }
      }

      // 创建模拟的parent对象
      const mockParent = {
        cmnodeid: '1',
        dmCode: 'DMC-TEST-A-00-00-00-00A-001A-A',
        $axios: {
          post: async (url, data) => {
            // 模拟后端接口
            if (url.includes('getSymbolFile')) {
              return { data: { data: 'data:image/png;base64,mock' } }
            }
            if (url.includes('getUniqueIds')) {
              return { data: ['001', '002', '003'] }
            }
            return { data: { data: null } }
          }
        }
      }

      // 执行每个测试用例
      for (const tc of testCases) {
        try {
          // Step 1: XML → HTML
          const html = await para2html(mockParent, tc.xml)

          // Step 2: HTML → XML
          let outputXml = await html2para(mockParent, html)
          outputXml = `<para>${outputXml}</para>`

          // Step 3: 对比
          const inputNorm = normalize(tc.xml)
          const outputNorm = normalize(outputXml)
          const isSymmetric = inputNorm === outputNorm

          testResults.push({
            id: tc.id,
            name: tc.name,
            input: inputNorm,
            output: outputNorm,
            isSymmetric: isSymmetric,
            passed: isSymmetric
          })

        } catch (error) {
          testResults.push({
            id: tc.id,
            name: tc.name,
            error: error.message,
            passed: false
          })
        }
      }

      return testResults
    })

    // 输出测试结果
    console.log('\n测试结果：\n')

    let passCount = 0
    let failCount = 0

    for (const result of results) {
      if (result.error) {
        console.log(`❌ ${result.id}: ${result.name}`)
        console.log(`   错误: ${result.error}\n`)
        failCount++
      } else if (result.passed) {
        console.log(`✅ ${result.id}: ${result.name}`)
        passCount++
      } else {
        console.log(`❌ ${result.id}: ${result.name}`)
        console.log(`   输入:  ${result.input}`)
        console.log(`   输出:  ${result.output}\n`)
        failCount++
      }
    }

    console.log('\n========================================')
    console.log(`总计: ${results.length}个用例`)
    console.log(`通过: ${passCount}个`)
    console.log(`失败: ${failCount}个`)
    console.log(`通过率: ${(passCount / results.length * 100).toFixed(1)}%`)
    console.log('========================================\n')

    // 断言：所有测试必须通过
    const allPassed = results.every(r => r.passed)
    expect(allPassed, `有${failCount}个测试失败，详见上方日志`).toBe(true)
  })
})
