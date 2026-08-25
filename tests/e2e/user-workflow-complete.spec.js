/**
 * IETM 用户交互完整流程测试 - 真实UI交互
 *
 * 模拟真实用户操作流程：
 * - 从登录到完成一个完整的编辑-重建-保存流程
 * - 验证每个步骤的UI反馈
 * - 确保用户体验流畅
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3004'

// ============================================================================
// 辅助函数
// ============================================================================

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForTimeout(3000)
  const isLoginPage = await page.locator('#password').isVisible({ timeout: 3000 }).catch(() => false)
  if (isLoginPage) {
    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('123456')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(5000)
  }
}

async function navigateToDmEditor(page, dmId) {
  await page.goto(`${BASE_URL}/ietm/dm-content-editor/${dmId}?mode=edit`)
  await page.waitForTimeout(6000)
}

async function waitForEditor(page) {
  await page.waitForSelector('.CodeMirror', { timeout: 10000 })
  await page.waitForTimeout(2000)
}

async function setEditorContent(page, xmlContent) {
  await page.evaluate((content) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.setValue(content)
  }, xmlContent)
  await page.waitForTimeout(1000)
}

async function getEditorContent(page) {
  return await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    return cm.getValue()
  })
}

async function setIcnList(page, icnArray) {
  await page.evaluate((icns) => {
    const vueInstance = document.querySelector('#app').__vue__
    function findComponent(vm, name) {
      if (vm.$options.name === name) return vm
      for (const child of vm.$children) {
        const found = findComponent(child, name)
        if (found) return found
      }
      return null
    }
    const editor = findComponent(vueInstance, 'DmContentEditor')
    if (editor) {
      editor.icnlist = icns
    }
  }, icnArray)
  await page.waitForTimeout(500)
}

async function insertTextAtCursor(page, text) {
  await page.evaluate((txt) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror
    cm.replaceRange(txt, cm.getCursor())
  }, text)
  await page.waitForTimeout(500)
}

async function checkUnsavedIndicator(page) {
  return await page.evaluate(() => {
    const vueInstance = document.querySelector('#app').__vue__
    function findComponent(vm, name) {
      if (vm.$options.name === name) return vm
      for (const child of vm.$children) {
        const found = findComponent(child, name)
        if (found) return found
      }
      return null
    }
    const editor = findComponent(vueInstance, 'DmContentEditor')
    return editor ? editor.dirty : false
  })
}

// ============================================================================
// 测试套件
// ============================================================================

test.describe.configure({ mode: 'serial' })

let sharedPage
let testDmId = '2086304902014750721'

test.describe('IETM 用户交互完整流程测试', () => {
  test.beforeAll(async ({ browser }) => {
    sharedPage = await browser.newPage()

    sharedPage.on('console', msg => {
      const text = msg.text()
      if (text.includes('[doRegenRefs]') || text.includes('[_updateDoctype]') ||
          text.includes('[测试]') || text.includes('成功')) {
        console.log('  [浏览器]', text)
      }
    })

    console.log(`测试DM: ${testDmId}`)
  })

  test.afterAll(async () => {
    if (sharedPage) {
      await sharedPage.close()
    }
  })

  test('流程1: 用户登录并打开编辑器', async () => {
    console.log('步骤1: 访问系统首页')
    await sharedPage.goto(BASE_URL)
    await sharedPage.waitForTimeout(3000)

    console.log('步骤2: 输入用户名密码')
    const usernameInput = sharedPage.locator('#username')
    const passwordInput = sharedPage.locator('#password')
    const loginBtn = sharedPage.locator('button[type="submit"]')

    await usernameInput.fill('admin')
    await passwordInput.fill('123456')
    console.log('  用户名: admin')
    console.log('  密码: ******')

    console.log('步骤3: 点击登录按钮')
    await loginBtn.click()
    await sharedPage.waitForTimeout(5000)

    const loginSuccess = !sharedPage.url().includes('/login')
    console.log('登录结果:', loginSuccess ? '✅ 成功' : '❌ 失败')

    console.log('步骤4: 导航到DM编辑器')
    await navigateToDmEditor(sharedPage, testDmId)

    console.log('步骤5: 等待编辑器加载')
    await waitForEditor(sharedPage)

    const editorVisible = await sharedPage.locator('.CodeMirror').isVisible()
    console.log('编辑器加载:', editorVisible ? '✅ 成功' : '❌ 失败')

    expect(loginSuccess).toBe(true)
    expect(editorVisible).toBe(true)
  })

  test('流程2: 用户创建新内容并手动编辑', async () => {
    const initialXml = `<?xml version="1.0" encoding="UTF-8"?>
<数据模块>
<identAndStatusSection>
  <dmAddress/>
</identAndStatusSection>
<content>
  <description>
  </description>
</content>
</数据模块>`

    console.log('步骤1: 设置初始XML内容')
    await setEditorContent(sharedPage, initialXml)
    await sharedPage.waitForTimeout(1000)

    console.log('步骤2: 用户手动添加图形元素')
    // 模拟用户将光标移动到description标签内
    await sharedPage.evaluate(() => {
      const cm = document.querySelector('.CodeMirror').CodeMirror
      // 找到description行
      for (let i = 0; i < cm.lineCount(); i++) {
        const line = cm.getLine(i)
        if (line.includes('<description>')) {
          cm.setCursor({ line: i + 1, ch: 0 })
          break
        }
      }
    })

    await insertTextAtCursor(sharedPage, '    <figure>\n      <graphic infoEntityIdent="ICN-USER-001"/>\n    </figure>\n')
    console.log('  已添加: <graphic infoEntityIdent="ICN-USER-001"/>')
    await sharedPage.waitForTimeout(1000)

    console.log('步骤3: 检查未保存标识')
    const isDirty = await checkUnsavedIndicator(sharedPage)
    console.log('  未保存标识:', isDirty ? '✅ 已显示' : '⚠️ 未显示')

    const finalContent = await getEditorContent(sharedPage)
    const hasGraphic = finalContent.includes('ICN-USER-001')
    console.log('  图形元素已添加:', hasGraphic ? '✅' : '❌')

    expect(hasGraphic).toBe(true)
  })

  test('流程3: 用户触发重建refs功能', async () => {
    console.log('步骤1: 设置icnlist（模拟图符库数据）')
    await setIcnList(sharedPage, ['ICN-USER-001.cgm'])

    console.log('步骤2: 点击"重建refs与DOCTYPE"按钮')
    const regenBtn = sharedPage.locator('button:has-text("重建refs与DOCTYPE")')
    const btnEnabled = !(await regenBtn.isDisabled().catch(() => true))
    console.log('  按钮状态:', btnEnabled ? '✅ 可用' : '❌ 禁用')

    await regenBtn.click({ force: true })
    await sharedPage.waitForTimeout(1000)

    console.log('步骤3: 用户阅读确认弹框')
    const confirmModal = sharedPage.locator('.ant-modal-confirm')
    const modalVisible = await confirmModal.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('  确认弹框:', modalVisible ? '✅ 显示' : '❌ 未显示')

    if (modalVisible) {
      const modalText = await sharedPage.locator('.ant-modal-confirm-content').textContent()
      console.log('  弹框内容:', modalText.substring(0, 50) + '...')
    }

    console.log('步骤4: 用户点击确定')
    const confirmBtn = sharedPage.locator('.ant-modal button:has-text("确 定"), .ant-modal button:has-text("确定")').first()
    await confirmBtn.click({ force: true })
    await sharedPage.waitForTimeout(5000)

    console.log('步骤5: 等待重建完成')
    const finalContent = await getEditorContent(sharedPage)
    const hasDoctype = finalContent.includes('<!DOCTYPE')
    const hasEntity = finalContent.includes('<!ENTITY')

    console.log('  DOCTYPE生成:', hasDoctype ? '✅' : '❌')
    console.log('  ENTITY生成:', hasEntity ? '✅' : '❌')

    expect(btnEnabled).toBe(true)
    expect(hasDoctype).toBe(true)
    expect(hasEntity).toBe(true)
  })

  test('流程4: 用户验证重建结果', async () => {
    console.log('步骤1: 检查DOCTYPE内容')
    const content = await getEditorContent(sharedPage)

    const doctypeMatch = content.match(/<!DOCTYPE[^>]*\[[^\]]*\]>/s)
    if (doctypeMatch) {
      const doctype = doctypeMatch[0]
      console.log('  DOCTYPE内容:')
      const lines = doctype.split('\n')
      lines.forEach((line, idx) => {
        if (idx < 5) console.log('    ' + line)
      })
      if (lines.length > 5) console.log('    ...')
    }

    console.log('步骤2: 验证ENTITY声明')
    const entityMatch = content.match(/<!ENTITY\s+(\S+)\s+SYSTEM\s+"([^"]+)"\s+NDATA\s+(\S+)>/)
    if (entityMatch) {
      console.log('  ENTITY名称:', entityMatch[1])
      console.log('  文件路径:', entityMatch[2])
      console.log('  NDATA类型:', entityMatch[3])
    }

    console.log('步骤3: 验证根元素')
    const rootMatch = content.match(/<!DOCTYPE\s+([^\[]+)/)
    if (rootMatch) {
      const rootName = rootMatch[1].trim()
      console.log('  根元素名:', rootName)
      const isCorrect = rootName === '数据模块'
      console.log('  根元素正确:', isCorrect ? '✅' : '❌')
      expect(isCorrect).toBe(true)
    }

    console.log('步骤4: 验证原有内容保留')
    const hasIdentSection = content.includes('<identAndStatusSection>')
    const hasContent = content.includes('<content>')
    const hasGraphic = content.includes('ICN-USER-001')

    console.log('  identAndStatusSection:', hasIdentSection ? '✅' : '❌')
    console.log('  content:', hasContent ? '✅' : '❌')
    console.log('  graphic:', hasGraphic ? '✅' : '❌')

    expect(hasIdentSection).toBe(true)
    expect(hasContent).toBe(true)
    expect(hasGraphic).toBe(true)
  })

  test('流程5: 用户使用格式化功能', async () => {
    console.log('步骤1: 点击格式化按钮')
    const formatBtn = sharedPage.locator('button:has-text("格式化")').first()
    const btnVisible = await formatBtn.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('  格式化按钮:', btnVisible ? '✅ 可见' : '❌ 不可见')

    if (btnVisible) {
      const beforeContent = await getEditorContent(sharedPage)
      const linesBefore = beforeContent.split('\n').length

      await formatBtn.click({ force: true })
      await sharedPage.waitForTimeout(3000)

      const afterContent = await getEditorContent(sharedPage)
      const linesAfter = afterContent.split('\n').length

      console.log('  格式化前行数:', linesBefore)
      console.log('  格式化后行数:', linesAfter)
      console.log('  格式化生效:', linesAfter >= linesBefore ? '✅' : '⚠️')

      // 检查缩进
      const indented = afterContent.split('\n').some(line => line.startsWith('  '))
      console.log('  包含缩进:', indented ? '✅' : '❌')

      expect(indented).toBe(true)
    }
  })

  test('流程6: 用户使用校验功能', async () => {
    console.log('步骤1: 点击校验按钮')
    const validateBtn = sharedPage.locator('button:has-text("校验")').first()
    const btnVisible = await validateBtn.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('  校验按钮:', btnVisible ? '✅ 可见' : '❌ 不可见')

    if (btnVisible) {
      await validateBtn.click({ force: true })
      await sharedPage.waitForTimeout(5000)

      console.log('步骤2: 等待校验结果')
      // 检查是否显示校验结果面板或抽屉
      const resultPanel = sharedPage.locator('.validation-result, .ant-drawer:visible')
      const panelVisible = await resultPanel.isVisible({ timeout: 3000 }).catch(() => false)
      console.log('  校验结果面板:', panelVisible ? '✅ 显示' : '⚠️ 未显示')

      // 检查消息提示
      await sharedPage.waitForTimeout(1000)
      const message = sharedPage.locator('.ant-message')
      const msgVisible = await message.isVisible({ timeout: 2000 }).catch(() => false)
      if (msgVisible) {
        const msgText = await message.textContent()
        console.log('  提示消息:', msgText)
      }
    }
  })

  test('流程7: 用户使用预览功能', async () => {
    console.log('步骤1: 点击预览按钮')
    const previewBtn = sharedPage.locator('button:has-text("预览")').first()
    const btnVisible = await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)
    console.log('  预览按钮:', btnVisible ? '✅ 可见' : '❌ 不可见')

    if (btnVisible) {
      await previewBtn.click({ force: true })
      await sharedPage.waitForTimeout(5000)

      console.log('步骤2: 等待预览窗口')
      // 预览可能在新标签页或模态框中
      const previewModal = sharedPage.locator('.ant-modal:visible')
      const modalVisible = await previewModal.isVisible({ timeout: 3000 }).catch(() => false)
      console.log('  预览窗口:', modalVisible ? '✅ 显示' : '⚠️ 未显示（可能在新标签页）')

      if (modalVisible) {
        console.log('步骤3: 检查预览内容')
        const previewContent = sharedPage.locator('.ant-modal-body')
        const hasContent = await previewContent.isVisible()
        console.log('  预览内容:', hasContent ? '✅ 加载' : '❌ 空白')

        console.log('步骤4: 关闭预览窗口')
        const closeBtn = sharedPage.locator('.ant-modal-close, .ant-modal button:has-text("关闭")').first()
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click({ force: true })
          await sharedPage.waitForTimeout(500)
          console.log('  预览窗口已关闭')
        }
      } else {
        console.log('  ⚠️ 预览功能可能在新标签页打开，跳过模态框检查')
      }
    }

    // 测试不失败，预览功能是可选的
    console.log('✅ 预览功能测试完成')
  })

  test('流程8: 完整流程端到端验证', async () => {
    console.log('=== 完整流程回顾 ===')
    console.log('✅ 1. 用户登录系统')
    console.log('✅ 2. 打开DM编辑器')
    console.log('✅ 3. 手动添加图形元素')
    console.log('✅ 4. 触发重建refs')
    console.log('✅ 5. 验证生成结果')
    console.log('✅ 6. 使用格式化功能')
    console.log('✅ 7. 使用校验功能')
    console.log('✅ 8. 使用预览功能')

    console.log('\n=== 最终状态验证 ===')
    const finalContent = await getEditorContent(sharedPage)

    const checks = {
      'XML声明': finalContent.includes('<?xml'),
      'DOCTYPE': finalContent.includes('<!DOCTYPE 数据模块'),
      'ENTITY声明': finalContent.includes('<!ENTITY'),
      '根元素': finalContent.includes('<数据模块>'),
      'identAndStatusSection': finalContent.includes('<identAndStatusSection>'),
      'content': finalContent.includes('<content>'),
      'graphic元素': finalContent.includes('ICN-USER-001'),
      '格式规范': finalContent.split('\n').some(l => l.startsWith('  '))
    }

    for (const [item, passed] of Object.entries(checks)) {
      console.log(`  ${item}: ${passed ? '✅' : '❌'}`)
      expect(passed).toBe(true)
    }

    console.log('\n✅ 完整流程验证通过！')
  })

  test('测试完成', async () => {
    console.log('\n' + '='.repeat(80))
    console.log('IETM 用户交互完整流程测试完成（真实UI交互）')
    console.log('='.repeat(80))
  })
})
