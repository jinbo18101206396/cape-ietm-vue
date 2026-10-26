import { test } from '@playwright/test'

test('Para公式ICN格式验证-简化版', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 打开DM编辑页面
    console.log('🔵 打开DM编辑页面...')
    const dmUrl = 'http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(dmUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 直接在源码中查找已有的公式symbol标签
    console.log('🔵 查找XML中的公式symbol标签...')

    const formulaSymbols = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const content = cm.getValue()

      // 查找所有symbol标签
      const symbolMatches = []
      const regex = /<symbol[^>]*infoEntityIdent="([^"]+)"[^>]*>/g
      let match

      while ((match = regex.exec(content)) !== null) {
        symbolMatches.push({
          icn: match[1],
          fullTag: match[0]
        })
      }

      return symbolMatches
    })

    if (formulaSymbols.length === 0) {
      console.log('❌ XML中未找到任何symbol标签')
      console.log('ℹ️  需要先手动在Para设计视图中插入一个公式')
      return
    }

    console.log(`\n📊 找到 ${formulaSymbols.length} 个symbol标签:\n`)

    // 分析每个ICN格式
    let correctCount = 0
    let wrongCount = 0

    formulaSymbols.forEach((symbol, index) => {
      const parts = symbol.icn.split('-')
      const isCorrect = parts.length === 10

      console.log(`Symbol #${index + 1}:`)
      console.log(`  ICN: ${symbol.icn}`)
      console.log(`  段数: ${parts.length}`)

      if (isCorrect) {
        console.log(`  ✅ 格式正确 (10段)`)
        console.log(`     [${parts.join(', ')}]`)
        correctCount++
      } else {
        console.log(`  ❌ 格式错误 (应为10段)`)
        console.log(`     [${parts.join(', ')}]`)
        wrongCount++
      }
      console.log('')
    })

    // 最终结论
    console.log('─'.repeat(60))
    console.log(`📊 统计结果:`)
    console.log(`   总共: ${formulaSymbols.length} 个symbol`)
    console.log(`   正确: ${correctCount} 个 (10段格式)`)
    console.log(`   错误: ${wrongCount} 个 (非10段格式)`)
    console.log('')

    if (wrongCount === 0 && correctCount > 0) {
      console.log('✅✅✅ 验证通过: 所有公式ICN格式都正确!')
    } else if (wrongCount > 0) {
      console.log(`❌❌❌ 验证失败: ${wrongCount} 个公式ICN格式错误!`)
      console.log('\n🔧 修复建议:')
      console.log('   1. 检查 formulaConverter.js 中的 generateIcnCode 函数')
      console.log('   2. 确保应用已重新编译并刷新')
      console.log('   3. 删除旧公式，重新插入新公式验证')
    } else {
      console.log('⚠️ 未找到任何symbol标签进行验证')
    }
  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
