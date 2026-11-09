const { chromium } = require('playwright')

/**
 * 手动验证脚本：检查DM预览中的上标样式
 *
 * 此脚本会：
 * 1. 打开DM编辑页面
 * 2. 点击预览按钮
 * 3. 检查上标样式是否正确
 */

async function verifySupScript() {
  console.log('🚀 启动浏览器验证...\n')

  const browser = await chromium.launch({
    headless: false, // 显示浏览器窗口
    slowMo: 1000 // 每步操作延迟1秒，便于观察
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    console.log('📝 步骤1: 访问DM编辑页面')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2119611605359517698?mode=edit&dmc=DMC-ZB1-A-09-00-00-00A-007A-A_001-01_zh-CN')

    // 等待页面加载
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    console.log('📝 步骤2: 查找"预览"按钮')

    // 尝试多种可能的按钮选择器
    const previewButtonSelectors = [
      'button:has-text("预览")',
      '.ant-btn:has-text("预览")',
      'a:has-text("预览")',
      '[title="预览"]'
    ]

    let previewButton = null
    for (const selector of previewButtonSelectors) {
      const btn = page.locator(selector).first()
      if (await btn.count() > 0) {
        previewButton = btn
        console.log(`✓ 找到预览按钮: ${selector}`)
        break
      }
    }

    if (!previewButton) {
      console.error('❌ 未找到预览按钮')
      console.log('💡 请手动点击预览按钮，脚本将继续等待...')

      // 等待模态框出现（用户手动点击）
      await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 60000 })
    } else {
      console.log('📝 步骤3: 点击预览按钮')
      await previewButton.click()

      // 等待预览弹出框出现
      await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 10000 })
    }

    console.log('✓ 预览弹出框已打开\n')

    console.log('📝 步骤4: 检查iframe中的上标元素')

    // 获取iframe
    const modal = page.locator('.ant-modal:has-text("DM内容预览")')
    const iframe = modal.locator('iframe')
    await iframe.waitFor({ state: 'visible' })

    // 等待iframe加载
    await page.waitForTimeout(2000)

    // 获取iframe的frame对象
    const frameElement = await iframe.elementHandle()
    const frame = await frameElement.contentFrame()

    if (!frame) {
      throw new Error('无法获取iframe内容')
    }

    // 查找上标元素
    const supElements = frame.locator('sup')
    const supCount = await supElements.count()

    console.log(`\n📊 检测结果：`)
    console.log(`   找到 ${supCount} 个 <sup> 标签\n`)

    if (supCount === 0) {
      console.log('⚠️  未找到上标元素')
      console.log('可能原因：')
      console.log('  1. 该DM中确实没有上标内容')
      console.log('  2. <superScript>标签未转换为<sup>')
      console.log('  3. 后端未返回上标数据\n')

      // 检查是否有未转换的标签
      const bodyHTML = await frame.locator('body').innerHTML()
      if (bodyHTML.includes('superScript')) {
        console.log('❌ 发现未转换的<superScript>标签！')
        console.log('   前端转换代码未生效，需要重启开发服务器\n')
      }

      console.log('💡 让浏览器保持打开，您可以：')
      console.log('  - 查看预览内容确认是否应该有上标')
      console.log('  - 按F12打开开发者工具检查')
      console.log('  - 右键点击iframe内容 → 检查元素')
    } else {
      console.log('✓ 找到上标元素\n')

      // 检查每个上标的样式
      for (let i = 0; i < Math.min(supCount, 5); i++) {
        const sup = supElements.nth(i)
        const text = await sup.textContent()

        const styles = await sup.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          const parentComputed = window.getComputedStyle(el.parentElement)
          return {
            verticalAlign: computed.verticalAlign,
            fontSize: computed.fontSize,
            lineHeight: computed.lineHeight,
            parentFontSize: parentComputed.fontSize
          }
        })

        console.log(`上标 #${i + 1}: "${text}"`)
        console.log(`  vertical-align: ${styles.verticalAlign}`)
        console.log(`  font-size: ${styles.fontSize} (父元素: ${styles.parentFontSize})`)
        console.log(`  line-height: ${styles.lineHeight}`)

        // 验证样式
        const isCorrect = styles.verticalAlign === 'super'
        const fontSize = parseFloat(styles.fontSize)
        const parentFontSize = parseFloat(styles.parentFontSize)
        const ratio = fontSize / parentFontSize

        if (isCorrect && ratio >= 0.7 && ratio <= 0.8) {
          console.log(`  ✅ 样式正确 (字体比例: ${(ratio * 100).toFixed(1)}%)\n`)
        } else {
          console.log(`  ❌ 样式错误`)
          if (!isCorrect) {
            console.log(`     - vertical-align 应该是 'super'，实际是 '${styles.verticalAlign}'`)
          }
          if (ratio < 0.7 || ratio > 0.8) {
            console.log(`     - 字体比例 ${(ratio * 100).toFixed(1)}% 不在预期范围 (70-80%)`)
          }
          console.log('')
        }
      }

      // 检查CSS规则
      console.log('📋 检查CSS样式表中的sup规则：')
      const hasSupRule = await frame.evaluate(() => {
        let found = false
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            Array.from(sheet.cssRules || []).forEach((rule) => {
              if (rule.selectorText === 'sup') {
                found = true
                console.log('找到sup规则:', {
                  verticalAlign: rule.style.verticalAlign,
                  fontSize: rule.style.fontSize,
                  lineHeight: rule.style.lineHeight
                })
              }
            })
          } catch (e) {
            // 跨域或其他问题
          }
        })
        return found
      })

      if (hasSupRule) {
        console.log('✅ sup的CSS规则已正确注入\n')
      } else {
        console.log('❌ 未找到sup的CSS规则')
        console.log('   样式代码未生效，需要重启前端服务\n')
      }
    }

    console.log('='.repeat(60))
    console.log('验证完成！浏览器窗口将保持打开30秒供您检查')
    console.log('='.repeat(60))

    // 保持浏览器打开30秒
    await page.waitForTimeout(30000)
  } catch (error) {
    console.error('❌ 验证过程出错：', error.message)
    console.log('\n💡 浏览器窗口将保持打开60秒供您手动检查')
    await page.waitForTimeout(60000)
  } finally {
    await browser.close()
    console.log('\n✓ 浏览器已关闭')
  }
}

// 运行验证
verifySupScript().catch(console.error)
