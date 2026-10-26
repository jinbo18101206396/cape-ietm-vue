import { test } from '@playwright/test'

test('读取parent对象的dmCode属性', async ({ browser }) => {
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    console.log('\n🔵 登录...')
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("登 录")')
    await page.waitForURL(/.*/, { timeout: 30000 })
    await page.waitForTimeout(2000)

    console.log('🔵 打开DM编辑页面...')
    await page.goto('http://localhost:3000/ietm/dm-content-editor/2109256417100640257?mode=edit&dmc=DMC-ZB1-A-00-00-00-00A-007A-A_001-01_zh-CN',
      { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)

    // 查找para行
    const paraLineInfo = await page.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      for (let i = 0; i < cm.lineCount(); i++) {
        if (cm.getLine(i).includes('<para')) return { line: i }
      }
      return null
    })

    if (!paraLineInfo) {
      console.log('❌ 未找到para')
      return
    }

    // 滚动
    await page.evaluate((lineNum) => {
      document.querySelector('.CodeMirror').CodeMirror.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)
    await page.waitForTimeout(500)

    // 打开Para设计视图
    console.log('🔵 打开Para设计视图...')
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
    if (await pencilBtn.isVisible()) {
      await pencilBtn.click()
      await page.waitForTimeout(2000)
    }

    // 读取Parent对象
    const parentInfo = await page.evaluate(() => {
      // 查找ParaDesigner组件实例
      const app = document.querySelector('#app').__vue__

      function findParaDesigner(vm) {
        if (vm.$options.name === 'ParaDesigner') return vm
        if (vm.$children) {
          for (const child of vm.$children) {
            const found = findParaDesigner(child)
            if (found) return found
          }
        }
        return null
      }

      const paraDesigner = findParaDesigner(app)
      if (!paraDesigner) {
        return { error: '未找到ParaDesigner实例' }
      }

      const parent = paraDesigner.Parent
      if (!parent) {
        return { error: 'Parent对象为空' }
      }

      // 只提取简单属性，避免循环引用
      const simpleData = {}
      for (const key of Object.keys(parent)) {
        const value = parent[key]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          simpleData[key] = value
        } else if (value === null || value === undefined) {
          simpleData[key] = value
        }
      }

      return {
        dmCode: parent.dmCode,
        dmcCode: parent.dmcCode,
        dmc: parent.dmc,
        id: parent.id,
        keys: Object.keys(parent),
        allData: simpleData
      }
    })

    console.log('\n' + '='.repeat(70))
    console.log('📋 ParaDesigner的Parent对象:')
    console.log('='.repeat(70))

    if (parentInfo.error) {
      console.log('❌', parentInfo.error)
      return
    }

    console.log('parent.dmCode =', parentInfo.dmCode)
    console.log('parent.dmcCode =', parentInfo.dmcCode)
    console.log('parent.dmc =', parentInfo.dmc)
    console.log('parent.id =', parentInfo.id)

    console.log('\nparent对象所有属性:')
    parentInfo.keys.forEach(key => {
      const value = parentInfo.allData[key]
      if (typeof value === 'string' && value.length > 100) {
        console.log(`  ${key}: "${value.substring(0, 100)}..."`)
      } else {
        console.log(`  ${key}:`, value)
      }
    })

    console.log('\n' + '='.repeat(70))
    console.log('🔍 分析parent.dmCode:')
    console.log('='.repeat(70))

    if (parentInfo.dmCode) {
      const parts = parentInfo.dmCode.split('-')
      console.log(`parent.dmCode = "${parentInfo.dmCode}"`)
      console.log(`分段数: ${parts.length}`)
      parts.forEach((part, idx) => {
        console.log(`  第${idx + 1}段: "${part}"`)
      })

      console.log('\n❌ 问题诊断:')
      console.log(`  期望: DMC-ZB1-A-XX-XX-XX-60101-30101-...`)
      console.log(`  实际: ${parentInfo.dmCode}`)
      console.log(`  第6段应为 "60101"，实际为 "${parts[6]}"`)
      console.log(`  第7段应为 "30101"，实际为 "${parts[7]}"`)
    } else {
      console.log('❌ parent.dmCode为空或未定义')
    }
  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
