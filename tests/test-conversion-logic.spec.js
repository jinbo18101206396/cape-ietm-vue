/**
 * 简化版诊断：直接模拟预览场景
 * 不依赖页面交互，直接测试DmPreviewModal的show()方法
 */

const { test, expect } = require('@playwright/test')

test.describe('上标预览 - 直接测试转换逻辑', () => {
  test.setTimeout(120000)

  test('直接测试预览转换逻辑', async ({ page }) => {
    console.log('\n========== 策略：直接注入测试代码 ==========\n')

    // 等待服务器
    console.log('等待服务器就绪...')
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
    console.log('✅ 服务器就绪\n')

    // 监听控制台
    const logs = []
    page.on('console', msg => {
      const text = msg.text()
      logs.push(text)
      if (text.includes('🔍') || text.includes('TEST')) {
        console.log(`[Console] ${text}`)
      }
    })

    console.log('========== 步骤1：注入测试代码 ==========\n')

    // 直接在页面上测试转换逻辑
    const testResult = await page.evaluate(() => {
      // 模拟后端返回的HTML（包含superScript标签）
      const mockHTML = `
        <div>
          <p>1<superScript>2</superScript></p>
          <p>H<subScript>2</subScript>O</p>
          <p><emphasis>重要</emphasis>内容</p>
        </div>
      `

      console.log('🔍 TEST: 原始HTML:', mockHTML)

      // 执行与DmPreviewModal.vue相同的转换逻辑
      let body = mockHTML

      console.log('🔍 TEST: 转换前包含<superScript>:', body.includes('<superScript>'))

      body = body
        .replace(/<superScript>/g, '<sup>')
        .replace(/<\/superScript>/g, '</sup>')
        .replace(/<subScript>/g, '<sub>')
        .replace(/<\/subScript>/g, '</sub>')
        .replace(/<emphasis>/g, '<strong>')
        .replace(/<\/emphasis>/g, '</strong>')

      console.log('🔍 TEST: 转换后的HTML:', body)
      console.log('🔍 TEST: 转换后包含<sup>:', body.includes('<sup>'))
      console.log('🔍 TEST: 转换后包含<sub>:', body.includes('<sub>'))
      console.log('🔍 TEST: 转换后包含<strong>:', body.includes('<strong>'))

      // 创建DOM测试渲染效果
      const testDiv = document.createElement('div')
      testDiv.innerHTML = body
      testDiv.style.cssText = 'position:fixed;top:10px;left:10px;background:white;border:2px solid red;padding:20px;z-index:9999;'
      document.body.appendChild(testDiv)

      console.log('🔍 TEST: 已在页面上渲染测试结果')

      return {
        hasSuperScriptBefore: mockHTML.includes('<superScript>'),
        hasSupAfter: body.includes('<sup>'),
        hasSubAfter: body.includes('<sub>'),
        hasStrongAfter: body.includes('<strong>'),
        convertedHTML: body
      }
    })

    console.log('\n========== 步骤2：分析测试结果 ==========\n')

    console.log('JavaScript转换逻辑测试:')
    console.log(`  原始HTML包含<superScript>: ${testResult.hasSuperScriptBefore ? '✅' : '❌'}`)
    console.log(`  转换后包含<sup>: ${testResult.hasSupAfter ? '✅' : '❌'}`)
    console.log(`  转换后包含<sub>: ${testResult.hasSubAfter ? '✅' : '❌'}`)
    console.log(`  转换后包含<strong>: ${testResult.hasStrongAfter ? '✅' : '❌'}`)

    if (testResult.hasSupAfter) {
      console.log('\n✅ 转换逻辑正常工作！')
    } else {
      console.log('\n❌ 转换逻辑失败！')
    }

    // 截图页面上的测试结果
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/conversion-test-result.png' })
    console.log('\n✅ 截图已保存: conversion-test-result.png')

    console.log('\n========== 步骤3：测试实际Vue组件 ==========\n')

    // 访问一个包含Para内容的实际页面
    console.log('尝试访问DM列表页...')
    await page.goto('http://localhost:3000/ietm/ietmdatamodulemanagement/IetmDataModuleList', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    await page.waitForTimeout(3000)

    console.log('✅ 页面加载完成')
    await page.screenshot({ path: 'test-results/dm-list-page.png' })

    console.log('\n========== 步骤4：检查DmPreviewModal组件是否存在 ==========\n')

    // 在页面上查找DmPreviewModal组件
    const componentCheck = await page.evaluate(() => {
      // 查找Vue实例中的DmPreviewModal
      const modals = document.querySelectorAll('.ant-modal')
      console.log('🔍 TEST: 页面中的modal数量:', modals.length)

      // 检查是否有预览相关的方法
      if (window.__POWERED_BY_QIANKUN__) {
        console.log('🔍 TEST: 检测到qiankun微前端环境')
      }

      return {
        modalCount: modals.length
      }
    })

    console.log(`Modal组件数量: ${componentCheck.modalCount}`)

    console.log('\n========== 诊断总结 ==========\n')

    const allLogs = logs.filter(log =>
      log.includes('🔍 TEST') ||
      log.includes('🔍 [Preview Debug]')
    )

    console.log('捕获的日志 (' + allLogs.length + '条):')
    allLogs.forEach((log, i) => {
      console.log(`  ${i + 1}. ${log}`)
    })

    if (testResult.hasSupAfter) {
      console.log('\n✅ 结论: JavaScript转换逻辑正确')
      console.log('   问题可能在于:')
      console.log('   1. DmPreviewModal的show()方法未被调用')
      console.log('   2. 后端返回的HTML不包含<superScript>标签')
      console.log('   3. 转换后的body变量被其他代码覆盖')
      console.log('\n   建议: 需要在实际预览场景中捕获日志')
    } else {
      console.log('\n❌ 结论: 转换逻辑本身有问题')
    }

    await page.waitForTimeout(3000)
  })
})
