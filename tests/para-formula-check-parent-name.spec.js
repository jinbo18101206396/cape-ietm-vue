import { test } from '@playwright/test'

test('对比parent.name和parent.dmCode', async ({ browser }) => {
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

    await page.evaluate((lineNum) => {
      document.querySelector('.CodeMirror').CodeMirror.scrollIntoView({ line: lineNum, ch: 0 })
    }, paraLineInfo.line)
    await page.waitForTimeout(500)

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

    const parentInfo = await page.evaluate(() => {
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
      if (!paraDesigner) return { error: '未找到ParaDesigner' }

      const parent = paraDesigner.Parent
      if (!parent) return { error: 'Parent为空' }

      return {
        name: parent.name,
        dmCode: parent.dmCode,
        dmcCode: parent.dmcCode,
        dmc: parent.dmc
      }
    })

    console.log('\n' + '='.repeat(70))
    console.log('📋 Parent对象分析:')
    console.log('='.repeat(70))

    console.log('\n1️⃣  parent.name (旧系统使用):')
    console.log('   值:', parentInfo.name)
    if (parentInfo.name) {
      const nameParts = parentInfo.name.split('-')
      console.log('   段数:', nameParts.length)
      nameParts.forEach((part, idx) => {
        console.log(`     第${idx + 1}段: "${part}"`)
      })

      // 模拟旧系统逻辑
      if (nameParts.length >= 6) {
        const oldSystemSNS = nameParts[1] + '-' + nameParts[2] + '-' + nameParts[3] + nameParts[4] + nameParts[5]
        console.log('\n   旧系统SNS组合:', oldSystemSNS)
        console.log('   旧系统ICN格式: ICN-' + oldSystemSNS + '-{rpc}-{originator}-{uniqueid}-A-001-01')
      }
    }

    console.log('\n2️⃣  parent.dmCode (新系统使用):')
    console.log('   值:', parentInfo.dmCode)
    if (parentInfo.dmCode) {
      const dmCodeParts = parentInfo.dmCode.split('-')
      console.log('   段数:', dmCodeParts.length)
      dmCodeParts.forEach((part, idx) => {
        console.log(`     第${idx + 1}段: "${part}"`)
      })
    }

    console.log('\n3️⃣  其他属性:')
    console.log('   parent.dmcCode:', parentInfo.dmcCode)
    console.log('   parent.dmc:', parentInfo.dmc)

    console.log('\n' + '='.repeat(70))
    console.log('🔍 关键发现:')
    console.log('='.repeat(70))
    console.log('旧系统使用 parent.name 而非 parent.dmCode')
    console.log('新系统需要检查：parent 对象中是否有 name 属性？')
    console.log('如果有，应该使用 parent.name 来保持兼容性')
  } catch (error) {
    console.log('\n❌ 异常:', error.message)
  } finally {
    await page.close()
  }
})
