/**
 * Warning/Caution适用性修复 - 回归测试套件
 *
 * 测试目标：
 * 1. 验证带applicRefId的warning/caution显示适用性
 * 2. 验证不带applicRefId的warning/caution不显示适用性
 * 3. 验证note的适用性未受影响
 * 4. 验证CSS样式正确
 * 5. 验证向后兼容性
 */

const { test, expect } = require('@playwright/test')

test.describe('状况模块适用性回归测试', () => {
  let testDmId = null

  test.beforeAll(async ({ browser }) => {
    // 准备测试数据：创建包含适用性的测试DM
    const page = await browser.newPage()

    // 登录
    await page.goto('http://localhost:3000/user/login')
    await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 })
    await page.fill('input[placeholder*="账户名"]', 'admin')
    await page.fill('input[placeholder*="密码"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // 打开项目
    try {
      const openProjectBtn = page.locator('button:has-text("打开项目")').first()
      if (await openProjectBtn.isVisible({ timeout: 3000 })) {
        await openProjectBtn.click()
        await page.waitForTimeout(1000)
        const firstProject = page.locator('.ant-table-row').first()
        if (await firstProject.isVisible({ timeout: 2000 })) {
          await firstProject.click()
          await page.click('button:has-text("确定")')
          await page.waitForTimeout(1000)
        }
      }
    } catch (e) {
      console.log('未找到打开项目按钮，可能已有项目打开')
    }

    // 进入数据模块管理
    await page.click('text=数据模块')
    await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })

    console.log('✅ 测试环境准备完成')
    await page.close()
  })

  test('TC-01: 带适用性的Warning显示正确', async ({ page }) => {
    // 登录并进入数据模块管理
    await loginAndOpenProject(page)

    // 查找或创建测试DM
    const dmId = await findOrCreateTestDM(page, 'applicability-test')

    if (!dmId) {
      console.log('⚠️ 无法创建测试DM，跳过测试')
      test.skip()
      return
    }

    // 打开DM编辑器
    await openDmEditor(page, dmId)

    // 插入带适用性的Warning
    const warningXml = `
    <levelledPara>
      <title>适用性测试 - Warning</title>
      <warning applicRefId="app-warning-001">
        <warningAndCautionPara>这是一个带适用性的警告信息</warningAndCautionPara>
      </warning>
    </levelledPara>`

    const applicXml = `
    <applicReposit>
      <applic id="app-warning-001">
        <displayText>
          <simplePara>仅适用于A型和B型飞机</simplePara>
        </displayText>
      </applic>
    </applicReposit>`

    await insertXmlContent(page, applicXml, warningXml)
    await page.waitForTimeout(1000)

    // 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    // 打开预览
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(3000)

    // 检查预览内容
    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe) return { error: 'iframe未找到' }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document

      // 查找Warning元素
      const warningDiv = iframeDoc.querySelector('.warningBGImage')
      if (!warningDiv) return { error: 'Warning元素未找到' }

      // 查找适用性文本
      const applicDiv = warningDiv.querySelector('.applicAnnotation')

      return {
        hasWarning: !!warningDiv,
        hasApplicAnnotation: !!applicDiv,
        applicText: applicDiv ? applicDiv.textContent.trim() : null,
        warningHtml: warningDiv.innerHTML.substring(0, 500)
      }
    })

    console.log('TC-01 结果:', JSON.stringify(result, null, 2))

    // 断言
    expect(result.hasWarning).toBe(true)
    expect(result.hasApplicAnnotation).toBe(true)
    expect(result.applicText).toContain('适用性')
    expect(result.applicText).toContain('仅适用于A型和B型飞机')

    console.log('✅ TC-01: 带适用性的Warning显示正确')
  })

  test('TC-02: 不带适用性的Warning显示正确', async ({ page }) => {
    await loginAndOpenProject(page)

    const dmId = await findOrCreateTestDM(page, 'no-applicability-test')
    if (!dmId) {
      test.skip()
      return
    }

    await openDmEditor(page, dmId)

    // 插入不带适用性的Warning
    const warningXml = `
    <levelledPara>
      <title>无适用性测试 - Warning</title>
      <warning>
        <warningAndCautionPara>这是一个不带适用性的警告信息</warningAndCautionPara>
      </warning>
    </levelledPara>`

    await insertXmlContent(page, '', warningXml)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    // 打开预览
    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(3000)

    // 检查预览内容
    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe) return { error: 'iframe未找到' }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const warningDiv = iframeDoc.querySelector('.warningBGImage')

      if (!warningDiv) return { error: 'Warning元素未找到' }

      const applicDiv = warningDiv.querySelector('.applicAnnotation')

      return {
        hasWarning: !!warningDiv,
        hasApplicAnnotation: !!applicDiv,
        warningContent: warningDiv.textContent.trim()
      }
    })

    console.log('TC-02 结果:', JSON.stringify(result, null, 2))

    // 断言：不应该有适用性文本
    expect(result.hasWarning).toBe(true)
    expect(result.hasApplicAnnotation).toBe(false)
    expect(result.warningContent).toContain('警 告')
    expect(result.warningContent).toContain('这是一个不带适用性的警告信息')
    expect(result.warningContent).not.toContain('适用性')

    console.log('✅ TC-02: 不带适用性的Warning显示正确（向后兼容）')
  })

  test('TC-03: 带适用性的Caution显示正确', async ({ page }) => {
    await loginAndOpenProject(page)

    const dmId = await findOrCreateTestDM(page, 'caution-applicability-test')
    if (!dmId) {
      test.skip()
      return
    }

    await openDmEditor(page, dmId)

    const cautionXml = `
    <levelledPara>
      <title>适用性测试 - Caution</title>
      <caution applicRefId="app-caution-001">
        <warningAndCautionPara>这是一个带适用性的注意信息</warningAndCautionPara>
      </caution>
    </levelledPara>`

    const applicXml = `
    <applicReposit>
      <applic id="app-caution-001">
        <displayText>
          <simplePara>仅适用于沙漠型设备</simplePara>
        </displayText>
      </applic>
    </applicReposit>`

    await insertXmlContent(page, applicXml, cautionXml)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(3000)

    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe) return { error: 'iframe未找到' }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const cautionDiv = iframeDoc.querySelector('.cautionBGImage')

      if (!cautionDiv) return { error: 'Caution元素未找到' }

      const applicDiv = cautionDiv.querySelector('.applicAnnotation')

      return {
        hasCaution: !!cautionDiv,
        hasApplicAnnotation: !!applicDiv,
        applicText: applicDiv ? applicDiv.textContent.trim() : null
      }
    })

    console.log('TC-03 结果:', JSON.stringify(result, null, 2))

    expect(result.hasCaution).toBe(true)
    expect(result.hasApplicAnnotation).toBe(true)
    expect(result.applicText).toContain('适用性')
    expect(result.applicText).toContain('仅适用于沙漠型设备')

    console.log('✅ TC-03: 带适用性的Caution显示正确')
  })

  test('TC-04: Note的适用性未受影响', async ({ page }) => {
    await loginAndOpenProject(page)

    const dmId = await findOrCreateTestDM(page, 'note-applicability-test')
    if (!dmId) {
      test.skip()
      return
    }

    await openDmEditor(page, dmId)

    const noteXml = `
    <levelledPara>
      <title>适用性测试 - Note</title>
      <note applicRefId="app-note-001">
        <notePara>这是一个带适用性的注释信息</notePara>
      </note>
    </levelledPara>`

    const applicXml = `
    <applicReposit>
      <applic id="app-note-001">
        <displayText>
          <simplePara>仅适用于软件版本 v2.0+</simplePara>
        </displayText>
      </applic>
    </applicReposit>`

    await insertXmlContent(page, applicXml, noteXml)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(3000)

    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe) return { error: 'iframe未找到' }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document

      // Note的适用性在noteBlock外面
      const applicDiv = iframeDoc.querySelector('.applicAnnotation')
      const noteBlock = iframeDoc.querySelector('.noteBlock')

      return {
        hasNote: !!noteBlock,
        hasApplicAnnotation: !!applicDiv,
        applicText: applicDiv ? applicDiv.textContent.trim() : null,
        noteText: noteBlock ? noteBlock.textContent.trim() : null
      }
    })

    console.log('TC-04 结果:', JSON.stringify(result, null, 2))

    expect(result.hasNote).toBe(true)
    expect(result.hasApplicAnnotation).toBe(true)
    expect(result.applicText).toContain('适用性')
    expect(result.applicText).toContain('仅适用于软件版本 v2.0+')
    expect(result.noteText).toContain('[注]')

    console.log('✅ TC-04: Note的适用性未受影响（保持原有功能）')
  })

  test('TC-05: 混合场景 - 三种状况类型同时存在', async ({ page }) => {
    await loginAndOpenProject(page)

    const dmId = await findOrCreateTestDM(page, 'mixed-applicability-test')
    if (!dmId) {
      test.skip()
      return
    }

    await openDmEditor(page, dmId)

    const mixedXml = `
    <levelledPara>
      <title>混合适用性测试</title>

      <warning applicRefId="app-mixed-001">
        <warningAndCautionPara>带适用性的警告</warningAndCautionPara>
      </warning>

      <warning>
        <warningAndCautionPara>不带适用性的警告</warningAndCautionPara>
      </warning>

      <caution applicRefId="app-mixed-002">
        <warningAndCautionPara>带适用性的注意</warningAndCautionPara>
      </caution>

      <note applicRefId="app-mixed-001">
        <notePara>带适用性的注释</notePara>
      </note>
    </levelledPara>`

    const applicXml = `
    <applicReposit>
      <applic id="app-mixed-001">
        <displayText>
          <simplePara>适用于配置A</simplePara>
        </displayText>
      </applic>
      <applic id="app-mixed-002">
        <displayText>
          <simplePara>适用于配置B</simplePara>
        </displayText>
      </applic>
    </applicReposit>`

    await insertXmlContent(page, applicXml, mixedXml)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(3000)

    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe) return { error: 'iframe未找到' }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document

      const warnings = iframeDoc.querySelectorAll('.warningBGImage')
      const cautions = iframeDoc.querySelectorAll('.cautionBGImage')
      const notes = iframeDoc.querySelectorAll('.noteBlock')
      const applicAnnotations = iframeDoc.querySelectorAll('.applicAnnotation')

      return {
        warningCount: warnings.length,
        cautionCount: cautions.length,
        noteCount: notes.length,
        applicCount: applicAnnotations.length,
        warnings: Array.from(warnings).map(w => ({
          hasApplic: !!w.querySelector('.applicAnnotation'),
          applicText: w.querySelector('.applicAnnotation')?.textContent.trim()
        })),
        cautions: Array.from(cautions).map(c => ({
          hasApplic: !!c.querySelector('.applicAnnotation'),
          applicText: c.querySelector('.applicAnnotation')?.textContent.trim()
        }))
      }
    })

    console.log('TC-05 结果:', JSON.stringify(result, null, 2))

    // 断言
    expect(result.warningCount).toBe(2)
    expect(result.cautionCount).toBe(1)
    expect(result.applicCount).toBe(3) // Warning1 + Caution1 + Note1

    // 第一个Warning有适用性
    expect(result.warnings[0].hasApplic).toBe(true)
    expect(result.warnings[0].applicText).toContain('适用于配置A')

    // 第二个Warning无适用性
    expect(result.warnings[1].hasApplic).toBe(false)

    // Caution有适用性
    expect(result.cautions[0].hasApplic).toBe(true)
    expect(result.cautions[0].applicText).toContain('适用于配置B')

    console.log('✅ TC-05: 混合场景测试通过')
  })

  test('TC-06: CSS样式一致性检查', async ({ page }) => {
    await loginAndOpenProject(page)

    const dmId = await findOrCreateTestDM(page, 'css-consistency-test')
    if (!dmId) {
      test.skip()
      return
    }

    await openDmEditor(page, dmId)

    const testXml = `
    <levelledPara>
      <title>CSS样式测试</title>

      <warning applicRefId="app-css-001">
        <warningAndCautionPara>Warning测试</warningAndCautionPara>
      </warning>

      <caution applicRefId="app-css-001">
        <warningAndCautionPara>Caution测试</warningAndCautionPara>
      </caution>

      <note applicRefId="app-css-001">
        <notePara>Note测试</notePara>
      </note>
    </levelledPara>`

    const applicXml = `
    <applicReposit>
      <applic id="app-css-001">
        <displayText>
          <simplePara>CSS测试</simplePara>
        </displayText>
      </applic>
    </applicReposit>`

    await insertXmlContent(page, applicXml, testXml)
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(2000)

    await page.click('button:has-text("预览")')
    await page.waitForSelector('.ant-modal:has-text("DM内容预览")', { timeout: 5000 })
    await page.waitForTimeout(3000)

    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (!iframe) return { error: 'iframe未找到' }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const applicDivs = iframeDoc.querySelectorAll('.applicAnnotation')

      return {
        count: applicDivs.length,
        styles: Array.from(applicDivs).map(div => {
          const computed = iframe.contentWindow.getComputedStyle(div)
          return {
            className: div.className,
            display: computed.display,
            color: computed.color,
            fontSize: computed.fontSize,
            text: div.textContent.trim()
          }
        })
      }
    })

    console.log('TC-06 结果:', JSON.stringify(result, null, 2))

    // 断言：所有适用性元素使用相同的CSS类
    expect(result.count).toBe(3)
    result.styles.forEach(style => {
      expect(style.className).toBe('applicAnnotation')
      expect(style.text).toContain('适用性')
      expect(style.text).toContain('CSS测试')
    })

    console.log('✅ TC-06: CSS样式一致性检查通过')
  })
})

