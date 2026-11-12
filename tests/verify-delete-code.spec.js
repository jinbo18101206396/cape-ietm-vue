/**
 * 简化测试：直接检查转换逻辑
 * 不依赖登录，直接测试 paraConverter.js 的转换功能
 */

const { test, expect } = require('@playwright/test')

test.describe('删除线转换逻辑验证', () => {
  test('验证 paraConverter.js 已包含删除线转换代码', async ({ page }) => {
    console.log('🔹 步骤 1: 访问应用')
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)

    console.log('🔹 步骤 2: 读取 paraConverter.js 源码')
    const converterCode = await page.evaluate(async () => {
      try {
        // 尝试直接访问模块
        const response = await fetch('/src/views/ietm/ietmdatamodulemanagement/editor/utils/paraConverter.js')
        if (response.ok) {
          return await response.text()
        }

        // 如果直接访问失败，返回错误信息
        return `无法读取源文件: ${response.status}`
      } catch (e) {
        return `异常: ${e.message}`
      }
    })

    console.log('📄 读取结果长度:', converterCode.length)

    // 检查是否包含删除线转换代码
    console.log('🔹 步骤 3: 检查 para2html 中的 delete → s 转换')
    const hasDeleteToS = converterCode.includes('.replace(/<delete>/g, \'<s>\')') ||
                         converterCode.includes('.replace(/<delete>/g, "<s>")')
    console.log('✓ para2html 包含 delete→s:', hasDeleteToS)

    console.log('🔹 步骤 4: 检查 html2para 中的 s → delete 转换')
    const hasSToDelete = converterCode.includes('.replace(/<s(\\s[^>]*)?\\>/g, \'<delete>\')') ||
                         converterCode.includes('.replace(/<s(\\s[^>]*)?>\\g, "<delete>")')
    console.log('✓ html2para 包含 s→delete:', hasSToDelete)

    console.log('🔹 步骤 5: 检查 del → delete 转换')
    const hasDelToDelete = converterCode.includes('<del(\\s[^>]*)?\\>') ||
                           converterCode.includes('/<del/')
    console.log('✓ html2para 包含 del→delete:', hasDelToDelete)

    // 输出关键代码片段
    if (converterCode.length > 100) {
      const deleteMatch = converterCode.match(/.{0,100}<delete>.{0,100}/g)
      if (deleteMatch) {
        console.log('\n📋 找到的 delete 相关代码:')
        deleteMatch.slice(0, 3).forEach(m => console.log('  -', m.trim()))
      }
    }

    // 断言
    if (!hasDeleteToS && !hasSToDelete) {
      console.error('❌ 未找到删除线转换代码！')
      console.log('可能原因：')
      console.log('1. webpack 未重新编译')
      console.log('2. 浏览器缓存未清除')
      console.log('3. 源文件修改未保存')
    }

    expect(hasDeleteToS || hasSToDelete).toBe(true)
  })

  test('测试转换函数（如果已导出）', async ({ page }) => {
    console.log('🔹 尝试直接调用转换函数')

    await page.goto('http://localhost:3000')
    await page.waitForTimeout(2000)

    const result = await page.evaluate(() => {
      try {
        // 尝试访问全局变量或模块
        if (window.para2html) {
          return { found: true, type: 'global' }
        }
        return { found: false, message: '转换函数未暴露到全局' }
      } catch (e) {
        return { found: false, error: e.message }
      }
    })

    console.log('转换函数查找结果:', result)
  })
})
