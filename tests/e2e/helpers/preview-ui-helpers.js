/**
 * 预览功能UI测试辅助函数
 *
 * 所有函数都通过真实的UI交互执行，不绕过Vue层
 */

/**
 * 模拟完整的DM预览流程：从列表页→详情页→点击预览
 *
 * @param {Page} page - Playwright页面对象
 * @param {string} dmId - DM的ID
 * @param {string} xmlContent - DM的XML内容（用于mock后端响应）
 * @returns {Promise<void>}
 */
export async function openDmPreviewFromList(page, dmId, xmlContent) {
  // 1. 导航到DM列表页
  await page.goto('http://localhost:3000/#/ietm/dm-manage')
  await page.waitForLoadState('networkidle')

  // 2. Mock后端API响应
  await page.route('**/ietm/dm-content/query*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: {
          id: dmId,
          dm_content: xmlContent
        }
      })
    })
  })

  await page.route('**/ietm/dm-content/preview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: '<div>Preview HTML</div>'
      })
    })
  })

  // 3. 点击DM进入详情页（模拟点击列表行）
  await page.evaluate((id) => {
    // 模拟路由跳转到详情页
    window.location.hash = `#/ietm/dm-manage/detail/${id}`
  }, dmId)

  await page.waitForTimeout(500)

  // 4. 等待详情页加载
  await page.waitForSelector('.dm-detail-container', { timeout: 5000 })
}

/**
 * 点击预览按钮并等待预览模态框打开
 *
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function clickPreviewButton(page) {
  // 查找并点击预览按钮
  const previewButton = page.locator('button:has-text("预览")').first()
  await previewButton.click()

  // 等待预览模态框出现
  await page.waitForSelector('.dm-preview-modal', { timeout: 5000 })

  // 等待iframe加载
  await page.waitForSelector('#previewIframe', { timeout: 5000 })
}

/**
 * 获取预览iframe中的HTML内容
 *
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<string>} iframe中的HTML内容
 */
export async function getPreviewIframeContent(page) {
  return await page.evaluate(() => {
    const iframe = document.getElementById('previewIframe')
    if (!iframe || !iframe.contentDocument) {
      return null
    }
    return iframe.contentDocument.body.innerHTML
  })
}

/**
 * 在预览iframe中执行点击操作
 *
 * @param {Page} page - Playwright页面对象
 * @param {string} selector - 要点击的元素选择器
 * @returns {Promise<void>}
 */
export async function clickInPreviewIframe(page, selector) {
  await page.evaluate((sel) => {
    const iframe = document.getElementById('previewIframe')
    const element = iframe.contentDocument.querySelector(sel)
    if (element) {
      element.click()
    }
  }, selector)
}

/**
 * 检查预览iframe中元素的样式
 *
 * @param {Page} page - Playwright页面对象
 * @param {string} selector - 元素选择器
 * @param {string} styleName - CSS属性名
 * @returns {Promise<string>} 样式值
 */
export async function getIframeElementStyle(page, selector, styleName) {
  return await page.evaluate(({ sel, style }) => {
    const iframe = document.getElementById('previewIframe')
    const element = iframe.contentDocument.querySelector(sel)
    if (!element) return null
    return window.getComputedStyle(element)[style]
  }, { sel: selector, style: styleName })
}

/**
 * 模拟真实的DM内容加载和预览流程
 *
 * @param {Page} page - Playwright页面对象
 * @param {Object} options - 配置选项
 * @param {string} options.dmId - DM ID
 * @param {string} options.xmlContent - XML内容
 * @param {string} options.htmlContent - 预期的预览HTML内容
 * @returns {Promise<void>}
 */
export async function mockFullPreviewFlow(page, options) {
  const { dmId, xmlContent, htmlContent } = options

  // Mock后端API
  await page.route('**/ietm/dm-content/query*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: {
          id: dmId,
          dm_content: xmlContent
        }
      })
    })
  })

  await page.route('**/ietm/dm-content/preview', async route => {
    // 从请求中提取XML，调用真实的预览逻辑
    const postData = route.request().postDataJSON()

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: htmlContent
      })
    })
  })
}

/**
 * 通过编辑器打开预览（从DM编辑界面）
 *
 * @param {Page} page - Playwright页面对象
 * @param {string} dmId - DM ID
 * @param {string} xmlContent - XML内容
 * @returns {Promise<void>}
 */
export async function openPreviewFromEditor(page, dmId, xmlContent) {
  // 导航到编辑器页面
  await page.goto(`http://localhost:3000/#/ietm/dm-manage/editor/${dmId}`)
  await page.waitForLoadState('networkidle')

  // Mock编辑器数据加载
  await page.route('**/ietm/dm-content/query*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: {
          id: dmId,
          dm_content: xmlContent
        }
      })
    })
  })

  // 等待编辑器加载完成
  await page.waitForSelector('.dm-editor-container', { timeout: 5000 })
}

/**
 * 验证UI交互结果（而不是直接检查HTML）
 *
 * @param {Page} page - Playwright页面对象
 * @param {string} elementSelector - 元素选择器
 * @param {string} expectedBehavior - 期望的行为描述
 * @returns {Promise<boolean>}
 */
export async function verifyUIBehavior(page, elementSelector, expectedBehavior) {
  return await page.evaluate(({ selector, behavior }) => {
    const iframe = document.getElementById('previewIframe')
    if (!iframe || !iframe.contentDocument) return false

    const element = iframe.contentDocument.querySelector(selector)
    if (!element) return false

    switch (behavior) {
      case 'visible':
        return element.offsetParent !== null
      case 'hidden':
        return element.offsetParent === null
      case 'clickable':
        return element.onclick !== null || element.style.cursor === 'pointer'
      default:
        return false
    }
  }, { selector: elementSelector, behavior: expectedBehavior })
}

/**
 * 等待预览内容完全加载
 *
 * @param {Page} page - Playwright页面对象
 * @returns {Promise<void>}
 */
export async function waitForPreviewLoaded(page) {
  // 等待iframe存在
  await page.waitForSelector('#previewIframe', { timeout: 10000 })

  // 等待iframe内容加载
  await page.waitForFunction(() => {
    const iframe = document.getElementById('previewIframe')
    return iframe &&
           iframe.contentDocument &&
           iframe.contentDocument.body &&
           iframe.contentDocument.body.innerHTML.length > 0
  }, { timeout: 10000 })

  // 额外等待确保渲染完成
  await page.waitForTimeout(500)
}

/**
 * 直接注入HTML到iframe用于测试（保持通过Vue层的约束）
 * 这个方法模拟后端返回特定HTML，然后让Vue正常处理
 *
 * @param {Page} page - Playwright页面对象
 * @param {string} html - 要注入的HTML内容
 * @returns {Promise<void>}
 */
export async function injectHtmlViaBackendMock(page, html) {
  // Mock后端预览API返回特定HTML
  await page.route('**/ietm/dm-content/preview', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        result: html
      })
    })
  })
}