// ==================== 辅助函数 ====================

async function loginAndOpenProject(page) {
  await page.goto('http://localhost:3000/user/login')
  await page.waitForSelector('input[placeholder*="账户名"]', { timeout: 10000 })
  await page.fill('input[placeholder*="账户名"]', 'admin')
  await page.fill('input[placeholder*="密码"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)

  try {
    const openProjectBtn = page.locator('button:has-text("打开项目")').first()
    if (await openProjectBtn.isVisible({ timeout: 3000 })) {
      await openProjectBtn.click()
      await page.waitForTimeout(1000)
      const firstProject = page.locator('.ant-table-row').first()
      if (await firstProject.isVisible({ timeout: 2000 })) {
        await firstProject.click()
        await page.click('button:has-text("确定")')
        await page.waitForTimeout(1000)
      }
    }
  } catch (e) {
    // 已有项目打开
  }

  await page.click('text=数据模块')
  await page.waitForSelector('.ant-table-tbody', { timeout: 10000 })
}

async function findOrCreateTestDM(page, keyword) {
  // 搜索是否存在测试DM
  await page.fill('input[placeholder*="技术名称"]', keyword)
  await page.waitForTimeout(1000)

  const rows = await page.locator('.ant-table-tbody tr').count()

  if (rows > 0) {
    console.log(`找到测试DM: ${keyword}`)
    return true
  }

  console.log(`未找到测试DM: ${keyword}，尝试创建...`)

  // 创建新DM（简化版，实际可能需要更完整的流程）
  // 这里返回null表示需要手动准备测试数据
  return null
}

async function openDmEditor(page, dmId) {
  // 双击打开编辑器
  await page.locator('.ant-table-tbody tr').first().dblclick()
  await page.waitForTimeout(2000)
}

async function insertXmlContent(page, applicXml, contentXml) {
  // 在Monaco编辑器中插入XML内容
  await page.evaluate(({ applic, content }) => {
    const editor = window.editor || window.monacoEditor
    if (editor) {
      const model = editor.getModel()
      const currentContent = model.getValue()

      // 插入applicReposit（如果有）
      let newContent = currentContent
      if (applic) {
        newContent = newContent.replace(
          '<content>',
          '<content>\n' + applic
        )
      }

      // 插入内容
      newContent = newContent.replace(
        '</content>',
        content + '\n  </content>'
      )

      model.setValue(newContent)
    }
  }, { applic: applicXml, content: contentXml })
}
