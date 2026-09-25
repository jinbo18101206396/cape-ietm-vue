/**
 * Para设计器 - 综合测试套件
 * 验证所有修复是否生效
 */

const { chromium } = require('playwright')

async function runComprehensiveTests() {
  console.log('=' .repeat(80))
  console.log('Para设计器Bug修复 - 综合验证测试')
  console.log('=' .repeat(80))
  console.log('')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 监听控制台日志
  const logs = []
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[ParaDesigner]')) {
      logs.push(text)
      console.log('📋', text)
    }
  })

  try {
    console.log('=' .repeat(80))
    console.log('测试准备')
    console.log('=' .repeat(80))
    console.log('')

    // 1. 访问系统
    console.log('✓ 正在访问 http://localhost:3000')
    await page.goto('http://localhost:3000')
    await page.waitForTimeout(3000)

    // 2. 登录（如果需要）
    console.log('✓ 检查登录状态...')
    const loginButton = await page.$('button:has-text("登录")')
    if (loginButton) {
      console.log('  需要登录，请手动登录...')
      await page.waitForTimeout(30000) // 等待30秒手动登录
    }

    // 3. 导航到数据模块管理
    console.log('✓ 导航到数据模块管理...')
    await page.click('text=数据模块管理')
    await page.waitForTimeout(2000)

    console.log('')
    console.log('=' .repeat(80))
    console.log('测试1：验证UEditor实例复用时setcontent被调用')
    console.log('=' .repeat(80))
    console.log('')

    // 找到第一个para的铅笔图标
    console.log('✓ 查找para铅笔图标...')
    const firstPencil = await page.$('.para-edit-icon')
    if (!firstPencil) {
      console.log('❌ 找不到para铅笔图标，请手动打开一个DM')
      await page.waitForTimeout(20000)
    }

    // 点击铅笔图标
    console.log('✓ 点击第一个para的铅笔图标...')
    await firstPencil.click()
    await page.waitForTimeout(2000)

    // 检查日志
    const hasSetcontentLog = logs.some(log => log.includes('🔍 setcontent开始'))
    console.log('')
    console.log('验证结果：')
    if (hasSetcontentLog) {
      console.log('  ✅ setcontent被调用 - 修复3生效！')
    } else {
      console.log('  ❌ setcontent未被调用 - 修复3可能失效')
    }

    // 检查endline是否设置
    const hasEndlineLog = logs.some(log =>
      log.includes('单行para: endline') || log.includes('找到结束标签')
    )
    if (hasEndlineLog) {
      console.log('  ✅ endline已设置')
    } else {
      console.log('  ❌ endline未设置')
    }

    console.log('')
    console.log('=' .repeat(80))
    console.log('测试2：验证保存功能')
    console.log('=' .repeat(80))
    console.log('')

    // 清空之前的日志
    logs.length = 0

    // 点击保存按钮
    console.log('✓ 点击保存按钮...')
    const saveButton = await page.$('button:has-text("保存")')
    if (saveButton) {
      await saveButton.click()
      await page.waitForTimeout(2000)
    }

    // 检查是否有错误
    const hasEndlineError = logs.some(log => log.includes('❌ endline无效'))
    const hasSuccessMsg = await page.$('text=保存成功')

    console.log('')
    console.log('验证结果：')
    if (hasEndlineError) {
      console.log('  ❌ 仍然报endline错误 - 需要进一步诊断')
    } else if (hasSuccessMsg) {
      console.log('  ✅ 保存成功 - 所有修复生效！')
    } else {
      console.log('  ⚠️  未检测到保存成功消息，请查看页面')
    }

    // 检查html2para结果
    const html2paraLog = logs.find(log => log.includes('Step 2 - html2para结果'))
    if (html2paraLog) {
      console.log('  html2para结果:', html2paraLog)
      if (html2paraLog.includes('<para>\\n</para>')) {
        console.log('  ✅ html2para返回多行格式 - 修复4生效！')
      } else if (html2paraLog.includes('<para></para>')) {
        console.log('  ⚠️  html2para返回单行格式')
      }
    }

    // 检查formateXml是否添加换行符
    const formateXmlLog = logs.find(log => log.includes('Step 4 - formateXml后'))
    if (formateXmlLog) {
      console.log('  formateXml结果:', formateXmlLog)
      const xmlEndCharLog = logs.find(log => log.includes('XML末尾字符码'))
      if (xmlEndCharLog) {
        console.log('  ', xmlEndCharLog)
        if (xmlEndCharLog.includes(': 10')) {
          console.log('  ⚠️  末尾有换行符(\\n)')
        } else {
          console.log('  ✅ 末尾无换行符 - 修复1可能生效')
        }
      }
    }

    console.log('')
    console.log('=' .repeat(80))
    console.log('测试3：验证行数不变')
    console.log('=' .repeat(80))
    console.log('')

    // 检查变化的行
    const changedLinesLog = logs.find(log => log.includes('变化的行'))
    if (changedLinesLog) {
      console.log('  变化的行:', changedLinesLog)
    }

    const lineCountLog = logs.find(log => log.includes('行数变化'))
    if (lineCountLog) {
      console.log('  ', lineCountLog)
      if (lineCountLog.includes('→')) {
        const [before, after] = lineCountLog.match(/(\d+) → (\d+)/).slice(1)
        if (before === after) {
          console.log('  ✅ 行数不变 - 未丢失数据！')
        } else {
          console.log(`  ❌ 行数变化: ${before} → ${after}`)
        }
      }
    }

    console.log('')
    console.log('=' .repeat(80))
    console.log('测试4：多次编辑测试（实例复用场景）')
    console.log('=' .repeat(80))
    console.log('')

    // 关闭设计器
    console.log('✓ 关闭设计器...')
    const closeButton = await page.$('.design-view-close')
    if (closeButton) {
      await closeButton.click()
      await page.waitForTimeout(1000)
    }

    // 清空日志
    logs.length = 0

    // 再次打开同一个para
    console.log('✓ 再次打开同一个para（实例复用）...')
    await firstPencil.click()
    await page.waitForTimeout(2000)

    // 检查setcontent是否被调用
    const hasSetcontentLog2 = logs.some(log => log.includes('🔍 setcontent开始'))
    console.log('')
    console.log('验证结果：')
    if (hasSetcontentLog2) {
      console.log('  ✅ 实例复用时setcontent仍被调用 - 修复3完全生效！')
    } else {
      console.log('  ❌ 实例复用时setcontent未调用 - 可能有遗漏')
    }

    // 再次保存
    console.log('✓ 再次保存...')
    logs.length = 0
    if (saveButton) {
      await saveButton.click()
      await page.waitForTimeout(2000)
    }

    const hasError2 = logs.some(log => log.includes('❌'))
    if (!hasError2) {
      console.log('  ✅ 第二次保存也成功！')
    } else {
      console.log('  ❌ 第二次保存出现错误')
    }

    console.log('')
    console.log('=' .repeat(80))
    console.log('测试总结')
    console.log('=' .repeat(80))
    console.log('')

    const results = {
      setcontentCalled: hasSetcontentLog && hasSetcontentLog2,
      endlineSet: hasEndlineLog,
      saveSuccess: !hasEndlineError && hasSuccessMsg,
      multilineFormat: html2paraLog && html2paraLog.includes('\\n'),
      noDataLoss: !lineCountLog || lineCountLog.includes('→ ') === false
    }

    console.log('测试结果汇总：')
    console.log(`  setcontent调用: ${results.setcontentCalled ? '✅' : '❌'}`)
    console.log(`  endline设置: ${results.endlineSet ? '✅' : '❌'}`)
    console.log(`  保存成功: ${results.saveSuccess ? '✅' : '❌'}`)
    console.log(`  多行格式: ${results.multilineFormat ? '✅' : '❌'}`)
    console.log(`  无数据丢失: ${results.noDataLoss ? '✅' : '❌'}`)

    const passCount = Object.values(results).filter(v => v).length
    const totalCount = Object.values(results).length

    console.log('')
    console.log(`总体通过率: ${passCount}/${totalCount} (${(passCount/totalCount*100).toFixed(1)}%)`)

    if (passCount === totalCount) {
      console.log('')
      console.log('🎉 所有测试通过！修复完全生效！')
    } else {
      console.log('')
      console.log('⚠️  部分测试未通过，需要进一步调查')
    }

    console.log('')
    console.log('完整日志：')
    logs.forEach(log => console.log('  ', log))

  } catch (error) {
    console.error('❌ 测试执行出错:', error)
  }

  console.log('')
  console.log('测试完成。浏览器将保持打开状态，按Enter键关闭...')
  // 等待用户按键
  await new Promise(resolve => {
    process.stdin.once('data', resolve)
  })

  await browser.close()
}

// 运行测试
runComprehensiveTests().catch(console.error)
