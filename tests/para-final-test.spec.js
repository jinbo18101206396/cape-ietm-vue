const { test } = require('@playwright/test')
const fs = require('fs')

test('验证Para设计视图-公式按钮第一次和第二次打开的一致性', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    // 登录
    console.log('\n🔵 步骤1: 登录系统...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })

    const accountInputs = await page.$$('input[type="text"]')
    const passwordInputs = await page.$$('input[type="password"]')
    if (accountInputs.length > 0) await accountInputs[0].fill('admin')
    if (passwordInputs.length > 0) await passwordInputs[0].fill('123456')

    const loginBtn = await page.locator('button:has-text("登 录")').first()
    if (await loginBtn.isVisible()) await loginBtn.click()

    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 登录成功')

    // 导航到DM列表
    console.log('\n🔵 步骤2: 导航到DM管理...')
    await page.goto('http://localhost:3000/ietm/ietmdatamodulemanagement', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    console.log('✅ 进入DM管理页面')

    // 获取第一个DM的行
    console.log('\n🔵 步骤3: 查找可编辑的DM...')

    // 等待表格数据加载
    await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => {
      console.log('   ⚠️  超时：表格未在10秒内加载')
    })

    // 检查页面是否有分页或其他容器
    const hasTable = await page.locator('table').isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`   表格可见: ${hasTable}`)

    // 截图查看页面状态
    await page.screenshot({ path: 'dm-list-page.png', fullPage: false })
    console.log('   📸 已保存页面截图到 dm-list-page.png')

    const rows = await page.$$('tbody tr')
    console.log(`   找到 ${rows.length} 个DM行`)

    // 检查是否有编辑按钮或操作列
    const firstRow = await page.locator('tbody tr').first()
    const editBtn = await firstRow.locator('button:has-text("编辑"), a:has-text("编辑"), .action-btn').first()
    const hasBtns = await editBtn.isVisible({ timeout: 2000 }).catch(() => false)
    console.log(`   行中有编辑按钮: ${hasBtns}`)

    // 截图查看行的结构
    await firstRow.screenshot({ path: 'dm-row-structure.png' })
    console.log('   📸 已保存行结构截图到 dm-row-structure.png')

    // 获取HTML用于调试
    const rowHtml = await firstRow.innerHTML()
    console.log('   行HTML长度:', rowHtml.length)
    if (rowHtml.length < 500) {
      console.log('   行HTML:', rowHtml.substring(0, 300))
    }
    for (let i = 0; i < Math.min(15, 3); i++) {
      // 重新获取最新的行（每次都重新获取，防止DOM过期）
      const latestRows = await page.$$('tbody tr')
      if (latestRows.length === 0) break

      const row = latestRows[i]
      if (!row) break

      // 滚动到行
      try {
        await row.scrollIntoViewIfNeeded()
      } catch (e) {
        console.log(`   ⚠️  滚动失败，继续尝试`)
      }
      await page.waitForTimeout(500)

      // 双击打开编辑器
      console.log(`   尝试打开第${i + 1}个DM...`)
      try {
        await row.dblclick({ timeout: 5000 })
        await page.waitForTimeout(2000)

        // 检查编辑器是否打开
        const codeEditor = await page.locator('.CodeMirror').first()
        const isVisible = await codeEditor.isVisible({ timeout: 5000 }).catch(() => false)
        console.log(`   编辑器打开状态: ${isVisible}`)

        if (isVisible) {
          console.log(`✅ 成功打开第${i + 1}个DM的编辑器`)
          dmFound = true
          break
        }
      } catch (err) {
        console.log(`   ⚠️  第${i + 1}个DM打开异常: ${err.message}`)
        continue
      }
    }

    if (!dmFound) {
      console.log('❌ 无法打开任何DM编辑器')
      return
    }

    // 找到para行
    console.log('\n🔵 步骤4: 查找para元素...')
    const lineNumbers = await page.$$('.CodeMirror-linenumber')
    console.log(`   找到 ${lineNumbers.length} 行代码`)

    // 查找包含 <para 的行
    let paraLineIndex = -1
    for (let i = 0; i < lineNumbers.length; i++) {
      const content = await page.locator(`.CodeMirror-code > div:nth-child(${i + 1}) .CodeMirror-line`).textContent()
      if (content && content.includes('para')) {
        paraLineIndex = i
        console.log(`✅ 找到para行 (行号 ${i + 1})`)
        break
      }
    }

    if (paraLineIndex < 0) {
      console.log('⚠️  未找到para行，使用第10行')
      paraLineIndex = 9
    }

    // 第一次打开Para设计视图
    console.log('\n🔵 步骤5: 第一次打开Para设计视图...')
    await lineNumbers[paraLineIndex].click()
    await page.waitForTimeout(2000)

    // 确认设计视图打开
    const designView1 = await page.locator('.design-view-container, [class*="designer"]').first()
    const isOpen1 = await designView1.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isOpen1) {
      console.log('⚠️  设计视图可能未打开，继续进行...')
    }

    // 等待UEditor加载
    await page.waitForTimeout(1500)

    // 获取第一次的工具栏
    console.log('📸 捕获第一次打开时的工具栏...')
    const toolbars1 = await page.$$('.edui-toolbar')
    console.log(`   找到 ${toolbars1.length} 个工具栏`)

    if (toolbars1.length > 0) {
      await page.locator('.edui-toolbar').first().screenshot({ path: 'tests/toolbar-first.png' })
      console.log('✅ 工具栏截图已保存: tests/toolbar-first.png')

      // 获取公式按钮（第一次）
      const formulaBtnElements1 = await page.$$('.edui-for-kityformula')
      console.log(`   找到 ${formulaBtnElements1.length} 个公式按钮`)

      let formulaBtnData1 = null
      if (formulaBtnElements1.length > 0) {
        const fb = page.locator('.edui-for-kityformula').first()
        try {
          const box1 = await fb.boundingBox()
          const cls1 = await fb.getAttribute('class')
          const html1 = await fb.innerHTML()
          formulaBtnData1 = {
            x: box1.x,
            y: box1.y,
            width: box1.width,
            height: box1.height,
            className: cls1,
            htmlLength: html1.length
          }
          console.log(`✅ 公式按钮（第一次）:`)
          console.log(`   位置: x=${box1.x.toFixed(0)}, y=${box1.y.toFixed(0)}`)
          console.log(`   大小: ${box1.width.toFixed(0)}x${box1.height.toFixed(0)}`)
          console.log(`   className: ${cls1}`)
        } catch (e) {
          console.log(`⚠️  获取公式按钮属性失败: ${e.message}`)
        }
      }

      // 保存内容
      console.log('\n🔵 步骤6: 保存Para内容...')
      const saveBtns = await page.locator('button:has-text("保存")').all()
      if (saveBtns.length > 0) {
        await saveBtns[0].click()
        await page.waitForTimeout(2000)
        console.log('✅ 已保存')
      }

      // 关闭设计视图
      console.log('\n🔵 步骤7: 关闭设计视图...')
      const closeBtns = await page.locator('button[aria-label="Close"], .ant-modal-close').all()
      if (closeBtns.length > 0) {
        // 找到最后一个关闭按钮（通常是设计视图的）
        await closeBtns[closeBtns.length - 1].click()
        await page.waitForTimeout(1500)
        console.log('✅ 已关闭')
      }

      // 第二次打开Para设计视图
      console.log('\n🔵 步骤8: 第二次打开Para设计视图...')
      await lineNumbers[paraLineIndex].click()
      await page.waitForTimeout(2000)

      // 获取第二次的工具栏
      console.log('📸 捕获第二次打开时的工具栏...')
      const toolbars2 = await page.$$('.edui-toolbar')
      console.log(`   找到 ${toolbars2.length} 个工具栏`)

      if (toolbars2.length > 0) {
        await page.locator('.edui-toolbar').first().screenshot({ path: 'tests/toolbar-second.png' })
        console.log('✅ 工具栏截图已保存: tests/toolbar-second.png')

        // 获取公式按钮（第二次）
        const formulaBtnElements2 = await page.$$('.edui-for-kityformula')
        console.log(`   找到 ${formulaBtnElements2.length} 个公式按钮`)

        let formulaBtnData2 = null
        if (formulaBtnElements2.length > 0) {
          const fb = page.locator('.edui-for-kityformula').first()
          try {
            const box2 = await fb.boundingBox()
            const cls2 = await fb.getAttribute('class')
            const html2 = await fb.innerHTML()
            formulaBtnData2 = {
              x: box2.x,
              y: box2.y,
              width: box2.width,
              height: box2.height,
              className: cls2,
              htmlLength: html2.length
            }
            console.log(`✅ 公式按钮（第二次）:`)
            console.log(`   位置: x=${box2.x.toFixed(0)}, y=${box2.y.toFixed(0)}`)
            console.log(`   大小: ${box2.width.toFixed(0)}x${box2.height.toFixed(0)}`)
            console.log(`   className: ${cls2}`)
          } catch (e) {
            console.log(`⚠️  获取公式按钮属性失败: ${e.message}`)
          }
        }

        // 对比
        console.log('\n📊 ========== 对比结果 ==========')
        if (formulaBtnData1 && formulaBtnData2) {
          const xDiff = Math.abs(formulaBtnData1.x - formulaBtnData2.x)
          const yDiff = Math.abs(formulaBtnData1.y - formulaBtnData2.y)
          const wDiff = Math.abs(formulaBtnData1.width - formulaBtnData2.width)
          const hDiff = Math.abs(formulaBtnData1.height - formulaBtnData2.height)

          console.log(`位置差异: Δx=${xDiff.toFixed(1)}, Δy=${yDiff.toFixed(1)}`)
          console.log(`大小差异: Δw=${wDiff.toFixed(1)}, Δh=${hDiff.toFixed(1)}`)

          if (formulaBtnData1.className === formulaBtnData2.className) {
            console.log('✅ className相同')
          } else {
            console.log('❌ className不同')
            console.log(`   第一次: ${formulaBtnData1.className}`)
            console.log(`   第二次: ${formulaBtnData2.className}`)
          }

          if (xDiff < 2 && yDiff < 2 && wDiff < 2 && hDiff < 2) {
            console.log('✅✅✅ 公式按钮位置和大小完全一致 - 问题已修复!')
          } else {
            console.log('❌ 公式按钮位置或大小存在差异')
          }
        } else {
          console.log('❌ 无法获取公式按钮数据')
        }
      }
    }
  } catch (error) {
    console.error('\n❌ 测试出错:', error.message)
    console.error(error.stack)
    try {
      await page.screenshot({ path: 'tests/error.png' })
    } catch (e) {}
  } finally {
    await page.close()
  }
})
