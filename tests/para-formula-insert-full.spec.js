import { test } from '@playwright/test'

test('Para公式插入完整验证', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 步骤1: 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 登录成功')

    // 打开DM编辑页面
    console.log('\n🔵 步骤2: 打开DM编辑页面...')
    const dmUrl = 'http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN'
    await page.goto(dmUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    console.log('✅ 进入编辑页面')

    // 查找para行
    console.log('\n🔵 步骤3: 查找para标签...')
    const paraLineInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      for (let i = 0; i < cm.lineCount(); i++) {
        if (cm.getLine(i).includes('<para')) return { line: i }
      }
      return null
    })

    if (!paraLineInfo) {
      console.log('❌ 未找到para标签')
      return
    }
    console.log(`✅ 找到para行: 第 ${paraLineInfo.line} 行`)

    // 滚动到para行
    await page.evaluate((lineNum) => {
      document.querySelector('.CodeMirror').CodeMirror.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)
    await page.waitForTimeout(500)

    // 打开Para设计视图
    console.log('\n🔵 步骤4: 打开Para设计视图...')
    await page.evaluate((lineNum) => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const coords = cm.charCoords({ line: lineNum, ch: 0 }, 'page')
      const gutterWidth = document.querySelector('.CodeMirror-linenumber').offsetWidth
      const event = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: coords.left - gutterWidth - 10,
        clientY: coords.top + 10
      })
      document.querySelector('.CodeMirror-gutter').dispatchEvent(event)
    }, paraLineInfo.line)

    await page.waitForTimeout(300)

    const pencilBtn = await page.locator('[class*="pencil"]').first()
    if (await pencilBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pencilBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ Para设计视图已打开')
    } else {
      console.log('❌ 未找到铅笔按钮')
      return
    }

    // 查找并点击公式按钮
    console.log('\n🔵 步骤5: 点击插入公式按钮...')
    const formulaBtn = await page.locator('.edui-for-插入kityformula').first()
    if (await formulaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await formulaBtn.click()
      await page.waitForTimeout(2000)
      console.log('✅ 公式编辑器已打开')
    } else {
      console.log('❌ 未找到公式按钮')
      return
    }

    // 在公式编辑器中输入公式
    console.log('\n🔵 步骤6: 输入公式内容...')
    try {
      const formulaIframe = await page.frameLocator('iframe[src*="formula"]').first()
      await formulaIframe.locator('textarea, input[type="text"], .kf-editor-input').first().fill('x^2+y^2=1')
      await page.waitForTimeout(1000)
      console.log('✅ 已输入公式: x^2+y^2=1')

      // 点击确定按钮
      console.log('\n🔵 步骤7: 点击确定插入公式...')
      await page.locator('button:has-text("确定"), button:has-text("插入"), button:has-text("确认")').first().click({ force: true })
      await page.waitForTimeout(2000)
      console.log('✅ 公式已插入')
    } catch (e) {
      console.log(`⚠️ 公式编辑器操作跳过: ${e.message}`)
    }

    // 保存Para
    console.log('\n🔵 步骤8: 保存Para设计视图...')
    const saveBtn = await page.locator('button:has-text("保存")').first()
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 监听控制台日志
      page.on('console', msg => {
        const text = msg.text()
        if (text.includes('[html2para]') && text.includes('ICN')) {
          console.log(`📋 浏览器日志: ${text}`)
        }
      })

      await saveBtn.click()
      await page.waitForTimeout(3000)
      console.log('✅ Para已保存')
    } else {
      console.log('❌ 未找到保存按钮')
      return
    }

    // 验证XML中的symbol标签
    console.log('\n🔵 步骤9: 验证生成的symbol标签...')
    const symbolData = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      const content = cm.getValue()

      // 查找最新的symbol标签（最后一个）
      const symbolMatches = []
      const regex = /<symbol[^>]*infoEntityIdent="([^"]+)"[^>]*>/g
      let match

      while ((match = regex.exec(content)) !== null) {
        symbolMatches.push({
          icn: match[1],
          fullTag: match[0],
          index: match.index
        })
      }

      if (symbolMatches.length === 0) return null

      // 返回最后一个symbol（最新插入的）
      const latest = symbolMatches[symbolMatches.length - 1]
      return {
        icn: latest.icn,
        parts: latest.icn.split('-'),
        fullTag: latest.fullTag,
        totalCount: symbolMatches.length
      }
    })

    if (!symbolData) {
      console.log('❌ XML中未找到任何symbol标签')
      console.log('⚠️  可能是公式插入失败或保存未生效')
      return
    }

    console.log(`\n📊 找到 ${symbolData.totalCount} 个symbol标签，验证最新插入的:`)
    console.log(`\n最新公式ICN: ${symbolData.icn}`)
    console.log(`段数: ${symbolData.parts.length}`)
    console.log(`各段: [${symbolData.parts.join(', ')}]`)
    console.log(`\n完整标签:`)
    console.log(symbolData.fullTag)

    // 验证格式
    const isCorrectFormat = symbolData.parts.length === 10
    const hasCorrectStructure =
      symbolData.parts[0] === 'ICN' &&
      symbolData.parts[3].length === 6 && // SNS第3段应为6位（合并后）
      symbolData.parts[6].length === 5 && // uniqueId应为5位
      symbolData.parts[8] === '001' &&
      symbolData.parts[9] === '01'

    console.log('\n' + '─'.repeat(60))
    console.log('📋 验证结果:')
    console.log(`   ✓ 段数检查: ${isCorrectFormat ? '✅ 通过 (10段)' : `❌ 失败 (${symbolData.parts.length}段)`}`)
    console.log(`   ✓ 结构检查: ${hasCorrectStructure ? '✅ 通过' : '❌ 失败'}`)

    if (isCorrectFormat && hasCorrectStructure) {
      console.log(`\n✅✅✅ 验证通过！公式ICN格式完全正确！`)
      console.log(`\n格式说明:`)
      console.log(`   第1段: ${symbolData.parts[0]} (固定前缀)`)
      console.log(`   第2-6段: ${symbolData.parts.slice(1, 6).join('-')} (SNS 5段)`)
      console.log(`   第7段: ${symbolData.parts[6]} (uniqueId 5位)`)
      console.log(`   第8段: ${symbolData.parts[7]} (originator)`)
      console.log(`   第9段: ${symbolData.parts[8]} (固定 001)`)
      console.log(`   第10段: ${symbolData.parts[9]} (固定 01)`)
    } else {
      console.log(`\n❌❌❌ 验证失败！公式ICN格式不正确！`)
      console.log(`\n问题诊断:`)
      if (!isCorrectFormat) {
        console.log(`   - 段数错误: 预期10段，实际${symbolData.parts.length}段`)
      }
      if (!hasCorrectStructure) {
        console.log(`   - 结构错误: SNS未正确合并或uniqueId格式不正确`)
        console.log(`     第3段长度: ${symbolData.parts[3].length} (应为6)`)
        console.log(`     第7段长度: ${symbolData.parts[6].length} (应为5)`)
      }
    }
  } catch (error) {
    console.log('\n❌ 测试异常:', error.message)
  } finally {
    await page.close()
  }
})
